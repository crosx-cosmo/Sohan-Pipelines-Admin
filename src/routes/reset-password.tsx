import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "Choose a new password for your SOHAN PIPELINES admin account.",
      },
      { property: "og:title", content: "Reset password — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Choose a new password for your SOHAN PIPELINES admin account.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      setMsg("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    setMsg(error ? error.message : "Password updated. You can now open the dashboard.");
  };
  return (
    <form
      onSubmit={submit}
      className="surface-panel mx-auto mt-10 max-w-sm space-y-4 rounded-2xl p-6"
    >
      <h1 className="text-lg font-semibold">Set a new password</h1>
      <div className="space-y-2">
        <Label htmlFor="new-pw">New password</Label>
        <Input id="new-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Button type="submit" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Save password
      </Button>
    </form>
  );
}
