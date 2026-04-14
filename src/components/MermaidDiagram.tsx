import { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;
let nextDiagramId = 0;

async function getMermaid() {
  const { default: mermaid } = await import("mermaid");

  if (mermaidInitialized) return mermaid;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
    fontFamily: "inherit",
  });

  mermaidInitialized = true;

  return mermaid;
}

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramIdRef = useRef(`mermaid-diagram-${nextDiagramId++}`);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = await getMermaid();
        const { svg, bindFunctions } = await mermaid.render(diagramIdRef.current, code);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Failed to render Mermaid diagram";
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
        setError(message);
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Mermaid render error: {error}
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
