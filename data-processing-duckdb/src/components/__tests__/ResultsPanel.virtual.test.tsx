import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultsPanel from '@/components/ResultsPanel';

// Avoid clipboard spies; just validate interactions don't throw and elements remain present

describe('ResultsPanel virtualization branch', () => {
  it('renders virtualized table and supports clicking header and cells', async () => {
    const columns = ['id', 'name'];
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `n${i}` }));

    render(
      <ResultsPanel
        columns={columns}
        rows={rows}
        message="ok"
        executionMs={10}
        schemaTables={[]}
        schemaColumns={{}}
        enablePagination={false}
      />
    );

    // Should render headers
    expect(!!screen.getByText('id')).toBe(true);
    // Scroll the virtual container to force slice changes
    const container = screen.getByRole('table').parentElement!.parentElement!;
    fireEvent.scroll(container, { target: { scrollTop: 300 } });

    // Wait for scroll state to propagate and rows to render, then click fresh nodes
    await waitFor(() => expect(screen.getAllByRole('cell').length).toBeGreaterThan(0));
    const header = screen.getAllByRole('columnheader')[0];
    fireEvent.click(header);
    const firstCell = screen.getAllByRole('cell')[0] as HTMLElement;
    fireEvent.click(firstCell);
    // Ensure interactive elements remain
    expect(!!screen.getAllByRole('columnheader')[0]).toBe(true);
    expect(!!screen.getAllByRole('cell')[0]).toBe(true);
  });
});
