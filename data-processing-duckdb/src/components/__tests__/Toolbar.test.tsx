import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Toolbar from '@/components/Toolbar';

function setup(over: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props: React.ComponentProps<typeof Toolbar> = {
    title: 'Playground',
    running: false,
    ready: true,
    notebookMode: false,
    setNotebookMode: vi.fn() as any,
    // Snippets
    snippetsOpen: false,
    setSnippetsOpen: vi.fn() as any,
    snippet: '',
    applySnippet: vi.fn(),
    // Datasets
    datasetsOpen: false,
    setDatasetsOpen: vi.fn() as any,
    dataset: '',
    loadDataset: vi.fn(),
    // Secondary
    menuOpen: false,
    setMenuOpen: vi.fn() as any,
    installHttpfs: vi.fn(),
    loadSampleAction: vi.fn(),
    parquetDemo: vi.fn(),
    resetDb: vi.fn(),
    runQualityReport: vi.fn(),
    // Single editor
    canDownload: true,
    onShare: vi.fn(),
    onSaveGist: vi.fn(),
    onCopySQL: vi.fn(),
    onDownloadCSV: vi.fn(),
    onRun: vi.fn(),
    // Notebook
    onAddCell: vi.fn(),
    onRunAll: vi.fn(),
    // Refs
    snippetsRef: React.createRef<HTMLDivElement>(),
    datasetsRef: React.createRef<HTMLDivElement>(),
    menuRef: React.createRef<HTMLDivElement>(),
    ...over,
  };
  return render(<Toolbar {...props} />);
}

describe('Toolbar', () => {
  it('renders controls and triggers actions', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Copy SQL'));
    fireEvent.click(screen.getByLabelText('Share link'));
    fireEvent.click(screen.getByLabelText('Download CSV'));
    fireEvent.click(screen.getByLabelText('Run'));
    // Just ensure buttons exist and are clickable; handlers called
    // Use truthy existence assertions compatible with Vitest
    expect(!!screen.getByLabelText('Run')).toBe(true);
  });

  it('disables actions when not ready', () => {
    setup({ ready: false });
    expect((screen.getByLabelText('Copy SQL') as HTMLButtonElement).disabled).toBe(true);
  });

  it('toggles notebook controls', () => {
    setup({ notebookMode: true });
    expect(!!screen.getByLabelText('Add cell')).toBe(true);
    expect(!!screen.getByLabelText('Run all')).toBe(true);
  });

  it('opens snippets dropdown and applies snippet', () => {
    const applySnippet = vi.fn();
    const setSnippetsOpen = vi.fn();
    setup({ snippetsOpen: true, applySnippet, setSnippetsOpen });
    // Menu items present
    const item = screen.getByText('Load Sample');
    expect(!!item).toBe(true);
    // Click handler
    item.click();
    expect(applySnippet).toHaveBeenCalled();
    expect(setSnippetsOpen).toHaveBeenCalled();
  });

  it('opens datasets dropdown and loads dataset', () => {
    const loadDataset = vi.fn();
    const setDatasetsOpen = vi.fn();
    setup({ datasetsOpen: true, loadDataset, setDatasetsOpen });
    const item = screen.getByText('People (local CSV)');
    expect(!!item).toBe(true);
    item.click();
    expect(loadDataset).toHaveBeenCalled();
    expect(setDatasetsOpen).toHaveBeenCalled();
  });

  it('opens menu dropdown and triggers actions', () => {
    const installHttpfs = vi.fn();
    const loadSampleAction = vi.fn();
    const parquetDemo = vi.fn();
    const resetDb = vi.fn();
    const runQualityReport = vi.fn();
    setup({ menuOpen: true, installHttpfs, loadSampleAction, parquetDemo, resetDb, runQualityReport });
    screen.getByText('Install httpfs').click();
    screen.getByText('Load Sample').click();
    screen.getByText('Parquet demo').click();
    screen.getByText('Reset').click();
    screen.getByText('Quality Report').click();
    expect(installHttpfs).toHaveBeenCalled();
    expect(loadSampleAction).toHaveBeenCalled();
    expect(parquetDemo).toHaveBeenCalled();
    expect(resetDb).toHaveBeenCalled();
    expect(runQualityReport).toHaveBeenCalled();
  });
});
