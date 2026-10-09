import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Loader2, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { supabase, BRAND_LOGO_URL } from "@/lib/supabase";
import { loadAll, admin } from "@/lib/mock-data";
import { setAdminPhoto } from "@/lib/admin-photo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Ctx = { version: number; reload: () => Promise<void>; signOut: () => Promise<void> };
const DataCtx = createContext<Ctx>({ version: 0, reload: async () => {}, signOut: async () => {} });
export const useData = () => useContext(DataCtx);

type Phase = "checking" | "signed-out" | "forbidden" | "loading" | "ready" | "error";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setPhase("signed-out");
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setSession(s);
        if (!s) setPhase("signed-out");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setPhase("loading");
      const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (cancelled) return;
      if (roleErr || !isAdmin) {
        setPhase("forbidden");
        return;
      }
      try {
        await loadAll(userId);
        if (cancelled) return;
        if (!admin.email) admin.email = session?.user.email ?? "";
        setAdminPhoto(admin.photo);
        setPhase("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load data");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, session?.user.email]);

  const reload = useCallback(async () => {
    if (!userId) return;
    await loadAll(userId);
    setAdminPhoto(admin.photo);
    setVersion((v) => v + 1);
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPhase("signed-out");
  }, []);

  if (phase === "signed-out") return <SignIn />;
  if (phase === "forbidden")
    return (
      <Centered>
        <h1 className="text-lg font-semibold">No admin access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session?.user.email} is not an admin account.
        </p>
        <Button className="mt-5" variant="outline" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </Centered>
    );
  if (phase === "error")
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Couldn't load your data</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </Centered>
    );
  if (phase !== "ready")
    return (
      <Centered>
        <Loader2 className="mx-auto size-6 animate-spin text-primary" aria-label="Loading" />
        <p className="mt-3 text-sm text-muted-foreground">Loading operations data…</p>
      </Centered>
    );

  return <DataCtx.Provider value={{ version, reload, signOut }}>{children}</DataCtx.Provider>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error)
      setErr(
        error.message === "Invalid login credentials" ? "Wrong email or password." : error.message,
      );
  };
  const reset = async () => {
    setErr("");
    if (!email.trim()) {
      setErr("Enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setErr(error.message);
    else setSent("Password reset link sent. Check your email.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="surface-panel w-full max-w-sm space-y-5 rounded-2xl p-7">
        <div className="flex items-center gap-3">
          <img
            src={BRAND_LOGO_URL}
            alt="SOHAN PIPELINES"
            className="size-11 rounded-xl object-cover ring-1 ring-border"
          />
          <div>
            <p className="font-display text-sm font-semibold">SOHAN PIPELINES</p>
            <p className="text-xs text-muted-foreground">Admin sign in</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
        {sent && <p className="text-sm text-muted-foreground">{sent}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Sign in
        </Button>
        <button
          type="button"
          onClick={reset}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}
