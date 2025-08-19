// Simple structured logging to IndexedDB with download helper
// Uses dedicated 'logs' object store (src/lib/idb.ts)

import { logsAdd, logsGetAll, logsClear as idbLogsClear } from '@/lib/idb';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string; // ISO timestamp
  level: LogLevel;
  ctx: string; // component/hook context e.g., 'schema', 'runner', 'shell'
  event: string; // short event name
  data?: unknown; // structured payload (must be JSON-serializable)
}

export async function logEvent(level: LogLevel, ctx: string, event: string, data?: unknown): Promise<void> {
  try {
    const now = new Date().toISOString();
    const entry: LogEntry = { ts: now, level, ctx, event, data };
    await logsAdd(entry);
  } catch {
    // best-effort: ignore logging errors
  }
}

export async function getLogs(): Promise<LogEntry[]> {
  return logsGetAll<LogEntry>();
}

export async function clearLogs(): Promise<void> {
  await idbLogsClear();
}

export async function downloadLogs(filename = 'duckdb_playground_logs.json'): Promise<void> {
  try {
    const logs = await logsGetAll<LogEntry>();
    const safe = JSON.stringify(logs, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
    const blob = new Blob([safe], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

// Optional: expose on window for quick manual debugging
try {
  (window as any).Logs = {
    logEvent,
    getLogs,
    clearLogs,
    downloadLogs,
  };
} catch {}
