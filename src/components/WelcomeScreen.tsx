import { RecentFile } from "../hooks/useRecentFiles";
import { RecentProject } from "../hooks/useRecentProjects";

interface WelcomeScreenProps {
    onOpenFile: () => void;
    onOpenFolder: () => void;
    onFileDrop: (path: string) => void;
    recentFiles?: RecentFile[];
    onRecentSelect?: (path: string) => void;
    recentProjects?: RecentProject[];
    onProjectSelect?: (path: string) => void;
}

function getShortPath(path: string): string {
    const normalized = path.replace(/\\/g, "/");
    const parts = normalized.split("/");
    if (parts.length <= 3) return normalized;
    return ".../" + parts.slice(-3).join("/");
}

export function WelcomeScreen({ onOpenFile, onOpenFolder, onFileDrop, recentFiles, onRecentSelect, recentProjects, onProjectSelect }: WelcomeScreenProps) {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            // @ts-expect-error - Tauri adds path to File objects
            const path = file.path || file.name;
            if (path.endsWith('.md') || path.endsWith('.markdown')) {
                onFileDrop(path);
            }
        }
    };

    return (
        <main
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex-1 flex flex-col items-center justify-center p-6 no-select"
        >
            <div className="flex flex-col items-center gap-8 max-w-sm text-center animate-fade-in-up">
                {/* Logo */}
                <div className="flex items-center justify-center w-20 h-20">
                    <img src="/icon.svg" alt="MarkLite" className="w-full h-full" />
                </div>

                {/* App Name */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        MarkLite
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        A minimal markdown editor
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onOpenFile}
                        className="btn-press flex items-center gap-2 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)] font-medium text-sm px-6 py-2.5 rounded-lg transition-all duration-200"
                    >
                        <span className="material-symbols-outlined text-[20px]">description</span>
                        <span>Open File</span>
                    </button>
                    <button
                        onClick={onOpenFolder}
                        className="btn-press flex items-center gap-2 border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium text-sm px-6 py-2.5 rounded-lg transition-all duration-200"
                    >
                        <span className="material-symbols-outlined text-[20px]">folder_open</span>
                        <span>Open Folder</span>
                    </button>
                </div>

                {/* Hint */}
                <p className="text-xs text-[var(--text-muted)]">
                    or drag and drop a <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border)]">.md</code> file
                </p>

                {/* Recent sections */}
                {((recentFiles && recentFiles.length > 0) || (recentProjects && recentProjects.length > 0)) && (
                    <div className="w-full max-w-xs mt-2 flex flex-col gap-4">
                        {/* Recent projects */}
                        {recentProjects && recentProjects.length > 0 && onProjectSelect && (
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-2 text-left">Recent projects</p>
                                <div className="flex flex-col gap-0.5">
                                    {recentProjects.slice(0, 3).map((project) => (
                                        <button
                                            key={project.path}
                                            onClick={() => onProjectSelect(project.path)}
                                            className="btn-press w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px] shrink-0">folder</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium text-[var(--text-primary)]">{project.name}</div>
                                                <div className="truncate text-xs text-[var(--text-muted)]">{getShortPath(project.path)}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                                    <kbd className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)]">Ctrl+Shift+P</kbd> to see all
                                </p>
                            </div>
                        )}

                        {/* Recent files */}
                        {recentFiles && recentFiles.length > 0 && onRecentSelect && (
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-2 text-left">Recent files</p>
                                <div className="flex flex-col gap-0.5">
                                    {recentFiles.slice(0, 5).map((file) => (
                                        <button
                                            key={file.path}
                                            onClick={() => onRecentSelect(file.path)}
                                            className="btn-press w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px] shrink-0">description</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium text-[var(--text-primary)]">{file.name}</div>
                                                <div className="truncate text-xs text-[var(--text-muted)]">{getShortPath(file.path)}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                                    <kbd className="px-1 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)]">Ctrl+P</kbd> to see all
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </main>
    );
}
