import { useEffect, useMemo, useRef, useState } from 'react';
import { useSEO } from '@/lib/useSEO';
import { getDB, getConn, resetSession, ensureHttpfs } from '@/lib/duckdb';
import { idbGet, idbSet } from '@/lib/idb';
// CodeMirror is now used inside subcomponents
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { hoverTooltip } from '@codemirror/view';
import NotebookCell from '@/components/NotebookCell';
import Notebook from '@/components/Notebook';
import Toolbar from '@/components/Toolbar';
import { useSchema } from '@/lib/useSchema';
import { useRunner } from '@/lib/useRunner';

interface Row { [k: string]: unknown }

export default function Playground() {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  // Notebook-only mode
  const defaultSQL = `-- Welcome! Try these:
-- 1) Load the sample CSV
LOAD SAMPLE;
-- 2) Query it
SELECT * FROM people LIMIT 5;
-- 3) Simple aggregation
SELECT city, COUNT(*) AS n FROM people GROUP BY city ORDER BY n DESC;`;
  // Legacy single-editor state removed; notebook cells hold SQL/results/messages
  const [sql, setSql] = useState<string>(defaultSQL);
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');
  const [execMs, setExecMs] = useState<number | null>(null);
  const runningRef = useRef(false);
  const [snippet, setSnippet] = useState('');
  const [dataset, setDataset] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  // pagination handled inside ResultsPanel/SingleEditor
  const [vars, setVars] = useState<Record<string, string>>({});
  const [showVars, setShowVars] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const snippetsRef = useRef<HTMLDivElement | null>(null);
  const datasetsRef = useRef<HTMLDivElement | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showDatasets, setShowDatasets] = useState(false);
  const [debugLogs, setDebugLogs] = useState<boolean>(false);
  const { schemaTables, schemaColumns, refreshSchema } = useSchema(ready);
  const [schemaOpen, setSchemaOpen] = useState<boolean>(false);

  useSEO({
    title: 'DuckDB Playground – Run SQL in Your Browser',
    description: 'Execute DuckDB SQL in the browser with datasets, notebooks, and shareable links. No backend required.',
    image: '/og-image.png',
    siteName: 'DuckDB Data Processing',
  });

  // Safe JSON logging helper to handle BigInt values in result rows
  const jsonLog = (o: unknown) => {
    try {
      // Replacer converts BigInt to string to avoid JSON serialization errors
      const s = JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
      // eslint-disable-next-line no-console
      console.log(s);
    } catch (e) {
      // Fallback: best-effort log
      // eslint-disable-next-line no-console
      console.log('[log-json-failed]', e);
    }
  };

  // Markdown helpers
  const escapeMd = (s: any) => String(s ?? '').replace(/\|/g, '\\|');
  const tableToMarkdown = (cols: string[], rows: Row[], limit = 50) => {
    if (!cols.length) return '';
    const header = `| ${cols.map(escapeMd).join(' | ')} |`;
    const sep = `| ${cols.map(() => '---').join(' | ')} |`;
    const body = rows.slice(0, limit).map((r) => `| ${cols.map((c) => escapeMd((r as any)[c])).join(' | ')} |`).join('\n');
    return [header, sep, body].filter(Boolean).join('\n');
  };
  const cellToMarkdown = (cell: Cell) => {
    const title = cell.title ? `\n\n### ${cell.title}\n` : '\n\n';
    if (cell.mode === 'md') {
      return `${title}${cell.sql || ''}`;
    }
    const code = `\n\n\`\`\`sql\n${cell.sql || ''}\n\`\`\``;
    const table = (cell.columns?.length || 0) ? `\n\n${tableToMarkdown(cell.columns, cell.rows)}` : '';
    return `${title}${code}${table}`;
  };
  const notebookToMarkdown = (nb: NotebookT) => {
    const h = `## ${nb.label}\n`;
    return h + nb.cells.map(cellToMarkdown).join('\n');
  };

  const copyNotebookMarkdown = async (nbId: string) => {
    const nb = notebooks.find((n) => n.id === nbId);
    if (!nb) return;
    try { await navigator.clipboard.writeText(notebookToMarkdown(nb)); showToast('Notebook Markdown copied'); } catch { setMessage('Failed to copy Markdown'); }
  };
  const copyCellMarkdown = async (nbId: string, cellId: string) => {
    const nb = notebooks.find((n) => n.id === nbId);
    const cell = nb?.cells.find((c) => c.id === cellId);
    if (!nb || !cell) return;
    try { await navigator.clipboard.writeText(cellToMarkdown(cell)); showToast('Cell Markdown copied'); } catch { setMessage('Failed to copy Markdown'); }
  };

  // Workspace export/import
  const exportWorkspace = () => {
    const payload = {
      v: 1,
      vars,
      notebooks: notebooks.map((nb) => ({ label: nb.label, vars: nb.vars || {}, cells: nb.cells.map((c) => ({ title: c.title, sql: c.sql, mode: c.mode || 'sql' })) })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'playground_workspace.json'; a.click(); URL.revokeObjectURL(url);
    showToast('Workspace exported');
  };
  const importWorkspace = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const importedNBs: NotebookT[] = Array.isArray(data?.notebooks) ? data.notebooks.map((nb: any, i: number) => ({
        id: genId(), label: typeof nb?.label === 'string' ? nb.label : `Notebook ${i + 1}`, isOpen: true, showVars: false, vars: (nb?.vars && typeof nb.vars === 'object') ? nb.vars : {},
        cells: Array.isArray(nb?.cells) ? nb.cells.map((c: any, j: number) => ({ id: genId(), title: typeof c?.title === 'string' ? c.title : `Cell ${j + 1}`, sql: typeof c?.sql === 'string' ? c.sql : '', columns: [], rows: [], message: '', running: false, mode: c?.mode === 'md' ? 'md' : 'sql' })) : [],
      })) : [];
      if (!importedNBs.length) throw new Error('No notebooks in file');
      setVars((data?.vars && typeof data.vars === 'object') ? data.vars : {});
      setNotebooks(importedNBs);
      setActiveNotebookId(importedNBs[0].id);
      setActiveCellId(importedNBs[0].cells[0]?.id ?? null);
      showToast('Workspace imported');
    } catch (e: any) {
      setMessage(`Import failed: ${String(e?.message || e)}`);
    }
  };

  type Cell = {
    id: string;
    title: string;
    sql: string;
    columns: string[];
    rows: Row[];
    message: string;
    running: boolean;
    execMs?: number | null;
    mode?: 'sql' | 'md';
  };
  type NotebookT = { id: string; label: string; isOpen: boolean; showVars?: boolean; cells: Cell[]; vars?: Record<string, string> };
  const [notebooks, setNotebooks] = useState<NotebookT[]>([{ id: genId(), label: 'Notebook 1', isOpen: true, showVars: false, vars: {}, cells: [{ id: genId(), title: 'Cell 1', sql: defaultSQL, columns: [], rows: [], message: '', running: false, mode: 'sql' }] }]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => notebooks[0].id);
  const [activeCellId, setActiveCellId] = useState<string | null>(() => (notebooks[0].cells[0]?.id ?? null));

  useEffect(() => {
    (async () => {
      await getDB();
      setReady(true);
    })();
  }, []);

  // Restore persisted uploads (VFS files) and tables/views and datasets
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const db = await getDB();
        // 1) Restore uploaded files into VFS
        const uploads = (await idbGet<any[]>('uploads')) || [];
        for (const u of uploads) {
          try {
            if (u?.blob && u?.vfsPath) {
              const ab: ArrayBuffer = await (u.blob as Blob).arrayBuffer();
              await db.registerFileBuffer(u.vfsPath, new Uint8Array(ab));
            }
          } catch {}
        }
      } catch {}
      try {
        // 2) Replay DDLs for tables/views
        const metas = (await idbGet<any[]>('tables_metadata')) || [];
        const conn = await getConn();
        for (const m of metas) {
          if (m?.ddl) {
            try { await conn.query(String(m.ddl)); } catch {}
          }
        }
      } catch {}
      try {
        // 3) Reload datasets by key (idempotent)
        const ds = (await idbGet<string[]>('datasets_loaded')) || [];
        for (const key of ds) {
          try { await loadDataset(key); } catch {}
        }
      } catch {}
      try { await refreshSchema(); } catch {}
      // 4) Load notebooks (migrate from legacy notebook_cells if present)
      try {
        const legacy = await idbGet<any[]>('notebook_cells');
        const stored = await idbGet<any[]>('notebooks');
        if (stored && Array.isArray(stored) && stored.length) {
          const fixed: NotebookT[] = stored.map((nb: any, i: number) => ({
            id: nb.id ?? genId(),
            label: typeof nb.label === 'string' ? nb.label : `Notebook ${i + 1}`,
            isOpen: nb.isOpen !== false,
            showVars: !!nb.showVars,
            vars: nb.vars && typeof nb.vars === 'object' ? nb.vars : {},
            cells: Array.isArray(nb.cells) ? nb.cells.map((c: any, j: number) => ({
              id: c.id ?? genId(),
              title: typeof c.title === 'string' ? c.title : `Cell ${j + 1}`,
              sql: typeof c.sql === 'string' ? c.sql : '-- New cell',
              columns: Array.isArray(c.columns) ? c.columns : [],
              rows: Array.isArray(c.rows) ? c.rows : [],
              message: typeof c.message === 'string' ? c.message : '',
              running: !!c.running,
              execMs: c.execMs ?? null,
              mode: c.mode === 'md' ? 'md' : 'sql',
            })) : [],
          }));
          setNotebooks(fixed);
          setActiveNotebookId(fixed[0]?.id || genId());
          setActiveCellId(fixed[0]?.cells[0]?.id ?? null);
        } else if (legacy && Array.isArray(legacy) && legacy.length) {
          const nb: NotebookT = { id: genId(), label: 'Notebook 1', isOpen: true, showVars: false, vars: {}, cells: legacy.map((c: any, i: number) => ({
            id: c.id ?? genId(), title: c.title ?? `Cell ${i + 1}`, sql: c.sql ?? '-- New cell', columns: Array.isArray(c.columns) ? c.columns : [], rows: Array.isArray(c.rows) ? c.rows : [], message: typeof c.message === 'string' ? c.message : '', running: !!c.running, execMs: c.execMs ?? null, mode: c.mode === 'md' ? 'md' : 'sql'
          })) };
          setNotebooks([nb]);
          setActiveNotebookId(nb.id);
          setActiveCellId(nb.cells[0]?.id ?? null);
        }
      } catch {}
    })();
  }, [ready]);

  // runner hook
  const { run } = useRunner(refreshSchema, (text: string) => interpolateSQL(text));

  // SQL keyword list (subset)
  const SQL_KEYWORDS = [
    'SELECT','FROM','WHERE','GROUP','BY','ORDER','LIMIT','JOIN','LEFT','RIGHT','FULL','OUTER','INNER','ON','USING','UNION','ALL','AS','INSERT','INTO','VALUES','CREATE','TABLE','VIEW','OR','REPLACE','DROP','IF','EXISTS','UPDATE','SET','DELETE','DISTINCT','HAVING','CASE','WHEN','THEN','ELSE','END','AND','OR','NOT','NULL','IS','LIKE','IN','BETWEEN'
  ];

  // Simple word matcher
  const wordRE = /[A-Za-z_][A-Za-z0-9_]*/;

  // Parse simple table aliases in the query text
  function parseAliases(text: string): Record<string, string> {
    const aliases: Record<string, string> = {};
    const re = /(from|join)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) != null) {
      const tbl = m[2];
      const alias = m[3];
      if (alias) aliases[alias] = tbl;
    }
    return aliases;
  }

  // Completion source using schema and keywords with context awareness
  const sqlCompletion = (ctx: CompletionContext) => {
    const { state } = ctx;
    const pos = ctx.pos;
    const line = state.doc.lineAt(pos);
    const before = state.sliceDoc(line.from, pos);
    const after = state.sliceDoc(pos, line.to);

    // Detect qualified completion: table./alias.
    const qualMatch = before.match(/([A-Za-z_][A-Za-z0-9_]*)\.$/);
    const m = ctx.matchBefore(wordRE);
    if (!m && !qualMatch && !ctx.explicit) return null;

    // Determine FROM/JOIN context to favor tables
    const windowStart = Math.max(0, pos - 200);
    const windowText = state.sliceDoc(windowStart, pos).toUpperCase();
    const inFromJoin = /(FROM|JOIN)\s+[A-Z_]*$/.test(windowText);

    // Build base option sets
    const kOpts: Completion[] = SQL_KEYWORDS.map((k) => ({ label: k, type: 'keyword', boost: 20 }));
    const tOpts: Completion[] = schemaTables.map((t) => ({ label: t, type: 'variable', info: 'table', boost: 50 }));
    const cOptsAll: Completion[] = Object.entries(schemaColumns).flatMap(([t, cols]) => cols.map((c) => ({ label: c, type: 'property', info: `column of ${t}`, boost: 40 })));

    // Qualified completion: only columns of that table/alias
    if (qualMatch) {
      const qual = qualMatch[1];
      const aliases = parseAliases(state.sliceDoc(0, state.doc.length));
      const table = schemaTables.includes(qual) ? qual : aliases[qual];
      const cols = table ? (schemaColumns[table] || []) : [];
      const options: Completion[] = cols.map((c) => ({ label: c, type: 'property', info: `column of ${table || 'table'}` }));
      return { from: pos, options, validFor: wordRE };
    }

    // Unqualified: choose based on context
    const from = m ? m.from : ctx.pos;
    const typed = m ? m.text : '';

    let options: Completion[];
    if (inFromJoin) {
      options = tOpts; // suggest tables when typing in FROM/JOIN clause
    } else {
      options = [...cOptsAll, ...tOpts, ...kOpts]; // prefer columns generally
    }
    options = options.filter((o) => !typed || o.label.toLowerCase().startsWith(typed.toLowerCase()));
    return { from, options, validFor: wordRE };
  };

  // Hover tooltip for tables/columns
  const sqlHover = hoverTooltip((view, pos) => {
    const { state } = view;
    const line = state.doc.lineAt(pos);
    const offset = pos - line.from;
    const text = line.text;
    const before = text.slice(0, offset);
    const after = text.slice(offset);
    const start = before.search(/[A-Za-z_][A-Za-z0-9_]*$/);
    const endMatch = after.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (start < 0 || !endMatch) return null;
    const startPos = line.from + start;
    const endPos = pos + endMatch[0].length;
    const word = (before.slice(start) + endMatch[0]).trim();
    if (!word) return null;
    let content = '';
    if (schemaTables.includes(word)) {
      const cols = schemaColumns[word] || [];
      content = `table ${word} (\n  ${cols.join(', ')}\n)`;
    } else {
      // find table that has this column
      const owner = Object.entries(schemaColumns).find(([, cols]) => cols.includes(word));
      if (owner) content = `column ${word} of ${owner[0]}`;
    }
    if (!content) return null;
    const dom = document.createElement('div');
    dom.style.whiteSpace = 'pre';
    dom.textContent = content;
    return { pos: startPos, end: endPos, create: () => ({ dom }) };
  });

  useEffect(() => {
    // persist SQL
    idbSet('playground_sql', sql).catch(() => {});
    // autosize textarea
    const el = taRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(600, Math.max(120, el.scrollHeight)) + 'px';
    }
  }, [sql]);

  useEffect(() => {
    // Load persisted state on mount
    (async () => {
      try {
        const hasHash = /^#sql=/.test(location.hash || '');
        if (!hasHash) {
          const persistedSql = await idbGet<string>('playground_sql');
          if (persistedSql) setSql(persistedSql);
        }
      } catch {}
      try {
        // Legacy persisted cells are now migrated in the notebooks loader above.
        // Intentionally no-op here to avoid conflicting state.
        await idbGet<any[]>('notebook_cells');
      } catch {}
      try {
        const persistedVars = await idbGet<Record<string, string>>('vars');
        if (persistedVars && typeof persistedVars === 'object') setVars(persistedVars);
      } catch {}
    })();
    // parse hash for shared content
    (async () => { try { await handleHash(true); } catch {} })();
    const onHash = () => { (async () => { try { await handleHash(false); } catch {} })(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Removed notebook_mode persistence (always notebook)

  useEffect(() => {
    idbSet('notebooks', notebooks).catch(() => {});
  }, [notebooks]);

  useEffect(() => {
    idbSet('vars', vars).catch(() => {});
  }, [vars]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      const closeIfOutside = (open: boolean, ref: React.RefObject<HTMLDivElement>, closer: () => void) => {
        if (!open) return;
        const el = ref.current;
        if (el && t && !el.contains(t)) closer();
      };
      closeIfOutside(showMenu, dropdownRef, () => setShowMenu(false));
      closeIfOutside(showSnippets, snippetsRef, () => setShowSnippets(false));
      closeIfOutside(showDatasets, datasetsRef, () => setShowDatasets(false));
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [showMenu, showSnippets, showDatasets]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2000);
  };

  // Handle URL fragments to restore shared content (supports gzip- and plain-base64)
  async function handleHash(initial: boolean) {
    const hash = location.hash || '';
    if (!hash) return;
    // #sqlgz=<b64-gzip>
    const mSqlGz = hash.match(/^#sqlgz=([^&]+)$/);
    if (mSqlGz && mSqlGz[1]) {
      try {
        const decoded = await gunzipFromBase64(decodeURIComponent(mSqlGz[1]));
        if (decoded) {
          // Import as a new notebook with a single cell
          const nbId = genId();
          const cell: Cell = { id: genId(), title: 'Shared SQL', sql: decoded, columns: [], rows: [], message: '', running: false, mode: 'sql' };
          const nb: NotebookT = { id: nbId, label: 'Imported SQL', isOpen: true, vars: {}, cells: [cell] };
          setNotebooks((prev) => [...prev, nb]);
          setActiveNotebookId(nbId);
          setActiveCellId(cell.id);
          clearHash();
          showToast('Imported shared SQL into a notebook');
        }
      } catch {}
      return;
    }
    // #sql=<b64>
    const mSql = hash.match(/^#sql=([^&]+)$/);
    if (mSql && mSql[1]) {
      const decoded = b64DecodeUtf8(decodeURIComponent(mSql[1]));
      if (decoded) {
        const nbId = genId();
        const cell: Cell = { id: genId(), title: 'Shared SQL', sql: decoded, columns: [], rows: [], message: '', running: false, mode: 'sql' };
        const nb: NotebookT = { id: nbId, label: 'Imported SQL', isOpen: true, vars: {}, cells: [cell] };
        setNotebooks((prev) => [...prev, nb]);
        setActiveNotebookId(nbId);
        setActiveCellId(cell.id);
        clearHash();
        showToast('Imported shared SQL into a notebook');
      }
      return;
    }
    // #nbpackgz=<b64-gzip>
    const mNbGz = hash.match(/^#nbpackgz=([^&]+)$/);
    if (mNbGz && mNbGz[1]) {
      try {
        const json = await gunzipFromBase64(decodeURIComponent(mNbGz[1]));
        const payload = JSON.parse(json || '{}');
        const nbId = genId();
        const cells: Cell[] = Array.isArray(payload?.cells) ? payload.cells.map((c: any, i: number) => ({
          id: genId(),
          title: typeof c?.title === 'string' ? c.title : `Cell ${i + 1}`,
          sql: typeof c?.sql === 'string' ? c.sql : '-- New cell',
          columns: [], rows: [], message: '', running: false, mode: c?.mode === 'md' ? 'md' : 'sql',
        })) : [{ id: genId(), title: 'Cell 1', sql: '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' }];
        const nb: NotebookT = { id: nbId, label: typeof payload?.label === 'string' ? payload.label : 'Imported Notebook', isOpen: true, vars: (payload?.vars && typeof payload.vars === 'object') ? payload.vars : {}, cells };
        setNotebooks((prev) => [...prev, nb]);
        setActiveNotebookId(nbId);
        setActiveCellId(cells[0]?.id ?? null);
        clearHash();
        showToast('Imported notebook from link');
      } catch {}
      return;
    }
    // #nbpack=<b64>
    const mNb = hash.match(/^#nbpack=([^&]+)$/);
    if (mNb && mNb[1]) {
      try {
        const json = b64DecodeUtf8(decodeURIComponent(mNb[1]));
        const payload = JSON.parse(json || '{}');
        const nbId = genId();
        const cells: Cell[] = Array.isArray(payload?.cells) ? payload.cells.map((c: any, i: number) => ({
          id: genId(),
          title: typeof c?.title === 'string' ? c.title : `Cell ${i + 1}`,
          sql: typeof c?.sql === 'string' ? c.sql : '-- New cell',
          columns: [], rows: [], message: '', running: false, mode: c?.mode === 'md' ? 'md' : 'sql',
        })) : [{ id: genId(), title: 'Cell 1', sql: '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' }];
        const nb: NotebookT = { id: nbId, label: typeof payload?.label === 'string' ? payload.label : 'Imported Notebook', isOpen: true, vars: (payload?.vars && typeof payload.vars === 'object') ? payload.vars : {}, cells };
        setNotebooks((prev) => [...prev, nb]);
        setActiveNotebookId(nbId);
        setActiveCellId(cells[0]?.id ?? null);
        clearHash();
        showToast('Imported notebook from link');
      } catch {}
      return;
    }
    // #cell_sql_gz=<b64-gzip>
    const mCellGz = hash.match(/^#cell_sql_gz=([^&]+)/);
    if (mCellGz && mCellGz[1]) {
      try {
        const sqlText = await gunzipFromBase64(decodeURIComponent(mCellGz[1]));
        const nbId = genId();
        const cell: Cell = { id: genId(), title: 'Shared Cell', sql: typeof sqlText === 'string' ? sqlText : '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' };
        const nb: NotebookT = { id: nbId, label: 'Imported Cell', isOpen: true, vars: {}, cells: [cell] };
        setNotebooks((prev) => [...prev, nb]);
        setActiveNotebookId(nbId);
        setActiveCellId(cell.id);
        clearHash();
        showToast('Imported cell from link');
      } catch {}
      return;
    }
    // #cell_sql=<b64>&...
    const mCell = hash.match(/^#cell_sql=([^&]+)/);
    if (mCell && mCell[1]) {
      try {
        const sqlText = b64DecodeUtf8(decodeURIComponent(mCell[1]));
        const nbId = genId();
        const cell: Cell = { id: genId(), title: 'Shared Cell', sql: typeof sqlText === 'string' ? sqlText : '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' };
        const nb: NotebookT = { id: nbId, label: 'Imported Cell', isOpen: true, vars: {}, cells: [cell] };
        setNotebooks((prev) => [...prev, nb]);
        setActiveNotebookId(nbId);
        setActiveCellId(cell.id);
        clearHash();
        showToast('Imported cell from link');
      } catch {}
      return;
    }
    // Unknown hash: ignore
  }
  function clearHash() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  }

  const getEffectiveVars = (nbId?: string): Record<string,string> => {
    if (!nbId) return vars;
    const nb = notebooks.find((n) => n.id === nbId);
    const scoped = nb?.vars || {};
    return { ...vars, ...scoped };
  };
  const interpolateSQL = (text: string) => {
    const eff = getEffectiveVars(activeNotebookId);
    return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_m, key: string) => sqlLiteral(eff[key]));
  };
  const sqlLiteral = (v: any) => {
    if (v == null) return 'NULL';
    const s = String(v);
    if (/^null$/i.test(s)) return 'NULL';
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return s; // number
    // string literal with single-quote escaping
    return `'${s.replace(/'/g, "''")}'`;
  };

  // Single editor run removed; cells are executed via runCell/runAll

  const applySnippet = async (key: string) => {
    setSnippet(key);
    const code = SNIPPETS[key as keyof typeof SNIPPETS];
    if (!code) return;
    if (!activeCellId || !activeNotebookId) return;
    withNotebook(activeNotebookId, (nnb: NotebookT) => ({
      ...nnb,
      cells: nnb.cells.map((c: Cell) => (c.id === activeCellId ? { ...c, sql: code } : c)),
    }));
  };

  const loadDataset = async (key: string) => {
    setDataset(key);
    try {
      const conn = await getConn();
      if (key === 'people_local') {
        await loadSample(conn);
        setMessage('Loaded dataset: people (local CSV)');
      } else if (key === 'tips_remote') {
        await ensureHttpfs();
        const url = 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv';
        await conn.query(`CREATE OR REPLACE TABLE tips AS SELECT * FROM read_csv('${url}', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1);`);
        setMessage('Loaded dataset: tips (remote CSV)');
      } else if (key === 'tpch_lineitem') {
        await ensureHttpfs();
        const url = 'https://duckdb.org/data/tpch/lineitem.parquet';
        await conn.query(`CREATE OR REPLACE VIEW lineitem AS SELECT * FROM parquet_scan('${url}');`);
        setMessage('Loaded dataset: lineitem (remote Parquet view)');
      }
      // Track loaded dataset keys for restoration
      try {
        const ds = (await idbGet<string[]>('datasets_loaded')) || [];
        if (!ds.includes(key)) { ds.push(key); await idbSet('datasets_loaded', ds); }
      } catch {}
      await refreshSchema();
    } catch (e: any) {
      setMessage(String(e?.message || e));
    }
  };

  // legacy pagination removed (handled within components)

  // Notebook helpers
  function genId() { return Math.random().toString(36).slice(2); }
  const withNotebook = (nbId: string, fn: (nb: NotebookT, idx: number) => NotebookT) => {
    setNotebooks((prev) => prev.map((nb, i) => (nb.id === nbId ? fn(nb, i) : nb)));
  };
  const currentNbId = activeNotebookId;
  const getNotebookIndex = (nbId: string) => notebooks.findIndex((n) => n.id === nbId);
  const addNotebook = () => {
    const i = notebooks.length + 1;
    const nb: NotebookT = { id: genId(), label: `Notebook ${i}`, isOpen: true, showVars: false, vars: {}, cells: [{ id: genId(), title: 'Cell 1', sql: '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' }] };
    setNotebooks((prev) => [...prev, nb]);
    setActiveNotebookId(nb.id);
    setActiveCellId(nb.cells[0].id);
  };
  const renameNotebook = (nbId: string, label: string) => withNotebook(nbId, (nb) => ({ ...nb, label }));
  const toggleNotebook = (nbId: string) => withNotebook(nbId, (nb) => ({ ...nb, isOpen: !nb.isOpen }));
  const deleteNotebook = (nbId: string) => {
    const ok = confirm('Delete this notebook? This will remove all its cells.');
    if (!ok) return;
    setNotebooks((prev) => {
      const remaining = prev.filter((n) => n.id !== nbId);
      if (remaining.length === 0) {
        const nb: NotebookT = { id: genId(), label: 'Notebook 1', isOpen: true, showVars: false, vars: {}, cells: [{ id: genId(), title: 'Cell 1', sql: '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' }] };
        setActiveNotebookId(nb.id);
        setActiveCellId(nb.cells[0].id);
        return [nb];
      }
      // ensure active notebook/cell is valid
      if (activeNotebookId === nbId) {
        const nb = remaining[0];
        setActiveNotebookId(nb.id);
        setActiveCellId(nb.cells[0]?.id ?? null);
      }
      return remaining;
    });
    showToast('Notebook deleted');
  };
  const addCellBelow = (id?: string, nbId: string = currentNbId) => {
    const nbIdx = getNotebookIndex(nbId);
    if (nbIdx < 0) return;
    const cells = notebooks[nbIdx].cells;
    const idx = id ? cells.findIndex((c) => c.id === id) : cells.length - 1;
    const newCell: Cell = { id: genId(), title: `Cell ${cells.length + 1}`, sql: '-- New cell', columns: [], rows: [], message: '', running: false, mode: 'sql' };
    withNotebook(nbId, (nb) => {
      const list = [...nb.cells];
      list.splice(Math.max(0, idx + 1), 0, newCell);
      return { ...nb, cells: list };
    });
    setActiveCellId(newCell.id);
  };
  const deleteCell = (id: string) => {
    withNotebook(currentNbId, (nb) => {
      const copy = nb.cells.filter((c) => c.id !== id);
      if (activeCellId === id) setActiveCellId(copy[copy.length - 1]?.id ?? null);
      return { ...nb, cells: copy.length ? copy : [{ id: genId(), title: 'Cell 1', sql: '-- New cell', columns: [], rows: [], message: '', running: false }] };
    });
  };
  const moveCell = (id: string, dir: -1 | 1) => {
    withNotebook(currentNbId, (nb) => {
      const idx = nb.cells.findIndex((c) => c.id === id);
      if (idx < 0) return nb;
      const j = idx + dir;
      if (j < 0 || j >= nb.cells.length) return nb;
      const list = [...nb.cells];
      const [cell] = list.splice(idx, 1);
      list.splice(j, 0, cell);
      showToast(dir === -1 ? 'Moved cell up' : 'Moved cell down');
      return { ...nb, cells: list };
    });
  };
  const runCell = async (id: string) => {
    withNotebook(currentNbId, (nb) => ({ ...nb, cells: nb.cells.map((c) => c.id === id ? { ...c, running: true, message: 'Running...' } : c) }));
    try {
      const nb = notebooks.find((n) => n.id === currentNbId);
      const cell = nb?.cells.find((c) => c.id === id);
      const sqlText = cell?.sql || '';
      const res = await run(sqlText);
      const ts = new Date().toISOString();
      if (debugLogs) jsonLog({ ts, ctx: 'cell', id, sql: sqlText, result: { columns: res.columns, rows: res.rows, execMs: res.execMs, message: res.message } });
      withNotebook(currentNbId, (nb2) => ({ ...nb2, cells: nb2.cells.map((c) => c.id === id ? { ...c, columns: res.columns, rows: res.rows, message: res.message, execMs: res.execMs } : c) }));
    } catch (e: any) {
      const ts = new Date().toISOString();
      if (debugLogs) jsonLog({ ts, ctx: 'cell', id, error: String(e?.message || e) });
      withNotebook(currentNbId, (nb) => ({ ...nb, cells: nb.cells.map((c) => c.id === id ? { ...c, message: String(e?.message || e) } : c) }));
    } finally {
      withNotebook(currentNbId, (nb) => ({ ...nb, cells: nb.cells.map((c) => c.id === id ? { ...c, running: false } : c) }));
    }
  };
  const runAll = async () => {
    const nb = notebooks.find((n) => n.id === currentNbId);
    if (!nb) return;
    for (const c of nb.cells) {
      await runCell(c.id);
    }
  };

  // Sharing helpers
  const shareNotebook = async (nbId: string) => {
    const nb = notebooks.find((n) => n.id === nbId);
    if (!nb) return;
    const payload = {
      v: 1,
      label: nb.label,
      vars: nb.vars || {},
      cells: nb.cells.map((c) => ({ title: c.title, sql: c.sql, mode: c.mode || 'sql' })),
    };
    const b64 = await gzipToBase64(JSON.stringify(payload));
    const url = `${location.origin}${location.pathname}#nbpackgz=${encodeURIComponent(b64)}`;
    try { await navigator.clipboard.writeText(url); showToast('Notebook link copied'); } catch { setMessage('Failed to copy notebook link'); }
  };

  const shareCell = async (nbId: string, cellId: string) => {
    const nb = notebooks.find((n) => n.id === nbId);
    const cell = nb?.cells.find((c) => c.id === cellId);
    if (!nb || !cell) return;
    const b64 = await gzipToBase64(cell.sql || '');
    const url = `${location.origin}${location.pathname}#cell_sql_gz=${encodeURIComponent(b64)}&nb=${encodeURIComponent(nbId)}&cell=${encodeURIComponent(cellId)}`;
    try { await navigator.clipboard.writeText(url); showToast('Cell link copied'); } catch { setMessage('Failed to copy cell link'); }
  };

  // Upload support: register file into DuckDB VFS and create a table/view
  const sanitizeTable = (name: string) => {
    const n = name.replace(/\.[^.]+$/, ''); // drop extension
    let t = n.replace(/[^A-Za-z0-9_]/g, '_');
    if (!/^[A-Za-z_]/.test(t)) t = 't_' + t; // ensure starts with letter/underscore
    return t.toLowerCase();
  };
  const onUploadFile = async (file: File) => {
    try {
      const db = await getDB();
      const conn = await getConn();
      const buf = new Uint8Array(await file.arrayBuffer());
      const vfsPath = `/uploads/${Date.now()}_${file.name}`;
      await db.registerFileBuffer(vfsPath, buf);
      const table = sanitizeTable(file.name);
      let kind: 'parquet' | 'json' | 'csv' = 'csv';
      let ddl = '';
      if (/\.parquet$/i.test(file.name)) {
        kind = 'parquet';
        ddl = `CREATE OR REPLACE VIEW ${table} AS SELECT * FROM parquet_scan('${vfsPath}');`;
        await conn.query(ddl);
        setMessage(`Uploaded Parquet → view ${table}`);
      } else if (/\.(json|ndjson)$/i.test(file.name)) {
        kind = 'json';
        ddl = `CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_json_auto('${vfsPath}');`;
        await conn.query(ddl);
        setMessage(`Uploaded JSON/NDJSON → table ${table}`);
      } else {
        // Assume CSV/TSV or text-delimited; let DuckDB auto-detect
        kind = 'csv';
        ddl = `CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_csv('${vfsPath}', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1);`;
        await conn.query(ddl);
        setMessage(`Uploaded CSV/TSV → table ${table}`);
      }
      // Persist upload entry and DDL so we can restore on reload
      try {
        const entry = { id: `${Date.now()}_${file.name}`, fileName: file.name, mime: file.type, vfsPath, table, kind, blob: file };
        const uploads = (await idbGet<any[]>('uploads')) || [];
        uploads.push(entry);
        await idbSet('uploads', uploads);
      } catch {}
      try {
        const metas = (await idbGet<any[]>('tables_metadata')) || [];
        metas.push({ id: `${Date.now()}_${table}`, table, ddl, dependsOnVfsPath: vfsPath });
        await idbSet('tables_metadata', metas);
      } catch {}
      await refreshSchema();
    } catch (e: any) {
      setMessage(`Upload failed: ${String(e?.message || e)}`);
    }
  };

  // Global keyboard shortcuts for notebook cell movement
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeCellId) return;
      if (!e.altKey) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nb = notebooks.find((n) => n.id === activeNotebookId);
        const idx = nb ? nb.cells.findIndex((c) => c.id === activeCellId) : -1;
        if (idx < 0) return;
        if (e.key === 'ArrowUp' && idx > 0) moveCell(activeCellId, -1);
        if (e.key === 'ArrowDown' && nb && idx < nb.cells.length - 1) moveCell(activeCellId, 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCellId, activeNotebookId, notebooks]);

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-auto w-full gap-4">
      <Toolbar
        title="DuckDB WASM Playground"
        running={running}
        ready={ready}
        debugLogs={debugLogs}
        setDebugLogs={setDebugLogs}
        // snippets
        snippetsOpen={showSnippets}
        setSnippetsOpen={setShowSnippets}
        snippet={snippet}
        applySnippet={(key) => { setSnippet(key); applySnippet(key); }}
        // datasets
        datasetsOpen={showDatasets}
        setDatasetsOpen={setShowDatasets}
        dataset={dataset}
        loadDataset={(key) => { setDataset(key); loadDataset(key); }}
        // secondary actions
        menuOpen={showMenu}
        setMenuOpen={setShowMenu}
        installHttpfs={async () => {
          try { await ensureHttpfs(); setMessage('httpfs installed and loaded'); } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        loadSampleAction={async () => {
          try { const conn = await getConn(); await loadSample(conn); setMessage('Sample loaded as table people'); await refreshSchema(); } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        parquetDemo={async () => {
          try {
            const conn = await getConn();
            await ensureHttpfs();
            const url = 'https://duckdb.org/data/tpch/lineitem.parquet';
            const res = await conn.query(`SELECT * FROM parquet_scan('${url}') LIMIT 5;`);
            const cols = res.schema.fields.map((f: any) => f.name);
            const data: Row[] = [];
            for (const row of res) { const obj: Row = {}; cols.forEach((c: string, i: number) => (obj[c] = row.get(i))); data.push(obj); }
            setColumns(cols); setRows(data); setMessage('Parquet demo: lineitem.parquet (5 rows)');
          } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        resetDb={async () => {
          try { const conn = await getConn(); try { await conn.query(`DROP VIEW IF EXISTS adults;`); } catch {} try { await conn.query(`DROP VIEW IF EXISTS lineitem;`); } catch {} try { await conn.query(`DROP TABLE IF EXISTS tips;`); } catch {} try { await conn.query(`DROP TABLE IF EXISTS people;`); } catch {} setRows([]); setColumns([]); setMessage('Database reset (dropped people/adults/tips/lineitem)'); await refreshSchema(); } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        resetSession={async () => {
          try {
            await resetSession();
            setRows([]);
            setColumns([]);
            setMessage('Session reset');
            setReady(false);
            await getDB();
            setReady(true);
            await refreshSchema();
          } catch (e: any) {
            setMessage(String(e?.message || e));
          }
        }}
        runQualityReport={() => {
          const q = qualityReportSQL();
          if (!activeCellId || !activeNotebookId) return;
          withNotebook(activeNotebookId, (nnb: NotebookT) => ({
            ...nnb,
            cells: nnb.cells.map((c: Cell) => (c.id === activeCellId ? { ...c, sql: q } : c)),
          }));
          setTimeout(() => activeCellId && runCell(activeCellId), 0);
        }}
        // notebook
        onAddCell={() => addCellBelow()}
        onRunAll={runAll}
        onExportWorkspace={exportWorkspace}
        onImportWorkspace={importWorkspace}
        onUploadFile={onUploadFile}
        onOpenSchema={() => setSchemaOpen(true)}
        // refs for menus
        snippetsRef={snippetsRef}
        datasetsRef={datasetsRef}
        menuRef={dropdownRef}
      />

      {/* Main content */}
      <div className="flex gap-3 items-start min-h-0">
        <main className="flex flex-col gap-3 flex-1 min-w-0 min-h-0">
          {/* Vars panel toggle */}
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowVars((v) => !v)}>{showVars ? 'Hide Vars' : 'Show Vars'}</button>
            <button className="btn btn-ghost btn-sm" onClick={addNotebook}>
              <span className="material-symbols-outlined mr-1.5">add</span>
              Add Notebook
            </button>
          </div>
          {showVars && (
            <div className="card bg-base-100 border border-base-300 p-2 flex flex-col gap-1.5">
              <strong>Variables</strong>
              <div className="flex flex-col gap-1.5">
                {Object.entries(vars).map(([k, v], idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input className="input input-bordered w-[180px]" value={k} onChange={(e) => {
                      const nk = e.target.value.trim();
                      setVars((prev) => {
                        const copy: Record<string,string> = {};
                        Object.entries(prev).forEach(([ok, ov]) => { copy[ok === k ? nk : ok] = ov; });
                        return copy;
                      });
                    }} />
                    <input className="input input-bordered" placeholder="value" value={v} onChange={(e) => setVars((prev) => ({ ...prev, [k]: e.target.value }))} />
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      setVars((prev) => { const cp = { ...prev }; delete cp[k]; return cp; });
                    }}>Remove</button>
                  </div>
                ))}
                <div>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const base = 'var';
                    let i = Object.keys(vars).length + 1;
                    let name = `${base}${i}`;
                    while (vars[name] !== undefined) { i++; name = `${base}${i}`; }
                    setVars((prev) => ({ ...prev, [name]: '' }));
                  }}>Add Var</button>
                </div>
                <div className="text-base-content/70">Use variables in SQL as {'{{var}}'}. Strings are auto-quoted.</div>
              </div>
            </div>
          )}
          
            <div className="flex flex-col gap-3">
              {notebooks.map((nb, nbIdx) => (
                <Notebook
                  key={nb.id}
                  id={nb.id}
                  label={nb.label}
                  isOpen={nb.isOpen}
                  onToggle={(id) => { toggleNotebook(id); setActiveNotebookId(id); setActiveCellId(notebooks.find(n => n.id===id)?.cells[0]?.id ?? null); }}
                  onRename={renameNotebook}
                  headerRight={
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => withNotebook(nb.id, (nnb) => ({ ...nnb, showVars: !nnb.showVars }))}>
                        <span className="material-symbols-outlined mr-1">tune</span>
                        Vars
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActiveNotebookId(nb.id); shareNotebook(nb.id); }}>
                        <span className="material-symbols-outlined mr-1">link</span>
                        Share
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => copyNotebookMarkdown(nb.id)}>
                        <span className="material-symbols-outlined mr-1">description</span>
                        Copy MD
                      </button>
                      <button className="btn btn-ghost btn-sm text-error" onClick={() => deleteNotebook(nb.id)}>
                        <span className="material-symbols-outlined mr-1">delete</span>
                        Delete
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActiveNotebookId(nb.id); addCellBelow(undefined, nb.id); }}>
                        <span className="material-symbols-outlined mr-1">add</span>
                        Cell
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActiveNotebookId(nb.id); runAll(); }}>
                        <span className="material-symbols-outlined mr-1">play_arrow</span>
                        Run all
                        </button>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-3">
                    {/* Notebook-scoped Variables */}
                    {nb.showVars && (
                    <div className="card bg-base-100 border border-base-300 p-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <strong>Notebook Vars</strong>
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                          const base = 'var';
                          const keys = Object.keys(nb.vars || {});
                          let i = keys.length + 1; let name = `${base}${i}`;
                          while ((nb.vars || {})[name] !== undefined) { i++; name = `${base}${i}`; }
                          withNotebook(nb.id, (nnb) => ({ ...nnb, vars: { ...(nnb.vars || {}), [name]: '' } }));
                        }}>Add Var</button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {Object.entries(nb.vars || {}).map(([k, v], idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input className="input input-bordered w-[180px]" value={k} onChange={(e) => {
                              const nk = e.target.value.trim();
                              withNotebook(nb.id, (nnb) => {
                                const current = nnb.vars || {};
                                const copy: Record<string,string> = {};
                                Object.entries(current).forEach(([ok, ov]) => { copy[ok === k ? nk : ok] = ov as string; });
                                return { ...nnb, vars: copy };
                              });
                            }} />
                            <input className="input input-bordered" placeholder="value" value={v} onChange={(e) => withNotebook(nb.id, (nnb) => ({ ...nnb, vars: { ...(nnb.vars || {}), [k]: e.target.value } }))} />
                            <button className="btn btn-ghost btn-sm" onClick={() => withNotebook(nb.id, (nnb) => { const cp = { ...(nnb.vars || {}) }; delete (cp as any)[k]; return { ...nnb, vars: cp }; })}>Remove</button>
                          </div>
                        ))}
                        <div className="text-base-content/70">Resolution: notebook vars override global vars.</div>
                      </div>
                    </div>
                    )}
                    {nb.cells.map((cell, idx) => (
                      <NotebookCell
                        key={cell.id}
                        index={idx}
                        cell={cell}
                        schemaTables={schemaTables}
                        schemaColumns={schemaColumns}
                        sqlCompletion={sqlCompletion}
                        sqlHover={sqlHover}
                        onFocus={(id) => { setActiveNotebookId(nb.id); setActiveCellId(id); }}
                        onChange={(id, v) => withNotebook(nb.id, (nnb) => ({ ...nnb, cells: nnb.cells.map((c) => c.id === id ? { ...c, sql: v } : c) }))}
                        onChangeTitle={(id, t) => withNotebook(nb.id, (nnb) => ({ ...nnb, cells: nnb.cells.map((c) => c.id === id ? { ...c, title: t } : c) }))}
                        onChangeMode={(id, m) => withNotebook(nb.id, (nnb) => ({ ...nnb, cells: nnb.cells.map((c) => c.id === id ? { ...c, mode: m } : c) }))}
                        onRun={(id) => { setActiveNotebookId(nb.id); runCell(id); }}
                        onAddBelow={(id) => { setActiveNotebookId(nb.id); addCellBelow(id, nb.id); }}
                        onMove={(id, d) => { setActiveNotebookId(nb.id); moveCell(id, d); }}
                        onDelete={(id) => { setActiveNotebookId(nb.id); deleteCell(id); }}
                        onShare={(id: string) => { setActiveNotebookId(nb.id); shareCell(nb.id, id); }}
                        onCopyMarkdown={(id: string) => copyCellMarkdown(nb.id, id)}
                        disableMoveUp={idx === 0}
                        disableMoveDown={idx === nb.cells.length - 1}
                        ready={ready}
                      />
                    ))}
                    <div className="flex justify-center mt-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActiveNotebookId(nb.id); addCellBelow(undefined, nb.id); }}>
                        <span className="material-symbols-outlined mr-1.5">add</span>
                        Add Cell
                      </button>
                    </div>
                  </div>
                </Notebook>
              ))}
            </div>
        </main>

        {/* Schema modal */}
        {schemaOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-3xl">
              <h3 className="font-bold text-lg mb-2">Schema</h3>
              <div className="max-h-[60vh] overflow-auto">
                {schemaTables.length === 0 ? (
                  <div className="text-base-content/70">No tables</div>
                ) : (
                  schemaTables.map((t) => (
                    <div key={t} className="flex flex-col mb-3">
                      <strong>{t}</strong>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(schemaColumns[t] || []).map((c) => (
                          <span key={c} className="badge">{c}</span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setSchemaOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ... (rest of the code remains the same)

async function loadSample(conn: any) {
  await conn.query(`INSTALL httpfs; LOAD httpfs;`);
  const url = `${location.origin}/data/people.csv`;
  await conn.query(`CREATE OR REPLACE TABLE people AS SELECT * FROM read_csv('${url}', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1);`);
}

function toCSV(headers: string[], data: Row[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    const needsQuote = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuote ? `"${escaped}"` : escaped;
  };
  const lines = [headers.join(',')];
  for (const row of data) {
    lines.push(headers.map((h) => esc(row[h])).join(','));
  }
  return lines.join('\n');
}

function qualityReportSQL(): string {
  return `-- Data quality report for table 'people'
SELECT 'row_count' AS check, COUNT(*)::BIGINT AS n FROM people
UNION ALL
SELECT 'age_missing', COUNT(*) FROM people WHERE age IS NULL
UNION ALL
SELECT 'age_negative', COUNT(*) FROM people WHERE age < 0
UNION ALL
SELECT 'city_missing', COUNT(*) FROM people WHERE city IS NULL;`;
}

const SNIPPETS = {
  load_sample: `LOAD SAMPLE;\nSELECT * FROM people LIMIT 5;`,
  quality_report: `-- Data quality report for table 'people'\nSELECT 'row_count' AS check, COUNT(*)::BIGINT AS n FROM people\nUNION ALL\nSELECT 'age_missing', COUNT(*) FROM people WHERE age IS NULL\nUNION ALL\nSELECT 'age_negative', COUNT(*) FROM people WHERE age < 0\nUNION ALL\nSELECT 'city_missing', COUNT(*) FROM people WHERE city IS NULL;`,
  parquet_demo: `INSTALL httpfs; LOAD httpfs;\nSELECT * FROM parquet_scan('https://duckdb.org/data/tpch/lineitem.parquet') LIMIT 5;`,
  aggregation: `SELECT city, COUNT(*) AS n FROM people GROUP BY city ORDER BY n DESC;`,
  join_example: `-- Example join between people and tips (ensure both are loaded)\nSELECT p.name, t.total_bill, t.tip\nFROM people p\nJOIN tips t ON p.city = 'New York'\nLIMIT 10;`,
} as const;

function b64EncodeUtf8(str: string): string {
  // UTF-8 safe base64
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}

function b64DecodeUtf8(b64: string): string {
  try { return decodeURIComponent(escape(atob(b64))); } catch { return atob(b64); }
}

// Compression helpers (gzip + base64) with graceful fallback
async function gzipToBase64(text: string): Promise<string> {
  try {
    const CStream: any = (globalThis as any).CompressionStream;
    if (!CStream) {
      // Fallback: plain base64 of UTF-8
      // eslint-disable-next-line no-console
      console.warn('[compression] CompressionStream not available; falling back to base64 only');
      return b64EncodeUtf8(text);
    }
    const enc = new TextEncoder();
    const input = enc.encode(text);
    const cs = new CStream('gzip');
    const stream = new Blob([input]).stream().pipeThrough(cs);
    const ab = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(ab);
    // Convert to base64
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any);
    }
    return btoa(binary);
  } catch {
    return b64EncodeUtf8(text);
  }
}

async function gunzipFromBase64(b64: string): Promise<string> {
  try {
    const DStream: any = (globalThis as any).DecompressionStream;
    if (!DStream) {
      // Fallback: treat as plain base64 UTF-8
      // eslint-disable-next-line no-console
      console.warn('[compression] DecompressionStream not available; treating as plain base64');
      return b64DecodeUtf8(b64);
    }
    // base64 -> Uint8Array
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    const dec = new TextDecoder();
    return dec.decode(new Uint8Array(ab));
  } catch {
    return b64DecodeUtf8(b64);
  }
}
