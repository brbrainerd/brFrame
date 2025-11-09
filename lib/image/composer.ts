import sharp from "sharp";
import { formatInTimeZone } from "date-fns-tz";
import { createCanvas, GlobalFonts, SKRSContext2D } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";

import { createLogger } from "../logger";

const logger = createLogger({ module: "image-composer" });

// Register font
const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
if (fs.existsSync(fontPath)) {
  GlobalFonts.registerFromPath(fontPath, "Roboto");
  logger.debug("Font registered", { fontPath });
} else {
  logger.warn("Font file not found", { fontPath });
}

export interface ImageComposerOptions {
  image: Buffer;
  title: string;
  subreddit: string;
  generatedAt: Date;
  timezone?: string;
  attribution?: string;
  credits?: string;
  maxTitleLength?: number;
  overlayHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  quality?: number;
  fontFamily?: string;
}

export interface ImageComposerResult {
  finalImage: Buffer;
  processedMetadata: {
    width: number;
    height: number;
    overlayHeight: number;
  };
}

const DEFAULTS = {
  timezone: "America/New_York",
  attribution: "100 Years Ago Today",
  credits: "Built by Bertrand Reyna-Brainerd",
  maxTitleLength: 80,
  overlayHeight: 160,
  outputWidth: 1024,
  outputHeight: 768,
  quality: 90,
  fontFamily: "sans-serif",
} as const;

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function composeHistoricalImage(
  options: ImageComposerOptions,
): Promise<ImageComposerResult> {
  const {
    image,
    title,
    subreddit,
    generatedAt,
    timezone = DEFAULTS.timezone,
    attribution = DEFAULTS.attribution,
    credits = DEFAULTS.credits,
    maxTitleLength = DEFAULTS.maxTitleLength,
    overlayHeight = DEFAULTS.overlayHeight,
    outputWidth = DEFAULTS.outputWidth,
    outputHeight = DEFAULTS.outputHeight,
    quality = DEFAULTS.quality,
    fontFamily = DEFAULTS.fontFamily,
  } = options;

  logger.debug("Starting image composition", { titleLength: title.length });

  const metadata = await sharp(image).metadata();
  logger.debug("Image metadata retrieved", {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  });

  const processedImage = await sharp(image)
    .resize(outputWidth, outputHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0 },
      position: "center",
    })
    .jpeg({ quality })
    .toBuffer();

  logger.debug("Image resized with contain - full image visible");

  const timestamp = formatInTimeZone(
    generatedAt,
    timezone,
    "MMMM d, yyyy h:mm a z",
  );
  const displayTitle =
    title.length > maxTitleLength
      ? `${title.slice(0, maxTitleLength)}...`
      : title;

  // Create canvas overlay with text
  const canvas = createCanvas(outputWidth, overlayHeight);
  const ctx = canvas.getContext("2d");

  // Draw semi-transparent background
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, outputWidth, overlayHeight);

  // Draw text
  ctx.fillStyle = "white";
  ctx.font = "18px Roboto";
  ctx.fillText(attribution, 20, 35);

  ctx.font = "bold 24px Roboto";
  ctx.fillText(displayTitle, 20, 70);

  ctx.font = "16px Roboto";
  ctx.fillText(`r/${subreddit} • ${timestamp}`, 20, 110);

  ctx.fillStyle = "#cccccc";
  ctx.font = "14px Roboto";
  ctx.fillText(credits, 20, 140);

  const overlayBuffer = canvas.toBuffer("image/png");
  
  logger.debug("Canvas overlay created", {
    bufferSize: overlayBuffer.length,
    dimensions: { width: outputWidth, height: overlayHeight },
  });

  const finalImage = await sharp(processedImage)
    .composite([
      {
        input: overlayBuffer,
        top: outputHeight - overlayHeight,
        left: 0,
      },
    ])
    .jpeg({ quality })
    .toBuffer();

  logger.debug("Image composition complete", {
    finalSize: finalImage.length,
    overlayHeight,
  });

  return {
    finalImage,
    processedMetadata: {
      width: outputWidth,
      height: outputHeight,
      overlayHeight,
    },
  };
}

