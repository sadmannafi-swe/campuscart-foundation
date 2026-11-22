import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "./mailer";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("uses SITE_URL in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SITE_URL", "https://campuscart-foundation.vercel.app/");
    vi.stubEnv("VERCEL_URL", "campuscart-abc123.vercel.app");
    expect(siteUrl()).toBe("https://campuscart-foundation.vercel.app");
  });

  it("uses the preview's own URL on Vercel previews, even if SITE_URL is set", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SITE_URL", "https://campuscart-foundation.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "campuscart-git-claude-x.vercel.app");
    vi.stubEnv("VERCEL_URL", "campuscart-abc123.vercel.app");
    expect(siteUrl()).toBe("https://campuscart-git-claude-x.vercel.app");
  });

  it("falls back to the production domain, then localhost", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "campuscart-foundation.vercel.app");
    expect(siteUrl()).toBe("https://campuscart-foundation.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl()).toBe("http://localhost:5173");
  });
});
