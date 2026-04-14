import { useState } from "react";
import { Window } from "@tauri-apps/api/window";
import { SettingsMenu } from "./SettingsMenu";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

export interface Tab {
  path: string;
  name: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabPath: string | null;
  isDirty?: boolean;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onNewTab: () => void;
  onSaveFile?: () => Promise<void>;
  getExportHtml?: () => string;
}

export function TabBar({
  tabs,
  activeTabPath,
  isDirty,
  onTabSelect,
  onTabClose,
  onNewTab,
  onSaveFile,
  getExportHtml,
}: TabBarProps) {
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const handleMinimize = async () => {
    try {
      await Window.getCurrent().minimize();
    } catch (e) {
      console.error("Minimize failed:", e);
    }
  };

  const handleMaximize = async () => {
    try {
      await Window.getCurrent().toggleMaximize();
    } catch (e) {
      console.error("Maximize failed:", e);
    }
  };

  const handleCloseClick = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      forceClose();
    }
  };

  const forceClose = async () => {
    try {
      await Window.getCurrent().close();
    } catch (e) {
      console.error("Close failed:", e);
    }
  };

  const handleSaveAndClose = async () => {
    if (onSaveFile) await onSaveFile();
    forceClose();
  };

  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const activeFileName = activeTab?.name || "document.md";

  return (
    <>
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onDiscard={() => { setShowUnsavedDialog(false); forceClose(); }}
        onSave={handleSaveAndClose}
      />
      <header className="h-10 shrink-0 flex items-center bg-[var(--bg-titlebar)] border-b border-[var(--border)] no-select drag-region transition-colors">
        {/* Left: Icon */}
        <div className="flex items-center px-3 no-drag">
          <div className="w-4 h-4">
            <img src="/icon.svg" alt="MarkLite" className="w-full h-full" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex items-end gap-0 overflow-x-auto no-drag min-w-0 h-full">
          {tabs.map((tab) => {
            const isActive = tab.path === activeTabPath;
            return (
              <div
                key={tab.path}
                onClick={() => onTabSelect(tab.path)}
                className={`group relative flex items-center gap-1.5 h-full px-4 text-xs cursor-pointer transition-colors shrink-0 max-w-[200px] border-r border-[var(--border)] ${
                  isActive
                    ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="truncate">{tab.name}</span>
                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.path);
                  }}
                  className={`flex items-center justify-center w-4 h-4 rounded-sm transition-colors shrink-0 ${
                    isActive
                      ? "opacity-60 hover:opacity-100 hover:bg-[var(--bg-hover)]"
                      : "opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-[var(--bg-hover)]"
                  }`}
                  aria-label={`Close ${tab.name}`}
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
                )}
              </div>
            );
          })}

          {/* New tab button */}
          <button
            onClick={onNewTab}
            className="flex items-center justify-center w-8 h-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
            aria-label="Open file"
            title="Open File (Ctrl+O)"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>

        {/* Right: Settings & Window Controls */}
        <div className="flex items-center gap-0.5 px-2 no-drag">
          <SettingsMenu
            fileName={activeTab ? activeFileName : undefined}
            getExportHtml={activeTab ? getExportHtml : undefined}
          />
          <div className="w-[1px] h-4 bg-[var(--border)] mx-1"></div>
          <button
            onClick={handleMinimize}
            aria-label="Minimize"
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            onClick={handleMaximize}
            aria-label="Maximize"
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">crop_square</span>
          </button>
          <button
            onClick={handleCloseClick}
            aria-label="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--danger)] text-[var(--text-secondary)] hover:text-[var(--accent-text)] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </header>
    </>
  );
}
