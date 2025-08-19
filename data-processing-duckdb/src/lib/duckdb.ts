import * as duckdb from '@duckdb/duckdb-wasm';

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundles = duckdb.getJsDelivrBundles();
      let bundle = await duckdb.selectBundle(bundles);
      // Diagnostics: log selected bundle URLs
      try {
        console.debug('[duckdb] Selected bundle', {
          mainWorker: bundle.mainWorker,
          mainModule: bundle.mainModule,
          pthreadWorker: bundle.pthreadWorker,
        });
      } catch {}

      // Create a worker that loads the main worker script from the selected bundle
      const mw = bundle.mainWorker;
      if (!mw) throw new Error('DuckDB bundle mainWorker is missing');
      const workerBlob = new Blob([`importScripts("${mw}");`], { type: 'text/javascript' });
      const worker = new Worker(URL.createObjectURL(workerBlob));

      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      // Validate mainModule is reachable and looks like wasm to avoid opaque magic-word errors
      try {
        const mm = bundle.mainModule;
        if (!mm) throw new Error('DuckDB bundle mainModule is missing');
        const res = await fetch(mm, { method: 'GET' });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || (!ct.includes('wasm') && !ct.includes('application/wasm'))) {
          throw new Error(`DuckDB mainModule not usable: url=${mm} status=${res.status} content-type='${ct}'`);
        }
      } catch (e) {
        console.warn('[duckdb] jsDelivr mainModule fetch failed, attempting unpkg fallback…', e);
        // Fallback: rewrite to unpkg CDN
        const rewrite = (u: string | undefined | null) => (u ? u.replace('https://cdn.jsdelivr.net/', 'https://unpkg.com/') : undefined as any);
        bundle = {
          ...bundle,
          mainModule: rewrite(bundle.mainModule) as any,
          mainWorker: rewrite(bundle.mainWorker) as any,
          pthreadWorker: bundle.pthreadWorker ? (rewrite(bundle.pthreadWorker) as any) : undefined as any,
        };
        try {
          console.debug('[duckdb] Fallback bundle', {
            mainWorker: bundle.mainWorker,
            mainModule: bundle.mainModule,
            pthreadWorker: bundle.pthreadWorker,
          });
          const mm2 = bundle.mainModule;
          if (!mm2) throw new Error('DuckDB fallback mainModule is missing');
          const res2 = await fetch(mm2, { method: 'GET' });
          const ct2 = res2.headers.get('content-type') || '';
          if (!res2.ok || (!ct2.includes('wasm') && !ct2.includes('application/wasm'))) {
            throw new Error(`DuckDB mainModule fallback not usable: url=${mm2} status=${res2.status} content-type='${ct2}'`);
          }
        } catch (e2) {
          console.error('[duckdb] Fallback mainModule fetch failed', e2);
          throw e2;
        }
      }

      const modUrl = bundle.mainModule;
      if (!modUrl) throw new Error('DuckDB bundle mainModule is missing at instantiate');
      await db.instantiate(modUrl, bundle.pthreadWorker);
      return db;
    })();
  }
  return dbPromise;
}

let connPromise: Promise<duckdb.AsyncDuckDBConnection> | null = null;

// Returns a shared connection to preserve session context (temp tables, pragmas, etc.) across cell runs
export async function getConn(): Promise<duckdb.AsyncDuckDBConnection> {
  const db = await getDB();
  if (!connPromise) {
    connPromise = db.connect();
  }
  return connPromise;
}

// Reset the shared session by discarding the current connection and database.
// Next call to getDB/getConn will create a fresh instance, clearing all tables/views/session state.
export async function resetSession(): Promise<void> {
  try {
    if (connPromise) {
      const c = await connPromise;
      try { await c.close(); } catch { /* ignore */ }
    }
  } finally {
    connPromise = null;
    dbPromise = null;
  }
}

// Robustly install and load httpfs for WASM builds. Tries default repo and extensions.duckdb.org.
export async function ensureHttpfs(): Promise<void> {
  const conn = await getConn();
  // Fast path: try LOAD first (in case it's already installed)
  try {
    await conn.query('LOAD httpfs;');
    return;
  } catch {}
  // Try plain install + load
  try {
    await conn.query('INSTALL httpfs;');
    await conn.query('LOAD httpfs;');
    return;
  } catch {}
  // Try with custom extension repository variable
  try {
    await conn.query("SET custom_extension_repository='https://extensions.duckdb.org';");
    await conn.query('INSTALL httpfs;');
    await conn.query('LOAD httpfs;');
    return;
  } catch {}
  // Try explicit FROM syntax
  try {
    await conn.query("INSTALL httpfs FROM 'https://extensions.duckdb.org';");
    await conn.query('LOAD httpfs;');
    return;
  } catch {}
}
