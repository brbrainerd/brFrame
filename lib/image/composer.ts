import sharp from "sharp";
import { formatInTimeZone } from "date-fns-tz";
import { createCanvas } from "canvas";
import { logger } from "../logger";

export interface ComposedImage {
  finalImage: Buffer;
  overlaySvg: string;
  processedMetadata: {
    width: number;
    height: number;
    overlayHeight: number;
  };
}

export async function composeHistoricalImage(params: {
  image: Buffer;
  title: string;
  subreddit: string;
  generatedAt: Date;
}): Promise<ComposedImage> {
  const { image: imageBuffer, title } = params;
  logger.debug("Starting image composition");

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  logger.debug("Image metadata retrieved", {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  });

  // Resize and process image with contain (no cropping)
  const processedImage = await sharp(imageBuffer)
    .resize(1024, 768, {
      fit: "contain", // Fit entire image without cropping
      background: { r: 0, g: 0, b: 0 }, // Black letterbox bars
      position: "center", // Center the image
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  logger.debug("Image resized with contain mode - full image visible");

  // Create text overlay
  const now = new Date();
  const estTime = formatInTimeZone(
    now,
    "America/New_York",
    "MMMM d, yyyy h:mm a z",
  );

  const attribution = "100 Years Ago Today";
  const credits = "Built by Bertrand Reyna-Brainerd";

  // Truncate title if too long
  const maxTitleLength = 80;
  const displayTitle =
    title.length > maxTitleLength
      ? title.substring(0, maxTitleLength) + "..."
      : title;

  const overlayHeight = 160;

  // Create canvas for text overlay
  const canvas = createCanvas(1024, overlayHeight);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
  ctx.fillRect(0, 0, 1024, overlayHeight);

  // Text styling
  ctx.fillStyle = "white";

  // Attribution
  ctx.font = "18px Arial";
  ctx.fillText(attribution, 20, 35);

  // Title
  ctx.font = "bold 24px Arial";
  ctx.fillText(displayTitle, 20, 70);

  // Time and subreddit
  ctx.font = "16px Arial";
  ctx.fillText(`r/100yearsago • ${estTime}`, 20, 110);

  // Credits
  ctx.font = "14px Arial";
  ctx.fillStyle = "#cccccc";
  ctx.fillText(credits, 20, 140);

  // Convert canvas to buffer
  const overlayBuffer = canvas.toBuffer("image/png");

  // Composite the overlay onto the processed image
  const finalImage = await sharp(processedImage)
    .composite([
      {
        input: overlayBuffer,
        top: 768 - overlayHeight,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  logger.debug("Image composition complete", {
    finalSize: finalImage.length,
    overlayHeight,
  });

  return {
    finalImage,
    overlaySvg: "<svg />", // Placeholder for compatibility
    processedMetadata: {
      width: 1024,
      height: 768,
      overlayHeight,
    },
  };
}
