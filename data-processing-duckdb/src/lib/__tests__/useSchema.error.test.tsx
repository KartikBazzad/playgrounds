import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSchema } from '@/lib/useSchema';

vi.mock('@/lib/duckdb', () => ({
  getDB: async () => ({
    connect: async () => ({
      query: async () => { throw new Error('schema boom'); },
      close: async () => {},
    }),
  }),
}));

function Host() {
  // ready true triggers refreshSchema in effect
  const { schemaTables, schemaColumns } = useSchema(true);
  return (
    <div>
      <div data-testid="tables">{schemaTables.join(',')}</div>
      <div data-testid="cols">{Object.keys(schemaColumns).join(',')}</div>
    </div>
  );
}

describe('useSchema error path', () => {
  it('does not crash when schema queries fail', () => {
    const { getByTestId } = render(<Host />);
    // Should render with empty state
    expect(getByTestId('tables').textContent).toBe('');
    expect(getByTestId('cols').textContent).toBe('');
  });
});
