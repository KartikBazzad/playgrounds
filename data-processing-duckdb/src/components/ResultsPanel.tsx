import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface ResultsPanelProps {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  message: string;
  executionMs?: number | null;
  schemaTables: string[];
  schemaColumns: Record<string, string[]>;
  enablePagination?: boolean;
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
      // prefer non-null types if available
      if (types[c] === 'null' && t !== 'null') types[c] = t;
      // keep first non-null, else leave as-is
    }
  }
  return types;
}

export default function ResultsPanel({ title, columns, rows, message, executionMs = null, schemaTables, schemaColumns, enablePagination = true }: ResultsPanelProps) {
  const [tab, setTab] = useState<'results' | 'schema' | 'messages'>('results');
  const [jsonMode, setJsonMode] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => { setPage(1); }, [rows, pageSize]);
  const pageCount = Math.max(1, Math.ceil((rows.length || 1) / pageSize));
  const pagedRows = useMemo(() => {
    if (!enablePagination) return rows;
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize, enablePagination]);

  const types = useMemo(() => inferTypes(columns, rows), [columns, rows]);

  // Basic virtualization for large page
  const virtContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = () => {
    const el = virtContainerRef.current;
    if (el) setScrollTop(el.scrollTop);
  };
  const visibleHeight = 400; // fixed visible area height for virtualization
  const usingVirt = pagedRows.length > Math.floor(visibleHeight / ROW_HEIGHT) + 30;
  const totalHeight = pagedRows.length * ROW_HEIGHT;
  const startIndex = usingVirt ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10) : 0;
  const endIndex = usingVirt ? Math.min(pagedRows.length, startIndex + Math.ceil(visibleHeight / ROW_HEIGHT) + 20) : pagedRows.length;
  const virtSlice = usingVirt ? pagedRows.slice(startIndex, endIndex) : pagedRows;
  const offsetY = usingVirt ? startIndex * ROW_HEIGHT : 0;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="card vstack" style={{ gap: 8 }}>
      {title && <strong>{title}</strong>}

      {/* Tabs */}
      <div className="tabs hstack" style={{ gap: 8 }}>
        <button className={tab === 'results' ? 'tab active' : 'tab'} onClick={() => setTab('results')}>Results</button>
        <button className={tab === 'schema' ? 'tab active' : 'tab'} onClick={() => setTab('schema')}>Schema</button>
        <button className={tab === 'messages' ? 'tab active' : 'tab'} onClick={() => setTab('messages')}>Messages</button>
        <div className="hstack" style={{ marginLeft: 'auto', gap: 8 }}>
          {tab === 'results' && (
            <>
              <button className="secondary" onClick={() => setJsonMode((v) => !v)}>{jsonMode ? 'Table' : 'JSON'}</button>
              {enablePagination && (
                <>
                  <button className="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
                  <span className="muted">Page {page} / {pageCount}</span>
                  <button className="secondary" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>Next</button>
                  <span className="muted" style={{ marginLeft: 8 }}>Page size:</span>
                  <select className="secondary" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
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

      {/* Meta line */}
      <div className="muted">
        {rows.length} rows{executionMs != null ? ` • ${Math.round(executionMs)} ms` : ''}
      </div>

      {/* Tab content */}
      {tab === 'results' && (
        <div style={{ overflowX: 'auto' }}>
          {jsonMode ? (
            <pre style={{ maxHeight: 420, overflow: 'auto', margin: 0 }}>{JSON.stringify(pagedRows, null, 2)}</pre>
          ) : (
            <div ref={virtContainerRef} onScroll={onScroll} style={{ maxHeight: usingVirt ? visibleHeight : undefined, overflow: usingVirt ? 'auto' : 'visible' }}>
              {usingVirt ? (
                <div style={{ height: totalHeight, position: 'relative' }}>
                  <table className="table" style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
                    <thead>
                      <tr>
                        {columns.map((c) => (
                          <th key={c} title={`Click to copy column name`} onClick={() => copy(c)}>
                            <span>{c}</span>
                            <span className="badge" style={{ marginLeft: 6 }}>{types[c]}</span>
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
                <table className="table">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c} title={`Click to copy column name`} onClick={() => copy(c)}>
                          <span>{c}</span>
                          <span className="badge" style={{ marginLeft: 6 }}>{types[c]}</span>
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
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          {schemaTables.length === 0 ? (
            <div className="muted">No tables found</div>
          ) : (
            schemaTables.map((t) => (
              <div key={t} className="vstack" style={{ marginBottom: 8 }}>
                <strong>{t}</strong>
                <div className="hstack wrap" style={{ gap: 6 }}>
                  {(schemaColumns[t] || []).map((c) => (
                    <span key={c} className="badge" title="Click to copy" onClick={() => copy(c)}>{c}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{message || 'No messages'}</div>
      )}
    </div>
  );
}
