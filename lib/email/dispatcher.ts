import { Resend } from "resend";
import nodemailer from "nodemailer";
import { cronConfig } from "../config/cron";
import { logger } from "../logger";

export interface EmailPayload {
  subject: string;
  html: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export interface EmailResult {
  provider: "resend" | "gmail";
  id: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const { subject, html, attachments } = payload;

  // Use Gmail if configured, otherwise Resend
  if (cronConfig.email.gmail) {
    logger.debug("Sending email via Gmail SMTP");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: cronConfig.email.gmail.user,
        pass: cronConfig.email.gmail.appPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `"100 Years Ago Today" <${cronConfig.email.gmail.user}>`,
      to: cronConfig.email.frameEmail,
      subject,
      html,
      attachments,
    });

    logger.info("Email sent via Gmail", { messageId: info.messageId });

    return {
      provider: "gmail",
      id: info.messageId,
    };
  } else if (cronConfig.email.resend) {
    logger.debug("Sending email via Resend");

    const resend = new Resend(cronConfig.email.resend.apiKey);

    const { data, error } = await resend.emails.send({
      from: `100 Years Ago Today <${cronConfig.email.resend.fromEmail}>`,
      to: [cronConfig.email.frameEmail],
      subject,
      html,
      attachments,
    });

    if (error) {
      logger.error("Resend email failed", { error: error.message });
      throw new Error(`Resend Error: ${error.message}`);
    }

    logger.info("Email sent via Resend", { id: data?.id });

    return {
      provider: "resend",
      id: data?.id || "unknown",
    };
  } else {
    throw new Error("No email provider configured (neither Gmail nor Resend)");
  }
}
