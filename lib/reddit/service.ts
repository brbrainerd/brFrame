import { Buffer } from "node:buffer";
import { cronConfig } from "../config/cron";
import { logger } from "../logger";

export interface RedditPost {
  title: string;
  imageUrl: string;
  score: number;
  permalink: string;
  matchType: "exact" | "±3 days" | "±1 year";
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function matchesDate(
  postTitle: string,
  month: string,
  day: number,
  year: number,
): boolean {
  const dayWithSuffix = day + getDaySuffix(day);

  const pattern1 = `[${month} ${dayWithSuffix}, ${year}]`;
  const pattern2 = `[${month} ${day}, ${year}]`;
  const pattern3 = `[${month} ${dayWithSuffix} ${year}]`; // Without comma
  const pattern4 = `[${month} ${day} ${year}]`; // Without comma or suffix

  return (
    postTitle.includes(pattern1) ||
    postTitle.includes(pattern2) ||
    postTitle.includes(pattern3) ||
    postTitle.includes(pattern4)
  );
}

function isPostForTodayFuzzy(
  postTitle: string,
  daysRange: number = 0,
  yearsRange: number = 0,
): { matches: boolean; priority: number } {
  const today = new Date();
  const historicalDate = new Date(today);
  historicalDate.setFullYear(today.getFullYear() - 100);

  const month = historicalDate.toLocaleString("en-US", { month: "long" });
  const day = historicalDate.getDate();
  const year = historicalDate.getFullYear();

  // Priority 1: Exact date match
  if (matchesDate(postTitle, month, day, year)) {
    return { matches: true, priority: 1 };
  }

  // Priority 2: Nearby days in the same year
  if (daysRange > 0) {
    for (let dayOffset = 1; dayOffset <= daysRange; dayOffset++) {
      const nearbyDate = new Date(historicalDate);
      nearbyDate.setDate(historicalDate.getDate() + dayOffset);
      if (
        matchesDate(
          postTitle,
          nearbyDate.toLocaleString("en-US", { month: "long" }),
          nearbyDate.getDate(),
          year,
        )
      ) {
        return { matches: true, priority: 2 };
      }

      nearbyDate.setDate(historicalDate.getDate() - dayOffset);
      if (
        matchesDate(
          postTitle,
          nearbyDate.toLocaleString("en-US", { month: "long" }),
          nearbyDate.getDate(),
          year,
        )
      ) {
        return { matches: true, priority: 2 };
      }
    }
  }

  // Priority 3: Same day, nearby years
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

async function getRedditAccessToken(): Promise<string> {
  const clientId = cronConfig.reddit.clientId.trim();
  const clientSecret = cronConfig.reddit.clientSecret.trim();

  logger.debug("Requesting Reddit OAuth token", {
    hasClientId: !!clientId,
    clientIdLength: clientId.length,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "brFrame/1.0.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Reddit OAuth failed", {
      status: response.status,
      statusText: response.statusText,
      error: errorText.substring(0, 200),
    });
    throw new Error(
      `Reddit OAuth failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  logger.debug("Reddit OAuth token obtained");
  return data.access_token;
}

function extractImageFromPost(post: any): string | null {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif"];

  // Check for direct image URL
  if (post.url) {
    const hasImageExtension = imageExtensions.some((ext) =>
      post.url.toLowerCase().endsWith(ext),
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

export async function fetchHistoricalRedditPost(): Promise<RedditPost> {
  const subreddit = cronConfig.reddit.subreddit;

  logger.info("Fetching posts from Reddit", { subreddit });

  const today = new Date();
  const historicalDate = new Date(today);
  historicalDate.setFullYear(today.getFullYear() - 100);
  const month = historicalDate.toLocaleString("en-US", { month: "long" });
  const day = historicalDate.getDate();
  const year = historicalDate.getFullYear();
  const targetDateString = `${month} ${day}, ${year}`;

  logger.debug("Looking for historical date", { targetDate: targetDateString });

  const accessToken = await getRedditAccessToken();

  const response = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/hot?limit=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "brFrame/1.0.0",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Reddit API request failed", {
      status: response.status,
      error: errorText.substring(0, 500),
    });
    throw new Error(
      `Reddit API failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  const posts = data.data.children.map((child: any) => child.data);

  logger.debug("Retrieved posts from subreddit", { count: posts.length });

  // Try progressive fuzzy matching
  let validPosts: any[] = [];
  let matchType: "exact" | "±3 days" | "±1 year" = "exact";

  // Attempt 1: Exact date match
  validPosts = posts
    .map((post: any) => ({
      post,
      match: isPostForTodayFuzzy(post.title, 0, 0),
      imageUrl: extractImageFromPost(post),
    }))
    .filter(({ match, imageUrl }: any) => match.matches && imageUrl)
    .map(({ post, match, imageUrl }: any) => ({
      ...post,
      _priority: match.priority,
      _imageUrl: imageUrl,
    }));

  if (validPosts.length > 0) {
    logger.debug("Found exact date matches", { count: validPosts.length });
  }

  // Attempt 2: ±3 days
  if (validPosts.length === 0) {
    logger.debug("No exact matches, trying ±3 days");
    matchType = "±3 days";
    validPosts = posts
      .map((post: any) => ({
        post,
        match: isPostForTodayFuzzy(post.title, 3, 0),
        imageUrl: extractImageFromPost(post),
      }))
      .filter(({ match, imageUrl }: any) => match.matches && imageUrl)
      .map(({ post, match, imageUrl }: any) => ({
        ...post,
        _priority: match.priority,
        _imageUrl: imageUrl,
      }));

    if (validPosts.length > 0) {
      logger.debug("Found matches within ±3 days", {
        count: validPosts.length,
      });
    }
  }

  // Attempt 3: ±1 year
  if (validPosts.length === 0) {
    logger.debug("No matches in date range, trying ±1 year");
    matchType = "±1 year";
    validPosts = posts
      .map((post: any) => ({
        post,
        match: isPostForTodayFuzzy(post.title, 0, 1),
        imageUrl: extractImageFromPost(post),
      }))
      .filter(({ match, imageUrl }: any) => match.matches && imageUrl)
      .map(({ post, match, imageUrl }: any) => ({
        ...post,
        _priority: match.priority,
        _imageUrl: imageUrl,
      }));

    if (validPosts.length > 0) {
      logger.debug("Found matches within ±1 year", {
        count: validPosts.length,
      });
    }
  }

  if (validPosts.length === 0) {
    throw new Error(
      `No posts found for ${targetDateString} with images (tried: exact, ±3 days, ±1 year)`,
    );
  }

  // Sort by priority, then by score
  validPosts.sort((a: any, b: any) => {
    if (a._priority !== b._priority) return a._priority - b._priority;
    return b.score - a.score;
  });

  const bestPost = validPosts[0];

  logger.info("Selected historical post", {
    title: bestPost.title.substring(0, 100),
    score: bestPost.score,
    matchType,
  });

  return {
    title: bestPost.title,
    imageUrl: bestPost._imageUrl,
    score: bestPost.score,
    permalink: `https://www.reddit.com${bestPost.permalink}`,
    matchType,
  };
}
