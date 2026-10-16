import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_LOGO_URL, supabase } from "@/lib/supabase";
import { getLoginSecurity, signInWithSecurity } from "@/lib/login.functions";
import { loginSchema } from "@/lib/login-schema";
import { Turnstile } from "./turnstile";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [securityLoading, setSecurityLoading] = useState(true);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const loadSecurity = useServerFn(getLoginSecurity);
  const secureSignIn = useServerFn(signInWithSecurity);

  useEffect(() => {
    let cancelled = false;
    setSecurityLoading(true);
    loadSecurity().then((result) => {
      if (cancelled) return;
      setSiteKey(result.siteKey);
      if (!result.siteKey) setCaptchaError("Security verification is not configured. Contact your administrator.");
    }).catch(() => {
      if (!cancelled) setCaptchaError("Security verification is unavailable. Please retry.");
    }).finally(() => { if (!cancelled) setSecurityLoading(false); });
    return () => { cancelled = true; };
  }, [loadSecurity, attempt]);

  const retrySecurity = () => {
    setCaptchaToken("");
    setCaptchaError("");
    setSiteKey("");
    setAttempt((value) => value + 1);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || resetting) return;
    setError("");
    setNotice("");
    const parsed = loginSchema.safeParse({ email, password, captchaToken });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Check your login details.";
      setError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    try {
      const result = await secureSignIn({ data: parsed.data });
      if (result.error || !result.session) throw new Error(result.error ?? "Unable to sign in.");
      const { error: sessionError } = await supabase.auth.setSession(result.session);
      if (sessionError) throw new Error("Could not finish signing in. Please try again.");
      toast.success("Signed in successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
      retrySecurity();
    }
  };

  const reset = async () => {
    if (busy || resetting) return;
    setError("");
    setNotice("");
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email address first.");
      toast.error("Enter a valid email address first.");
      return;
    }
    setResetting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setNotice("Password reset link sent. Check your email.");
      toast.success("Password reset link sent. Check your email.");
    } catch {
      setError("Could not send the reset link. Please try again shortly.");
      toast.error("Could not send the reset link. Please try again shortly.");
    } finally { setResetting(false); }
  };

  return (
    <div className="login-workspace relative grid min-h-svh grid-rows-[auto_1fr_auto] px-5 py-6 sm:px-10 sm:py-8">
      <header className="flex min-w-0 items-center gap-3">
        <img src={BRAND_LOGO_URL} alt="SOHAN PIPELINES" className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold">SOHAN PIPELINES</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Operations Console</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[440px] flex-col justify-center py-12 sm:py-16">
        <div className="page-enter">
          <div className="mb-6 grid size-12 place-items-center rounded-xl border border-primary/15 bg-primary-soft text-primary"><LockKeyhole className="size-5" /></div>
          <p className="mb-3 text-xs font-semibold uppercase text-primary">Administrator access</p>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to SOHAN PIPELINES.</p>
          <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={busy}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email address</Label>
              <Input id="login-email" type="email" autoComplete="username" placeholder="you@company.com" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy || resetting} className="h-12 bg-card px-3.5 text-base md:text-base" aria-describedby={error ? "login-error" : undefined} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="login-password">Password</Label>
                <Button type="button" variant="link" className="h-auto p-0 text-xs" disabled={busy || resetting} onClick={reset}>{resetting ? <Loader2 className="size-3 animate-spin" /> : null}Forgot password?</Button>
              </div>
              <div className="relative">
                <Input id="login-password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy || resetting} className="h-12 bg-card pl-3.5 pr-12 text-base md:text-base" aria-describedby={error ? "login-error" : undefined} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-10 text-muted-foreground" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((value) => !value)} disabled={busy}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
              </div>
            </div>
            <div className="space-y-2" aria-live="polite">
              {securityLoading ? <div className="flex min-h-[65px] items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading security check…</div> : siteKey ? <Turnstile key={attempt} siteKey={siteKey} onToken={(token) => { setCaptchaToken(token); if (token) setCaptchaError(""); }} onError={setCaptchaError} /> : null}
              {captchaError ? <div><p className="text-xs text-destructive">{captchaError}</p><Button type="button" variant="link" className="h-9 p-0 text-xs" onClick={retrySecurity}>Retry security check</Button></div> : null}
            </div>
            {error ? <p id="login-error" role="alert" className="text-sm leading-5 text-destructive">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
            <Button type="submit" className="h-12 w-full justify-between px-4 text-sm" disabled={busy || resetting || !captchaToken || !!captchaError || securityLoading}>
              <span>{busy ? "Signing in…" : "Sign in"}</span>{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </Button>
          </form>
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 shrink-0" />Secure access · Authorized administrators only</div>
        </div>
      </main>
      <footer className="text-center text-xs text-muted-foreground">SOHAN PIPELINES · Admin Operations</footer>
    </div>
  );
}