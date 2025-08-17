import { describe, it, expect, beforeEach } from 'vitest';
import { idbGet, idbSet } from '@/lib/idb';

// Minimal IndexedDB mock
class MockReq {
  onsuccess: ((this: any, ev: any) => any) | null = null;
  onerror: ((this: any, ev: any) => any) | null = null;
  result: any;
  error: any;
  constructor(result?: any) { this.result = result; }
}

class Store {
  map = new Map<string, any>();
  get(key: string) { const r = new MockReq(this.map.get(key)); setTimeout(() => r.onsuccess && r.onsuccess.call(r, {}), 0); return r as any; }
  put(val: any, key: string) { this.map.set(key, val); const r = new MockReq(); setTimeout(() => r.onsuccess && r.onsuccess.call(r, {}), 0); return r as any; }
}
class Tx { constructor(public store: Store) {} objectStore() { return this.store as any; } }
class DB {
  store = new Store();
  transaction(_name: string, _mode: string) { return new Tx(this.store) as any; }
  objectStoreNames = { contains: () => true } as any;
}

class OpenDB {
  result = new DB();
  onupgradeneeded: any;
  onsuccess: any;
  onerror: any;
}

let openCalls = 0;

beforeEach(() => {
  const sharedDB = new DB();
  (global as any).indexedDB = {
    open: (_name: string, _ver: number) => {
      openCalls++;
      const req = new OpenDB();
      // ensure all opens return the same underlying DB
      (req as any).result = sharedDB;
      setTimeout(() => req.onsuccess && req.onsuccess({}), 0);
      return req as any;
    },
  };
});

describe('idb', () => {
  it('sets and gets values', async () => {
    await idbSet('k', 123);
    const v = await idbGet('k');
    expect(v).toBe(123);
  });
});
