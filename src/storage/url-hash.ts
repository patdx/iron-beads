import type { StorageBackend } from "./types";

export function encodeShare(source: string): string {
  return btoa(unescape(encodeURIComponent(source)));
}

export function decodeShare(encoded: string): string | null {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
}

export class UrlHashAdapter implements StorageBackend {
  getItem(key: string): string | null {
    if (key === "source") {
      const hash = window.location.hash.slice(1);
      if (hash) {
        return decodeShare(hash);
      }
    }
    return null;
  }

  setItem(key: string, value: string): void {
    if (key === "source") {
      window.location.hash = encodeShare(value);
    }
  }

  removeItem(_key: string): void {}
}
