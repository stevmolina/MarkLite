import { useEffect, useRef } from "react";

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { category: "General", items: [
    { keys: "Ctrl + O", action: "Open file" },
    { keys: "Ctrl + S", action: "Save file" },
    { keys: "Ctrl + E", action: "Toggle preview / editor" },
    { keys: "Ctrl + /", action: "Show shortcuts" },
    { keys: "F11", action: "Zen mode" },
  ]},
  { category: "Navigation", items: [
    { keys: "Ctrl + P", action: "Recent files" },
    { keys: "Ctrl + Shift + P", action: "Recent projects" },
    { keys: "Ctrl + Shift + E", action: "File explorer" },
    { keys: "Ctrl + Shift + O", action: "Table of contents" },
  ]},
];

export function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 w-[280px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <span className="text-xs font-semibold text-[var(--text-primary)] no-select">Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Shortcut list */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 no-select">
                {group.category}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">{shortcut.action}</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)] font-mono no-select">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
