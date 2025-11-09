import { NextResponse } from "next/server";
import sharp from "sharp";

export async function GET() {
  const results: any = {
    sharpVersion: sharp.versions,
    timestamp: new Date().toISOString(),
    tests: [],
  };

  const testFonts = [
    { name: "sans-serif", fontFamily: "sans-serif" },
    { name: "serif", fontFamily: "serif" },
    { name: "monospace", fontFamily: "monospace" },
    { name: "Arial-sans", fontFamily: "Arial, sans-serif" },
    { name: "DejaVu", fontFamily: "DejaVu Sans, sans-serif" },
    { name: "Liberation", fontFamily: "Liberation Sans, sans-serif" },
    { name: "FreeSans", fontFamily: "FreeSans, sans-serif" },
    { name: "Helvetica", fontFamily: "Helvetica, sans-serif" },
  ];

  for (const testFont of testFonts) {
    try {
      const svgContent = `
        <svg width="400" height="100">
          <rect width="400" height="100" fill="rgba(0,0,0,0.85)"/>
          <text x="10" y="30" font-family="${testFont.fontFamily}" font-size="18" fill="white">100 Years Ago Today</text>
          <text x="10" y="60" font-family="${testFont.fontFamily}" font-size="14" fill="#cccccc">Testing: ${testFont.name}</text>
          <text x="10" y="85" font-family="${testFont.fontFamily}" font-size="12" fill="#999999">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</text>
        </svg>
      `;

      const imageBuffer = await sharp(Buffer.from(svgContent))
        .png()
        .toBuffer();

      const base64 = imageBuffer.toString("base64");

      results.tests.push({
        font: testFont.name,
        fontFamily: testFont.fontFamily,
        success: true,
        imageSize: imageBuffer.length,
        base64Preview: `data:image/png;base64,${base64}`,
      });
    } catch (error) {
      results.tests.push({
        font: testFont.name,
        fontFamily: testFont.fontFamily,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(results, { status: 200 });
}

