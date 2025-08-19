import React from 'react';
import { useSEO } from '@/lib/useSEO';
import ShellTerminal from '@/components/ShellTerminal';

export default function WebShell() {
  useSEO({
    title: 'Web Shell – DuckDB WASM Terminal',
    description: 'A lightweight web terminal for running DuckDB commands directly in your browser using WebAssembly.',
    image: '/og-image.png',
    siteName: 'DuckDB Data Processing',
  });
  return (
    <div className="h-full w-full flex flex-col">
      <ShellTerminal />
    </div>
  );
}

