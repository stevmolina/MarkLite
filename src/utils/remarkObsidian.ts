/**
 * Custom remark/rehype plugins for Obsidian-flavored markdown syntax.
 *
 * Supports:
 * - ==highlighted text==
 * - %%hidden comments%%
 * - [[wikilinks]] and [[wikilinks|display text]]
 * - > [!type] callout blocks
 */

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent } from 'mdast';

// ── Highlight ==text== ──────────────────────────────────────────────

/**
 * Remark plugin that transforms ==text== into <mark> elements.
 */
export const remarkHighlight: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, 'text', (node: Text, index, parent) => {
            if (!parent || index === undefined) return;
            const regex = /==((?:(?!==).)+)==/g;
            const value = node.value;
            if (!regex.test(value)) return;

            regex.lastIndex = 0;
            const children: PhrasingContent[] = [];
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(value)) !== null) {
                if (match.index > lastIndex) {
                    children.push({ type: 'text', value: value.slice(lastIndex, match.index) });
                }
                children.push({
                    type: 'html',
                    value: `<mark>${match[1]}</mark>`,
                } as unknown as PhrasingContent);
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < value.length) {
                children.push({ type: 'text', value: value.slice(lastIndex) });
            }

            if (children.length > 0) {
                parent.children.splice(index, 1, ...children);
            }
        });
    };
};

// ── Comments %%hidden%% ─────────────────────────────────────────────

/**
 * Remark plugin that strips %%comment%% blocks (both inline and multi-line).
 */
export const remarkComments: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, 'text', (node: Text, index, parent) => {
            if (!parent || index === undefined) return;
            // Strip inline %%...%% comments
            const stripped = node.value.replace(/%%[\s\S]*?%%/g, '');
            if (stripped !== node.value) {
                if (stripped.trim() === '') {
                    parent.children.splice(index, 1);
                    return index; // revisit this index
                }
                node.value = stripped;
            }
        });
    };
};

// ── Wikilinks [[page]] and [[page|display]] ─────────────────────────

/**
 * Remark plugin that converts [[wikilinks]] to regular markdown links.
 * - [[Page Name]] → link with text "Page Name"
 * - [[Page Name|Display Text]] → link with text "Display Text"
 */
export const remarkWikilinks: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, 'text', (node: Text, index, parent) => {
            if (!parent || index === undefined) return;
            const regex = /\[\[([^\]]+?)(?:\|([^\]]+?))?\]\]/g;
            const value = node.value;
            if (!regex.test(value)) return;

            regex.lastIndex = 0;
            const children: PhrasingContent[] = [];
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(value)) !== null) {
                if (match.index > lastIndex) {
                    children.push({ type: 'text', value: value.slice(lastIndex, match.index) });
                }

                const target = match[1].trim();
                const display = match[2]?.trim() || target;

                children.push({
                    type: 'link',
                    url: target,
                    children: [{ type: 'text', value: display }],
                    data: {
                        hProperties: { className: ['wikilink'] },
                    },
                });
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < value.length) {
                children.push({ type: 'text', value: value.slice(lastIndex) });
            }

            if (children.length > 0) {
                parent.children.splice(index, 1, ...children);
            }
        });
    };
};

// ── Callouts > [!type] ──────────────────────────────────────────────

const CALLOUT_TYPES: Record<string, { icon: string; label: string }> = {
    note: { icon: '📝', label: 'Note' },
    info: { icon: 'ℹ️', label: 'Info' },
    tip: { icon: '💡', label: 'Tip' },
    hint: { icon: '💡', label: 'Hint' },
    important: { icon: '❗', label: 'Important' },
    warning: { icon: '⚠️', label: 'Warning' },
    caution: { icon: '⚠️', label: 'Caution' },
    danger: { icon: '🔴', label: 'Danger' },
    error: { icon: '❌', label: 'Error' },
    bug: { icon: '🐛', label: 'Bug' },
    example: { icon: '📋', label: 'Example' },
    quote: { icon: '💬', label: 'Quote' },
    cite: { icon: '💬', label: 'Cite' },
    abstract: { icon: '📄', label: 'Abstract' },
    summary: { icon: '📄', label: 'Summary' },
    tldr: { icon: '📄', label: 'TL;DR' },
    todo: { icon: '✅', label: 'Todo' },
    success: { icon: '✅', label: 'Success' },
    check: { icon: '✅', label: 'Check' },
    done: { icon: '✅', label: 'Done' },
    question: { icon: '❓', label: 'Question' },
    help: { icon: '❓', label: 'Help' },
    faq: { icon: '❓', label: 'FAQ' },
    failure: { icon: '❌', label: 'Failure' },
    fail: { icon: '❌', label: 'Fail' },
    missing: { icon: '❌', label: 'Missing' },
};

/**
 * Rehype plugin that transforms blockquotes starting with [!type] into
 * styled callout boxes matching Obsidian's callout syntax.
 */
export const rehypeCallouts: Plugin = () => {
    return (tree: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visit(tree as any, 'element', (node: any) => {
            if (node.tagName !== 'blockquote') return;

            const children = node.children as Array<Record<string, unknown>>;
            if (!children || children.length === 0) return;

            // Find the first paragraph inside the blockquote
            const firstP = children.find(
                (c) => c.tagName === 'p'
            );
            if (!firstP) return;

            const pChildren = firstP.children as Array<Record<string, unknown>>;
            if (!pChildren || pChildren.length === 0) return;

            // Check if the first text node starts with [!type]
            const firstText = pChildren.find((c) => c.type === 'text') as
                | { type: string; value: string }
                | undefined;
            if (!firstText) return;

            const calloutMatch = firstText.value.match(
                /^\s*\[!(\w+)\]\s*(.*)/
            );
            if (!calloutMatch) return;

            const typeName = calloutMatch[1].toLowerCase();
            const customTitle = calloutMatch[2]?.trim();
            const calloutDef = CALLOUT_TYPES[typeName] || {
                icon: '📝',
                label: typeName.charAt(0).toUpperCase() + typeName.slice(1),
            };

            const title = customTitle || calloutDef.label;

            // Remove the [!type] text from the first paragraph
            firstText.value = firstText.value
                .replace(/^\s*\[!\w+\]\s*.*/, '')
                .trim();
            if (!firstText.value) {
                const textIdx = pChildren.indexOf(firstText);
                if (textIdx !== -1) pChildren.splice(textIdx, 1);
            }

            // Remove empty first paragraph
            if (pChildren.length === 0) {
                const pIdx = children.indexOf(firstP);
                if (pIdx !== -1) children.splice(pIdx, 1);
            }

            // Transform the blockquote into a callout
            const props = (node.properties || {}) as Record<string, unknown>;
            const existingClass = (props.className as string[]) || [];
            props.className = [...existingClass, 'callout', `callout-${typeName}`];
            node.properties = props;

            // Prepend a title element
            const titleNode = {
                type: 'element',
                tagName: 'div',
                properties: { className: ['callout-title'] },
                children: [
                    {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['callout-icon'] },
                        children: [{ type: 'text', value: calloutDef.icon }],
                    },
                    {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['callout-title-text'] },
                        children: [{ type: 'text', value: title }],
                    },
                ],
            };

            const contentWrapper = {
                type: 'element',
                tagName: 'div',
                properties: { className: ['callout-content'] },
                children: [...children.splice(0)],
            };

            children.length = 0;
            children.push(titleNode, contentWrapper);
        });
    };
};
