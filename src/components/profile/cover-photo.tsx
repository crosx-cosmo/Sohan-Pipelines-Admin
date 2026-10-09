import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import * as db from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const OUT_W = 1500,
  OUT_H = 500; // 3:1 banner

export function CoverPhoto() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    db.getCoverUrl()
      .then(setUrl)
      .catch(() => setUrl(null))
      .finally(() => setLoading(false));
  }, []);

  const onFile = (f?: File) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type))
      return void toast.error("Use a JPG, PNG or WebP image.");
    if (f.size > 8 * 1024 * 1024) return void toast.error("Image must be 8 MB or smaller.");
    const u = URL.createObjectURL(f);
    const i = new Image();
    i.onload = () => {
      setImg(i);
      setZoom(1);
      setPosX(50);
      setPosY(50);
      setSrc(u);
    };
    i.onerror = () => toast.error("Couldn't read that image.");
    i.src = u;
  };

  useEffect(() => {
    // Draw after the dialog mounts the canvas.
    const id = requestAnimationFrame(() => {
      const c = canvasRef.current;
      if (!c || !img) return;
      const ctx = c.getContext("2d")!;
      const base = Math.max(OUT_W / img.width, OUT_H / img.height) * zoom;
      const w = img.width * base,
        h = img.height * base;
      ctx.clearRect(0, 0, OUT_W, OUT_H);
      ctx.drawImage(img, (OUT_W - w) * (posX / 100), (OUT_H - h) * (posY / 100), w, h);
    });
    return () => cancelAnimationFrame(id);
  }, [img, zoom, posX, posY, src]);

  const close = () => {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setImg(null);
  };

  const save = () => {
    canvasRef.current?.toBlob(
      async (blob) => {
        if (!blob) return void toast.error("Couldn't prepare the image.");
        setBusy(true);
        try {
          setUrl(await db.uploadCover(blob));
          toast.success("Cover photo saved");
          close();
        } catch (e) {
          toast.error("Upload failed", { description: e instanceof Error ? e.message : undefined });
        } finally {
          setBusy(false);
        }
      },
      "image/jpeg",
      0.88,
    );
  };

  const remove = async () => {
    setBusy(true);
    try {
      await db.removeCover();
      setUrl(null);
      toast.success("Cover photo removed");
    } catch (e) {
      toast.error("Couldn't remove", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative aspect-[3/1] max-h-56 min-h-28 w-full overflow-hidden border-b border-primary/10 bg-primary/8">
      {url && (
        <img
          src={url}
          alt="Profile cover"
          className="size-full object-cover"
          onError={() => setUrl(null)}
        />
      )}
      {(loading || busy) && (
        <span className="absolute inset-0 grid place-items-center bg-background/50">
          <Loader2 className="size-6 animate-spin text-primary" />
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Upload cover photo"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="absolute top-3 right-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-4" /> {url ? "Change cover" : "Add cover"}
        </Button>
        {url && (
          <Button
            size="icon"
            variant="secondary"
            className="size-8"
            disabled={busy}
            onClick={remove}
            aria-label="Remove cover"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <Dialog
        open={!!src}
        onOpenChange={(o) => {
          if (!o && !busy) close();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjust cover photo</DialogTitle>
            <DialogDescription>Zoom and reposition, then save.</DialogDescription>
          </DialogHeader>
          <canvas
            ref={canvasRef}
            width={OUT_W}
            height={OUT_H}
            className="aspect-[3/1] w-full rounded-lg border bg-muted"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Zoom</Label>
              <Slider
                min={1}
                max={3}
                step={0.05}
                value={[zoom]}
                onValueChange={([v]) => setZoom(v ?? 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Horizontal</Label>
              <Slider min={0} max={100} value={[posX]} onValueChange={([v]) => setPosX(v ?? 50)} />
            </div>
            <div className="space-y-2">
              <Label>Vertical</Label>
              <Slider min={0} max={100} value={[posY]} onValueChange={([v]) => setPosY(v ?? 50)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={save}>
              {busy && <Loader2 className="size-4 animate-spin" />} Save cover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
