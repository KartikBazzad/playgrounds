import { describe, it, expect, vi } from 'vitest';
import { getDB } from '@/lib/duckdb';

vi.mock('@duckdb/duckdb-wasm', () => {
  class AsyncDuckDB {
    constructor(_logger: any, _worker: any) {}
    async instantiate(_mod: any, _pthread: any) {}
  }
  return {
    ConsoleLogger: class {},
    AsyncDuckDB,
    getJsDelivrBundles: () => ({ some: 'bundle' }),
    selectBundle: vi.fn(async () => ({ mainWorker: 'mw.js', mainModule: 'mm.wasm', pthreadWorker: 'pw.js' })),
  };
});

// Mock Worker and Blob
class W {}
(global as any).Worker = W as any;
(global as any).Blob = class {} as any;
(global as any).URL = { createObjectURL: () => 'blob:url' } as any;


describe('duckdb getDB', () => {
  it('returns a singleton db instance', async () => {
    const db1 = await getDB();
    const db2 = await getDB();
    expect(db1).toBe(db2);
  });
});
