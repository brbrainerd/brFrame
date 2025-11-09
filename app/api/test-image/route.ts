import { NextResponse } from "next/server";
import { fetchHistoricalRedditPost } from "../../../lib/reddit/service";
import { composeHistoricalImage } from "../../../lib/image/composer";

export async function GET() {
  try {
    // Fetch a post
    const redditPost = await fetchHistoricalRedditPost();

    // Download the image
    const imageResponse = await fetch(redditPost.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Image download failed: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Compose the image with text overlay
    const composedImage = await composeHistoricalImage({
      image: imageBuffer,
      title: redditPost.title,
      subreddit: "100yearsago",
      generatedAt: new Date(),
    });

    // Return the image directly
    return new NextResponse(composedImage.finalImage as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'inline; filename="test-image.jpg"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

