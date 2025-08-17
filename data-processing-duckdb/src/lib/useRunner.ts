import { useCallback } from 'react';
import { getDB } from '@/lib/duckdb';

type Row = Record<string, unknown>;

async function loadSample(conn: any) {
  await conn.query(`INSTALL httpfs; LOAD httpfs;`);
  const url = `${location.origin}/data/people.csv`;
  await conn.query(`CREATE OR REPLACE TABLE people AS SELECT * FROM read_csv('${url}', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1);`);
}

export interface RunResult {
  columns: string[];
  rows: Row[];
  execMs: number;
  message: string;
}

export function useRunner(
  refreshSchema: () => Promise<void>,
  interpolateSQL: (text: string) => string,
) {
  const run = useCallback(async (rawText: string): Promise<RunResult> => {
    const db = await getDB();
    const conn = await db.connect();
    const t0 = performance.now();
    const text = interpolateSQL(rawText.trim());
    try {
      if (/^LOAD SAMPLE;?/im.test(text)) {
        await loadSample(conn);
        const t1 = performance.now();
        return { columns: [], rows: [], execMs: t1 - t0, message: 'Sample loaded as table people' };
      }
      const result = await conn.query(text);
      const cols = result.schema.fields.map((f: any) => f.name as string);
      const data: Row[] = [];
      for (const row of result) {
        const obj: Row = {};
        cols.forEach((c: string, i: number) => (obj[c] = row.get(i)));
        data.push(obj);
      }
      const t1 = performance.now();
      return { columns: cols, rows: data, execMs: t1 - t0, message: `Returned ${data.length} rows` };
    } finally {
      try { await conn.close(); } catch {}
      try { await refreshSchema(); } catch {}
    }
  }, [refreshSchema, interpolateSQL]);

  return { run };
}
