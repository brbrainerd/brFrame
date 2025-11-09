import { Resend } from "resend";
import nodemailer from "nodemailer";

import type { CronConfig } from "../config/cron";
import { cronConfig } from "../config/cron";
import { createLogger, type Logger } from "../logger";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailRequest {
  subject: string;
  html: string;
  text?: string;
  to?: string;
  fromName?: string;
  attachments?: EmailAttachment[];
}

export interface EmailDispatchResult {
  provider: "resend" | "gmail";
  id: string | null;
}

export interface EmailDispatcherDependencies {
  config?: CronConfig["email"];
  resendFactory?: (apiKey: string) => Resend;
  transporterFactory?: (options: {
    user: string;
    pass: string;
  }) => nodemailer.Transporter;
  logger?: Logger;
}

const DEFAULT_FROM_NAME = "100 Years Ago Today";

export function createEmailDispatcher(deps: EmailDispatcherDependencies = {}) {
  const config = deps.config ?? cronConfig.email;
  const serviceLogger =
    deps.logger ?? createLogger({ module: "email-dispatcher" });

  const createResendClient = (apiKey: string) => {
    const factory = deps.resendFactory ?? ((key: string) => new Resend(key));
    return factory(apiKey);
  };

  const createTransporter = (options: { user: string; pass: string }) => {
    const factory =
      deps.transporterFactory ??
      ((credentials: { user: string; pass: string }) =>
        nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: credentials.user,
            pass: credentials.pass,
          },
        }));
    return factory(options);
  };

  async function sendEmail(
    request: EmailRequest,
  ): Promise<EmailDispatchResult> {
    const { subject, html, text, attachments = [], fromName, to } = request;
    const recipient = to ?? config.frameEmail;
    const displayName = fromName ?? DEFAULT_FROM_NAME;

    const provider = config.gmail ? "gmail" : "resend";

    serviceLogger.debug("Dispatching email", {
      subjectLength: subject.length,
      attachmentCount: attachments.length,
      provider,
      recipient,
    });

    if (config.gmail) {
      const gmailConfig = config.gmail;
      if (!gmailConfig) {
        throw new Error("Gmail configuration missing");
      }

      const transporter = createTransporter({
        user: gmailConfig.user,
        pass: gmailConfig.appPassword,
      });

      const info = await transporter.sendMail({
        from: `"${displayName}" <${gmailConfig.user}>`,
        to: recipient,
        subject,
        html,
        text,
        attachments,
      });

      serviceLogger.info("Email sent via Gmail", {
        messageId: info?.messageId ?? null,
      });
      return { provider: "gmail", id: info?.messageId ?? null };
    }

    const resendConfig = config.resend;
    if (!resendConfig) {
      throw new Error("Resend configuration missing");
    }

    const resend = createResendClient(resendConfig.apiKey);
    const { data, error } = await resend.emails.send({
      from: `${displayName} <${resendConfig.fromEmail}>`,
      to: [recipient],
      subject,
      html,
      text,
      attachments,
    });

    if (error) {
      serviceLogger.error("Resend send failed", { message: error.message });
      throw new Error(`Resend Error: ${error.message}`);
    }

    serviceLogger.info("Email sent via Resend", { id: data?.id ?? null });
    return { provider: "resend", id: data?.id ?? null };
  }

  return {
    sendEmail,
  };
}

export const emailDispatcher = createEmailDispatcher();

export const sendEmail = (request: EmailRequest) =>
  emailDispatcher.sendEmail(request);
