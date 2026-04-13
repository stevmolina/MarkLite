import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RecentProject } from "../hooks/useRecentProjects";

interface RecentProjectsModalProps {
  isOpen: boolean;
  recentProjects: RecentProject[];
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  onClear: () => void;
  onOpenFolder: () => void;
  onClose: () => void;
}

function getDisplayPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (parts.length <= 4) return normalized;
  return ".../" + parts.slice(-3).join("/");
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function RecentProjectsModal({
  isOpen,
  recentProjects,
  onSelect,
  onRemove,
  onClear,
  onOpenFolder,
  onClose,
}: RecentProjectsModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return recentProjects;
    const lower = query.toLowerCase();
    return recentProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.path.toLowerCase().includes(lower)
    );
  }, [recentProjects, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            onSelect(filtered[selectedIndex].path);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Delete":
          if (e.shiftKey && filtered[selectedIndex]) {
            e.preventDefault();
            onRemove(filtered[selectedIndex].path);
          }
          break;
      }
    },
    [filtered, selectedIndex, onSelect, onRemove, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recent projects"
        className="relative z-10 w-[520px] max-h-[60vh] bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--text-muted)]">
            folder_open
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search recent projects..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder();
              onClose();
            }}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)] font-medium"
            title="Open a folder"
          >
            Browse...
          </button>
          {recentProjects.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
              title="Clear all recent projects"
            >
              Clear
            </button>
          )}
        </div>

        {/* Project list */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <span className="material-symbols-outlined text-[32px] mb-2">
                {recentProjects.length === 0 ? "create_new_folder" : "search_off"}
              </span>
              <p className="text-sm">
                {recentProjects.length === 0
                  ? "No recent projects"
                  : "No matching projects"}
              </p>
              {recentProjects.length === 0 && (
                <button
                  onClick={() => {
                    onOpenFolder();
                    onClose();
                  }}
                  className="mt-3 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Open a folder to get started
                </button>
              )}
            </div>
          ) : (
            filtered.map((project, index) => (
              <button
                key={project.path}
                onClick={() => {
                  onSelect(project.path);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-[var(--accent)] text-[var(--accent-text)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">
                  folder
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {project.name}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      index === selectedIndex
                        ? "opacity-70"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {getDisplayPath(project.path)}
                    {project.lastFilePath && (
                      <span className="ml-1.5">
                        — {project.lastFilePath.replace(/\\/g, "/").split("/").pop()}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs shrink-0 ${
                    index === selectedIndex
                      ? "opacity-70"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {formatTime(project.openedAt)}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex items-center gap-4 text-[10px] text-[var(--text-muted)] no-select">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[10px]">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[10px]">↵</kbd> open
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[10px]">esc</kbd> close
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[10px]">⇧Del</kbd> remove
          </span>
        </div>
      </div>
    </div>
  );
}
