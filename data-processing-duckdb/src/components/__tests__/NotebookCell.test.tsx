import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotebookCell, { NotebookCellData } from '@/components/NotebookCell';

// Mock CodeMirror to a simple textarea-like component
vi.mock('@uiw/react-codemirror', () => {
  return {
    default: (props: any) => (
      <textarea
        data-testid="cm"
        value={props.value}
        onFocus={props.onFocus}
        onChange={(e: any) => props.onChange?.(e.target.value)}
      />
    ),
  };
});

// Mock ResultsPanel to a simple div that renders message and columns length
vi.mock('@/components/ResultsPanel', () => {
  return {
    default: (props: any) => (
      <div>
        <div data-testid="message">{props.message}</div>
        <div data-testid="cols">{(props.columns || []).length}</div>
      </div>
    ),
  };
});

describe('NotebookCell', () => {
  const baseCell: NotebookCellData = {
    id: 'c1',
    sql: 'select 1',
    columns: ['id'],
    rows: [{ id: 1 }],
    message: 'ok',
    running: false,
    execMs: 10,
  };

  function renderCell(overrides: Partial<React.ComponentProps<typeof NotebookCell>> = {}) {
    const props: React.ComponentProps<typeof NotebookCell> = {
      index: 0,
      cell: baseCell,
      schemaTables: ['t'],
      schemaColumns: { t: ['a'] },
      sqlCompletion: () => null,
      sqlHover: () => null,
      onFocus: vi.fn(),
      onChange: vi.fn(),
      onRun: vi.fn(),
      onAddBelow: vi.fn(),
      onMove: vi.fn(),
      onDelete: vi.fn(),
      disableMoveUp: true,
      disableMoveDown: false,
      ready: true,
      ...overrides,
    } as any;
    const utils = render(<NotebookCell {...props} />);
    return { props, ...utils };
  }

  it('renders message and columns count', () => {
    renderCell();
    expect(screen.getByTestId('message').textContent).toBe('ok');
    expect(screen.getByTestId('cols').textContent).toBe('1');
  });

  it('triggers onFocus and onChange from editor', () => {
    const { props } = renderCell();
    const cm = screen.getByTestId('cm');
    fireEvent.focus(cm);
    expect(props.onFocus).toHaveBeenCalledWith('c1');
    fireEvent.change(cm, { target: { value: 'select 2' } });
    expect(props.onChange).toHaveBeenCalledWith('c1', 'select 2');
  });

  it('buttons call respective handlers', () => {
    const { props } = renderCell();
    // Run
    fireEvent.click(screen.getByRole('button', { name: /Run cell/i }));
    expect(props.onRun).toHaveBeenCalledWith('c1');
    // Add below
    fireEvent.click(screen.getByRole('button', { name: /Add cell below/i }));
    expect(props.onAddBelow).toHaveBeenCalledWith('c1');
    // Move up is disabled
    const upBtn = screen.getByRole('button', { name: /Move up/i });
    expect((upBtn as HTMLButtonElement).disabled).toBe(true);
    // Move down
    fireEvent.click(screen.getByRole('button', { name: /Move down/i }));
    expect(props.onMove).toHaveBeenCalledWith('c1', 1);
    // Delete
    fireEvent.click(screen.getByRole('button', { name: /Delete cell/i }));
    expect(props.onDelete).toHaveBeenCalledWith('c1');
  });
});
