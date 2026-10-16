import { useState, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Shared delete confirmation. When `blocked` is set the record is protected
 * and the delete button is hidden. `onConfirm` returns true when the delete
 * really succeeded, which closes the dialog.
 */
export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  blocked,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  blocked?: string | null;
  confirmLabel?: string;
  onConfirm: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {blocked ? (
                <p className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3 text-foreground">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{blocked}</span>
                </p>
              ) : (
                <div>{description}</div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{blocked ? "Close" : "Cancel"}</AlertDialogCancel>
          {!blocked && (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await onConfirm();
                setBusy(false);
                if (ok) onOpenChange(false);
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Deleting…" : confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
