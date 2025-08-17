import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { useSchema } from '@/lib/useSchema';
import { vi } from 'vitest';

// Mock DuckDB getDB
vi.mock('@/lib/duckdb', () => {
  return {
    getDB: async () => ({
      connect: async () => ({
        query: async (sql: string) => {
          if (/information_schema\.tables/i.test(sql)) {
            const rows = [ ['people'], ['tips'] ];
            return {
              schema: { fields: [{ name: 'name' }] },
              [Symbol.iterator]: function* () {
                for (const r of rows) {
                  yield { get: (i: number) => r[i] };
                }
              },
            } as any;
          }
          // columns
          const rows = [ ['people', 'id'], ['people', 'name'], ['tips', 'total_bill'] ];
          return {
            schema: { fields: [{ name: 'table_name' }, { name: 'column_name' }] },
            [Symbol.iterator]: function* () {
              for (const r of rows) {
                yield { get: (i: number) => r[i] };
              }
            },
          } as any;
        },
        close: async () => {},
      }),
    }),
  };
});

function SchemaHost({ ready, onSchema }: { ready: boolean; onSchema: (t: string[], c: Record<string, string[]>) => void }) {
  const { schemaTables, schemaColumns } = useSchema(ready);
  useEffect(() => {
    onSchema(schemaTables, schemaColumns);
  }, [schemaTables, schemaColumns, onSchema]);
  return null;
}

describe('useSchema', () => {
  it('loads tables and columns when ready', async () => {
    let latest: { t: string[]; c: Record<string, string[]> } = { t: [], c: {} };
    const onSchema = (t: string[], c: Record<string, string[]>) => { latest = { t, c }; };
    render(<SchemaHost ready={true} onSchema={onSchema} />);

    await waitFor(() => {
      expect(latest.t).toEqual(['people', 'tips']);
      expect(latest.c.people).toEqual(['id', 'name']);
      expect(latest.c.tips).toEqual(['total_bill']);
    });
  });
});
