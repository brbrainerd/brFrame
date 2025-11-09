import sharp from "sharp";
import fs from "fs";
import path from "path";

async function getRedditAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
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

  const data = await response.json();
  return data.access_token;
}

async function fetchTodaysImage() {
  // Load from .env.local
  const envFile = fs.readFileSync(".env.local", "utf-8");
  const clientId = envFile.match(/REDDIT_CLIENT_ID="(.+?)"/)?.[1] || "";
  const clientSecret = envFile.match(/REDDIT_CLIENT_SECRET="(.+?)"/)?.[1] || "";

  console.log("Fetching today's historical Reddit post...\n");

  // Get OAuth token
  const accessToken = await getRedditAccessToken(clientId, clientSecret);

  // Fetch posts from r/100yearsago
  const response = await fetch(
    "https://oauth.reddit.com/r/100yearsago/hot?limit=50",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "brFrame/1.0.0",
      },
    },
  );

  const data = await response.json();
  const posts = data.data.children.map((child: any) => child.data);

  // Find today's date (100 years ago)
  const today = new Date();
  const historicalDate = new Date(today);
  historicalDate.setFullYear(today.getFullYear() - 100);
  const month = historicalDate.toLocaleString("en-US", { month: "long" });
  const day = historicalDate.getDate();
  const year = historicalDate.getFullYear();

  console.log(`Looking for: ${month} ${day}, ${year}\n`);

  // Find a post with an image
  const post =
    posts.find((p: any) => {
      const hasImage =
        p.url &&
        (p.url.endsWith(".jpg") ||
          p.url.endsWith(".jpeg") ||
          p.url.endsWith(".png"));
      return hasImage && p.title.includes(`[${month}`);
    }) ||
    posts.find(
      (p: any) => p.url && (p.url.endsWith(".jpg") || p.url.endsWith(".jpeg")),
    );

  if (!post) {
    console.error("No post with image found!");
    return;
  }

  console.log("Selected post:");
  console.log(`  Title: ${post.title}`);
  console.log(`  Score: ${post.score} upvotes`);
  console.log(`  URL: ${post.url}\n`);

  // Download the image
  console.log("Downloading image...");
  const imageResponse = await fetch(post.url);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // Get metadata
  const metadata = await sharp(imageBuffer).metadata();
  console.log("Image properties:");
  console.log(`  Format: ${metadata.format}`);
  console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
  console.log(
    `  Aspect ratio: ${((metadata.width || 1) / (metadata.height || 1)).toFixed(2)}`,
  );
  console.log(`  Size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

  // Calculate resize
  const imageAspect = (metadata.width || 1) / (metadata.height || 1);
  const targetAspect = 1024 / 768;

  console.log("Resize calculation:");
  console.log(`  Target: 1024x768 (${targetAspect.toFixed(2)})`);
  console.log(`  Image aspect: ${imageAspect.toFixed(2)}`);

  if (imageAspect > targetAspect) {
    console.log(
      `  Result: Image is WIDER - will have BLACK BARS on TOP/BOTTOM\n`,
    );
  } else if (imageAspect < targetAspect) {
    console.log(
      `  Result: Image is TALLER - will have BLACK BARS on LEFT/RIGHT\n`,
    );
  }

  // Save original
  const tempDir = "C:\\\\Users\\\\iacch\\\\AppData\\\\Local\\\\Temp\\\\brFrame";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const originalPath = path.join(tempDir, "original-from-reddit.jpg");
  fs.writeFileSync(originalPath, imageBuffer);
  console.log(`Original saved to: ${originalPath}`);

  // Create resized version
  const resizedBuffer = await sharp(imageBuffer)
    .resize(1024, 768, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0 },
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const resizedPath = path.join(tempDir, "resized-1024x768.jpg");
  fs.writeFileSync(resizedPath, resizedBuffer);
  console.log(`Resized saved to: ${resizedPath}`);

  // Open images
  console.log("\nOpening images in default viewer...");
  const { exec } = require("child_process");
  exec(`"${originalPath}"`);
  setTimeout(() => exec(`"${resizedPath}"`), 1500);
}

fetchTodaysImage().catch(console.error);
