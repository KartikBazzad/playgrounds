'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id = 'mermaid-diagram' }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
      });
      
      mermaid.render(`${id}-${Math.random().toString(36).substr(2, 9)}`, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg;
        }
      });
    }
  }, [chart, id]);

  return (
    <div 
      ref={ref} 
      className="mermaid-diagram my-6 flex justify-center bg-white p-4 rounded-lg border border-gray-200"
    />
  );
}
