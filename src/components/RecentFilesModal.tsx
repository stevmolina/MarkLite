import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RecentFile } from "../hooks/useRecentFiles";

interface RecentFilesModalProps {
  isOpen: boolean;
  recentFiles: RecentFile[];
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function getParentDir(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return "";
  // Show last two directory segments for context
  const dir = normalized.slice(0, lastSlash);
  const parts = dir.split("/");
  return parts.length > 2 ? ".../" + parts.slice(-2).join("/") : dir;
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

export function RecentFilesModal({
  isOpen,
  recentFiles,
  onSelect,
  onRemove,
  onClear,
  onClose,
}: RecentFilesModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return recentFiles;
    const lower = query.toLowerCase();
    return recentFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(lower) ||
        f.path.toLowerCase().includes(lower)
    );
  }, [recentFiles, query]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay to ensure the modal is rendered before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Clamp selected index when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  // Scroll selected item into view
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
        aria-label="Recent files"
        className="relative z-10 w-[520px] max-h-[60vh] bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--text-muted)]">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search recent files..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {recentFiles.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-hover)]"
              title="Clear all recent files"
            >
              Clear
            </button>
          )}
        </div>

        {/* File list */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <span className="material-symbols-outlined text-[32px] mb-2">
                {recentFiles.length === 0 ? "folder_open" : "search_off"}
              </span>
              <p className="text-sm">
                {recentFiles.length === 0
                  ? "No recent files"
                  : "No matching files"}
              </p>
            </div>
          ) : (
            filtered.map((file, index) => (
              <button
                key={file.path}
                onClick={() => {
                  onSelect(file.path);
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
                  description
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {file.name}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      index === selectedIndex
                        ? "opacity-70"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {getParentDir(file.path)}
                  </div>
                </div>
                <span
                  className={`text-xs shrink-0 ${
                    index === selectedIndex
                      ? "opacity-70"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {formatTime(file.openedAt)}
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
