import { useSyncExternalStore } from "react";

// In-page store for the admin avatar. Swap `setAdminPhoto` for an upload call
// when a storage backend is connected.
let current: string | null = null;
const listeners = new Set<() => void>();

export function setAdminPhoto(url: string | null) {
  current = url;
  listeners.forEach((l) => l());
}

export function useAdminPhoto() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
