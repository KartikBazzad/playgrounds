import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultsPanel from '@/components/ResultsPanel';

Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } });

describe('ResultsPanel virtualization branch', () => {
  it('renders virtualized table and supports copy', () => {
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

    // Copy header and a visible cell
    fireEvent.click(screen.getByText('id'));
    fireEvent.click(screen.getByText('n0'));
    expect((navigator.clipboard.writeText as any)).toHaveBeenCalled();
  });
});
