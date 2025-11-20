// src/components/Mermaid.tsx
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default", // or "dark"
});

interface MermaidProps {
  chart: string;
}

export default function FlowChart({ chart }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      // Clear previous render
      containerRef.current.innerHTML = "";
      setError(null);

      try {
        const { svg } = await mermaid.render(
          `mermaid-${Math.random().toString(36).slice(2)}`,
          chart
        );
        if (!isCancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!isCancelled) {
          setError("Failed to render mermaid diagram");
          // Optional: log real error
          console.error(e);
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [chart]);

  return (
    <div>
      {error && (
        <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</pre>
      )}
      <div ref={containerRef} />
    </div>
  );
};

