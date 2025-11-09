import { describe, expect, it, vi } from "vitest";

import { composeHistoricalImage } from "../../lib/image/composer";

const baseBuffer = Buffer.from("raw");
const baseDate = new Date("2025-11-09T08:00:00Z");

vi.mock("sharp", () => {
  const instance = {
    resize: vi.fn().mockReturnThis(),
    flatten: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    metadata: vi
      .fn()
      .mockResolvedValue({ width: 1000, height: 800, format: "jpeg" }),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed")),
  };
  return {
    default: vi.fn(() => instance),
  };
});

describe("image composer", () => {
  it("resizes image and composites overlay", async () => {
    const result = await composeHistoricalImage({
      image: baseBuffer,
      title: "[November 9, 1925] Sample",
      subreddit: "100yearsago",
      generatedAt: baseDate,
    });

    expect(result.finalImage).toBeInstanceOf(Buffer);
    expect(result.overlaySvg).toContain("Sample");
  });

  it("truncates long titles", async () => {
    const longTitle = "[November 9, 1925] " + "Very long title ".repeat(5);
    const result = await composeHistoricalImage({
      image: baseBuffer,
      title: longTitle,
      subreddit: "100yearsago",
      generatedAt: baseDate,
      maxTitleLength: 20,
      overlayHeight: 120,
    });

    expect(result.overlaySvg).toContain("V...");
  });
});
