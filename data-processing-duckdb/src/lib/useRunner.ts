import { useCallback } from 'react';
import { getConn, ensureHttpfs } from '@/lib/duckdb';
import { logEvent } from '@/lib/logService';

type Row = Record<string, unknown>;

async function loadSample(conn: any) {
  await ensureHttpfs();
  const url = `${location.origin}/data/people.csv`;
  await conn.query(`CREATE OR REPLACE TABLE people AS SELECT * FROM read_csv('${url}', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1);`);
}

export interface RunResult {
  columns: string[];
  rows: Row[];
  execMs: number;
  message: string;
}

// Global serialization to prevent concurrent queries on the single shared connection.
// This ensures Playground and Shell don't interleave statements.
let __queryChain: Promise<any> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = __queryChain.then(fn, fn);
  // Ensure the chain continues regardless of success/failure
  __queryChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function useRunner(
  refreshSchema: () => Promise<void>,
  interpolateSQL: (text: string) => string,
) {
  const run = useCallback(async (rawText: string): Promise<RunResult> => serialize(async () => {
    const conn = await getConn();
    const t0 = performance.now();
    const text = interpolateSQL(rawText.trim());
    try {
      try { await logEvent('debug', 'runner', 'run_start', { text }); } catch {}
      // Handle LOAD SAMPLE optionally mixed with other statements.
      const loadRe = /^\s*LOAD\s+SAMPLE;?\s*$/gim;
      const hasLoad = loadRe.test(text);
      if (hasLoad) {
        // Reset regex state and remove lines that only contain LOAD SAMPLE;
        loadRe.lastIndex = 0;
        const remaining = text.replace(loadRe, '\n').trim();
        await loadSample(conn);
        if (!remaining) {
          const t1 = performance.now();
          try { await logEvent('info', 'runner', 'run_loaded_sample', { ms: t1 - t0 }); } catch {}
          return { columns: [], rows: [], execMs: t1 - t0, message: 'Sample loaded as table people' };
        }
        const result = await conn.query(remaining);
        const { cols, data } = buildRows(result);
        const t1 = performance.now();
        try { await logEvent('info', 'runner', 'run_ok', { ms: t1 - t0, rows: data.length, cols: cols.length }); } catch {}
        return { columns: cols, rows: data, execMs: t1 - t0, message: `Returned ${data.length} rows` };
      }
      const result = await conn.query(text);
      const { cols, data } = buildRows(result);
      const t1 = performance.now();
      try { await logEvent('info', 'runner', 'run_ok', { ms: t1 - t0, rows: data.length, cols: cols.length }); } catch {}
      return { columns: cols, rows: data, execMs: t1 - t0, message: `Returned ${data.length} rows` };
    } catch (e: any) {
      const t1 = performance.now();
      try { await logEvent('error', 'runner', 'run_failed', { ms: t1 - t0, error: String(e?.message || e) }); } catch {}
      throw e;
    } finally {
      try { await refreshSchema(); } catch {}
    }
  }), [refreshSchema, interpolateSQL]);

  function buildRows(result: any): { cols: string[]; data: Row[] } {
    try {
      // 1) If toArray() yields array of plain objects with meaningful keys, prefer that
      try {
        if (typeof result?.toArray === 'function') {
          const arr = result.toArray();
          if (Array.isArray(arr)) {
            const keys = arr[0] ? Object.keys(arr[0]) : [];
            const allGeneric = keys.length > 0 && keys.every((k) => /^column\d+$/i.test(k));
            if (keys.length > 0 && !allGeneric) {
              return { cols: keys, data: arr };
            }
          }
        }
      } catch { /* ignore and fallback */ }

      // 2) Use schema fields and iterable rows
      const cols: string[] = result?.schema?.fields?.map((f: any) => f.name as string) || [];
      const data: Row[] = [];
      try {
        for (const row of result) {
          if (row && typeof (row as any).get === 'function' && cols.length) {
            const obj: Row = {};
            cols.forEach((c: string, i: number) => (obj[c] = (row as any).get(i)));
            data.push(obj);
          } else if (row && typeof row === 'object') {
            data.push(row as Row);
          }
        }
      } catch { /* ignore */ }

      // 3) If still generic, and toArray exists, fall back to its objects even if keys are generic
      if (data.length === 0 && typeof result?.toArray === 'function') {
        const arr = result.toArray();
        if (Array.isArray(arr)) {
          const keys = cols.length ? cols : (arr[0] ? Object.keys(arr[0]) : []);
          return { cols: keys, data: arr };
        }
      }

      const derivedCols = cols.length ? cols : (data[0] ? Object.keys(data[0]) : []);
      return { cols: derivedCols, data };
    } catch {
      return { cols: [], data: [] };
    }
  }

  return { run };
}
