import { LogOut } from "lucide-react";
import { useData } from "@/components/auth/auth-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleDot, Copy, KeyRound, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { admin, adminSettings } from "@/lib/mock-data";
import { saveSettings } from "@/lib/db";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content:
          "Configure general, appearance, notification, booking, billing, security and API options.",
      },
      { property: "og:title", content: "Settings — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content:
          "Configure general, appearance, notification, booking, billing, security and API options.",
      },
    ],
  }),
  component: SettingsPage,
});

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel settings-panel rounded-xl p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-4 w-1 shrink-0 rounded-full bg-primary" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator className="my-3" />
      <div className="divide-y">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { signOut } = useData();
  const [confirmOut, setConfirmOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const [notif, setNotif] = useState({
    newBooking: true,
    assignment: true,
    lowStock: true,
    payments: true,
    dailyDigest: false,
    sms: true,
    whatsapp: true,
  });
  const [booking, setBooking] = useState({
    autoAssign: true,
    slotMinutes: "60",
    leadHours: [4],
    emergencySurcharge: 250,
    cancellationWindow: "2",
  });
  const [billing, setBilling] = useState({
    gst: 18,
    prefix: `INV-${new Date().getFullYear()}-`,
    upi: "",
    terms: "Payment due within 7 days of invoice date.",
  });
  const [security, setSecurity] = useState({
    twoFactor: true,
    sessionTimeout: "30",
    ipAllowlist: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = adminSettings as {
      booking?: typeof booking;
      billing?: typeof billing;
      security?: typeof security;
      notif?: typeof notif;
    };
    if (saved.booking) setBooking(saved.booking);
    if (saved.billing) setBilling(saved.billing);
    if (saved.security) setSecurity(saved.security);
    if (saved.notif) setNotif(saved.notif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = async (what: string) => {
    setSaving(true);
    try {
      await saveSettings({ booking, billing, security, notif });
      setDirty(false);
      toast.success(`${what} saved`, { description: "Shared across all your devices." });
    } catch (e) {
      toast.error("Couldn't save settings", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Operational preferences for the SOHAN PIPELINES console."
        actions={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
              dirty
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-success/25 bg-success/10 text-success",
            )}
          >
            {dirty ? <CircleDot className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
            {dirty ? "Unsaved changes" : "No pending changes"}
          </span>
        }
      />

      <Tabs defaultValue="general">
        <TabsList className="settings-tabs">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <div
          onInputCapture={() => setDirty(true)}
          onChangeCapture={() => setDirty(true)}
          onClickCapture={(event) => {
            if (
              (event.target as HTMLElement).closest(
                '[role="switch"], button[data-settings-control]',
              )
            )
              setDirty(true);
          }}
        >
          <TabsContent value="general" className="mt-4 space-y-4">
            <Panel title="Business profile" description="Shown to customers and on invoices.">
              <Row title="Business name">
                <Input
                  aria-label="Business name"
                  defaultValue={admin.business.name}
                  onChange={() => setDirty(true)}
                  className="w-56"
                />
              </Row>
              <Row title="Support phone">
                <Input
                  aria-label="Support phone"
                  defaultValue={admin.business.supportPhone}
                  onChange={() => setDirty(true)}
                  className="w-56"
                />
              </Row>
              <Row title="Time zone" description="Used for scheduling and reports.">
                <Select defaultValue="ist">
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ist">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row title="Currency">
                <Select defaultValue="inr">
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </Panel>
            <Button disabled={saving} onClick={() => save("General settings")}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              Save general settings
            </Button>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4 space-y-4">
            <Panel title="Theme" description="Choose how the console looks on this device.">
              <Row
                title="Colour mode"
                description="Light is best for daytime dispatch; dark for night shifts."
              >
                <div className="flex gap-2">
                  {(["light", "dark"] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setTheme(t);
                        setDirty(true);
                      }}
                      className={cn(
                        "h-auto w-28 flex-col items-stretch rounded-lg border p-2 text-left text-xs capitalize transition-all duration-200",
                        theme === t
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-border-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "block h-10 rounded-md border",
                          t === "light"
                            ? "border-neutral-200 bg-white"
                            : "border-neutral-700 bg-neutral-900",
                        )}
                      />
                      <span className="mt-1.5 block font-medium">{t}</span>
                    </Button>
                  ))}
                </div>
              </Row>
              <Row title="Compact tables" description="Reduce row height in long booking lists.">
                <Switch defaultChecked />
              </Row>
              <Row title="Reduced motion" description="Disable page transition animations.">
                <Switch />
              </Row>
            </Panel>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 space-y-4">
            <Panel title="Alerts" description="Decide what pings the operations team.">
              {(
                [
                  [
                    "newBooking",
                    "New booking received",
                    "Instant alert for every incoming request",
                  ],
                  ["assignment", "Technician assignment", "When a job is assigned or reassigned"],
                  ["lowStock", "Low stock warnings", "When a part falls below its threshold"],
                  ["payments", "Payment updates", "Successful collections and refunds"],
                  ["dailyDigest", "Daily digest email", "Summary at 9:00 PM IST"],
                ] as const
              ).map(([key, title, desc]) => (
                <Row key={key} title={title} description={desc}>
                  <Switch
                    checked={notif[key]}
                    onCheckedChange={(v) => setNotif({ ...notif, [key]: v })}
                  />
                </Row>
              ))}
            </Panel>
            <Panel title="Channels" description="Delivery channels for customer-facing updates.">
              <Row title="SMS to customers">
                <Switch
                  checked={notif.sms}
                  onCheckedChange={(v) => setNotif({ ...notif, sms: v })}
                />
              </Row>
              <Row title="WhatsApp updates">
                <Switch
                  checked={notif.whatsapp}
                  onCheckedChange={(v) => setNotif({ ...notif, whatsapp: v })}
                />
              </Row>
            </Panel>
            <Button disabled={saving} onClick={() => save("Notification preferences")}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              Save notifications
            </Button>
          </TabsContent>

          <TabsContent value="bookings" className="mt-4 space-y-4">
            <Panel title="Scheduling" description="How incoming bookings are handled.">
              <Row
                title="Auto-assign nearest technician"
                description="Based on service area and availability."
              >
                <Switch
                  checked={booking.autoAssign}
                  onCheckedChange={(v) => setBooking({ ...booking, autoAssign: v })}
                />
              </Row>
              <Row title="Slot length">
                <Select
                  value={booking.slotMinutes}
                  onValueChange={(v) => setBooking({ ...booking, slotMinutes: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["30", "60", "90", "120"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row
                title={`Minimum lead time — ${booking.leadHours[0]}h`}
                description="Earliest a standard booking can be scheduled."
              >
                <div className="w-40">
                  <Slider
                    min={1}
                    max={24}
                    step={1}
                    value={booking.leadHours}
                    onValueChange={(v) => setBooking({ ...booking, leadHours: v })}
                  />
                </div>
              </Row>
              <Row title="Emergency surcharge (₹)">
                <Input
                  type="number"
                  className="w-40"
                  value={booking.emergencySurcharge}
                  onChange={(e) =>
                    setBooking({ ...booking, emergencySurcharge: Number(e.target.value) })
                  }
                />
              </Row>
              <Row title="Free cancellation window">
                <Select
                  value={booking.cancellationWindow}
                  onValueChange={(v) => setBooking({ ...booking, cancellationWindow: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "4", "12"].map((h) => (
                      <SelectItem key={h} value={h}>
                        {h} hours
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            </Panel>
            <Button disabled={saving} onClick={() => save("Booking settings")}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              Save booking settings
            </Button>
          </TabsContent>

          <TabsContent value="services" className="mt-4 space-y-4">
            <Panel title="Service defaults" description="Applied to newly created services.">
              <Row title="Default duration">
                <Select defaultValue="60">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["30", "60", "90", "120", "240"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row title="Default visit charge (₹)">
                <Input type="number" defaultValue={199} className="w-40" />
              </Row>
              <Row
                title="Show prices in customer app"
                description="Hide to quote on inspection instead."
              >
                <Switch defaultChecked />
              </Row>
              <Row title="Allow spare-part billing on jobs">
                <Switch defaultChecked />
              </Row>
            </Panel>
            <Button disabled={saving} onClick={() => save("Service settings")}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              Save service settings
            </Button>
          </TabsContent>

          <TabsContent value="billing" className="mt-4 space-y-4">
            <Panel title="Invoicing" description="Numbering, tax and payment details.">
              <Row title="Default GST rate (%)">
                <Input
                  type="number"
                  className="w-40"
                  value={billing.gst}
                  onChange={(e) => setBilling({ ...billing, gst: Number(e.target.value) })}
                />
              </Row>
              <Row title="Invoice number prefix">
                <Input
                  className="w-40"
                  value={billing.prefix}
                  onChange={(e) => setBilling({ ...billing, prefix: e.target.value })}
                />
              </Row>
              <Row title="UPI collection ID">
                <Input
                  className="w-64"
                  value={billing.upi}
                  onChange={(e) => setBilling({ ...billing, upi: e.target.value })}
                />
              </Row>
            </Panel>
            <div className="surface-panel space-y-2 rounded-xl p-5">
              <Label htmlFor="terms">Invoice terms</Label>
              <Textarea
                id="terms"
                rows={3}
                value={billing.terms}
                onChange={(e) => setBilling({ ...billing, terms: e.target.value })}
              />
            </div>
            <Button disabled={saving} onClick={() => save("Billing settings")}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              Save billing settings
            </Button>
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-4">
            <Panel title="Access" description="Protect the operations console.">
              <Row title="Two-factor authentication" description="OTP on every new device sign-in.">
                <Switch
                  checked={security.twoFactor}
                  onCheckedChange={(v) => setSecurity({ ...security, twoFactor: v })}
                />
              </Row>
              <Row title="Auto sign-out">
                <Select
                  value={security.sessionTimeout}
                  onValueChange={(v) => setSecurity({ ...security, sessionTimeout: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["15", "30", "60", "240"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} minutes idle
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row
                title="Restrict to office IPs"
                description="Only allow sign-in from your office network."
              >
                <Switch
                  checked={security.ipAllowlist}
                  onCheckedChange={(v) => setSecurity({ ...security, ipAllowlist: v })}
                />
              </Row>
              <Row
                title="Password"
                description="We'll email you a secure link to set a new password."
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { error } = await supabase.auth.resetPasswordForEmail(admin.email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error)
                      toast.error("Couldn't send reset link", { description: error.message });
                    else toast.success("Password reset link sent", { description: admin.email });
                  }}
                >
                  <KeyRound className="size-4" /> Change
                </Button>
              </Row>
            </Panel>
            <Button disabled={saving} onClick={() => save("Security settings")}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
              Save security settings
            </Button>
          </TabsContent>

          <TabsContent value="account" className="mt-4 space-y-4">
            <Panel title="Session" description="Sign out of the admin console on this device.">
              <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Signed in as</p>
                  <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={signingOut}
                  onClick={() => setConfirmOut(true)}
                >
                  {signingOut ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}{" "}
                  Log out
                </Button>
              </div>
            </Panel>
            <AlertDialog open={confirmOut} onOpenChange={setConfirmOut}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {dirty ? "You have unsaved changes that will be lost. " : ""}You'll need to sign
                    in again to use the console.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setSigningOut(true);
                      try {
                        await signOut();
                        toast.success("Signed out");
                      } catch {
                        toast.error("Couldn't sign out. Try again.");
                        setSigningOut(false);
                      }
                    }}
                  >
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="api" className="mt-4 space-y-4">
            <Panel
              title="API configuration"
              description="Connection details for your database. Private keys are never shown here."
            >
              <Row title="API base URL">
                <Input className="w-72" readOnly value={SUPABASE_URL} />
              </Row>
              <Row title="Publishable key">
                <div className="flex gap-2">
                  <Input className="w-64" readOnly value="Publishable key (configured)" />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Copy key"
                    onClick={() => {
                      void navigator.clipboard.writeText(SUPABASE_URL);
                      toast.success("Database URL copied");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </Row>
              <Row title="Webhook endpoint" description="Booking and payment callbacks.">
                <Input
                  className="w-72"
                  placeholder="https://api.sohanpipelines.in/hooks/bookings"
                />
              </Row>
              <Row title="Enable API access" description="Turn on once the backend is provisioned.">
                <Switch />
              </Row>
            </Panel>
            <p className="text-xs text-muted-foreground">
              Connected to your live database. Settings are stored there and shared across devices.
            </p>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
