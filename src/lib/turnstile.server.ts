type Verification = { success?: boolean; hostname?: string; action?: string };

export async function verifyTurnstile(
  token: string,
  secret: string,
  hostname: string,
  request: typeof fetch = fetch,
) {
  if (!token || token.length > 2048 || !secret || !hostname) return false;
  try {
    const response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as Verification;
    return result.success === true && result.hostname === hostname && result.action === "admin_login";
  } catch {
    return false;
  }
}