import sharp from "sharp";
import fs from "fs";
import path from "path";

async function testImageGeneration() {
  console.log("Testing image generation with text overlay...");
  
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
  
  const fontBuffer = fs.readFileSync(fontPath);
  const fontBase64 = fontBuffer.toString('base64');
  
  const overlayHeight = 160;
  
  // Create SVG with embedded font (same as production code)
  const svgOverlay = `
    <svg width="1024" height="${overlayHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style type="text/css">
          @font-face {
            font-family: 'Roboto';
            src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
            font-weight: normal;
            font-style: normal;
          }
        </style>
      </defs>
      <rect width="1024" height="${overlayHeight}" fill="rgba(0,0,0,0.85)"/>
      <text x="20" y="35" font-family="Roboto" font-size="18" fill="white">100 Years Ago Today</text>
      <text x="20" y="70" font-family="Roboto" font-size="24" font-weight="bold" fill="white">Test Title: November 9, 1925</text>
      <text x="20" y="110" font-family="Roboto" font-size="16" fill="white">r/100yearsago • Test timestamp</text>
      <text x="20" y="140" font-family="Roboto" font-size="14" fill="#cccccc">Built by Bertrand Reyna-Brainerd</text>
    </svg>
  `;
  
  console.log("\nAttempting Sharp SVG-to-PNG conversion...");
  
  try {
    // Convert SVG to PNG using Sharp (this is where the problem is)
    const textOverlayBuffer = await sharp(Buffer.from(svgOverlay))
      .png()
      .toBuffer();
    
    console.log("✅ SVG converted to PNG");
    
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
    const outputPath = path.join(process.cwd(), 'test-output.jpg');
    fs.writeFileSync(outputPath, finalImage);
    
    console.log(`\n✅ Test image saved to: ${outputPath}`);
    console.log("\nPlease open test-output.jpg to verify if text is rendered correctly.");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

testImageGeneration().catch(console.error);
