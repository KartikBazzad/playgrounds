import { useCallback, useEffect, useState } from 'react';
import { getDB } from '@/lib/duckdb';

export function useSchema(ready: boolean) {
  const [schemaTables, setSchemaTables] = useState<string[]>([]);
  const [schemaColumns, setSchemaColumns] = useState<Record<string, string[]>>({});

  const refreshSchema = useCallback(async () => {
    try {
      const db = await getDB();
      const conn = await db.connect();
      const tblRes = await conn.query(`
        SELECT table_name AS name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema')
        ORDER BY name;
      `);
      const tables: string[] = [];
      for (const row of tblRes) tables.push(String(row.get(0)));

      const colRes = await conn.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('information_schema')
        ORDER BY table_name, ordinal_position;
      `);
      const cols: Record<string, string[]> = {};
      for (const row of colRes) {
        const t = String(row.get(0));
        const c = String(row.get(1));
        (cols[t] ||= []).push(c);
      }
      await conn.close();
      setSchemaTables(tables);
      setSchemaColumns(cols);
    } catch {}
  }, []);

  useEffect(() => {
    if (!ready) return;
    refreshSchema().catch(() => {});
  }, [ready, refreshSchema]);

  return { schemaTables, schemaColumns, refreshSchema };
}
