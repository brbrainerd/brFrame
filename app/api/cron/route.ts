import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import sharp from "sharp";
import satori from "satori";
import { formatInTimeZone } from "date-fns-tz";
import React from "react";

// NOTE: Next.js 16 (and 15+) defaults to dynamic execution
// for GET handlers in Route Handlers. We no longer need to export
// 'export const dynamic = "force-dynamic"'.
// This new default is perfect for our cron job.

// Helper function to add ordinal suffix to day (1st, 2nd, 3rd, 4th, etc.)
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

// Helper function to check if a post title matches a specific date
function matchesDate(postTitle: string, month: string, day: number, year: number): boolean {
  const dayWithSuffix = day + getDaySuffix(day);
  
  const pattern1 = `[${month} ${dayWithSuffix}, ${year}]`;
  const pattern2 = `[${month} ${day}, ${year}]`;
  const pattern3 = `[${month} ${dayWithSuffix} ${year}]`; // Without comma
  const pattern4 = `[${month} ${day} ${year}]`; // Without comma or suffix
  
  return postTitle.includes(pattern1) || 
         postTitle.includes(pattern2) || 
         postTitle.includes(pattern3) || 
         postTitle.includes(pattern4);
}

// Helper function to check if a post matches today or nearby dates (fuzzy matching)
function isPostForTodayFuzzy(postTitle: string, daysRange: number = 0, yearsRange: number = 0): { matches: boolean; priority: number } {
  const today = new Date();
  const historicalDate = new Date(today);
  historicalDate.setFullYear(today.getFullYear() - 100);
  
  const month = historicalDate.toLocaleString("en-US", { month: "long" });
  const day = historicalDate.getDate();
  const year = historicalDate.getFullYear();
  
  // Priority 1: Exact date match (today's date, 100 years ago)
  if (matchesDate(postTitle, month, day, year)) {
    return { matches: true, priority: 1 };
  }
  
  // Priority 2: Nearby days in the same year (within daysRange)
  if (daysRange > 0) {
    for (let dayOffset = 1; dayOffset <= daysRange; dayOffset++) {
      const nearbyDate = new Date(historicalDate);
      nearbyDate.setDate(historicalDate.getDate() + dayOffset);
      if (matchesDate(postTitle, nearbyDate.toLocaleString("en-US", { month: "long" }), nearbyDate.getDate(), year)) {
        return { matches: true, priority: 2 };
      }
      
      nearbyDate.setDate(historicalDate.getDate() - dayOffset);
      if (matchesDate(postTitle, nearbyDate.toLocaleString("en-US", { month: "long" }), nearbyDate.getDate(), year)) {
        return { matches: true, priority: 2 };
      }
    }
  }
  
  // Priority 3: Same day, nearby years (within yearsRange)
  if (yearsRange > 0) {
    for (let yearOffset = 1; yearOffset <= yearsRange; yearOffset++) {
      if (matchesDate(postTitle, month, day, year + yearOffset)) {
        return { matches: true, priority: 3 };
      }
      if (matchesDate(postTitle, month, day, year - yearOffset)) {
        return { matches: true, priority: 3 };
      }
    }
  }
  
  return { matches: false, priority: 999 };
}

// Helper function to get Reddit OAuth access token
async function getRedditAccessToken(): Promise<string> {
  // Trim environment variables to remove any trailing newlines or whitespace
  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  
  // Debug: Log environment variable presence (not values for security)
  console.log('[Reddit OAuth] Environment check:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdLength: clientId?.length || 0,
    clientSecretLength: clientSecret?.length || 0
  });
  
  if (!clientId || !clientSecret) {
    throw new Error('Reddit OAuth credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.');
  }
  
  console.log('[Reddit OAuth] Requesting access token...');
  
  // Create Basic Auth header
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  console.log('[Reddit OAuth] Auth header length:', auth.length);
  
  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'brFrame/1.0.0'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Reddit OAuth] Failed to get token: ${response.status} ${response.statusText}`);
      console.error(`[Reddit OAuth] Error response: ${errorText}`);
      throw new Error(`Reddit OAuth failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Reddit OAuth] Access token obtained successfully');
    return data.access_token;
  } catch (error: any) {
    console.error('[Reddit OAuth] Error:', error.message);
    throw error;
  }
}

// Helper function to extract image URL from various post types
function extractImageFromPost(post: any): string | null {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif"];
  
  // Check for direct image URL
  if (post.url) {
    const hasImageExtension = imageExtensions.some(ext => 
      post.url.toLowerCase().endsWith(ext)
    );
    if (hasImageExtension) {
      return post.url;
    }
  }
  
  // Check for gallery posts
  if (post.is_gallery && post.media_metadata) {
    const mediaIds = Object.keys(post.media_metadata);
    if (mediaIds.length > 0) {
      const firstMedia = post.media_metadata[mediaIds[0]];
      if (firstMedia.s?.u) {
        // Decode HTML entities in URL
        return firstMedia.s.u.replace(/&amp;/g, "&");
      }
    }
  }
  
  // Check for preview images as fallback
  if (post.preview?.images?.[0]?.source?.url) {
    return post.preview.images[0].source.url.replace(/&amp;/g, "&");
  }
  
  return null;
}

// Main function to get the best historical image for today
async function getBestHistoricalImageForToday() {
  const SUBREDDIT = "100yearsago";
  
  console.log(`[Reddit API] Fetching posts from r/${SUBREDDIT}`);
  
  // Calculate today's historical date for logging
  const today = new Date();
  const historicalDate = new Date(today);
  historicalDate.setFullYear(today.getFullYear() - 100);
  const month = historicalDate.toLocaleString("en-US", { month: "long" });
  const day = historicalDate.getDate();
  const year = historicalDate.getFullYear();
  const targetDateString = `${month} ${day}, ${year}`;
  
  console.log(`[Reddit API] Looking for posts matching date: ${targetDateString}`);
  
  try {
    // Get OAuth access token
    const accessToken = await getRedditAccessToken();
    
    // Fetch more posts from hot using OAuth endpoint (not blocked)
    const response = await fetch(
      `https://oauth.reddit.com/r/${SUBREDDIT}/hot?limit=50`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "brFrame/1.0.0"
        },
        cache: "no-store"
      }
    );
    
    console.log(`[Reddit API] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Reddit API] Error response body: ${errorText.substring(0, 500)}`);
      throw new Error(`Reddit API failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const posts = data.data.children.map((child: any) => child.data);
    
    console.log(`[Reddit API] Retrieved ${posts.length} posts from subreddit`);
    
    // Try progressive fuzzy matching: exact → ±3 days → ±1 year
    let validPosts: any[] = [];
    let matchType = "exact";
    
    // Attempt 1: Exact date match
    validPosts = posts
      .map((post: any) => ({
        post,
        match: isPostForTodayFuzzy(post.title, 0, 0),
        imageUrl: extractImageFromPost(post)
      }))
      .filter(({ match, imageUrl }: any) => match.matches && imageUrl)
      .map(({ post, match, imageUrl }: any) => ({ ...post, _priority: match.priority, _imageUrl: imageUrl }));
    
    if (validPosts.length > 0) {
      console.log(`[Reddit API] Found ${validPosts.length} posts with exact date match`);
    }
    
    // Attempt 2: If no exact match, try ±3 days
    if (validPosts.length === 0) {
      console.log(`[Reddit API] No exact matches, trying ±3 days...`);
      matchType = "±3 days";
      validPosts = posts
        .map((post: any) => ({
          post,
          match: isPostForTodayFuzzy(post.title, 3, 0),
          imageUrl: extractImageFromPost(post)
        }))
        .filter(({ match, imageUrl }: any) => match.matches && imageUrl)
        .map(({ post, match, imageUrl }: any) => ({ ...post, _priority: match.priority, _imageUrl: imageUrl }));
      
      if (validPosts.length > 0) {
        console.log(`[Reddit API] Found ${validPosts.length} posts within ±3 days`);
      }
    }
    
    // Attempt 3: If still no match, try ±1 year (same day, different year)
    if (validPosts.length === 0) {
      console.log(`[Reddit API] No matches in date range, trying ±1 year...`);
      matchType = "±1 year";
      validPosts = posts
        .map((post: any) => ({
          post,
          match: isPostForTodayFuzzy(post.title, 0, 1),
          imageUrl: extractImageFromPost(post)
        }))
        .filter(({ match, imageUrl }: any) => match.matches && imageUrl)
        .map(({ post, match, imageUrl }: any) => ({ ...post, _priority: match.priority, _imageUrl: imageUrl }));
      
      if (validPosts.length > 0) {
        console.log(`[Reddit API] Found ${validPosts.length} posts within ±1 year`);
      }
    }
    
    // Log all evaluated posts for debugging
    console.log(`[Reddit API] Sample of posts evaluated:`);
    posts.slice(0, 5).forEach((post: any) => {
      const imageUrl = extractImageFromPost(post);
      console.log(`  - "${post.title.substring(0, 60)}..."`);
      console.log(`    Image: ${imageUrl ? "Yes" : "No"}, Score: ${post.score}`);
    });
    
    if (validPosts.length === 0) {
      throw new Error(`No posts found for ${targetDateString} with images (tried: exact, ±3 days, ±1 year)`);
    }
    
    console.log(`[Reddit API] Using match type: ${matchType}`);
    
    // Sort by priority (exact match first), then by score
    validPosts.sort((a: any, b: any) => {
      if (a._priority !== b._priority) return a._priority - b._priority;
      return b.score - a.score;
    });
    
    const bestPost = validPosts[0];
    const imageUrl = bestPost._imageUrl;
    
    console.log(`[Reddit API] Selected post: "${bestPost.title}"`);
    console.log(`[Reddit API] Image URL: ${imageUrl}`);
    console.log(`[Reddit API] Score: ${bestPost.score} upvotes`);
    
    return {
      title: bestPost.title,
      imageUrl: imageUrl!,
      score: bestPost.score,
      permalink: `https://www.reddit.com${bestPost.permalink}`
    };
  } catch (error: any) {
    console.error("[Reddit API] Error:", error.message);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  // 1. --- SECURE THE ENDPOINT ---
  // Ensure this request is coming from Vercel's Cron service
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized: Invalid CRON_SECRET");
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("Cron job started: Fetching daily image...");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const SUBREDDIT = "100yearsago";

  try {
    // 2. --- FETCH DATA FROM REDDIT ---
    const chosenPost = await getBestHistoricalImageForToday();

    console.log(`Image found: ${chosenPost.title}`);

    // 3. --- PROCESS THE IMAGE WITH SHARP ---
    console.log(`Downloading image from: ${chosenPost.imageUrl}`);
    
    // Download image
    const imageResponse = await fetch(chosenPost.imageUrl);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    // Get image metadata to determine best fit
    const metadata = await sharp(imageBuffer).metadata();
    const imageAspect = (metadata.width || 1) / (metadata.height || 1);
    const targetAspect = 1024 / 768; // 4:3 ratio
    
    // Use 'contain' instead of 'cover' to avoid cropping, add background
    const processedImage = await sharp(imageBuffer)
      .resize(1024, 768, { 
        fit: 'contain',  // Don't crop - fit entire image
        background: { r: 0, g: 0, b: 0 }  // Black letterbox bars if needed
      })
      .flatten({ background: { r: 0, g: 0, b: 0 } })  // Ensure solid background
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Create text overlay using Satori (serverless-compatible SVG-to-PNG renderer)
    const now = new Date();
    const estTime = formatInTimeZone(now, "America/New_York", "MMMM d, yyyy h:mm a z");
    
    // Build text lines
    const titleText = chosenPost.title;  // Full Reddit post title with date
    const attribution = "100 Years Ago Today";
    const credits = "Built by Bertrand Reyna-Brainerd";
    
    // Simple text truncation for title (no complex wrapping needed with Satori)
    const maxTitleLength = 80;
    const displayTitle = titleText.length > maxTitleLength 
      ? titleText.substring(0, maxTitleLength) + '...'
      : titleText;
    
    // Calculate dynamic overlay height (simple fixed height based on content)
    const overlayHeight = 160;  // Fixed height for consistency
    
    // Create SVG markup using Satori with React elements
    const svg = await satori(
      React.createElement(
        'div',
        {
          style: {
            width: '1024px',
            height: `${overlayHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            fontFamily: 'sans-serif',
          },
        },
        React.createElement('div', { style: { fontSize: '18px', marginBottom: '8px' } }, attribution),
        React.createElement('div', { style: { fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' } }, displayTitle),
        React.createElement('div', { style: { fontSize: '16px', marginBottom: '6px' } }, `r/${SUBREDDIT} • ${estTime}`),
        React.createElement('div', { style: { fontSize: '14px', color: '#cccccc' } }, credits)
      ),
      {
        width: 1024,
        height: overlayHeight,
        fonts: [],  // Use system fonts
      }
    );
    
    // Convert SVG to PNG using Sharp
    const textOverlayBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    
    console.log(`[Image Processing] Text overlay height: ${overlayHeight}px (${((overlayHeight/768)*100).toFixed(1)}% of image)`);
    console.log(`[Image Processing] Title: ${displayTitle}`);
    console.log(`[Image Processing] Using Satori for serverless text rendering`);
    
    // Composite the text overlay onto the processed image (positioned at bottom)
    const finalImage = await sharp(processedImage)
      .composite([{
        input: textOverlayBuffer,
        top: 768 - overlayHeight,
        left: 0
      }])
      .jpeg({ quality: 90 })
      .toBuffer();

    console.log("Image processing complete.");

    // 4. --- SEND THE EMAIL ---
    console.log(`Sending email to: ${process.env.FRAME_EMAIL}`);

    // Use Nodemailer if GMAIL_APP_PASSWORD is set, otherwise use Resend
    if (process.env.GMAIL_APP_PASSWORD) {
      // Option: Gmail SMTP via Nodemailer (no restrictions on recipient)
      console.log('[Email] Using Gmail SMTP via Nodemailer');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER?.trim() || 'brbrainerd@gmail.com',
          pass: process.env.GMAIL_APP_PASSWORD.trim()
        }
      });

      const info = await transporter.sendMail({
        from: `"100 Years Ago Today" <${process.env.GMAIL_USER?.trim() || 'brbrainerd@gmail.com'}>`,
        to: process.env.FRAME_EMAIL?.trim()!,
        subject: `100 Years Ago Today: ${chosenPost.title}`,
        html: `<strong>100 Years Ago Today</strong><br><br>${chosenPost.title}<br><br><em>Built by Bertrand Reyna-Brainerd</em>`,
        attachments: [
          {
            filename: "daily-photo.jpg",
            content: finalImage,
          },
        ],
      });

      console.log(`Email sent successfully via Gmail! ID: ${info.messageId}`);
      return NextResponse.json({ success: true, message: `Email sent: ${info.messageId}` });
    } else {
      // Default: Resend (free tier restrictions apply)
      console.log('[Email] Using Resend');
      
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `100 Years Ago Today <${process.env.RESEND_FROM_EMAIL?.trim()}>`,
        to: [process.env.FRAME_EMAIL?.trim()!],
        subject: `100 Years Ago Today: ${chosenPost.title}`,
        html: `<strong>100 Years Ago Today</strong><br><br>${chosenPost.title}<br><br><em>Built by Bertrand Reyna-Brainerd</em>`,
        attachments: [
          {
            filename: "daily-photo.jpg",
            content: finalImage,
          },
        ],
      });

      if (emailError) {
        throw new Error(`Resend Error: ${emailError.message}`);
      }

      console.log(`Email sent successfully! ID: ${emailData?.id}`);
      return NextResponse.json({ success: true, message: `Email sent: ${emailData?.id}` });
    }

  } catch (error: any) {
    console.error("Cron job failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
