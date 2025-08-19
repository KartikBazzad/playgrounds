import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, expect, describe, it, beforeEach } from 'vitest';
import { useRunner } from '@/lib/useRunner';

// Helper to emulate DuckDB result iterator shape
function makeResult(columns: string[], rows: any[][]) {
  return {
    schema: { fields: columns.map((name) => ({ name })) },
    [Symbol.iterator]: function* () {
      for (const r of rows) {
        yield { get: (i: number) => r[i] };
      }
    },
  } as any;
}

// Simple in-memory state to simulate LOAD SAMPLE and SELECT
let peopleRows: Array<[string, number, string]> = [];

beforeEach(() => {
  peopleRows = [];
});

// Mock the DB layer used by useRunner
vi.mock('@/lib/duckdb', () => {
  return {
    getConn: async () => ({
      query: async (sql: string) => {
        const s = sql.trim().toUpperCase();
        // useRunner's LOAD SAMPLE calls loadSample(conn) which issues CREATE TABLE ... AS SELECT * FROM read_csv(...)
        if (s.startsWith('CREATE OR REPLACE TABLE PEOPLE AS SELECT * FROM READ_CSV(')) {
          peopleRows = [
            ['Aarav', 28, 'Bengaluru'],
            ['Diya', 22, 'Delhi'],
            ['Kabir', 35, 'Mumbai'],
            ['Isha', 31, 'Bengaluru'],
            ['Vihaan', 27, 'Pune'],
          ];
          return makeResult(['ok'], []);
        }
        if (s.startsWith('SELECT') && s.includes('FROM PEOPLE')) {
          const cols = ['name', 'age', 'city'];
          const limited = peopleRows.slice(0, 5);
          return makeResult(cols, limited as any);
        }
        // Default empty result
        return makeResult(['dummy'], []);
      },
      close: async () => {},
    }),
  };
});

describe('SQL integration via useRunner with mocked DuckDB', () => {
  it('LOAD SAMPLE then SELECT * FROM people LIMIT 5 returns rows', async () => {
    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = (t: string) => t; // no-op
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    // Step 1: LOAD SAMPLE
    let out1: any;
    await act(async () => {
      out1 = await result.current.run('LOAD SAMPLE;');
    });
    expect(out1.rows).toEqual([]);
    expect(out1.message).toContain('Sample loaded as table people');

    // Step 2: SELECT
    let out2: any;
    await act(async () => {
      out2 = await result.current.run('SELECT * FROM people LIMIT 5;');
    });

    expect(out2.columns).toEqual(['name', 'age', 'city']);
    expect(out2.rows).toEqual([
      { name: 'Aarav', age: 28, city: 'Bengaluru' },
      { name: 'Diya', age: 22, city: 'Delhi' },
      { name: 'Kabir', age: 35, city: 'Mumbai' },
      { name: 'Isha', age: 31, city: 'Bengaluru' },
      { name: 'Vihaan', age: 27, city: 'Pune' },
    ]);
  });
});
