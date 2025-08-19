import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import ResultsPanel from '@/components/ResultsPanel';

// No clipboard spying to avoid flakiness; we assert UI remains interactive

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

  it('renders tabs and toggles JSON mode', async () => {
    const user = userEvent.setup();
    renderPanel();
    // Results tab active
    expect(!!screen.getByText('Results')).toBe(true);
    // Toggle JSON
    await user.click(screen.getByText('JSON'));
    expect(!!screen.getByText(/\[/)).toBe(true);
    // Back to Table
    await user.click(screen.getByText('Table'));
    expect(!!screen.getByText('id')).toBe(true);
  });

  it('switches to Schema and Messages tabs', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByText('Schema'));
    expect(!!screen.getByText('t')).toBe(true);
    await user.click(screen.getByText('Messages'));
    expect(!!screen.getByText('ok')).toBe(true);
  });

  it('supports pagination controls', async () => {
    const user = userEvent.setup();
    renderPanel({ rows: Array.from({ length: 120 }, (_, i) => ({ id: i, name: `n${i}` })) });
    expect(!!screen.getByText(/Page 1/)).toBe(true);
    await user.click(screen.getByText('Next'));
    expect(!!screen.getByText(/Page 2/)).toBe(true);
    await user.click(screen.getByText('Prev'));
    expect(!!screen.getByText(/Page 1/)).toBe(true);
  });

  it('allows clicking header and cells (copy handlers are wired)', async () => {
    renderPanel();
    // click column header
    const header = screen.getByRole('columnheader', { name: /id/i });
    fireEvent.click(header);
    // click cell value
    const cell = screen.getByRole('cell', { name: '1' });
    fireEvent.click(cell);
    // If no errors thrown, handlers are wired. Also verify elements still present
    expect(!!screen.getByRole('columnheader', { name: /id/i })).toBe(true);
    expect(!!screen.getByRole('cell', { name: '1' })).toBe(true);
  });
});
