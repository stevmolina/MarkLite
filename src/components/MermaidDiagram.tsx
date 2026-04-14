import { useEffect, useRef, useState } from "react";
import { useTheme, type Theme } from "../context/ThemeContext";

let nextDiagramId = 0;

async function getMermaid() {
  const { default: mermaid } = await import("mermaid");
  return mermaid;
}

function getMermaidTheme(theme: Theme) {
  switch (theme) {
    case "light":
      return {
        darkMode: false,
        background: "#fafafa",
        textColor: "#171717",
        primaryColor: "#f5f5f5",
        primaryTextColor: "#171717",
        primaryBorderColor: "#d4d4d4",
        secondaryColor: "#ffffff",
        secondaryTextColor: "#171717",
        tertiaryColor: "#f0f0f0",
        tertiaryTextColor: "#171717",
        mainBkg: "#f5f5f5",
        secondBkg: "#ffffff",
        tertiaryBkg: "#f0f0f0",
        lineColor: "#404040",
        nodeBorder: "#d4d4d4",
        clusterBkg: "#fafafa",
        clusterBorder: "#d4d4d4",
        edgeLabelBackground: "#ffffff",
      };
    case "paper":
      return {
        darkMode: false,
        background: "#ebe5d8",
        textColor: "#3d3d3d",
        primaryColor: "#f5f0e6",
        primaryTextColor: "#3d3d3d",
        primaryBorderColor: "#b9ad95",
        secondaryColor: "#faf8f3",
        secondaryTextColor: "#3d3d3d",
        tertiaryColor: "#ddd6c6",
        tertiaryTextColor: "#3d3d3d",
        mainBkg: "#f5f0e6",
        secondBkg: "#faf8f3",
        tertiaryBkg: "#ddd6c6",
        lineColor: "#5c4033",
        nodeBorder: "#b9ad95",
        clusterBkg: "#ebe5d8",
        clusterBorder: "#c9c0ae",
        edgeLabelBackground: "#faf8f3",
      };
    case "github":
      return {
        darkMode: false,
        background: "#f6f8fa",
        textColor: "#1f2328",
        primaryColor: "#ffffff",
        primaryTextColor: "#1f2328",
        primaryBorderColor: "#d0d7de",
        secondaryColor: "#f6f8fa",
        secondaryTextColor: "#1f2328",
        tertiaryColor: "#eaeef2",
        tertiaryTextColor: "#1f2328",
        mainBkg: "#ffffff",
        secondBkg: "#f6f8fa",
        tertiaryBkg: "#eaeef2",
        lineColor: "#656d76",
        nodeBorder: "#d0d7de",
        clusterBkg: "#f6f8fa",
        clusterBorder: "#d0d7de",
        edgeLabelBackground: "#ffffff",
      };
    case "dark":
    default:
      return {
        darkMode: true,
        background: "#141414",
        textColor: "#ffffff",
        primaryColor: "#1f1f1f",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#525252",
        secondaryColor: "#262626",
        secondaryTextColor: "#ffffff",
        tertiaryColor: "#171717",
        tertiaryTextColor: "#ffffff",
        mainBkg: "#1f1f1f",
        secondBkg: "#262626",
        tertiaryBkg: "#171717",
        lineColor: "#d4d4d4",
        nodeBorder: "#525252",
        clusterBkg: "#141414",
        clusterBorder: "#404040",
        edgeLabelBackground: "#0a0a0a",
      };
  }
}

interface MermaidDiagramProps {
  code: string;
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramIdRef = useRef(`mermaid-diagram-${nextDiagramId++}`);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = await getMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "inherit",
          themeVariables: getMermaidTheme(theme),
        });

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
  }, [code, theme]);

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
