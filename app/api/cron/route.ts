import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { cronConfig } from "../../../lib/config/cron";
import { logger } from "../../../lib/logger";
import { fetchHistoricalRedditPost } from "../../../lib/reddit/service";
import { composeHistoricalImage } from "../../../lib/image/composer";
import { sendEmail as sendEmailDefault } from "../../../lib/email/dispatcher";

const SUBREDDIT = cronConfig.reddit.subreddit;

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

function buildEmailHtml(title: string, permalink: string) {
  return [
    "<strong>100 Years Ago Today</strong>",
    "",
    title,
    "",
    `<em>View on Reddit:</em> <a href="${permalink}">${permalink}</a>`,
    "",
    "<em>Built by Bertrand Reyna-Brainerd</em>",
  ].join("<br>");
}

export interface CronHandlerDependencies {
  fetchHistoricalPost?: typeof fetchHistoricalRedditPost;
  composeImage?: typeof composeHistoricalImage;
  sendEmail?: typeof sendEmailDefault;
  fetchImpl?: typeof fetch;
}

export function createCronHandler(deps: CronHandlerDependencies = {}) {
  const fetchHistoricalPost =
    deps.fetchHistoricalPost ?? fetchHistoricalRedditPost;
  const composeImage = deps.composeImage ?? composeHistoricalImage;
  const sendEmail = deps.sendEmail ?? sendEmailDefault;
  const fetchImpl = deps.fetchImpl ?? fetch;

  return async function handler(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronConfig.security.cronSecret}`) {
      logger.warn("Rejected unauthorized cron attempt");
      return unauthorizedResponse();
    }

    const requestId = randomUUID();
    const jobLogger = logger.child({ requestId });

    jobLogger.info("Cron job started", { subreddit: SUBREDDIT });

    try {
      const redditPost = await fetchHistoricalPost();

      jobLogger.info("Historical post selected", {
        title: redditPost.title,
        matchType: redditPost.matchType,
        score: redditPost.score,
      });

      const imageResponse = await fetchImpl(redditPost.imageUrl);
      if (!imageResponse.ok) {
        const bodySnippet = (await imageResponse.text()).slice(0, 200);
        throw new Error(
          `Image download failed: ${imageResponse.status} ${imageResponse.statusText} (${bodySnippet})`,
        );
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const composedImage = await composeImage({
        image: imageBuffer,
        title: redditPost.title,
        subreddit: SUBREDDIT,
        generatedAt: new Date(),
      });

      jobLogger.info("Image composition complete", {
        overlayLength: composedImage.overlaySvg.length,
      });

      const emailResult = await sendEmail({
        subject: `100 Years Ago Today: ${redditPost.title}`,
        html: buildEmailHtml(redditPost.title, redditPost.permalink),
        attachments: [
          {
            filename: "daily-photo.jpg",
            content: composedImage.finalImage,
          },
        ],
      });

      jobLogger.info("Email dispatched successfully", emailResult);

      return NextResponse.json({
        success: true,
        provider: emailResult.provider,
        id: emailResult.id,
        matchType: redditPost.matchType,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      jobLogger.error("Cron job failed", {
        error: message,
      });

      return NextResponse.json(
        { success: false, error: message },
        { status: 500 },
      );
    }
  };
}

export const GET = createCronHandler();
