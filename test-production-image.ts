import { composeHistoricalImage } from "./lib/image/composer";
import fs from "fs";

async function testProductionImage() {
  console.log("Generating exact production image...");

  // Use a real historical image from Reddit
  const testImageUrl = "https://i.redd.it/mrv3s8tgcuzd1.jpeg";

  console.log("Downloading image...");
  const response = await fetch(testImageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  console.log("Composing image with production code...");
  const result = await composeHistoricalImage({
    image: imageBuffer,
    title: "[November 9, 1925] Test historical image for Pix-Star diagnostics",
    subreddit: "100yearsago",
    generatedAt: new Date(),
  });

  // Save the final image
  const outputPath = "production-test-output.jpg";
  fs.writeFileSync(outputPath, result.finalImage);

  console.log(`\nSaved to: ${outputPath}`);
  console.log(
    `Dimensions: ${result.processedMetadata.width}x${result.processedMetadata.height}`,
  );
  console.log(`Overlay height: ${result.processedMetadata.overlayHeight}px`);
  console.log("\nThis is EXACTLY what gets sent to the Pix-Star frame.");
  console.log("Opening in default viewer...");

  // Open the file
  const { exec } = require("child_process");
  exec(`"${outputPath}"`);
}

testProductionImage().catch(console.error);
