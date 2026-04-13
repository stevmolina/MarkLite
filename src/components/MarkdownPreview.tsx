import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { readFile, exists } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
    remarkHighlight,
    remarkComments,
    remarkWikilinks,
    rehypeCallouts,
} from "../utils/remarkObsidian";

interface MarkdownPreviewProps {
    content: string;
    fileName: string;
    lineCount: number;
    fileSize: number;
    onEditClick: () => void;
    onLineChange?: (line: number) => void;
    onFileOpen?: (path: string) => void;
    filePath?: string | null;
    markdownBodyRef?: React.RefObject<HTMLDivElement | null>;
}

// MIME type lookup for image extensions
const IMAGE_MIME_TYPES: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp'
};

// Component to handle local image loading
function LocalImage({ src, alt, baseDir, ...props }: { src: string; alt: string; baseDir: string | null } & React.ImgHTMLAttributes<HTMLImageElement>) {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [error, setError] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;

        const loadImage = async () => {
            if (!baseDir || !src) return;

            // Check if it's a relative path
            if (src.startsWith('./') || src.startsWith('../') || (!src.includes('://') && !src.startsWith('data:'))) {
                try {
                    // Remove leading ./ if present
                    const cleanPath = src.startsWith('./') ? src.slice(2) : src;
                    // Construct full path - handle both Windows and Unix separators
                    const sep = baseDir.includes('\\') ? '\\' : '/';
                    const fullPath = `${baseDir}${sep}${cleanPath.replace(/[/\\]/g, sep)}`;

                    // Read the file as binary
                    const data = await readFile(fullPath);

                    // Detect image type from extension
                    const ext = cleanPath.split('.').pop()?.toLowerCase() || 'png';
                    const mimeType = IMAGE_MIME_TYPES[ext] || 'image/png';

                    // Use Blob + ObjectURL instead of base64 for better performance
                    const blob = new Blob([data], { type: mimeType });
                    objectUrl = URL.createObjectURL(blob);
                    setImageSrc(objectUrl);
                    setError(false);
                } catch (err) {
                    console.error('Failed to load image:', err);
                    setError(true);
                }
            } else {
                // External URL or data URL - use as is
                setImageSrc(src);
            }
        };

        loadImage();

        // Revoke object URL on cleanup to prevent memory leaks
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src, baseDir]);

    if (error) {
        return (
            <div className="my-4 p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">
                Failed to load image: {src}
            </div>
        );
    }

    if (!imageSrc) {
        return (
            <div className="my-4 p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] animate-pulse">
                <div className="h-32 bg-[var(--bg-tertiary)] rounded"></div>
            </div>
        );
    }

    return (
        <img 
            src={imageSrc} 
            alt={alt || 'image'} 
            {...props}
            className="max-w-full h-auto rounded-lg my-4"
        />
    );
}

export function MarkdownPreview({
    content,
    lineCount,
    onLineChange,
    onFileOpen,
    filePath,
    markdownBodyRef,
}: MarkdownPreviewProps) {
    const mainRef = useRef<HTMLElement>(null);

    // Get the directory containing the markdown file
    const baseDir = useMemo(() => {
        if (!filePath) return null;
        // Handle both Windows and Unix paths
        const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return lastSep > 0 ? filePath.slice(0, lastSep) : null;
    }, [filePath]);

    // Resolve a link target to a local .md file path
    const resolveLocalLink = useCallback(async (href: string): Promise<string | null> => {
        if (!baseDir) return null;
        const sep = baseDir.includes('\\') ? '\\' : '/';

        // Build candidate paths: as-is, with .md appended
        const cleanHref = href.startsWith('./') ? href.slice(2) : href;
        const candidates = [cleanHref];
        if (!cleanHref.match(/\.(md|markdown)$/i)) {
            candidates.push(`${cleanHref}.md`);
            candidates.push(`${cleanHref}.markdown`);
        }

        for (const candidate of candidates) {
            const fullPath = `${baseDir}${sep}${candidate.replace(/[/\\]/g, sep)}`;
            try {
                if (await exists(fullPath)) return fullPath;
            } catch { /* not found, try next */ }
        }
        return null;
    }, [baseDir]);

    // Handle link clicks
    const handleLinkClick = useCallback(async (e: React.MouseEvent, href: string) => {
        e.preventDefault();

        // Anchor links — scroll within current document
        if (href.startsWith('#')) {
            const id = href.slice(1);
            const target = markdownBodyRef?.current?.querySelector(`[id="${CSS.escape(id)}"]`);
            target?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // External URLs — open in system browser
        if (/^https?:\/\//i.test(href)) {
            try { await openUrl(href); } catch (err) {
                console.error('Failed to open URL:', err);
            }
            return;
        }

        // Local file links (wikilinks + relative .md links) — open in app
        if (onFileOpen) {
            const resolved = await resolveLocalLink(href);
            if (resolved) {
                onFileOpen(resolved);
                return;
            }
        }

        // Fallback: try opening as URL in system browser
        try { await openUrl(href); } catch { /* ignore */ }
    }, [resolveLocalLink, onFileOpen, markdownBodyRef]);

    // Custom components for react-markdown
    const components = useMemo(() => ({
        img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
            return <LocalImage src={src || ''} alt={alt || 'image'} baseDir={baseDir} {...props} />;
        },
        a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
            return (
                <a
                    {...props}
                    href={href}
                    onClick={(e) => href && handleLinkClick(e, href)}
                    style={{ cursor: 'pointer' }}
                >
                    {children}
                </a>
            );
        },
    }), [baseDir, handleLinkClick]);

    // Calculate current line based on scroll position
    const handleScroll = useCallback(() => {
        if (!mainRef.current || !onLineChange) return;

        const element = mainRef.current;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;

        if (scrollHeight <= 0) {
            onLineChange(1);
            return;
        }

        // Calculate approximate line based on scroll percentage
        const scrollPercentage = scrollTop / scrollHeight;
        const currentLine = Math.max(1, Math.ceil(scrollPercentage * lineCount));

        onLineChange(currentLine);
    }, [lineCount, onLineChange]);

    // Set up scroll listener
    useEffect(() => {
        const element = mainRef.current;
        if (!element) return;

        element.addEventListener("scroll", handleScroll);
        // Initial line
        handleScroll();

        return () => {
            element.removeEventListener("scroll", handleScroll);
        };
    }, [handleScroll]);

    return (
        <main
            ref={mainRef}
            className="flex-1 overflow-y-auto bg-[var(--bg-primary)] transition-colors"
        >
            <div className="max-w-[800px] mx-auto px-8 py-12">
<div className="markdown-body" ref={markdownBodyRef}>
                    <Markdown
                        remarkPlugins={[
                            remarkGfm,
                            remarkMath,
                            remarkFrontmatter,
                            remarkHighlight,
                            remarkComments,
                            remarkWikilinks,
                        ]}
                        rehypePlugins={[
                            rehypeHighlight,
                            rehypeKatex,
                            rehypeCallouts,
                        ]}
                        components={components}
                    >
                        {content}
                    </Markdown>
                </div>
            </div>
        </main>
    );
}
