import { useCallback, useEffect, useState } from 'react';
import { getConn } from '@/lib/duckdb';
import { logEvent } from '@/lib/logService';

let __schemaInFlight = false;

export function useSchema(ready: boolean) {
  const [schemaTables, setSchemaTables] = useState<string[]>([]);
  const [schemaColumns, setSchemaColumns] = useState<Record<string, string[]>>({});

  const refreshSchema = useCallback(async () => {
    if (__schemaInFlight) {
      try { console.debug('[schema] refresh skipped (in-flight)'); } catch {}
      try { await logEvent('debug', 'schema', 'refresh_skipped_inflight'); } catch {}
      return;
    }
    __schemaInFlight = true;
    try {
      // Use the shared session connection so TEMP/session-scoped objects are visible
      const conn = await getConn();
      const tables: string[] = [];
      let colsMap: Record<string, string[]> = {};

      // 1) Try duckdb_* functions first
      let duckOk = false;
      try {
        try { await logEvent('debug', 'schema', 'duckdb_introspection_start'); } catch {}
        const tblRes = await conn.query(`
          SELECT DISTINCT table_name AS name
          FROM duckdb_tables()
          ORDER BY name;
        `);
        try {
          for (const row of tblRes) tables.push(String(row.get(0)));
        } catch {
          const arr = typeof (tblRes as any)?.toArray === 'function' ? (tblRes as any).toArray() : [];
          for (const o of arr) tables.push(String(o?.name ?? o?.table_name ?? ''));
        }
        const colRes = await conn.query(`
          SELECT table_name, column_name
          FROM duckdb_columns()
          ORDER BY table_name, column_name;
        `);
        try {
          for (const row of colRes) {
            const t = String(row.get(0));
            const c = String(row.get(1));
            (colsMap[t] ||= []).push(c);
          }
        } catch {
          const arr = typeof (colRes as any)?.toArray === 'function' ? (colRes as any).toArray() : [];
          for (const o of arr) {
            const t = String((o as any)?.table_name ?? '');
            const c = String((o as any)?.column_name ?? '');
            if (t && c) (colsMap[t] ||= []).push(c);
          }
        }
        duckOk = true;
        try { await logEvent('info', 'schema', 'duckdb_introspection_ok', { tablesCount: tables.length, columnOwnerCount: Object.keys(colsMap).length }); } catch {}
      } catch (e: any) {
        try { console.debug('[schema] duckdb_* failed, falling back:', String(e?.message || e)); } catch {}
        try { await logEvent('warn', 'schema', 'duckdb_introspection_failed', { error: String(e?.message || e) }); } catch {}
      }

      // 2) Fallback to information_schema if needed
      if (!duckOk) {
        try {
          try { await logEvent('debug', 'schema', 'infoschema_introspection_start'); } catch {}
          const tblRes2 = await conn.query(`
            SELECT table_name AS name
            FROM information_schema.tables
            WHERE table_schema NOT IN ('information_schema')
            ORDER BY name;
          `);
          try {
            for (const row of tblRes2) tables.push(String(row.get(0)));
          } catch {
            const arr = typeof (tblRes2 as any)?.toArray === 'function' ? (tblRes2 as any).toArray() : [];
            for (const o of arr) tables.push(String(o?.name ?? o?.table_name ?? ''));
          }
          const colRes2 = await conn.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema NOT IN ('information_schema')
            ORDER BY table_name, ordinal_position;
          `);
          try {
            for (const row of colRes2) {
              const t = String(row.get(0));
              const c = String(row.get(1));
              (colsMap[t] ||= []).push(c);
            }
          } catch {
            const arr = typeof (colRes2 as any)?.toArray === 'function' ? (colRes2 as any).toArray() : [];
            for (const o of arr) {
              const t = String((o as any)?.table_name ?? '');
              const c = String((o as any)?.column_name ?? '');
              if (t && c) (colsMap[t] ||= []).push(c);
            }
          }
          try { await logEvent('info', 'schema', 'infoschema_introspection_ok', { tablesCount: tables.length, columnOwnerCount: Object.keys(colsMap).length }); } catch {}
        } catch (e: any) {
          try { console.debug('[schema] information_schema fallback failed:', String(e?.message || e)); } catch {}
          try { await logEvent('error', 'schema', 'infoschema_introspection_failed', { error: String(e?.message || e) }); } catch {}
        }
      }

      // Deduplicate tables and columns
      const uniqTables = Array.from(new Set(tables.filter(Boolean)));
      const uniqColsMap: Record<string, string[]> = {};
      for (const [t, cols] of Object.entries(colsMap)) {
        uniqColsMap[t] = Array.from(new Set((cols || []).filter(Boolean)));
      }
      setSchemaTables(uniqTables);
      setSchemaColumns(uniqColsMap);
      try { console.debug('[schema] tables:', uniqTables, 'columns keys:', Object.keys(uniqColsMap)); } catch {}
      try { await logEvent('info', 'schema', 'refresh_done', { tables: uniqTables, columnsKeys: Object.keys(uniqColsMap) }); } catch {}
      // Broadcast so other hook instances (e.g., Playground vs Shell) stay in sync
      try { window.dispatchEvent(new CustomEvent('schema_state', { detail: { tables: uniqTables, columns: uniqColsMap } })); } catch {}
    } catch (e: any) {
      try { console.debug('[schema] refresh failed:', String(e?.message || e)); } catch {}
      try { await logEvent('error', 'schema', 'refresh_failed', { error: String(e?.message || e) }); } catch {}
    } finally {
      __schemaInFlight = false;
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    refreshSchema().catch(() => {});
  }, [ready, refreshSchema]);

  // Listen for schema updates from other hook instances
  useEffect(() => {
    const onSchema = (e: Event) => {
      const anyEvt = e as CustomEvent<{ tables: string[]; columns: Record<string, string[]> }>;
      const detail = anyEvt?.detail;
      if (detail && Array.isArray(detail.tables) && typeof detail.columns === 'object') {
        setSchemaTables(detail.tables);
        setSchemaColumns(detail.columns);
      }
    };
    try { window.addEventListener('schema_state', onSchema as EventListener); } catch {}
    return () => { try { window.removeEventListener('schema_state', onSchema as EventListener); } catch {} };
  }, []);

  return { schemaTables, schemaColumns, refreshSchema };
}
