import { describe, expect, it } from "vitest";
import { verifyTurnstile } from "./turnstile.server";
import { loginSchema } from "./login-schema";

const respond = (result: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(result), { status })) as typeof fetch;

describe("admin login security", () => {
  it("requires a CAPTCHA token even with valid credentials", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "valid-password", captchaToken: "" }).success).toBe(false);
  });
  it("rejects missing server secret", async () => {
    expect(await verifyTurnstile("token", "", "example.com", respond({ success: true }))).toBe(false);
  });
  it("rejects provider failure", async () => {
    expect(await verifyTurnstile("token", "test-only", "example.com", respond({ success: false }))).toBe(false);
  });
  it("rejects a token issued for another hostname", async () => {
    expect(await verifyTurnstile("token", "test-only", "example.com", respond({ success: true, hostname: "other.example", action: "admin_login" }))).toBe(false);
  });
  it("rejects a token issued for another action", async () => {
    expect(await verifyTurnstile("token", "test-only", "example.com", respond({ success: true, hostname: "example.com", action: "other" }))).toBe(false);
  });
  it("allows only a verified login token for this hostname", async () => {
    expect(await verifyTurnstile("token", "test-only", "example.com", respond({ success: true, hostname: "example.com", action: "admin_login" }))).toBe(true);
  });
  it("fails closed when the provider is unavailable", async () => {
    expect(await verifyTurnstile("token", "test-only", "example.com", respond({}, 503))).toBe(false);
  });
});