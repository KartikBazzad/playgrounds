import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultsPanel from '@/components/ResultsPanel';

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn(async () => {}) },
});

describe('ResultsPanel', () => {
  const cols = ['id', 'name'];
  const rows = [ { id: 1, name: 'a' }, { id: 2, name: 'b' } ];

  function renderPanel(extra: Partial<React.ComponentProps<typeof ResultsPanel>> = {}) {
    return render(
      <ResultsPanel
        title="Output"
        columns={cols}
        rows={rows}
        message="ok"
        executionMs={42}
        schemaTables={['t']}
        schemaColumns={{ t: ['c1', 'c2'] }}
        enablePagination={true}
        {...extra}
      />
    );
  }

  it('renders tabs and toggles JSON mode', () => {
    renderPanel();
    // Results tab active
    expect(!!screen.getByText('Results')).toBe(true);
    // Toggle JSON
    fireEvent.click(screen.getByText('JSON'));
    expect(!!screen.getByText(/\[/)).toBe(true);
    // Back to Table
    fireEvent.click(screen.getByText('Table'));
    expect(!!screen.getByText('id')).toBe(true);
  });

  it('switches to Schema and Messages tabs', () => {
    renderPanel();
    fireEvent.click(screen.getByText('Schema'));
    expect(!!screen.getByText('t')).toBe(true);
    fireEvent.click(screen.getByText('Messages'));
    expect(!!screen.getByText('ok')).toBe(true);
  });

  it('supports pagination controls', () => {
    renderPanel({ rows: Array.from({ length: 120 }, (_, i) => ({ id: i, name: `n${i}` })) });
    expect(!!screen.getByText(/Page 1/)).toBe(true);
    fireEvent.click(screen.getByText('Next'));
    expect(!!screen.getByText(/Page 2/)).toBe(true);
    fireEvent.click(screen.getByText('Prev'));
    expect(!!screen.getByText(/Page 1/)).toBe(true);
  });

  it('copies cell and column text on click', () => {
    renderPanel();
    // click column header
    fireEvent.click(screen.getByText('id'));
    // click cell value
    fireEvent.click(screen.getByText('1'));
    expect((navigator.clipboard.writeText as any)).toHaveBeenCalled();
  });
});
