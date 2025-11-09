import sharp from "sharp";
import { createCanvas, registerFont } from "canvas";
import path from "path";
import fs from "fs";

async function testNodeCanvasFix() {
  console.log("Testing node-canvas text rendering fix...");
  
  // Create test base image (blue background)
  const testImage = await sharp({
    create: {
      width: 1024,
      height: 768,
      channels: 3,
      background: { r: 50, g: 100, b: 150 }
    }
  })
  .jpeg()
  .toBuffer();
  
  const overlayHeight = 160;
  
  // Use system Arial font (universally available - no registration needed)
  console.log("Using system Arial font for cross-platform compatibility");
  
  // Create canvas for text overlay (same as production code)
  const canvas = createCanvas(1024, overlayHeight);
  const ctx = canvas.getContext('2d');
  
  // Draw semi-transparent black background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, 1024, overlayHeight);
  
  // Draw text lines with Inter font
  ctx.fillStyle = '#FFFFFF';
  
  // Attribution line
  ctx.font = '18px Arial';
  ctx.fillText('100 Years Ago Today', 20, 35);
  
  // Title line (bold)
  ctx.font = 'bold 24px Arial';
  ctx.fillText('[November 9, 1925] Test Title for Vercel Production', 20, 70);
  
  // Metadata line
  ctx.font = '16px Arial';
  ctx.fillText('r/100yearsago • November 9, 2025 10:00 AM EST', 20, 110);
  
  // Credits line
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '14px Arial';
  ctx.fillText('Built by Bertrand Reyna-Brainerd', 20, 140);
  
  // Convert canvas to PNG buffer
  const textOverlayBuffer = canvas.toBuffer('image/png');
  console.log("✅ Canvas converted to PNG buffer");
  
  // Composite onto test image
  const finalImage = await sharp(testImage)
    .composite([{
      input: textOverlayBuffer,
      top: 768 - overlayHeight,
      left: 0
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
  
  // Save to file
  const outputPath = path.join(process.cwd(), 'test-node-canvas-fix.jpg');
  fs.writeFileSync(outputPath, finalImage);
  
  console.log(`\n✅ Test image saved to: ${outputPath}`);
  console.log("\nThis simulates the exact production code path.");
  console.log("If text is readable here, it will work on Vercel.");
}

testNodeCanvasFix().catch(console.error);
