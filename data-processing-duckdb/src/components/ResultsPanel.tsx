import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '@/components/Dropdown';

export interface ResultsPanelProps {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  message: string;
  executionMs?: number | null;
  schemaTables: string[];
  schemaColumns: Record<string, string[]>;
  enablePagination?: boolean;
  collapsed?: boolean;
}

const ROW_HEIGHT = 28; // px per row used for simple virtualization

function inferTypes(columns: string[], rows: Array<Record<string, unknown>>, sample = 200) {
  const types: Record<string, string> = {};
  const limit = Math.min(rows.length, sample);
  for (const c of columns) types[c] = 'null';
  for (let i = 0; i < limit; i++) {
    const r = rows[i];
    for (const c of columns) {
      const v = r[c];
      let t: string = typeof v;
      if (v === null || v === undefined) t = 'null';
      if (v instanceof Date) t = 'date';
      if (t === 'number' && Number.isInteger(v as number)) t = 'int';
      if (t === 'number' && !Number.isInteger(v as number)) t = 'float';
      if (types[c] === 'null' && t !== 'null') types[c] = t;
    }
  }
  return types;
}

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(columns: string[], rows: Array<Record<string, unknown>>, withHeader: boolean): string {
  const lines: string[] = [];
  if (withHeader) lines.push(columns.map((c) => escapeCSV(c)).join(','));
  for (const r of rows) {
    lines.push(columns.map((c) => escapeCSV(r[c])).join(','));
  }
  return lines.join('\n');
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
  } catch {
    try { return JSON.stringify(value, (_k, v) => typeof v === 'bigint' ? v.toString() : v); } catch { return '[]'; }
  }
}

export default function ResultsPanel({ title, columns, rows, message, executionMs = null, schemaTables, schemaColumns, enablePagination = true, collapsed = false }: ResultsPanelProps) {
  const [tab, setTab] = useState<'results' | 'schema' | 'messages'>('results');
  const [jsonMode, setJsonMode] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed);
  const [search, setSearch] = useState('');

  useEffect(() => { setIsCollapsed(collapsed); }, [collapsed]);
  useEffect(() => { setPage(1); }, [rows, pageSize]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => columns.some((c) => String(r[c] ?? '').toLowerCase().includes(q)));
  }, [rows, columns, search]);

  const pageCount = Math.max(1, Math.ceil((filteredRows.length || 1) / pageSize));
  const pagedRows = useMemo(() => {
    if (!enablePagination) return filteredRows;
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, enablePagination]);

  const types = useMemo(() => inferTypes(columns, filteredRows), [columns, filteredRows]);

  const virtContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = () => {
    const el = virtContainerRef.current;
    if (el) setScrollTop(el.scrollTop);
  };
  const visibleHeight = 420;
  const usingVirt = pagedRows.length > Math.floor(visibleHeight / ROW_HEIGHT) + 30;
  const totalHeight = pagedRows.length * ROW_HEIGHT;
  const startIndex = usingVirt ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10) : 0;
  const endIndex = usingVirt ? Math.min(pagedRows.length, startIndex + Math.ceil(visibleHeight / ROW_HEIGHT) + 20) : pagedRows.length;
  const virtSlice = usingVirt ? pagedRows.slice(startIndex, endIndex) : pagedRows;
  const offsetY = usingVirt ? startIndex * ROW_HEIGHT : 0;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };
  const download = (filename: string, text: string, mime = 'text/plain;charset=utf-8') => {
    try {
      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  if (isCollapsed) {
    return (
      <div className="card bg-base-100 border border-base-300 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setIsCollapsed(false)} title="Expand results" aria-label="Expand results">
              <span className="material-symbols-outlined" aria-hidden>keyboard_arrow_down</span>
            </button>
            {title && <strong>{title}</strong>}
          </div>
          <div className="text-sm text-base-content/70">{filteredRows.length} rows{executionMs != null ? ` • ${Math.round(executionMs)} ms` : ''} • collapsed</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 p-3">
      <div className="flex py-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm btn-square" onClick={() => setIsCollapsed(true)} title="Collapse results" aria-label="Collapse results">
            <span className="material-symbols-outlined" aria-hidden>keyboard_arrow_up</span>
          </button>
          {title && <strong>{title}</strong>}
        </div>
        <div className="flex items-center gap-2">
          <input
            aria-label="Search results"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm min-w-[160px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div role="tablist" className="tabs tabs-border tabs-sm">
          <button type="button" role="tab" className={`tab ${tab === 'results' ? 'tab-active' : ''}`} onClick={() => setTab('results')}>Results</button>
          <button type="button" role="tab" className={`tab ${tab === 'schema' ? 'tab-active' : ''}`} onClick={() => setTab('schema')}>Schema</button>
          <button type="button" role="tab" className={`tab ${tab === 'messages' ? 'tab-active' : ''}`} onClick={() => setTab('messages')}>Messages</button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {tab === 'results' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setJsonMode((v) => !v)}>{jsonMode ? 'Table' : 'JSON'}</button>
              {/* Copy actions dropdown */}
              <Dropdown
                alignEnd
                triggerClassName="btn btn-ghost btn-sm"
                trigger={<span title="Copy menu" aria-label="Copy menu">⋯</span>}
                widthClassName="w-64"
              >
                <li>
                  <button title="Copy JSON (current page/filter)" onClick={() => copy(safeStringify(pagedRows))}>Copy JSON (current page)</button>
                </li>
                <li>
                  <button title="Copy CSV with headers (current page/filter)" onClick={() => copy(toCSV(columns, pagedRows, true))}>Copy CSV with headers</button>
                </li>
                <li>
                  <button title="Copy CSV without headers (current page/filter)" onClick={() => copy(toCSV(columns, pagedRows, false))}>Copy CSV (no headers)</button>
                </li>
                <li><hr className="my-1" /></li>
                <li>
                  <button title="Download CSV (current page/filter)" onClick={() => download('results.csv', toCSV(columns, pagedRows, true), 'text/csv;charset=utf-8;')}>Download CSV</button>
                </li>
              </Dropdown>
              {enablePagination && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                  <span className="text-sm text-base-content/70">Page {page} / {pageCount}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>Next</button>
                  <span className="text-sm text-base-content/70 ml-2">Page size:</span>
                  <select className="select select-bordered select-xs" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="text-sm p-2 text-base-content/70">
        {filteredRows.length} rows{executionMs != null ? ` • ${(Math.round(executionMs)).toFixed(2)} ms` : ''}
      </div>

      {tab === 'results' && (
        <div className="overflow-auto p-2">
          {jsonMode ? (
            <pre className="max-h-[420px] overflow-auto m-0">{safeStringify(pagedRows)}</pre>
          ) : (
            <div ref={virtContainerRef} onScroll={onScroll} className="max-h-[420px] overflow-auto">
              {usingVirt ? (
                <div className="relative" style={{ height: totalHeight }}>
                  <table className="table table-sm absolute inset-x-0" style={{ top: offsetY }}>
                    <thead>
                      <tr>
                        {columns.map((c) => (
                          <th key={c} title={`Click to copy column name`} onClick={() => copy(c)} className="sticky top-0 bg-base-100 z-10">
                            <span>{c}</span>
                            <span className="badge badge-outline ml-1.5">{types[c]}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {virtSlice.map((r, i) => (
                        <tr key={i + startIndex}>
                          {columns.map((c) => (
                            <td key={c} title={`Click to copy`} onClick={() => copy(String(r[c]))}>{String(r[c])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table className="table table-sm">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c} title={`Click to copy column name`} onClick={() => copy(c)} className="sticky top-0 bg-base-100 z-10">
                          <span>{c}</span>
                          <span className="badge badge-outline ml-1.5">{types[c]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r, i) => (
                      <tr key={i}>
                        {columns.map((c) => (
                          <td key={c} title={`Click to copy`} onClick={() => copy(String(r[c]))}>{String(r[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'schema' && (
        <div className="max-h-[420px] p-2 overflow-auto">
          {schemaTables.length === 0 ? (
            <div className="text-sm text-base-content/70">No tables found</div>
          ) : (
            schemaTables.map((t) => (
              <div key={t} className="flex flex-col mb-2">
                <strong>{t}</strong>
                <div className="flex flex-wrap gap-1.5">
                  {(schemaColumns[t] || []).map((c) => (
                    <span key={c} className="badge badge-outline" title="Click to copy" onClick={() => copy(c)}>{c}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="p-2 text-sm text-base-content/70 whitespace-pre-wrap max-h-[420px] overflow-auto">{message || 'No messages'}</div>
      )}
    </div>
  );
}
            
  