import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Toolbar from '@/components/Toolbar';

function setup(over: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props: React.ComponentProps<typeof Toolbar> = {
    title: 'Playground',
    running: false,
    ready: true,
    // Debug
    debugLogs: false,
    setDebugLogs: vi.fn() as any,
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
    resetSession: vi.fn(),
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
  it('renders controls and triggers actions', async () => {
    const user = userEvent.setup();
    const setDebugLogs = vi.fn();
    setup({ setDebugLogs });
    // Buttons present
    expect(!!screen.getByLabelText('Run all')).toBe(true);
    expect(!!screen.getByLabelText('Debug logs')).toBe(true);
    // Toggle debug
    await user.click(screen.getByLabelText('Debug logs'));
    expect(setDebugLogs).toHaveBeenCalled();
  });

  it('disables actions when not ready', () => {
    setup({ ready: false });
    expect((screen.getByLabelText('Run all') as HTMLButtonElement).disabled).toBe(true);
  });

  it('toggles notebook controls', () => {
    setup();
    expect(!!screen.getByLabelText('Run all')).toBe(true);
  });

  it('opens snippets dropdown and applies snippet', async () => {
    const user = userEvent.setup();
    const applySnippet = vi.fn();
    setup({ snippetsOpen: true, applySnippet });
    // Menu items present
    const item = screen.getByText('Load Sample');
    expect(!!item).toBe(true);
    // Click handler
    await user.click(item);
    expect(applySnippet).toHaveBeenCalled();
  });

  it('opens datasets dropdown and loads dataset', async () => {
    const user = userEvent.setup();
    const loadDataset = vi.fn();
    setup({ datasetsOpen: true, loadDataset });
    const item = screen.getByText('People (local CSV)');
    expect(!!item).toBe(true);
    await user.click(item);
    expect(loadDataset).toHaveBeenCalled();
  });

  it('opens menu dropdown and triggers actions', async () => {
    const user = userEvent.setup();
    const installHttpfs = vi.fn();
    const loadSampleAction = vi.fn();
    const parquetDemo = vi.fn();
    const resetDb = vi.fn();
    const runQualityReport = vi.fn();
    const resetSession = vi.fn();
    setup({ menuOpen: true, installHttpfs, loadSampleAction, parquetDemo, resetDb, resetSession, runQualityReport });
    await user.click(screen.getByText('Install httpfs'));
    await user.click(screen.getByText('Load Sample'));
    await user.click(screen.getByText('Parquet demo'));
    await user.click(screen.getByText('Reset'));
    await user.click(screen.getByText('Reset session'));
    await user.click(screen.getByText('Quality Report'));
    expect(installHttpfs).toHaveBeenCalled();
    expect(loadSampleAction).toHaveBeenCalled();
    expect(parquetDemo).toHaveBeenCalled();
    expect(resetDb).toHaveBeenCalled();
    expect(resetSession).toHaveBeenCalled();
    expect(runQualityReport).toHaveBeenCalled();
  });
});
