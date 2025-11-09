import { describe, expect, it, vi } from "vitest";

import type { CronConfig } from "../../lib/config/cron";
import type { Logger } from "../../lib/logger";
import { __test__, createRedditService } from "../../lib/reddit/service";

const TEST_CONFIG: CronConfig = {
  security: { cronSecret: "secret" },
  reddit: {
    clientId: "client",
    clientSecret: "secret",
    subreddit: "100yearsago",
  },
  email: {
    frameEmail: "frame@example.com",
    resend: { apiKey: "key", fromEmail: "from@example.com" },
  },
};

const createTestLogger = () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => logger,
  } as unknown as Logger;
  return logger;
};

const createFetchStub = (posts: Array<Record<string, unknown>>) => {
  const oauthResponse = new Response(
    JSON.stringify({ access_token: "token" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );

  const listingResponse = new Response(
    JSON.stringify({
      data: {
        children: posts.map((post) => ({ data: post })),
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof URL ? input.toString() : String(input);
    if (url.includes("access_token")) {
      return oauthResponse.clone();
    }
    if (url.includes("oauth.reddit.com")) {
      return listingResponse.clone();
    }
    return new Response(null, { status: 404 });
  });
};

describe("reddit service", () => {
  const referenceNow = () => new Date("2025-11-09T08:00:00Z");

  const createService = (posts: Array<Record<string, unknown>>) => {
    const fetchStub = createFetchStub(posts);
    const service = createRedditService({
      fetchImpl: fetchStub,
      now: referenceNow,
      config: TEST_CONFIG,
      logger: createTestLogger(),
    });
    return { service, fetchStub };
  };

  it("exposes date suffix helper", () => {
    expect(__test__.getDaySuffix(1)).toBe("st");
    expect(__test__.getDaySuffix(11)).toBe("th");
  });

  it("selects the highest scoring exact match", async () => {
    const posts = [
      {
        id: "1",
        title: "[November 9, 1925] A",
        url: "https://example.com/a.jpg",
        score: 100,
        permalink: "/r/test/1",
      },
      {
        id: "2",
        title: "[November 9, 1925] B",
        url: "https://example.com/b.jpg",
        score: 200,
        permalink: "/r/test/2",
      },
    ];

    const { service } = createService(posts);
    const result = await service.fetchHistoricalPost();

    expect(result.title).toContain("B");
    expect(result.matchType).toBe("exact");
  });

  it("falls back to nearby days", async () => {
    const posts = [
      {
        id: "10",
        title: "[November 8, 1925] Previous",
        url: "https://example.com/prev.jpg",
        score: 90,
        permalink: "/r/test/10",
      },
    ];

    const { service } = createService(posts);
    const result = await service.fetchHistoricalPost();

    expect(result.matchType).toBe("day-offset");
  });

  it("throws when no posts match", async () => {
    const posts = [
      {
        id: "irrelevant",
        title: "[October 1, 1925]",
        url: "https://example.com/irrelevant.jpg",
        score: 1,
        permalink: "/r/test/irrelevant",
      },
    ];

    const { service } = createService(posts);
    await expect(service.fetchHistoricalPost()).rejects.toThrow(/No posts/);
  });
});
