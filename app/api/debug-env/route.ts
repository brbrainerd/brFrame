import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Secure this endpoint
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Return environment variable status (not actual values for security)
  const envCheck = {
    REDDIT_CLIENT_ID: {
      exists: !!process.env.REDDIT_CLIENT_ID,
      length: process.env.REDDIT_CLIENT_ID?.length || 0,
      firstChar: process.env.REDDIT_CLIENT_ID?.charAt(0) || 'N/A',
      lastChar: process.env.REDDIT_CLIENT_ID?.charAt(process.env.REDDIT_CLIENT_ID.length - 1) || 'N/A'
    },
    REDDIT_CLIENT_SECRET: {
      exists: !!process.env.REDDIT_CLIENT_SECRET,
      length: process.env.REDDIT_CLIENT_SECRET?.length || 0,
      firstChar: process.env.REDDIT_CLIENT_SECRET?.charAt(0) || 'N/A',
      lastChar: process.env.REDDIT_CLIENT_SECRET?.charAt(process.env.REDDIT_CLIENT_SECRET.length - 1) || 'N/A'
    },
    FRAME_EMAIL: {
      exists: !!process.env.FRAME_EMAIL,
      length: process.env.FRAME_EMAIL?.length || 0,
      firstChar: process.env.FRAME_EMAIL?.charAt(0) || 'N/A',
      lastChar: process.env.FRAME_EMAIL?.charAt(process.env.FRAME_EMAIL.length - 1) || 'N/A'
    },
    RESEND_FROM_EMAIL: {
      exists: !!process.env.RESEND_FROM_EMAIL,
      length: process.env.RESEND_FROM_EMAIL?.length || 0,
      firstChar: process.env.RESEND_FROM_EMAIL?.charAt(0) || 'N/A',
      lastChar: process.env.RESEND_FROM_EMAIL?.charAt(process.env.RESEND_FROM_EMAIL.length - 1) || 'N/A'
    },
    nodeVersion: process.version,
    platform: process.platform
  };

  return NextResponse.json(envCheck);
}
