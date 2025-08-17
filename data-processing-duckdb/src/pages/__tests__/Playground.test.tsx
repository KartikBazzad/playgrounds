import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/SingleEditor', () => ({ default: () => <div>SingleEditorMock</div> }));
vi.mock('@/components/NotebookCell', () => ({ default: () => <div>NotebookCellMock</div> }));
vi.mock('@/components/Toolbar', () => ({ default: () => <div>ToolbarMock</div> }));
vi.mock('@/components/ResultsPanel', () => ({ default: () => <div>ResultsPanelMock</div> }));
vi.mock('@/lib/duckdb', () => ({ getDB: async () => ({ connect: async () => ({ close: async () => {} }) }) }));
vi.mock('@/lib/idb', () => ({ idbGet: async () => undefined, idbSet: async () => {} }));

import Playground from '@/pages/Playground';

describe('Playground', () => {
  it('renders with mocked subcomponents', () => {
    render(<Playground />);
    expect(!!screen.getByText('ToolbarMock')).toBe(true);
  });
});
