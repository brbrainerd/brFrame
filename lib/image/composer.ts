import sharp from "sharp";
import { formatInTimeZone } from "date-fns-tz";

import { createLogger } from "../logger";

const logger = createLogger({ module: "image-composer" });

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
  overlaySvg: string;
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

  const overlaySvg = `
    <svg width="${outputWidth}" height="${overlayHeight}">
      <rect width="${outputWidth}" height="${overlayHeight}" fill="rgba(0,0,0,0.85)"/>
      <text x="20" y="35" font-family="${fontFamily}" font-size="18" fill="white">${escapeXml(attribution)}</text>
      <text x="20" y="70" font-family="${fontFamily}" font-size="24" font-weight="bold" fill="white">${escapeXml(displayTitle)}</text>
      <text x="20" y="110" font-family="${fontFamily}" font-size="16" fill="white">r/${escapeXml(subreddit)} • ${escapeXml(timestamp)}</text>
      <text x="20" y="140" font-family="${fontFamily}" font-size="14" fill="#cccccc">${escapeXml(credits)}</text>
    </svg>
  `;

  logger.debug("SVG overlay content", {
    svgLength: overlaySvg.length,
    svgPreview: overlaySvg.slice(0, 200),
    fontFamily: fontFamily,
  });

  logger.debug("Sharp version info", {
    versions: sharp.versions,
  });

  let overlayBuffer: Buffer;
  try {
    overlayBuffer = await sharp(Buffer.from(overlaySvg)).png().toBuffer();
    logger.debug("SVG to PNG conversion successful", {
      bufferSize: overlayBuffer.length,
    });
  } catch (error) {
    logger.error("SVG to PNG conversion failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      svgContent: overlaySvg,
    });
    throw error;
  }

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
    overlaySvg,
    processedMetadata: {
      width: outputWidth,
      height: outputHeight,
      overlayHeight,
    },
  };
}

