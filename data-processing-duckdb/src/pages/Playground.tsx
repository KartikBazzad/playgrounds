import { useEffect, useMemo, useRef, useState } from 'react';
import { getDB } from '@/lib/duckdb';
import { idbGet, idbSet } from '@/lib/idb';
// CodeMirror is now used inside subcomponents
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { hoverTooltip } from '@codemirror/view';
import SingleEditor from '@/components/SingleEditor';
import NotebookCell from '@/components/NotebookCell';
import Toolbar from '@/components/Toolbar';
import { useSchema } from '@/lib/useSchema';
import { useRunner } from '@/lib/useRunner';

interface Row { [k: string]: unknown }

export default function Playground() {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [notebookMode, setNotebookMode] = useState<boolean>(true);
  const defaultSQL = `-- Welcome! Try these:
-- 1) Load the sample CSV
LOAD SAMPLE;
-- 2) Query it
SELECT * FROM people LIMIT 5;
-- 3) Simple aggregation
SELECT city, COUNT(*) AS n FROM people GROUP BY city ORDER BY n DESC;`;
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
  const { schemaTables, schemaColumns, refreshSchema } = useSchema(ready);

  type Cell = {
    id: string;
    sql: string;
    columns: string[];
    rows: Row[];
    message: string;
    running: boolean;
    execMs?: number | null;
  };
  const [cells, setCells] = useState<Cell[]>([{ id: genId(), sql: defaultSQL, columns: [], rows: [], message: '', running: false }]);
  const [activeCellId, setActiveCellId] = useState<string | null>(() => (cells[0]?.id ?? null));

  useEffect(() => {
    (async () => {
      await getDB();
      setReady(true);
    })();
  }, []);

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
        const persistedMode = await idbGet<string>('notebook_mode');
        if (persistedMode != null) setNotebookMode(persistedMode === '1');
      } catch {}
      try {
        const hasHash = /^#sql=/.test(location.hash || '');
        if (!hasHash) {
          const persistedSql = await idbGet<string>('playground_sql');
          if (persistedSql) setSql(persistedSql);
        }
      } catch {}
      try {
        const persistedCells = await idbGet<Cell[]>('notebook_cells');
        if (persistedCells && Array.isArray(persistedCells) && persistedCells.length) {
          setCells(persistedCells);
          setActiveCellId(persistedCells[0]?.id ?? null);
        }
      } catch {}
      try {
        const persistedVars = await idbGet<Record<string, string>>('vars');
        if (persistedVars && typeof persistedVars === 'object') setVars(persistedVars);
      } catch {}
    })();
    // parse hash for shared SQL
    try {
      const hash = location.hash || '';
      const m = hash.match(/^#sql=(.+)$/);
      if (m && m[1]) {
        const decoded = b64DecodeUtf8(decodeURIComponent(m[1]));
        if (decoded) setSql(decoded);
      }
    } catch {}
  }, []);

  useEffect(() => {
    idbSet('notebook_mode', notebookMode ? '1' : '0').catch(() => {});
  }, [notebookMode]);

  useEffect(() => {
    idbSet('notebook_cells', cells).catch(() => {});
  }, [cells]);

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

  const interpolateSQL = (text: string) => {
    return text.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_m, key: string) => sqlLiteral(vars[key]));
  };
  const sqlLiteral = (v: any) => {
    if (v == null) return 'NULL';
    const s = String(v);
    if (/^null$/i.test(s)) return 'NULL';
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return s; // number
    // string literal with single-quote escaping
    return `'${s.replace(/'/g, "''")}'`;
  };

  const runQuery = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setMessage('Running...');
    setRunning(true);
    setExecMs(null);
    try {
      const res = await run(sql);
      setColumns(res.columns);
      setRows(res.rows);
      setExecMs(res.execMs);
      setMessage(res.message);
    } catch (e: any) {
      setMessage(String(e?.message || e));
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  const applySnippet = async (key: string) => {
    setSnippet(key);
    const code = SNIPPETS[key as keyof typeof SNIPPETS];
    if (!code) return;
    if (notebookMode) {
      if (!activeCellId) return;
      setCells((prev) => prev.map((c) => c.id === activeCellId ? { ...c, sql: code } : c));
    } else {
      setSql(code);
    }
  };

  const loadDataset = async (key: string) => {
    setDataset(key);
    try {
      const db = await getDB();
      const conn = await db.connect();
      if (key === 'people_local') {
        await loadSample(conn);
        setMessage('Loaded dataset: people (local CSV)');
      } else if (key === 'tips_remote') {
        await conn.query(`INSTALL httpfs; LOAD httpfs;`);
        const url = 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv';
        await conn.query(`CREATE OR REPLACE TABLE tips AS SELECT * FROM read_csv('${url}', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1);`);
        setMessage('Loaded dataset: tips (remote CSV)');
      } else if (key === 'tpch_lineitem') {
        await conn.query(`INSTALL httpfs; LOAD httpfs;`);
        const url = 'https://duckdb.org/data/tpch/lineitem.parquet';
        await conn.query(`CREATE OR REPLACE VIEW lineitem AS SELECT * FROM parquet_scan('${url}');`);
        setMessage('Loaded dataset: lineitem (remote Parquet view)');
      }
      await conn.close();
      await refreshSchema();
    } catch (e: any) {
      setMessage(String(e?.message || e));
    }
  };

  // legacy pagination removed (handled within components)

  // Notebook helpers
  function genId() { return Math.random().toString(36).slice(2); }
  const addCellBelow = (id?: string) => {
    const idx = id ? cells.findIndex((c) => c.id === id) : cells.length - 1;
    const newCell: Cell = { id: genId(), sql: '-- New cell', columns: [], rows: [], message: '', running: false };
    setCells((prev) => {
      const copy = [...prev];
      copy.splice(Math.max(0, idx + 1), 0, newCell);
      return copy;
    });
    setActiveCellId(newCell.id);
  };
  const deleteCell = (id: string) => {
    setCells((prev) => {
      const copy = prev.filter((c) => c.id !== id);
      if (activeCellId === id) setActiveCellId(copy[copy.length - 1]?.id ?? null);
      return copy.length ? copy : [{ id: genId(), sql: '-- New cell', columns: [], rows: [], message: '', running: false }];
    });
  };
  const moveCell = (id: string, dir: -1 | 1) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [cell] = copy.splice(idx, 1);
      copy.splice(j, 0, cell);
      showToast(dir === -1 ? 'Moved cell up' : 'Moved cell down');
      return copy;
    });
  };
  const runCell = async (id: string) => {
    setCells((prev) => prev.map((c) => c.id === id ? { ...c, running: true, message: 'Running...' } : c));
    try {
      const cell = cells.find((c) => c.id === id);
      const res = await run(cell?.sql || '');
      setCells((prev) => prev.map((c) => c.id === id ? { ...c, columns: res.columns, rows: res.rows, message: res.message, execMs: res.execMs } : c));
    } catch (e: any) {
      setCells((prev) => prev.map((c) => c.id === id ? { ...c, message: String(e?.message || e) } : c));
    } finally {
      setCells((prev) => prev.map((c) => c.id === id ? { ...c, running: false } : c));
    }
  };
  const runAll = async () => {
    for (const c of cells) {
      await runCell(c.id);
    }
  };

  // Global keyboard shortcuts for notebook cell movement
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!notebookMode || !activeCellId) return;
      if (!e.altKey) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = cells.findIndex((c) => c.id === activeCellId);
        if (idx < 0) return;
        if (e.key === 'ArrowUp' && idx > 0) moveCell(activeCellId, -1);
        if (e.key === 'ArrowDown' && idx < cells.length - 1) moveCell(activeCellId, 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notebookMode, activeCellId, cells]);

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <Toolbar
        title="DuckDB WASM Playground"
        running={running}
        ready={ready}
        notebookMode={notebookMode}
        setNotebookMode={setNotebookMode}
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
          try { const db = await getDB(); const conn = await db.connect(); await conn.query(`INSTALL httpfs; LOAD httpfs;`); await conn.close(); setMessage('httpfs installed and loaded'); } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        loadSampleAction={async () => {
          try { const db = await getDB(); const conn = await db.connect(); await loadSample(conn); await conn.close(); setMessage('Sample loaded as table people'); await refreshSchema(); } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        parquetDemo={async () => {
          try {
            const db = await getDB(); const conn = await db.connect();
            await conn.query(`INSTALL httpfs; LOAD httpfs;`);
            const url = 'https://duckdb.org/data/tpch/lineitem.parquet';
            const res = await conn.query(`SELECT * FROM parquet_scan('${url}') LIMIT 5;`);
            const cols = res.schema.fields.map((f: any) => f.name);
            const data: Row[] = [];
            for (const row of res) { const obj: Row = {}; cols.forEach((c: string, i: number) => (obj[c] = row.get(i))); data.push(obj); }
            setColumns(cols); setRows(data); setMessage('Parquet demo: lineitem.parquet (5 rows)');
            await conn.close();
          } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        resetDb={async () => {
          try { const db = await getDB(); const conn = await db.connect(); try { await conn.query(`DROP VIEW IF EXISTS adults;`); } catch {} try { await conn.query(`DROP VIEW IF EXISTS lineitem;`); } catch {} try { await conn.query(`DROP TABLE IF EXISTS tips;`); } catch {} try { await conn.query(`DROP TABLE IF EXISTS people;`); } catch {} await conn.close(); setRows([]); setColumns([]); setMessage('Database reset (dropped people/adults/tips/lineitem)'); await refreshSchema(); } catch (e: any) { setMessage(String(e?.message || e)); }
        }}
        runQualityReport={() => {
          const q = qualityReportSQL();
          if (notebookMode) { if (!activeCellId) return; setCells((prev) => prev.map((c) => c.id === activeCellId ? { ...c, sql: q } : c)); setTimeout(() => activeCellId && runCell(activeCellId), 0); }
          else { setSql(q); setTimeout(runQuery, 0); }
        }}
        // single editor actions
        canDownload={rows.length > 0}
        onShare={async () => { try { const encoded = encodeURIComponent(b64EncodeUtf8(sql)); const url = `${location.origin}${location.pathname}#sql=${encoded}`; await navigator.clipboard.writeText(url); setMessage('Share link copied to clipboard'); } catch { setMessage('Failed to create share link'); } }}
        onSaveGist={async () => { try { const token = prompt('Enter GitHub Personal Access Token (scope: gist)'); if (!token) { setMessage('Gist cancelled'); return; } const body = { description: 'DuckDB Playground SQL', public: true, files: { 'duckdb-playground.sql': { content: sql }, 'README.txt': { content: 'SQL saved from DuckDB WASM Playground' }, }, }; const res = await fetch('https://api.github.com/gists', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', }, body: JSON.stringify(body), }); if (!res.ok) throw new Error(`GitHub API error: ${res.status}`); const json = await res.json(); const gistUrl = json?.html_url; if (gistUrl) { await navigator.clipboard.writeText(gistUrl); setMessage('Gist created and URL copied'); } else { setMessage('Gist created but URL missing'); } } catch (e: any) { setMessage(String(e?.message || e)); } }}
        onCopySQL={async () => { try { await navigator.clipboard.writeText(sql); setMessage('SQL copied to clipboard'); } catch { setMessage('Copy failed; select and copy manually'); } }}
        onDownloadCSV={() => { try { if (!rows.length) { setMessage('No results to download'); return; } const csv = toCSV(columns, rows); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'duckdb_results.csv'; a.click(); URL.revokeObjectURL(url); setMessage('Downloaded results as CSV'); } catch (e: any) { setMessage(String(e?.message || e)); } }}
        onRun={runQuery}
        // notebook
        onAddCell={() => addCellBelow()}
        onRunAll={runAll}
        // refs
        snippetsRef={snippetsRef}
        datasetsRef={datasetsRef}
        menuRef={dropdownRef}
      />
      {/* Vars panel toggle */}
        <div className="hstack" style={{ gap: 8 }}>
          <button className="secondary" onClick={() => setShowVars((v) => !v)}>{showVars ? 'Hide Vars' : 'Show Vars'}</button>
        </div>
        {showVars && (
          <div className="card vstack" style={{ gap: 6, padding: 8 }}>
            <strong>Variables</strong>
            <div className="vstack" style={{ gap: 6 }}>
              {Object.entries(vars).map(([k, v]) => (
                <div key={k} className="hstack" style={{ gap: 6 }}>
                  <input className="input" style={{ width: 180 }} value={k} onChange={(e) => {
                    const nk = e.target.value.trim();
                    setVars((prev) => {
                      const copy: Record<string,string> = {};
                      Object.entries(prev).forEach(([ok, ov]) => { copy[ok === k ? nk : ok] = ov; });
                      return copy;
                    });
                  }} />
                  <input className="input" placeholder="value" value={v} onChange={(e) => setVars((prev) => ({ ...prev, [k]: e.target.value }))} />
                  <button className="secondary" onClick={() => {
                    setVars((prev) => { const cp = { ...prev }; delete cp[k]; return cp; });
                  }}>Remove</button>
                </div>
              ))}
              <div>
                <button className="secondary" onClick={() => {
                  const base = 'var';
                  let i = Object.keys(vars).length + 1;
                  let name = `${base}${i}`;
                  while (vars[name] !== undefined) { i++; name = `${base}${i}`; }
                  setVars((prev) => ({ ...prev, [name]: '' }));
                }}>Add Var</button>
              </div>
              <div className="muted">Use variables in SQL as {'{{var}}'}. Strings are auto-quoted.</div>
            </div>
          </div>
        )}

        {!notebookMode && (
          <SingleEditor
            sql={sql}
            onChange={(v: string) => setSql(v)}
            onRun={runQuery}
            message={message}
            columns={columns}
            rows={rows}
            execMs={execMs}
            schemaTables={schemaTables}
            schemaColumns={schemaColumns}
            sqlCompletion={sqlCompletion}
            sqlHover={sqlHover}
          />
        )}
      

      {notebookMode && (
        <div className="vstack" style={{ gap: 12 }}>
          {cells.map((cell, idx) => (
            <NotebookCell
              key={cell.id}
              index={idx}
              cell={cell}
              schemaTables={schemaTables}
              schemaColumns={schemaColumns}
              sqlCompletion={sqlCompletion}
              sqlHover={sqlHover}
              onFocus={(id) => setActiveCellId(id)}
              onChange={(id, v) => setCells((prev) => prev.map((c) => c.id === id ? { ...c, sql: v } : c))}
              onRun={(id) => runCell(id)}
              onAddBelow={(id) => addCellBelow(id)}
              onMove={(id, d) => moveCell(id, d)}
              onDelete={(id) => deleteCell(id)}
              disableMoveUp={idx === 0}
              disableMoveDown={idx === cells.length - 1}
              ready={ready}
            />
          ))}
        </div>
      )}
      {toast && (<div className="toast">{toast}</div>)}
    </div>
  );
}

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
