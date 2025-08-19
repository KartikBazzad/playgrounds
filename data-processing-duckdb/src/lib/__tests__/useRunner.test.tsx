import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, expect, describe, it, beforeEach } from 'vitest';
import { useRunner } from '@/lib/useRunner';

// Mock DuckDB getConn and a simple result iterator
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

const querySpy = vi.fn<[string], Promise<any>>();

vi.mock('@/lib/duckdb', () => {
  return {
    getConn: async () => ({
      query: async (sql: string) => querySpy(sql),
      close: async () => {},
    }),
  };
});

describe('useRunner', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });
  it('executes a normal query and returns rows/cols/execMs/message, and refreshes schema', async () => {
    querySpy.mockImplementationOnce(async (sql: string) => makeResult(['id', 'name'], [[1, 'a'], [2, 'b']]));

    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = (t: string) => t;
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    let out: any;
    await act(async () => {
      out = await result.current.run('select * from people');
    });

    expect(out.columns).toEqual(['id', 'name']);
    expect(out.rows).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
    expect(typeof out.execMs).toBe('number');
    expect(out.message).toContain('Returned 2 rows');
    expect(refreshSchema).toHaveBeenCalled();
  });

  it('handles LOAD SAMPLE and returns message and execMs, and refreshes schema', async () => {
    // First call (LOAD SAMPLE) does not care about query result
    querySpy.mockImplementation(async () => makeResult(['dummy'], []));

    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = (t: string) => t;
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    let out: any;
    await act(async () => {
      out = await result.current.run('LOAD SAMPLE;');
    });

    expect(out.columns).toEqual([]);
    expect(out.rows).toEqual([]);
    expect(typeof out.execMs).toBe('number');
    expect(out.message).toContain('Sample loaded as table people');
    expect(refreshSchema).toHaveBeenCalled();
  });

  it('propagates query errors but still refreshes schema and closes', async () => {
    querySpy.mockImplementationOnce(async () => { throw new Error('boom'); });

    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = vi.fn((t: string) => t + ' -- interpolated');
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    await expect(result.current.run('select 1')).rejects.toThrow('boom');
    expect(refreshSchema).toHaveBeenCalled();
    expect(interpolateSQL).toHaveBeenCalledWith('select 1');
  });

  it('executes LOAD SAMPLE followed by a SELECT in the same submission', async () => {
    // First two calls: internal loadSample (INSTALL/LOAD, CREATE TABLE)
    // Third call: actual SELECT
    querySpy
      .mockImplementationOnce(async (_sql: string) => makeResult(['ignored1'], []))
      .mockImplementationOnce(async (_sql: string) => makeResult(['ignored2'], []))
      .mockImplementationOnce(async (_sql: string) => makeResult(['a'], [[42]]));

    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = (t: string) => t; // keep as-is
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    let out: any;
    await act(async () => {
      out = await result.current.run('LOAD SAMPLE;\nSELECT 42 AS a;');
    });

    expect(out.columns).toEqual(['a']);
    expect(out.rows).toEqual([{ a: 42 }]);
    expect(out.message).toContain('Returned 1 rows');
    expect(refreshSchema).toHaveBeenCalled();
  });

  it('supports result rows as plain objects when row.get is not available', async () => {
    const plainIterResult = {
      // no schema: columns should be inferred from first row
      [Symbol.iterator]: function* () {
        yield { id: 1, name: 'x' };
        yield { id: 2, name: 'y' };
      },
    } as any;
    querySpy.mockImplementationOnce(async () => plainIterResult);

    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = (t: string) => t;
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    let out: any;
    await act(async () => {
      out = await result.current.run('select * from t');
    });

    expect(out.columns.sort()).toEqual(['id', 'name']);
    expect(out.rows).toEqual([{ id: 1, name: 'x' }, { id: 2, name: 'y' }]);
  });

  it('passes through BigInt values in rows without throwing during building', async () => {
    const resWithSchema = {
      schema: { fields: [{ name: 'b' }] },
      [Symbol.iterator]: function* () {
        yield { get: (i: number) => (i === 0 ? BigInt(9007199254740993) : null) };
      },
    } as any;
    querySpy.mockImplementationOnce(async () => resWithSchema);

    const refreshSchema = vi.fn(async () => {});
    const interpolateSQL = (t: string) => t;
    const { result } = renderHook(() => useRunner(refreshSchema, interpolateSQL));

    let out: any;
    await act(async () => {
      out = await result.current.run('select 9007199254740993::UBIGINT as b');
    });

    expect(out.columns).toEqual(['b']);
    // BigInt preserved in structure; JSON logging is handled elsewhere
    expect(typeof out.rows[0].b).toBe('bigint');
  });
});
