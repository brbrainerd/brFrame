import { Buffer } from "node:buffer";

import type { CronConfig } from "../config/cron";
import { cronConfig } from "../config/cron";
import { createLogger, type Logger } from "../logger";

const MATCH_STEPS = [
  { label: "exact", daysRange: 0, yearsRange: 0, priority: 1 } as const,
  { label: "day-offset", daysRange: 3, yearsRange: 0, priority: 2 } as const,
  { label: "year-offset", daysRange: 0, yearsRange: 1, priority: 3 } as const,
];

export interface HistoricalRedditPost {
  title: string;
  imageUrl: string;
  score: number;
  permalink: string;
  matchType: (typeof MATCH_STEPS)[number]["label"];
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function buildDateVariants(month: string, day: number, year: number) {
  const suffix = getDaySuffix(day);
  return [
    `[${month} ${day}${suffix}, ${year}]`,
    `[${month} ${day}, ${year}]`,
    `[${month} ${day}${suffix} ${year}]`,
    `[${month} ${day} ${year}]`,
  ];
}

function matchesDate(title: string, month: string, day: number, year: number) {
  return buildDateVariants(month, day, year).some((variant) =>
    title.includes(variant),
  );
}

function evaluateMatch(
  title: string,
  baseDate: Date,
  step: (typeof MATCH_STEPS)[number],
) {
  const month = baseDate.toLocaleString("en-US", { month: "long" });
  const day = baseDate.getDate();
  const year = baseDate.getFullYear();

  if (matchesDate(title, month, day, year)) {
    return { matches: true, priority: step.priority, matchType: step.label };
  }

  if (step.daysRange > 0) {
    for (let offset = 1; offset <= step.daysRange; offset++) {
      const forward = new Date(baseDate);
      forward.setDate(baseDate.getDate() + offset);
      if (
        matchesDate(
          title,
          forward.toLocaleString("en-US", { month: "long" }),
          forward.getDate(),
          year,
        )
      ) {
        return {
          matches: true,
          priority: step.priority,
          matchType: step.label,
        };
      }

      const backward = new Date(baseDate);
      backward.setDate(baseDate.getDate() - offset);
      if (
        matchesDate(
          title,
          backward.toLocaleString("en-US", { month: "long" }),
          backward.getDate(),
          year,
        )
      ) {
        return {
          matches: true,
          priority: step.priority,
          matchType: step.label,
        };
      }
    }
  }

  if (step.yearsRange > 0) {
    for (let offset = 1; offset <= step.yearsRange; offset++) {
      if (matchesDate(title, month, day, year + offset)) {
        return {
          matches: true,
          priority: step.priority,
          matchType: step.label,
        };
      }
      if (matchesDate(title, month, day, year - offset)) {
        return {
          matches: true,
          priority: step.priority,
          matchType: step.label,
        };
      }
    }
  }

  return {
    matches: false,
    priority: Number.MAX_SAFE_INTEGER,
    matchType: step.label,
  };
}

function extractImageFromPost(post: any): string | null {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif"];

  if (post.url) {
    const lower = post.url.toLowerCase();
    if (imageExtensions.some((ext) => lower.endsWith(ext))) {
      return post.url;
    }
  }

  if (post.is_gallery && post.media_metadata) {
    const firstMedia = Object.values(post.media_metadata)[0] as any;
    const galleryUrl = firstMedia?.s?.u;
    if (galleryUrl) {
      return galleryUrl.replace(/&amp;/g, "&");
    }
  }

  const previewUrl = post.preview?.images?.[0]?.source?.url;
  if (previewUrl) {
    return previewUrl.replace(/&amp;/g, "&");
  }

  return null;
}

export interface RedditServiceDependencies {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  config?: CronConfig;
  logger?: Logger;
}

export function createRedditService(deps: RedditServiceDependencies = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const config = deps.config ?? cronConfig;
  const serviceLogger =
    deps.logger ?? createLogger({ module: "reddit-service" });

  async function getAccessToken(): Promise<string> {
    const clientId = config.reddit.clientId.trim();
    const clientSecret = config.reddit.clientSecret.trim();

    serviceLogger.debug("Requesting Reddit OAuth token", {
      hasClientId: !!clientId,
      clientIdLength: clientId.length,
    });

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetchImpl(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "brFrame/1.0.0",
        },
        body: "grant_type=client_credentials",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      serviceLogger.error("Reddit OAuth failed", {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: errorText.slice(0, 200),
      });
      throw new Error(
        `Reddit OAuth failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.access_token;
  }

  async function fetchPosts(accessToken: string) {
    const url = new URL(
      `/r/${config.reddit.subreddit}/hot`,
      "https://oauth.reddit.com",
    );
    url.searchParams.set("limit", "50");

    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "brFrame/1.0.0",
      },
      cache: "no-store" as RequestCache,
    });

    if (!response.ok) {
      const errorText = await response.text();
      serviceLogger.error("Reddit listing failed", {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: errorText.slice(0, 200),
      });
      throw new Error(
        `Reddit API failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = await response.json();
    return payload.data.children.map((child: any) => child.data);
  }

  function selectBestPost(posts: any[]): HistoricalRedditPost {
    const today = now();
    const historicalDate = new Date(today);
    historicalDate.setFullYear(today.getFullYear() - 100);

    for (const step of MATCH_STEPS) {
      const matches = posts
        .map((post) => ({
          post,
          evaluation: evaluateMatch(post.title, historicalDate, step),
          imageUrl: extractImageFromPost(post),
        }))
        .filter(
          (candidate) => candidate.evaluation.matches && candidate.imageUrl,
        );

      if (matches.length > 0) {
        matches.sort((a, b) => {
          if (a.evaluation.priority !== b.evaluation.priority) {
            return a.evaluation.priority - b.evaluation.priority;
          }
          return b.post.score - a.post.score;
        });

        const best = matches[0];
        return {
          title: best.post.title,
          imageUrl: best.imageUrl!,
          score: best.post.score,
          permalink: `https://www.reddit.com${best.post.permalink}`,
          matchType: step.label,
        };
      }
    }

    throw new Error(
      `No posts found for ${config.reddit.subreddit} matching today's historical date (searched exact, ±days, ±years).`,
    );
  }

  async function fetchHistoricalPost(): Promise<HistoricalRedditPost> {
    serviceLogger.info("Fetching posts from Reddit", {
      subreddit: config.reddit.subreddit,
    });
    const accessToken = await getAccessToken();
    const posts = await fetchPosts(accessToken);
    const best = selectBestPost(posts);
    serviceLogger.info("Historical post selected", {
      title: best.title,
      matchType: best.matchType,
      score: best.score,
    });
    return best;
  }

  return {
    fetchHistoricalPost,
  };
}

export const redditService = createRedditService();

export const fetchHistoricalRedditPost = () =>
  redditService.fetchHistoricalPost();

export const __test__ = {
  getDaySuffix,
  buildDateVariants,
  matchesDate,
  evaluateMatch,
  extractImageFromPost,
  MATCH_STEPS,
};
