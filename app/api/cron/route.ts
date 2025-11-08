import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import Jimp from "jimp";
import { formatInTimeZone } from "date-fns-tz";

// NOTE: Next.js 16 (and 15+) defaults to dynamic execution
// for GET handlers in Route Handlers. We no longer need to export
// 'export const dynamic = "force-dynamic"'.
// This new default is perfect for our cron job.

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
  const SUBREDDIT = "100yearsagotoday";

  try {
    // 2. --- FETCH DATA FROM REDDIT ---
    // We use { cache: 'no-store' } on our fetch call to ensure
    // we get fresh data from Reddit every time.
    const url = `https://www.reddit.com/r/${SUBREDDIT}/top.json?t=day`;
    const headers = { "User-Agent": "VercelServerless:FrameUpdater:v1.0" };
    
    const redditResponse = await fetch(url, { headers, cache: 'no-store' });
    if (!redditResponse.ok) {
      throw new Error(`Reddit API failed: ${redditResponse.statusText}`);
    }

    const data = await redditResponse.json();
    const posts = data.data.children;

    // Find the first valid image post
    let chosenPost = null;
    for (const post of posts) {
      const postData = post.data;
      const isImage =
        postData.post_hint === "image" ||
        postData.url?.endsWith(".jpg") ||
        postData.url?.endsWith(".png");

      if (isImage) {
        chosenPost = {
          title: postData.title,
          url: postData.url,
        };
        break; // Stop at the first (top-rated) image
      }
    }

    if (!chosenPost) {
      console.error("No image posts found for the day.");
      return NextResponse.json({ success: false, message: "No image found" }, { status: 200 });
    }

    console.log(`Image found: ${chosenPost.title}`);

    // 3. --- PROCESS THE IMAGE WITH JIMP ---
    console.log(`Downloading image from: ${chosenPost.url}`);
    const image = await Jimp.read(chosenPost.url);

    // Resize to the 4:3 aspect ratio of the Pix-Star 10-inch
    image.resize(1024, 768);

    // Load fonts (Jimp's built-in fonts are used here)
    const fontWhite = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    // Generate the text overlay
    const now = new Date();
    const estTime = formatInTimeZone(now, "America/New_York", "MMMM d, yyyy h:mm a z");
    const titleText = chosenPost.title;
    const infoText = `r/${SUBREDDIT} | ${estTime}`;
    
    // Add a semi-transparent black overlay for text legibility
    const overlay = new Jimp(1024, 150, 0x00000088); // 150px height, 50% opacity black
    image.composite(overlay, 0, 768 - 150); // Position at the bottom

    // Print the text onto the image
    image.print(fontSmall, 20, 768 - 130, infoText, 1024 - 40);
    image.print(fontWhite, 20, 768 - 90, titleText, 1024 - 40);

    console.log("Image processing complete.");

    // Convert the final image to a Buffer
    const imageBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // 4. --- SEND THE EMAIL WITH RESEND ---
    console.log(`Sending email to: ${process.env.FRAME_EMAIL}`);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Historical Frame <${process.env.RESEND_FROM_EMAIL}>`,
      to: [process.env.FRAME_EMAIL!],
      subject: `Daily Photo: ${chosenPost.title.substring(0, 50)}...`,
      html: "<strong>Here is today's historical photo.</strong>",
      attachments: [
        {
          filename: "daily-photo.jpg",
          content: imageBuffer,
        },
      ],
    });

    if (emailError) {
      throw new Error(`Resend Error: ${emailError.message}`);
    }

    console.log(`Email sent successfully! ID: ${emailData?.id}`);
    return NextResponse.json({ success: true, message: `Email sent: ${emailData?.id}` });

  } catch (error: any) {
    console.error("Cron job failed:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
