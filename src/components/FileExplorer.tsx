import { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
}

interface FileExplorerProps {
    isOpen: boolean;
    currentFilePath: string | null;
    projectDir: string | null;
    onFileSelect: (path: string) => void;
    onClose: () => void;
}

// Get parent directory from a file path
function getDirectory(filePath: string | null): string | null {
    if (!filePath) return null;
    const normalized = filePath.replace(/\\/g, "/");
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash > 0 ? filePath.substring(0, lastSlash) : null;
}

export function FileExplorer({
    isOpen,
    currentFilePath,
    projectDir,
    onFileSelect,
    onClose,
}: FileExplorerProps) {
    const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, FileEntry[]>>({});
    const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
    // Pinned root directory — set once when explorer opens, stable across file selections
    const [rootDirectory, setRootDirectory] = useState<string | null>(null);
    const panelRef = useRef<HTMLElement>(null);

    const directoryName = rootDirectory
        ? rootDirectory.replace(/\\/g, "/").split("/").pop()
        : "Files";

    // When an explicit projectDir is set, always use it as root
    useEffect(() => {
        if (projectDir) {
            setRootDirectory(projectDir);
        }
    }, [projectDir]);

    // Pin root directory when the explorer opens without a projectDir.
    // Only update when:
    // 1. The explorer opens for the first time (no root set yet)
    // 2. A new file is opened from outside the explorer (e.g. via Open dialog),
    //    which means the file is NOT under the current root.
    useEffect(() => {
        if (!isOpen || !currentFilePath || projectDir) return;

        const fileDir = getDirectory(currentFilePath);
        if (!fileDir) return;

        if (!rootDirectory || !currentFilePath.replace(/\\/g, "/").startsWith(rootDirectory.replace(/\\/g, "/"))) {
            setRootDirectory(fileDir);
        }
    }, [isOpen, currentFilePath, projectDir]);

    // Load root entries when rootDirectory changes
    useEffect(() => {
        if (!isOpen || !rootDirectory) return;

        setIsLoading(true);
        setError(null);
        invoke<FileEntry[]>("list_directory_files", { directory: rootDirectory })
            .then((entries) => {
                setRootEntries(entries);
                setExpanded({});
            })
            .catch((err) => {
                console.error("Failed to load directory:", err);
                setError("Failed to load files");
            })
            .finally(() => setIsLoading(false));
    }, [isOpen, rootDirectory]);

    // Escape key and click-outside to close
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handleClickOutside);
        panelRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const toggleFolder = useCallback(async (dirPath: string) => {
        if (expanded[dirPath]) {
            setExpanded((prev) => {
                const next = { ...prev };
                delete next[dirPath];
                return next;
            });
            return;
        }

        setLoadingDirs((prev) => new Set(prev).add(dirPath));
        try {
            const entries = await invoke<FileEntry[]>("list_directory_files", {
                directory: dirPath,
            });
            setExpanded((prev) => ({ ...prev, [dirPath]: entries }));
        } catch (err) {
            console.error("Failed to load subdirectory:", err);
        } finally {
            setLoadingDirs((prev) => {
                const next = new Set(prev);
                next.delete(dirPath);
                return next;
            });
        }
    }, [expanded]);

    // Select file without closing the explorer or changing root
    const handleFileClick = (path: string) => {
        onFileSelect(path);
    };

    // Recursive renderer for file tree
    const renderEntries = (entries: FileEntry[], depth: number) => {
        return entries.map((entry) => {
            const isActive = entry.path === currentFilePath;
            const isExpanded = !!expanded[entry.path];
            const isLoadingDir = loadingDirs.has(entry.path);
            const paddingLeft = `${1 + depth * 1.25}rem`;

            if (entry.is_dir) {
                const children = expanded[entry.path];
                return (
                    <li key={entry.path} role="treeitem" aria-expanded={isExpanded}>
                        <button
                            onClick={() => toggleFolder(entry.path)}
                            className="btn-press w-full py-1.5 text-left text-sm flex items-center gap-1.5 transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                            style={{ paddingLeft }}
                        >
                            <span
                                className="material-symbols-outlined text-[16px] transition-transform duration-150"
                                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                            >
                                chevron_right
                            </span>
                            <span className="material-symbols-outlined text-[16px]">
                                {isExpanded ? "folder_open" : "folder"}
                            </span>
                            <span className="truncate">{entry.name}</span>
                            {isLoadingDir && (
                                <span className="ml-auto pr-3 text-[var(--text-muted)] text-xs">...</span>
                            )}
                        </button>
                        {isExpanded && children && (
                            <ul role="group">
                                {children.length === 0 ? (
                                    <li
                                        className="py-1 text-xs text-[var(--text-muted)] italic"
                                        style={{ paddingLeft: `${1 + (depth + 1) * 1.25 + 1.5}rem` }}
                                    >
                                        Empty
                                    </li>
                                ) : (
                                    renderEntries(children, depth + 1)
                                )}
                            </ul>
                        )}
                    </li>
                );
            }

            return (
                <li key={entry.path} role="treeitem">
                    <button
                        onClick={() => handleFileClick(entry.path)}
                        aria-selected={isActive}
                        className={`btn-press w-full py-1.5 text-left text-sm flex items-center gap-1.5 transition-colors ${
                            isActive
                                ? "bg-[var(--accent)] text-[var(--accent-text)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        }`}
                        style={{ paddingLeft: `calc(${paddingLeft} + 1.375rem)` }}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            description
                        </span>
                        <span className="truncate">{entry.name}</span>
                    </button>
                </li>
            );
        });
    };

    const hasEntries = rootEntries.length > 0;

    return (
        <aside
            ref={panelRef}
            role="navigation"
            aria-label="File explorer"
            tabIndex={-1}
            className={`fixed left-0 top-10 bottom-7 w-72 bg-[var(--bg-secondary)] border-r border-[var(--border)] z-50 shadow-2xl transition-transform duration-200 ease-out ${
                isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
            {/* Header */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-titlebar)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] no-select">
                    <span className="material-symbols-outlined text-[18px]">
                        folder_open
                    </span>
                    <span className="truncate max-w-[180px]">{directoryName}</span>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close file explorer"
                    className="btn-press flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        close
                    </span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto h-[calc(100%-2.5rem)]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32 text-[var(--text-secondary)] text-sm">
                        Loading...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-32 text-[var(--danger)] text-sm" role="alert">
                        {error}
                    </div>
                ) : !hasEntries ? (
                    <div className="flex items-center justify-center h-32 text-[var(--text-secondary)] text-sm">
                        No markdown files
                    </div>
                ) : (
                    <ul className="py-1" role="tree" aria-label="File tree">
                        {renderEntries(rootEntries, 0)}
                    </ul>
                )}
            </div>
        </aside>
    );
}
