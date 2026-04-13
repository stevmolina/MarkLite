import { useState, useCallback, useEffect } from "react";

export interface RecentFile {
  path: string;
  name: string;
  openedAt: number; // timestamp
}

const STORAGE_KEY = "marklite-recent-files";
const MAX_RECENT = 20;

function loadRecent(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentFile[];
  } catch {
    return [];
  }
}

function saveRecent(files: RecentFile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecent);

  // Sync across tabs/windows (unlikely but cheap)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setRecentFiles(loadRecent());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addRecent = useCallback((path: string, name: string) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.path !== path);
      const next = [{ path, name, openedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((path: string) => {
    setRecentFiles((prev) => {
      const next = prev.filter((f) => f.path !== path);
      saveRecent(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentFiles([]);
    saveRecent([]);
  }, []);

  return { recentFiles, addRecent, removeRecent, clearRecent };
}
