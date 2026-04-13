import { useState, useCallback, useEffect } from "react";

export interface RecentProject {
  path: string;
  name: string;
  openedAt: number;
  lastFilePath?: string;
}

const STORAGE_KEY = "marklite-recent-projects";
const MAX_RECENT = 15;

function loadRecent(): RecentProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentProject[];
  } catch {
    return [];
  }
}

function saveRecent(projects: RecentProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function dirName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").pop() || path;
}

export function useRecentProjects() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(loadRecent);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setRecentProjects(loadRecent());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addRecentProject = useCallback((path: string) => {
    setRecentProjects((prev) => {
      const existing = prev.find((p) => p.path === path);
      const filtered = prev.filter((p) => p.path !== path);
      const next = [{ path, name: dirName(path), openedAt: Date.now(), lastFilePath: existing?.lastFilePath }, ...filtered].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  const removeRecentProject = useCallback((path: string) => {
    setRecentProjects((prev) => {
      const next = prev.filter((p) => p.path !== path);
      saveRecent(next);
      return next;
    });
  }, []);

  const setProjectLastFile = useCallback((projectPath: string, filePath: string) => {
    setRecentProjects((prev) => {
      const next = prev.map((p) =>
        p.path === projectPath ? { ...p, lastFilePath: filePath } : p
      );
      saveRecent(next);
      return next;
    });
  }, []);

  const clearRecentProjects = useCallback(() => {
    setRecentProjects([]);
    saveRecent([]);
  }, []);

  return { recentProjects, addRecentProject, removeRecentProject, setProjectLastFile, clearRecentProjects };
}
