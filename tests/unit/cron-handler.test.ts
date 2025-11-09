import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockFetch } from "../setup";

import { createCronHandler } from "../../app/api/cron/route";

const fetchHistoricalRedditPostMock = vi.fn();
const composeHistoricalImageMock = vi.fn();
const sendEmailMock = vi.fn();

const buildHandler = () =>
  createCronHandler({
    fetchHistoricalPost: fetchHistoricalRedditPostMock,
    composeImage: composeHistoricalImageMock,
    sendEmail: sendEmailMock,
    fetchImpl: mockFetch as unknown as typeof fetch,
  });

describe("/api/cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchHistoricalRedditPostMock.mockReset();
    composeHistoricalImageMock.mockReset();
    sendEmailMock.mockReset();
    mockFetch.mockReset();
  });

  it("returns 401 when authorization header missing", async () => {
    const handler = createCronHandler();
    const request = new Request("http://localhost/api/cron");
    const response = await handler(request as any);
    expect(response.status).toBe(401);
  });

  it("returns 401 when authorization header invalid", async () => {
    const handler = createCronHandler();
    const request = new Request("http://localhost/api/cron", {
      headers: { authorization: "Bearer invalid" },
    });
    const response = await handler(request as any);
    expect(response.status).toBe(401);
  });

  it("orchestrates the pipeline successfully", async () => {
    const handler = buildHandler();
    fetchHistoricalRedditPostMock.mockResolvedValue({
      title: "[November 9, 1925] Test Post",
      imageUrl: "https://example.com/test.jpg",
      score: 123,
      permalink: "https://reddit.com/r/test",
      matchType: "exact",
    });
    composeHistoricalImageMock.mockResolvedValue({
      finalImage: Buffer.from("processed"),
      overlaySvg: "<svg />",
      processedMetadata: {},
    });
    sendEmailMock.mockResolvedValue({ provider: "resend", id: "email-123" });
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response);

    const request = new Request("http://localhost/api/cron", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    const response = await handler(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      provider: "resend",
      id: "email-123",
      matchType: "exact",
    });
    expect(fetchHistoricalRedditPostMock).toHaveBeenCalled();
    expect(composeHistoricalImageMock).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Test Post"),
      }),
    );
  });

  it("handles image download failures", async () => {
    const handler = buildHandler();
    fetchHistoricalRedditPostMock.mockResolvedValue({
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

    const request = new Request("http://localhost/api/cron", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    const response = await handler(request as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Image download failed");
  });

  it("propagates upstream service errors", async () => {
    const handler = buildHandler();
    fetchHistoricalRedditPostMock.mockRejectedValue(
      new Error("Reddit unavailable"),
    );

    const request = new Request("http://localhost/api/cron", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    const response = await handler(request as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Reddit unavailable");
  });
});
