import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockFetch } from "../setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const redditModulePath = resolve(__dirname, "../../lib/reddit/service.ts");
const imageModulePath = resolve(__dirname, "../../lib/image/composer.ts");
const emailModulePath = resolve(__dirname, "../../lib/email/dispatcher.ts");

vi.doMock(redditModulePath, () => ({
  fetchHistoricalRedditPost: vi.fn(),
}));

vi.doMock(imageModulePath, () => ({
  composeHistoricalImage: vi.fn(),
}));

vi.doMock(emailModulePath, () => ({
  sendEmail: vi.fn(),
}));

const getMocks = async () => {
  const reddit = await import(redditModulePath);
  const image = await import(imageModulePath);
  const email = await import(emailModulePath);
  return {
    fetchHistoricalRedditPost:
      reddit.fetchHistoricalRedditPost as unknown as vi.Mock,
    composeHistoricalImage: image.composeHistoricalImage as unknown as vi.Mock,
    sendEmail: email.sendEmail as unknown as vi.Mock,
  };
};

const importHandler = async () => {
  const module = await import("../../app/api/cron/route");
  return module.GET;
};

describe("/api/cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("returns 401 when authorization header missing", async () => {
    const GET = await importHandler();
    const request = new Request("http://localhost/api/cron");
    const response = await GET(request as any);
    expect(response.status).toBe(401);
  });

  it("returns 401 when authorization header invalid", async () => {
    const GET = await importHandler();
    const request = new Request("http://localhost/api/cron", {
      headers: {
        authorization: "Bearer invalid",
      },
    });
    const response = await GET(request as any);
    expect(response.status).toBe(401);
  });

  it("orchestrates the pipeline successfully", async () => {
    const { fetchHistoricalRedditPost, composeHistoricalImage, sendEmail } =
      await getMocks();
    fetchHistoricalRedditPost.mockResolvedValue({
      title: "[November 9, 1925] Test Post",
      imageUrl: "https://example.com/test.jpg",
      score: 123,
      permalink: "https://reddit.com/r/test",
      matchType: "exact",
    });
    composeHistoricalImage.mockResolvedValue({
      finalImage: Buffer.from("processed"),
      overlaySvg: "<svg />",
      processedMetadata: {},
    });
    sendEmail.mockResolvedValue({ provider: "resend", id: "email-123" });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response);

    const GET = await importHandler();
    const request = new Request("http://localhost/api/cron", {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      provider: "resend",
      id: "email-123",
      matchType: "exact",
    });
    expect(fetchHistoricalRedditPost).toHaveBeenCalled();
    expect(composeHistoricalImage).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Test Post"),
      }),
    );
  });

  it("handles image download failures", async () => {
    const { fetchHistoricalRedditPost } = await getMocks();
    fetchHistoricalRedditPost.mockResolvedValue({
      title: "Failure",
      imageUrl: "https://example.com/fail.jpg",
      score: 1,
      permalink: "https://reddit.com/r/fail",
      matchType: "exact",
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: () => Promise.resolve("gateway error"),
    } as Response);

    const GET = await importHandler();
    const request = new Request("http://localhost/api/cron", {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Image download failed");
  });

  it("propagates upstream service errors", async () => {
    const { fetchHistoricalRedditPost } = await getMocks();
    fetchHistoricalRedditPost.mockRejectedValue(
      new Error("Reddit unavailable"),
    );

    const GET = await importHandler();
    const request = new Request("http://localhost/api/cron", {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const response = await GET(request as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Reddit unavailable");
  });
});
