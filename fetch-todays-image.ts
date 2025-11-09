import { fetchHistoricalRedditPost } from "./lib/reddit/service";
import sharp from "sharp";
import fs from "fs";
import path from "path";

async function fetchTodaysImage() {
  console.log("Fetching today's historical Reddit post...\n");

  // Use the production code to get today's post
  const post = await fetchHistoricalRedditPost();

  console.log("Selected post:");
  console.log(`  Title: ${post.title}`);
  console.log(`  Score: ${post.score} upvotes`);
  console.log(`  Match type: ${post.matchType}`);
  console.log(`  Image URL: ${post.imageUrl}`);
  console.log(`  Reddit link: ${post.permalink}\n`);

  // Download the image
  console.log("Downloading image...");
  const response = await fetch(post.imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // Get metadata
  const metadata = await sharp(imageBuffer).metadata();
  console.log("Image properties:");
  console.log(`  Format: ${metadata.format}`);
  console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
  console.log(
    `  Aspect ratio: ${((metadata.width || 1) / (metadata.height || 1)).toFixed(2)}`,
  );
  console.log(`  Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`  Color space: ${metadata.space}`);
  console.log(`  Has alpha: ${metadata.hasAlpha}\n`);

  // Calculate what will happen with resize
  const targetWidth = 1024;
  const targetHeight = 768;
  const imageAspect = (metadata.width || 1) / (metadata.height || 1);
  const targetAspect = targetWidth / targetHeight;

  console.log("Resize calculation:");
  console.log(
    `  Target: ${targetWidth}x${targetHeight} (${targetAspect.toFixed(2)})`,
  );
  console.log(`  Image aspect: ${imageAspect.toFixed(2)}`);

  if (imageAspect > targetAspect) {
    console.log(
      `  Result: Image is WIDER - will have BLACK BARS on TOP/BOTTOM`,
    );
  } else if (imageAspect < targetAspect) {
    console.log(
      `  Result: Image is TALLER - will have BLACK BARS on LEFT/RIGHT`,
    );
  } else {
    console.log(`  Result: Perfect fit - no black bars needed`);
  }

  // Save original
  const tempDir = "C:\\Users\\iacch\\AppData\\Local\\Temp\\brFrame";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const originalPath = path.join(tempDir, "original-from-reddit.jpg");
  fs.writeFileSync(originalPath, imageBuffer);
  console.log(`\nOriginal saved to: ${originalPath}`);

  // Create the resized version
  const resizedBuffer = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0 },
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const resizedPath = path.join(tempDir, "resized-1024x768.jpg");
  fs.writeFileSync(resizedPath, resizedBuffer);
  console.log(`Resized saved to: ${resizedPath}`);

  // Open both images
  console.log("\nOpening images...");
  const { exec } = require("child_process");
  exec(`"${originalPath}"`);
  setTimeout(() => exec(`"${resizedPath}"`), 1000);

  console.log("\nYou should see:");
  console.log("1. The original Reddit image");
  console.log(
    "2. How it will look resized to 1024x768 (what gets sent to frame)",
  );
}

fetchTodaysImage().catch(console.error);
