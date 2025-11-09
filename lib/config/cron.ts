import { z } from "zod";

// Zod schema for environment validation
const CronEnvSchema = z.object({
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),
  FRAME_EMAIL: z.string().email("FRAME_EMAIL must be a valid email"),
  REDDIT_CLIENT_ID: z.string().min(1, "REDDIT_CLIENT_ID is required"),
  REDDIT_CLIENT_SECRET: z.string().min(1, "REDDIT_CLIENT_SECRET is required"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  GMAIL_USER: z.string().email().optional(),
});

type CronEnv = z.infer<typeof CronEnvSchema>;

export interface CronConfig {
  security: {
    cronSecret: string;
  };
  reddit: {
    subreddit: string;
    clientId: string;
    clientSecret: string;
  };
  email: {
    frameEmail: string;
    resend?: {
      apiKey: string;
      fromEmail: string;
    };
    gmail?: {
      user: string;
      appPassword: string;
    };
  };
}

function mapEnvToConfig(env: CronEnv): CronConfig {
  const config: CronConfig = {
    security: {
      cronSecret: env.CRON_SECRET,
    },
    reddit: {
      subreddit: "100yearsago",
      clientId: env.REDDIT_CLIENT_ID,
      clientSecret: env.REDDIT_CLIENT_SECRET,
    },
    email: {
      frameEmail: env.FRAME_EMAIL,
    },
  };

  // Add Resend config if available
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    config.email.resend = {
      apiKey: env.RESEND_API_KEY,
      fromEmail: env.RESEND_FROM_EMAIL,
    };
  }

  // Add Gmail config if available
  if (env.GMAIL_APP_PASSWORD && env.GMAIL_USER) {
    config.email.gmail = {
      user: env.GMAIL_USER,
      appPassword: env.GMAIL_APP_PASSWORD,
    };
  }

  return config;
}

function parseConfig(): CronConfig {
  try {
    const parsed = CronEnvSchema.parse(process.env);
    return mapEnvToConfig(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "[cron-config] Environment validation failed",
        error.flatten().fieldErrors,
      );
    }
    throw error;
  }
}

function loadCronConfig(): CronConfig {
  return parseConfig();
}

export const cronConfig = loadCronConfig();
