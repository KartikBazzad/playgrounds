// IndexedDB helpers
// DB: 'duckdb-playground'
// Stores:
//  - 'kv'   (generic key-value, for backwards compatibility)
//  - 'logs' (auto-increment table for structured logs)

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('duckdb-playground', 2);
    req.onupgradeneeded = async (ev) => {
      const db = req.result;
      // Ensure KV store exists (v1)
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
      // Create logs store (v2)
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      }

      // Best-effort migration: if old kv['playground_logs'] exists and is an array, copy into logs
      try {
        const tx = (ev.target as IDBOpenDBRequest).transaction; // upgrade transaction
        if (!tx) return;
        const kvStore = tx.objectStore('kv');
        const logsStore = tx.objectStore('logs');
        const getReq = kvStore.get('playground_logs');
        getReq.onsuccess = () => {
          const arr = getReq.result;
          if (Array.isArray(arr)) {
            for (const entry of arr) {
              try { logsStore.add(entry); } catch {}
            }
            try { kvStore.delete('playground_logs'); } catch {}
          }
        };
      } catch {}
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet<T = unknown>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const req = store.put(value as any, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Logs table helpers
export async function logsAdd(entry: any): Promise<number | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    const req = store.add(entry);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function logsGetAll<T = any>(): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('logs', 'readonly');
    const store = tx.objectStore('logs');
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function logsClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
