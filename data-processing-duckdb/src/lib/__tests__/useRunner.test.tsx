import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, expect, describe, it } from 'vitest';
import { useRunner } from '@/lib/useRunner';

// Mock DuckDB getDB and a simple result iterator
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
    getDB: async () => ({
      connect: async () => ({
        query: async (sql: string) => querySpy(sql),
        close: async () => {},
      }),
    }),
  };
});

describe('useRunner', () => {
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
});
