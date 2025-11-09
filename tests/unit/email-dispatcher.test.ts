import { describe, expect, it, vi } from "vitest";

import type { CronConfig } from "../../lib/config/cron";
import { createEmailDispatcher } from "../../lib/email/dispatcher";

const resendConfig: CronConfig["email"] = {
  frameEmail: "frame@example.com",
  resend: {
    apiKey: "resend-key",
    fromEmail: "from@example.com",
  },
};

const gmailConfig: CronConfig["email"] = {
  frameEmail: "frame@example.com",
  gmail: {
    user: "frame@example.com",
    appPassword: "app-pass",
  },
  resend: undefined,
};

describe("email dispatcher", () => {
  it("sends via Resend", async () => {
    const sendMock = vi
      .fn()
      .mockResolvedValue({ data: { id: "resend_1" }, error: null });
    const dispatcher = createEmailDispatcher({
      config: resendConfig,
      resendFactory: () => ({ emails: { send: sendMock } }) as any,
    });

    const result = await dispatcher.sendEmail({
      subject: "Daily",
      html: "<p>Hello</p>",
      attachments: [{ filename: "daily.jpg", content: Buffer.from("img") }],
    });

    expect(result).toEqual({ provider: "resend", id: "resend_1" });
    expect(sendMock).toHaveBeenCalled();
  });

  it("sends via Gmail", async () => {
    const sendMailMock = vi.fn().mockResolvedValue({ messageId: "<gmail>" });
    const dispatcher = createEmailDispatcher({
      config: gmailConfig,
      transporterFactory: () => ({ sendMail: sendMailMock }) as any,
    });

    const result = await dispatcher.sendEmail({
      subject: "Daily",
      html: "<p>Hello</p>",
    });

    expect(sendMailMock).toHaveBeenCalled();
    expect(result).toEqual({ provider: "gmail", id: "<gmail>" });
  });
});
