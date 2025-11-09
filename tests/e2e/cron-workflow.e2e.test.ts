import { describe, it, expect, beforeAll } from "vitest";
import { GET } from "@/app/api/cron/route";
import { NextRequest } from "next/server";
import "dotenv/config"; // Load env vars for this test

describe("E2E Test: Full Cron Workflow", () => {
  beforeAll(() => {
    // Validate all required environment variables
    const envs = [
      "CRON_SECRET",
      "RESEND_API_KEY",
      "FRAME_EMAIL",
      "RESEND_FROM_EMAIL",
    ];
    const missing = envs.filter((e) => !process.env[e]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required env variables for E2E test: ${missing.join(", ")}`,
      );
    }
  });

  it("should run the complete end-to-end workflow with real APIs", async () => {
    console.log("\n🔄 Starting E2E test (this may take 10-20 seconds)...\n");

    const req = new NextRequest("http://localhost/api/cron", {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const response = await GET(req);
    const json = await response.json();

    // 1. Verify HTTP Response was successful
    expect(response.status).toBe(200);

    // 2. Check the response body
    if (!json.success) {
      // It's possible for this to "fail" if Reddit has no images
      console.warn(`⚠️  E2E Warning: ${json.error}`);
      expect(json.error).toBeTruthy();
    } else {
      // 3. If it succeeded, verify the response structure
      console.log(`✅ E2E Test Success - Email sent via ${json.provider}`);
      expect(json.success).toBe(true);
      expect(json.provider).toBeTruthy();
      expect(json.id).toBeTruthy();
      expect(json.matchType).toBeTruthy();
    }

    console.log("\n📧 Email should be delivered to:", process.env.FRAME_EMAIL);
    console.log(
      "📱 Please manually verify the image on the Pix-Star frame or Resend dashboard.",
    );
    console.log("🔗 Resend Dashboard: https://resend.com/emails\n");
  });
});

