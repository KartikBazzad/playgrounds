import React, { useEffect, useRef, useState } from 'react';
import Dropdown from '@/components/Dropdown';
import { useSchema } from '@/lib/useSchema';
import { useRunner } from '@/lib/useRunner';
import { getDB, resetSession } from '@/lib/duckdb';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface HistoryItem {
  input: string;
}

type OutputItem =
  | { kind: 'cmd'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'result'; title: string; columns: string[]; rows: Array<Record<string, unknown>>; execMs: number; message: string };

export default function ShellTerminal() {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [histIndex, setHistIndex] = useState<number | null>(null);
  // Textarea removed; input handled via xterm
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const termContainerRef = useRef<HTMLDivElement | null>(null);
  const lineBufRef = useRef<string>('');
  // Refs to avoid stale state in xterm handlers
  const historyRef = useRef<HistoryItem[]>([]);
  const histIndexRef = useRef<number | null>(null);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { histIndexRef.current = histIndex; }, [histIndex]);
  // Track last result summary for copy
  const lastSummaryRef = useRef<string>('');

  // Clipboard helpers
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }
  };
  const copySelection = async () => {
    const sel = termRef.current?.getSelection?.() || '';
    if (sel) await copyText(sel);
  };
  const copyLastCommand = async () => {
    const last = historyRef.current[historyRef.current.length - 1]?.input || '';
    if (last) await copyText(last);
  };
  const copyLastSummary = async () => {
    if (lastSummaryRef.current) await copyText(lastSummaryRef.current);
  };
  const clearTerminal = () => {
    try { termRef.current?.clear(); } catch {}
    try { if (termRef.current) { termRef.current.write('\u001b[2J\u001b[3J\u001b[H'); } } catch {}
    try { if (termRef.current) { termRef.current.writeln('\u001b[90mDuckDB Web Shell — cleared.\u001b[0m'); writePrompt(termRef.current); } } catch {}
  };

  // Render helpers for xterm
  const writePrompt = (term: Terminal) => {
    term.write('\u001b[90mduckdb> \u001b[0m');
  };
  const renderPromptAndBuffer = (term: Terminal) => {
    // Clear line and carriage return
    term.write('\u001b[2K\r');
    writePrompt(term);
    if (lineBufRef.current) term.write(lineBufRef.current);
  };

  // Load DB
  useEffect(() => {
    (async () => { await getDB(); setReady(true); })();
  }, []);

  // Init xterm terminal
  useEffect(() => {
    if (termRef.current || !termContainerRef.current) return;
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      disableStdin: false,
      scrollback: 1000,
      theme: {
        background: '#0b0b0b',
      },
    });
    const fit = new FitAddon();
    const links = new WebLinksAddon();
    term.loadAddon(fit);
    term.loadAddon(links);
    term.open(termContainerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;
    // Autofocus terminal on mount
    try { term.focus(); } catch {}
    // Welcome line
    term.writeln('\u001b[90mDuckDB Web Shell — type SQL and press Enter. Shift+Enter inserts a newline. Type .help for commands.\u001b[0m');
    // Prompt
    writePrompt(term);
    // Input handling
    const ignoreCROnceRef = { current: false } as { current: boolean };
    term.onData((data) => {
      const code = data.charCodeAt(0);
      // If Shift+Enter was handled in onKey, ignore the CR once
      if (ignoreCROnceRef.current && data === '\r') {
        ignoreCROnceRef.current = false;
        term.write('\n');
        lineBufRef.current += '\n';
        return;
      }
      // Enter (CR) submits
      if (data === '\r') {
        const current = lineBufRef.current.trim();
        term.writeln('');
        if (current.length > 0) {
          // Execute with explicit text to avoid stale React state
          setInput(current);
          setTimeout(() => execute(current), 0);
        } else {
          writePrompt(term);
        }
        lineBufRef.current = '';
        return;
      }
      // Backspace
      if (code === 127) {
        if (lineBufRef.current.length > 0) {
          lineBufRef.current = lineBufRef.current.slice(0, -1);
          // Erase last char: move left, erase, move left
          term.write('\b \b');
        }
        return;
      }
      // Printable range
      if (data >= ' ' && data <= '~') {
        lineBufRef.current += data;
        term.write(data);
        return;
      }
      // Newline from paste
      if (data === '\n') {
        lineBufRef.current += '\n';
        term.write('\n');
        return;
      }
    });
    // Key handling for history navigation
    term.onKey((e) => {
      const { key, domEvent } = e;
      // Shift+Enter -> newline (do not submit)
      if (domEvent.key === 'Enter' && domEvent.shiftKey) {
        domEvent.preventDefault();
        ignoreCROnceRef.current = true;
        return;
      }
      if (domEvent.key === 'ArrowUp' || domEvent.key === 'ArrowDown') {
        domEvent.preventDefault();
        const hist = historyRef.current;
        if (!hist.length) return;
        const curIdx = histIndexRef.current;
        if (curIdx == null) {
          const idx = domEvent.key === 'ArrowUp' ? hist.length - 1 : 0;
          setHistIndex(idx);
          lineBufRef.current = hist[idx].input;
          renderPromptAndBuffer(term);
        } else {
          let idx = curIdx + (domEvent.key === 'ArrowUp' ? -1 : 1);
          idx = Math.max(0, Math.min(hist.length - 1, idx));
          setHistIndex(idx);
          lineBufRef.current = hist[idx].input;
          renderPromptAndBuffer(term);
        }
      }
    });
    // Resize observer
    const ro = new ResizeObserver(() => {
      try { fitRef.current?.fit(); } catch {}
    });
    ro.observe(termContainerRef.current);
    return () => {
      try { ro.disconnect(); } catch {}
      try { term.dispose(); } catch {}
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Schema for runner
  const { refreshSchema } = useSchema(ready);
  const { run } = useRunner(refreshSchema, (t) => t);

  // Removed legacy results scroller

  // Textarea key handling removed

  const addOutput = (item: OutputItem) => {
    // Write only to xterm
    const term = termRef.current;
    if (term) {
      if (item.kind === 'cmd') {
        term.writeln(`\u001b[90mduckdb>\u001b[0m ${item.text}`);
      } else if (item.kind === 'info') {
        term.writeln(item.text);
      } else if (item.kind === 'error') {
        term.writeln(`\u001b[31mError: ${item.text}\u001b[0m`);
      } else if (item.kind === 'result') {
        // Do not format table in shell; just a concise summary line
        const summary = `${item.title} • ${item.rows.length} row${item.rows.length===1?'':'s'} • ${Math.round(item.execMs)} ms`;
        lastSummaryRef.current = summary;
        term.writeln(`\u001b[90m${summary}\u001b[0m`);
      }
    }
  };

  // Try to install httpfs robustly (plain, with custom repo, with FROM clause)
  const installHttpfs = async () => {
    try {
      await run('INSTALL httpfs;');
      return true;
    } catch (_e1: any) {
      // Try setting the extension repository explicitly
      try {
        await run("SET custom_extension_repository='https://extensions.duckdb.org';");
        await run('INSTALL httpfs;');
        return true;
      } catch (_e2: any) {
        // Try FROM syntax as another fallback
        try {
          await run("INSTALL httpfs FROM 'https://extensions.duckdb.org';");
          return true;
        } catch (_e3: any) {
          return false;
        }
      }
    }
  };

  // Removed text table formatting; shell prints only summary lines

  const execute = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text) return;
    setHistory((h) => [...h, { input: text }]);
    setHistIndex(null);
    addOutput({ kind: 'cmd', text });
    setInput('');
    setRunning(true);
    try {
      if (text === '.help') {
        addOutput({ kind: 'info', text: 'Commands:\n  .help               Show this help\n  .tables             List tables\n  .schema T           Show columns for table T\n  .install EXT        INSTALL DuckDB extension\n  .load EXT           LOAD DuckDB extension\n  .extensions         List available/installed extensions\n  .reset              Reset DuckDB session (clears connection and reinitializes)\n\nTips:\n  LOAD SAMPLE;        Load demo people table (shared across Shell and Playground)\n' });
      } else if (text === '.reset') {
        await resetSession();
        setReady(false);
        await getDB();
        setReady(true);
        try { await refreshSchema(); } catch {}
        addOutput({ kind: 'info', text: 'Session reset. New DuckDB instance initialized.' });
      } else if (/^\.install\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i.test(text)) {
        const m = text.match(/^\.install\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i);
        const ext = m?.[1];
        if (ext) {
          if (ext.toLowerCase() === 'httpfs') {
            const ok = await installHttpfs();
            if (!ok) throw new Error("Failed to install 'httpfs' (tried default and extensions.duckdb.org)");
          } else {
            await run(`INSTALL ${ext};`);
          }
          addOutput({ kind: 'info', text: `Installed extension '${ext}'.` });
        }
      } else if (/^\.load\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i.test(text)) {
        const m = text.match(/^\.load\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i);
        const ext = m?.[1];
        if (ext) {
          try {
            await run(`LOAD ${ext};`);
          } catch (e: any) {
            const msg = String(e?.message || e);
            // Auto-install on common "not found" failure
            if (/not found/i.test(msg) || /install it first/i.test(msg)) {
              if (ext.toLowerCase() === 'httpfs') {
                const ok = await installHttpfs();
                if (!ok) throw new Error("Failed to install 'httpfs' (tried default and extensions.duckdb.org)");
              } else {
                await run(`INSTALL ${ext};`);
              }
              await run(`LOAD ${ext};`);
            } else {
              throw e;
            }
          }
          addOutput({ kind: 'info', text: `Loaded extension '${ext}'.` });
        }
      } else if (text === '.extensions') {
        // Try to list extensions via system table function; fall back to PRAGMA if needed
        try {
          const res = await run('SELECT * FROM duckdb_extensions();');
          addOutput({ kind: 'result', title: 'Extensions', columns: res.columns, rows: res.rows, execMs: res.execMs, message: res.message });
        } catch {
          const res = await run('PRAGMA show_extensions;');
          addOutput({ kind: 'result', title: 'Extensions', columns: res.columns, rows: res.rows, execMs: res.execMs, message: res.message });
        }
      } else if (text === '.tables') {
        const res = await run("SELECT table_name FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name;");
        addOutput({ kind: 'result', title: 'Tables', columns: res.columns, rows: res.rows, execMs: res.execMs, message: res.message });
      } else if (/^\.schema\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/.test(text)) {
        const m = text.match(/^\.schema\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/);
        const tbl = m ? m[1] : '';
        const res = await run(`PRAGMA table_info(${tbl});`);
        addOutput({ kind: 'result', title: `Schema of ${tbl}`, columns: res.columns, rows: res.rows, execMs: res.execMs, message: res.message });
      } else {
        const res = await run(text);
        addOutput({ kind: 'result', title: 'Result', columns: res.columns, rows: res.rows, execMs: res.execMs, message: res.message });
      }
    } catch (e: any) {
      addOutput({ kind: 'error', text: String(e?.message || e) });
    } finally {
      setRunning(false);
      // Focus terminal
      try { termRef.current?.focus?.(); } catch {}
      // Re-prompt in xterm
      try { if (termRef.current) { termRef.current.write('\n'); writePrompt(termRef.current); } } catch {}
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="card bg-base-100 border border-base-300 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <strong>DuckDB Shell</strong>
          <span className={`badge ${running ? 'badge-warning' : (ready ? 'badge-success' : 'badge-neutral')} badge-sm`}>
            {ready ? (running ? 'Running…' : 'Ready') : 'Initializing…'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            className="btn btn-ghost btn-sm"
            title="Copy selection"
            onClick={copySelection}
            aria-label="Copy selection"
          >
            <span aria-hidden>📋</span>
          </button>
          {/* Actions dropdown */}
          <Dropdown
            alignEnd
            triggerClassName="btn btn-ghost btn-sm"
            trigger={<span aria-label="Actions menu">⋯</span>}
            widthClassName="w-60"
          >
            <li><button onClick={copySelection}>Copy selection</button></li>
            <li><button onClick={copyLastCommand}>Copy last command</button></li>
            <li><button onClick={copyLastSummary}>Copy last summary</button></li>
            <li><hr className="my-1" /></li>
            <li><button onClick={clearTerminal}>Clear terminal</button></li>
            <li><button onClick={() => execute('LOAD SAMPLE;')}>Load sample (people)</button></li>
            <li><button onClick={() => execute('.reset')}>Reset session</button></li>
          </Dropdown>
        </div>
      </div>

      {/* Xterm terminal container */}
      <div className="card bg-base-100 border border-base-300 p-0">
        <div
          ref={termContainerRef}
          className="h-[220px] w-full"
          tabIndex={0}
          onClick={() => { try { termRef.current?.focus?.(); } catch {} }}
        />
      </div>
    </div>
  );
}
