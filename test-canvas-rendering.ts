import sharp from "sharp";
import fs from "fs";
import path from "path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

async function testCanvasRendering() {
  console.log("Testing Canvas-based text rendering...");
  
  // Create a simple test image (blue rectangle)
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
  
  // Load font
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
  console.log(`Font path: ${fontPath}`);
  console.log(`Font exists: ${fs.existsSync(fontPath)}`);
  
  GlobalFonts.registerFromPath(fontPath, 'Roboto');
  console.log("✅ Font registered with Canvas");
  
  const overlayHeight = 160;
  
  // Create canvas overlay
  const canvas = createCanvas(1024, overlayHeight);
  const ctx = canvas.getContext('2d');
  
  // Draw semi-transparent black background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, 1024, overlayHeight);
  
  // Draw text lines
  ctx.fillStyle = 'white';
  ctx.font = '18px Roboto';
  ctx.fillText('100 Years Ago Today', 20, 35);
  
  ctx.font = 'bold 24px Roboto';
  ctx.fillText('Test Title: November 9, 1925', 20, 70);
  
  ctx.font = '16px Roboto';
  ctx.fillText('r/100yearsago • Test timestamp', 20, 110);
  
  ctx.fillStyle = '#cccccc';
  ctx.font = '14px Roboto';
  ctx.fillText('Built by Bertrand Reyna-Brainerd', 20, 140);
  
  // Convert canvas to buffer
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
  const outputPath = path.join(process.cwd(), 'test-canvas-output.jpg');
  fs.writeFileSync(outputPath, finalImage);
  
  console.log(`\n✅ Test image saved to: ${outputPath}`);
  console.log("\nPlease verify the text is rendered correctly.");
}

testCanvasRendering().catch(console.error);
