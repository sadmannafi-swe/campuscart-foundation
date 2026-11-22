import { afterEach, describe, expect, it, vi } from "vitest";
import { getGmailConfig, sendGmail } from "./gmail";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Gmail sender", () => {
  it("is disabled until all secrets are set", () => {
    vi.stubEnv("GMAIL_CLIENT_ID", "id");
    vi.stubEnv("GMAIL_CLIENT_SECRET", "");
    expect(getGmailConfig()).toBeNull();
  });

  it("refreshes an access token and posts a raw MIME message", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return url.includes("oauth2")
          ? Response.json({ access_token: "tok", expires_in: 3600 })
          : Response.json({ id: "msg-1" });
      }),
    );
    const id = await sendGmail(
      {
        clientId: "c",
        clientSecret: "s",
        refreshToken: "r",
        sender: "shop@gmail.com",
        senderName: "CampusCart",
      },
      "seller@gmail.com",
      { subject: "New order ৳", html: "<p>hi</p>", text: "hi" },
    );
    expect(id).toBe("msg-1");
    expect(calls[0]!.url).toBe("https://oauth2.googleapis.com/token");
    expect(String(calls[0]!.init.body)).toContain("grant_type=refresh_token");
    expect(calls[1]!.url).toContain("/gmail/v1/users/me/messages/send");
    expect((calls[1]!.init.headers as Record<string, string>)["authorization"]).toBe("Bearer tok");
    const raw = JSON.parse(String(calls[1]!.init.body)).raw as string;
    const mime = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    expect(mime).toContain("To: <seller@gmail.com>");
    expect(mime).toContain("From: CampusCart <shop@gmail.com>");
  });

  it("surfaces Gmail API errors so the outbox can retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("oauth2")
          ? Response.json({ access_token: "tok2", expires_in: 3600 })
          : Response.json({ error: { message: "Invalid To header" } }, { status: 400 }),
      ),
    );
    await expect(
      sendGmail(
        {
          clientId: "c2",
          clientSecret: "s",
          refreshToken: "r",
          sender: "shop@gmail.com",
          senderName: "CC",
        },
        "seller@gmail.com",
        { subject: "x", html: "x", text: "x" },
      ),
    ).rejects.toThrow("Gmail send failed (400): Invalid To header");
  });
});
