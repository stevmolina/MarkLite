import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { listen, TauriEvent } from "@tauri-apps/api/event";

import { ThemeProvider } from "./context/ThemeContext";
import { TitleBar } from "./components/TitleBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { CodeEditor } from "./components/CodeEditor";
import { StatusBar } from "./components/StatusBar";
import { ModeToggle } from "./components/ModeToggle";
import { FileExplorer } from "./components/FileExplorer";
import { TableOfContents } from "./components/TableOfContents";
import { Toast, ToastType } from "./components/Toast";
import { UnsavedChangesDialog } from "./components/UnsavedChangesDialog";
import { RecentFilesModal } from "./components/RecentFilesModal";
import { RecentProjectsModal } from "./components/RecentProjectsModal";
import { ShortcutHelp } from "./components/ShortcutHelp";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { useRecentProjects } from "./hooks/useRecentProjects";

interface FileData {
  path: string;
  name: string;
  content: string;
  size: number;
  line_count: number;
}

type ViewMode = "preview" | "code";

// Utility function to count words in text
const getWordCount = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

function AppContent() {
  // File state
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);

  // UI state
  const [mode, setMode] = useState<ViewMode>("preview");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [isLoading, setIsLoading] = useState(false);

  // Pending file to open after unsaved changes dialog
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);
  const [showUnsavedBeforeOpen, setShowUnsavedBeforeOpen] = useState(false);

  // Sidebar panel state
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [showTOC, setShowTOC] = useState(false);

  // Preview scroll position
  const [previewLine, setPreviewLine] = useState(1);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; isVisible: boolean; type: ToastType }>({ message: '', isVisible: false, type: 'success' });

  // Recent files & projects
  const { recentFiles, addRecent, removeRecent, clearRecent } = useRecentFiles();
  const { recentProjects, addRecentProject, removeRecentProject, clearRecentProjects } = useRecentProjects();
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [showRecentProjects, setShowRecentProjects] = useState(false);

  // Project directory — drives file explorer root independently of current file
  const [projectDir, setProjectDir] = useState<string | null>(null);

  // Zen mode — hides title bar, status bar, mode toggle, and panels
  const [zenMode, setZenMode] = useState(false);

  // Shortcut help overlay
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Export HTML content ref - captures from visible preview
  const previewRef = useRef<HTMLDivElement>(null);

  // Derived state
  const isDirty = content !== originalContent;
  const lineCount = useMemo(() => content.split("\n").length, [content]);
  const hasFile = filePath !== null;
  const wordCount = useMemo(() => getWordCount(content), [content]);

  // Show toast helper
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, isVisible: true, type });
  }, []);

  // Load file from path (with unsaved changes check)
  const loadFileDirect = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const fileData = await invoke<FileData>("read_file", { path });
      setFilePath(fileData.path);
      setFileName(fileData.name);
      setContent(fileData.content);
      setOriginalContent(fileData.content);
      setFileSize(fileData.size);
      setMode("preview");
      addRecent(fileData.path, fileData.name);
    } catch (err) {
      console.error("Failed to load file:", err);
      showToast("Failed to open file", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast, addRecent]);

  // Load file with unsaved changes protection
  const loadFile = useCallback(async (path: string) => {
    if (content !== originalContent) {
      // Has unsaved changes — ask user first
      setPendingFilePath(path);
      setShowUnsavedBeforeOpen(true);
    } else {
      await loadFileDirect(path);
    }
  }, [content, originalContent, loadFileDirect]);

  // Handlers for unsaved-before-open dialog
  const handleSaveAndOpen = useCallback(async () => {
    setShowUnsavedBeforeOpen(false);
    if (filePath) {
      try {
        await invoke("save_file", { path: filePath, content });
        setOriginalContent(content);
      } catch (err) {
        console.error("Failed to save file:", err);
        showToast("Failed to save file", "error");
        return;
      }
    }
    if (pendingFilePath) {
      await loadFileDirect(pendingFilePath);
      setPendingFilePath(null);
    }
  }, [filePath, content, pendingFilePath, loadFileDirect, showToast]);

  const handleDiscardAndOpen = useCallback(async () => {
    setShowUnsavedBeforeOpen(false);
    if (pendingFilePath) {
      await loadFileDirect(pendingFilePath);
      setPendingFilePath(null);
    }
  }, [pendingFilePath, loadFileDirect]);

  const handleCancelOpen = useCallback(() => {
    setShowUnsavedBeforeOpen(false);
    setPendingFilePath(null);
  }, []);

  // Listen for Tauri drag-drop events
  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | undefined;

    listen<{ paths: string[] }>(TauriEvent.DRAG_DROP, async (event) => {
      const paths = event.payload.paths;
      if (paths && paths.length > 0) {
        const firstPath = paths[0];
        // Only load markdown files
        if (firstPath.endsWith('.md') || firstPath.endsWith('.markdown')) {
          await loadFile(firstPath);
        }
      }
    }).then((fn) => {
      if (mounted) {
        unlisten = fn;
      } else {
        fn(); // Component already unmounted, clean up immediately
      }
    });

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [loadFile]);

  // Open file dialog
  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Markdown",
            extensions: ["md", "markdown"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        await loadFile(selected);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  }, [loadFile]);

  // Save file
  const handleSaveFile = useCallback(async () => {
    if (!filePath) {
      // Save as new file
      const selected = await save({
        filters: [
          {
            name: "Markdown",
            extensions: ["md"],
          },
        ],
      });

      if (selected) {
        try {
          await invoke("save_file", { path: selected, content });
          setFilePath(selected);
          const name = selected.replace(/\\/g, '/').split('/').pop() || 'Untitled';
          setFileName(name);
          setOriginalContent(content);
          showToast("File saved", "success");
        } catch (err) {
          console.error("Failed to save file:", err);
          showToast("Failed to save file", "error");
        }
      }
    } else {
      try {
        await invoke("save_file", { path: filePath, content });
        setOriginalContent(content);
        showToast("File saved", "success");
      } catch (err) {
        console.error("Failed to save file:", err);
        showToast("Failed to save file", "error");
      }
    }
  }, [filePath, content, showToast]);

  // Listen for file open from CLI (when app is opened with a file by double-click)
  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | undefined;

    listen<string>("file-open-from-cli", async (event) => {
      const filePath = event.payload;
      if (filePath) {
        await loadFile(filePath);
      }
    }).then((fn) => {
      if (mounted) {
        unlisten = fn;
      } else {
        fn();
      }
    });

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [loadFile]);

  // Toggle mode
  const handleToggleMode = useCallback(() => {
    setMode((prev) => (prev === "preview" ? "code" : "preview"));
  }, []);

  // Toggle file explorer (mutually exclusive with TOC)
  const handleToggleFileExplorer = useCallback(() => {
    setShowFileExplorer((prev) => !prev);
    setShowTOC(false);
  }, []);

  // Toggle table of contents (mutually exclusive with file explorer)
  const handleToggleTOC = useCallback(() => {
    setShowTOC((prev) => !prev);
    setShowFileExplorer(false);
  }, []);

  // Close all panels
  const closeAllPanels = useCallback(() => {
    setShowFileExplorer(false);
    setShowTOC(false);
  }, []);

  // Handle file drop
  const handleFileDrop = useCallback(
    (path: string) => {
      loadFile(path);
    },
    [loadFile]
  );

// Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Handle image paste success
  const handleImagePaste = useCallback(() => {
    showToast('Image pasted successfully!', 'success');
  }, [showToast]);

  // Handle error messages from child components
  const handleError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  // Hide toast
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 - Toggle zen mode
      if (e.key === "F11") {
        e.preventDefault();
        setZenMode((prev) => {
          if (!prev) {
            // Entering zen mode — close panels
            setShowFileExplorer(false);
            setShowTOC(false);
          }
          return !prev;
        });
        return;
      }
      // Ctrl+Shift+E - Toggle file explorer (check before Ctrl+E)
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        if (hasFile || projectDir) {
          handleToggleFileExplorer();
        }
        return;
      }
      // Ctrl+Shift+P - Recent projects
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setShowRecentProjects((prev) => !prev);
        return;
      }
      // Ctrl+Shift+O - Toggle TOC (check before Ctrl+O)
      if (e.ctrlKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        if (hasFile) {
          handleToggleTOC();
        }
        return;
      }
      // Ctrl+P - Recent files
      if (e.ctrlKey && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        setShowRecentFiles((prev) => !prev);
        return;
      }
      // Ctrl+O - Open file (without Shift)
      if (e.ctrlKey && !e.shiftKey && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      }
      // Ctrl+S - Save file
      if (e.ctrlKey && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        if (hasFile || content) {
          handleSaveFile();
        }
      }
      // Ctrl+E - Toggle mode (without Shift)
      if (e.ctrlKey && !e.shiftKey && e.key === "e") {
        e.preventDefault();
        if (hasFile) {
          handleToggleMode();
        }
      }
      // Ctrl+/ - Toggle shortcut help
      if (e.ctrlKey && !e.shiftKey && e.key === "/") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenFile, handleSaveFile, handleToggleMode, handleToggleFileExplorer, handleToggleTOC, hasFile, projectDir, content]);

  // Handle recent file selection
  const handleRecentSelect = useCallback((path: string) => {
    setShowRecentFiles(false);
    loadFile(path);
  }, [loadFile]);

  // Open folder dialog
  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setProjectDir(selected);
        addRecentProject(selected);
        setShowFileExplorer(true);
        setShowTOC(false);
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  }, [addRecentProject]);

  // Handle recent project selection
  const handleProjectSelect = useCallback((path: string) => {
    setShowRecentProjects(false);
    setProjectDir(path);
    addRecentProject(path);
    setShowFileExplorer(true);
    setShowTOC(false);
  }, [addRecentProject]);

  // Get export HTML from the visible preview on demand (avoids duplicate rendering)
  const getExportHtml = useCallback((): string => {
    if (previewRef.current) {
      return previewRef.current.innerHTML;
    }
    return "";
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden transition-colors">
      {!zenMode && (
        <TitleBar
          fileName={fileName ?? undefined}
          isDirty={isDirty}
          filePath={filePath ?? undefined}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          getExportHtml={getExportHtml}
        />
      )}

      {!hasFile ? (
        <WelcomeScreen
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onFileDrop={handleFileDrop}
          recentFiles={recentFiles}
          onRecentSelect={handleRecentSelect}
          recentProjects={recentProjects}
          onProjectSelect={handleProjectSelect}
        />
      ) : (
        <>
          {/* Both views rendered; toggle via display to preserve scroll/state */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ display: mode === "preview" ? "flex" : "none" }}>
            <MarkdownPreview
              content={content}
              fileName={fileName || ""}
              lineCount={lineCount}
              fileSize={fileSize}
              onEditClick={handleToggleMode}
              onLineChange={(line) => setPreviewLine(line)}
              onFileOpen={loadFile}
              filePath={filePath}
              markdownBodyRef={previewRef}
            />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col" style={{ display: mode === "code" ? "flex" : "none" }}>
            <CodeEditor
              content={content}
              onChange={handleContentChange}
              onCursorChange={(line, col) => setCursorPosition({ line, col })}
              onImagePaste={handleImagePaste}
              onError={handleError}
              filePath={filePath}
            />
          </div>

          {!zenMode && <ModeToggle mode={mode} onToggle={handleToggleMode} />}

          {/* Sidebar Panels — TOC only shows with a file */}
          {!zenMode && (
            <TableOfContents
              isOpen={showTOC}
              content={content}
              onClose={closeAllPanels}
            />
          )}

          {!zenMode && (
            <StatusBar
              isSaved={!isDirty}
              lineNumber={mode === "preview" ? previewLine : cursorPosition.line}
              columnNumber={cursorPosition.col}
              mode={mode}
              showFileExplorer={showFileExplorer}
              showTOC={showTOC}
              onToggleFileExplorer={handleToggleFileExplorer}
              onToggleTOC={handleToggleTOC}
              wordCount={wordCount}
            />
          )}
        </>
      )}

      {/* File Explorer — available globally (with file or project dir) */}
      {!zenMode && (
        <FileExplorer
          isOpen={showFileExplorer}
          currentFilePath={filePath}
          projectDir={projectDir}
          onFileSelect={loadFile}
          onClose={closeAllPanels}
        />
      )}

      {/* Unsaved changes dialog before opening new file */}
      <UnsavedChangesDialog
        isOpen={showUnsavedBeforeOpen}
        onClose={handleCancelOpen}
        onDiscard={handleDiscardAndOpen}
        onSave={handleSaveAndOpen}
      />

      {/* Recent projects modal */}
      <RecentProjectsModal
        isOpen={showRecentProjects}
        recentProjects={recentProjects}
        onSelect={handleProjectSelect}
        onRemove={removeRecentProject}
        onClear={clearRecentProjects}
        onOpenFolder={handleOpenFolder}
        onClose={() => setShowRecentProjects(false)}
      />

      {/* Recent files modal */}
      <RecentFilesModal
        isOpen={showRecentFiles}
        recentFiles={recentFiles}
        onSelect={handleRecentSelect}
        onRemove={removeRecent}
        onClear={clearRecent}
        onClose={() => setShowRecentFiles(false)}
      />

      {/* Shortcut help */}
      <ShortcutHelp
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-[var(--accent)] animate-spin">progress_activity</span>
            <span className="text-sm text-[var(--text-secondary)]">Loading...</span>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onHide={hideToast}
        type={toast.type}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
