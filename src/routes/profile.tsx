import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Building2,
  Camera,
  Loader2,
  Trash2,
  Upload,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdminAvatarImage } from "@/components/common/admin-avatar-image";
import { setAdminPhoto, useAdminPhoto } from "@/lib/admin-photo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activity, admin, serviceAreas } from "@/lib/mock-data";
import * as db from "@/lib/db";
import { CoverPhoto } from "@/components/profile/cover-photo";
import { useData } from "@/components/auth/auth-gate";
import { initials, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SOHAN PIPELINES Admin" },
      {
        name: "description",
        content: "Admin profile, business information and recent account activity.",
      },
      { property: "og:title", content: "Profile — SOHAN PIPELINES Admin" },
      {
        property: "og:description",
        content: "Admin profile, business information and recent account activity.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [form, setForm] = useState({
    name: admin.name,
    role: admin.role,
    email: admin.email,
    phone: admin.phone,
    bio: admin.bio,
  });
  const { reload } = useData();
  const [saving, setSaving] = useState(false);
  const savePersonal = async () => {
    if (!form.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error("Enter a valid email");
      return;
    }
    setSaving(true);
    await db.persist(
      () =>
        db.saveProfile({
          full_name: form.name.trim(),
          designation: form.role,
          email: form.email,
          phone: form.phone,
          bio: form.bio,
        }),
      reload,
      "Personal details saved",
      toast,
    );
    setSaving(false);
  };
  const saveBusiness = async () => {
    if (business.gstin && !/^[0-9A-Z]{15}$/i.test(business.gstin)) {
      toast.error("GSTIN must be 15 characters");
      return;
    }
    setSaving(true);
    await db.persist(
      () =>
        db.saveProfile({
          business_name: business.name,
          gstin: business.gstin,
          address: business.address,
          support_email: business.supportEmail,
          support_phone: business.supportPhone,
        }),
      reload,
      "Business details saved",
      toast,
    );
    setSaving(false);
  };
  const [business, setBusiness] = useState(admin.business);
  const photo = useAdminPhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const onFile = (file: File | undefined) => {
    setPhotoError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    db.uploadAvatar(file)
      .then((url) => {
        setAdminPhoto(url);
        toast.success("Profile photo updated");
      })
      .catch((e) => setPhotoError(e instanceof Error ? e.message : "Upload failed. Try again."))
      .finally(() => setUploading(false));
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your admin identity and the business details printed on invoices."
        actions={
          <Button
            size="sm"
            disabled={saving}
            onClick={() => {
              void savePersonal();
              void saveBusiness();
            }}
          >
            <Save className="size-4" /> Save changes
          </Button>
        }
      />

      <section className="surface-panel overflow-hidden rounded-xl">
        <CoverPhoto />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
          <div className="relative -mt-12 w-fit">
            <Avatar className="size-24 ring-4 ring-card">
              <AdminAvatarImage />
              <AvatarFallback className="text-2xl">{initials(admin.name)}</AvatarFallback>
            </Avatar>
            {uploading && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
                <Loader2 className="size-6 animate-spin text-primary" />
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
              aria-label="Upload profile photo"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full border border-border bg-card shadow-card transition-transform duration-200 hover:scale-105"
              aria-label="Change photo"
            >
              <Camera className="size-4" />
            </Button>
          </div>
          <div className="min-w-0 sm:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight">{form.name}</h2>
              <StatusBadge value="Owner Admin" tone="brand" dot={false} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" /> {photo ? "Change photo" : "Upload photo"}
              </Button>
              {photo && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={uploading}
                  onClick={() => {
                    setUploading(true);
                    db.removeAvatar()
                      .then(() => {
                        setAdminPhoto(null);
                        toast.success("Profile photo removed");
                      })
                      .catch((e) => setPhotoError(e.message))
                      .finally(() => setUploading(false));
                  }}
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              )}
              <span className="text-xs text-muted-foreground">JPG, PNG or WebP · max 5 MB</span>
            </div>
            {photoError && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {photoError}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" /> {form.role}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {form.email}
              </span>
              <span className="num inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {form.phone}
              </span>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <div className="surface-panel grid gap-4 rounded-xl p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-name">Full name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-role">Designation</Label>
              <Input
                id="p-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-phone">Phone</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p-bio">About</Label>
              <Textarea
                id="p-bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button disabled={saving} onClick={savePersonal}>
                <Save className="size-4" /> Save
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <div className="surface-panel grid gap-4 rounded-xl p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="b-name">Business name</Label>
              <Input
                id="b-name"
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-gst">GSTIN</Label>
              <Input
                id="b-gst"
                value={business.gstin}
                onChange={(e) => setBusiness({ ...business, gstin: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="b-addr">Registered address</Label>
              <Textarea
                id="b-addr"
                rows={2}
                value={business.address}
                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-mail">Support email</Label>
              <Input
                id="b-mail"
                value={business.supportEmail}
                onChange={(e) => setBusiness({ ...business, supportEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-phone">Support phone</Label>
              <Input
                id="b-phone"
                value={business.supportPhone}
                onChange={(e) => setBusiness({ ...business, supportPhone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="size-4" /> {business.name}
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {serviceAreas.filter((a) => a.active).length} active
                service areas
              </span>
            </div>
            <div className="sm:col-span-2">
              <Button disabled={saving} onClick={saveBusiness}>
                <Save className="size-4" /> Save
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ol className="surface-panel space-y-5 rounded-xl p-5">
            {activity.map((a) => (
              <li key={a.id} className="relative border-l border-border pl-5 pb-1 last:pb-0">
                <span className="absolute top-1 -left-[5px] size-2.5 rounded-full bg-primary ring-4 ring-card" />
                <p className="text-sm">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span> {a.target}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/80">{timeAgo(a.at)}</p>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
    </>
  );
}
