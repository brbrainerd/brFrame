import sharp from "sharp";
import fs from "fs";

async function testContain() {
  console.log("Testing Sharp resize with fit: 'contain'...");

  // Download a sample tall image (portrait)
  const testImageUrl = "https://i.redd.it/mrv3s8tgcuzd1.jpeg";

  console.log("Downloading test image...");
  const response = await fetch(testImageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // Get original dimensions
  const metadata = await sharp(imageBuffer).metadata();
  console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);

  const imageAspect = (metadata.width || 1) / (metadata.height || 1);
  const targetAspect = 1024 / 768;
  console.log(
    `Aspect ratios - Image: ${imageAspect.toFixed(2)}, Target: ${targetAspect.toFixed(2)}`,
  );

  // Resize with contain (same as production code)
  const processedImage = await sharp(imageBuffer)
    .resize(1024, 768, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0 },
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Verify output dimensions
  const outputMetadata = await sharp(processedImage).metadata();
  console.log(
    `Output dimensions: ${outputMetadata.width}x${outputMetadata.height}`,
  );

  // Save to file
  const outputPath = "test-contain-output.jpg";
  fs.writeFileSync(outputPath, processedImage);

  console.log(`\nSaved to: ${outputPath}`);
  console.log(
    "Open this file to verify if the entire image is visible without cropping.",
  );
}

testContain().catch(console.error);
