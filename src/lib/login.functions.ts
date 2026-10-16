import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { loginSchema } from "./login-schema";

export const getLoginSecurity = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  return { siteKey: process.env["TURNSTILE_SITE_KEY"] ?? "" };
});

export const signInWithSecurity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!secret || !process.env["TURNSTILE_SITE_KEY"]) {
      return { error: "Security verification is not configured. Contact your administrator." };
    }
    const { verifyTurnstile } = await import("./turnstile.server");
    const hostname = new URL(getRequest().url).hostname;
    if (!(await verifyTurnstile(data.captchaToken, secret, hostname))) {
      return { error: "Security check failed or expired. Please try again." };
    }
    // The password exchange happens only after a fresh, single-use CAPTCHA is verified.
    // This client has no persistent state and uses the existing public project key, never admin access.
    const { createClient } = await import("@supabase/supabase-js");
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import("./supabase");
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    try {
      const { data: auth, error } = await client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error || !auth.session) {
        return { error: "Unable to sign in. Check your email and password, then try again." };
      }
      return { session: { access_token: auth.session.access_token, refresh_token: auth.session.refresh_token } };
    } catch {
      return { error: "Sign-in is unavailable right now. Please try again shortly." };
    }
  });