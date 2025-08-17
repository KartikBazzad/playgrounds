import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SingleEditor from '@/components/SingleEditor';

// Mock CodeMirror to a simple textarea-like component
vi.mock('@uiw/react-codemirror', () => {
  return {
    default: (props: any) => (
      <textarea
        data-testid="cm"
        value={props.value}
        onChange={(e: any) => props.onChange?.(e.target.value)}
        onKeyDown={props.onKeyDown}
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

describe('SingleEditor', () => {
  it('renders message and triggers onRun via Cmd/Ctrl+Enter', () => {
    const onRun = vi.fn();
    render(
      <SingleEditor
        sql={"select 1"}
        onChange={() => {}}
        onRun={onRun}
        message="Ready"
        columns={["a", "b"]}
        rows={[]}
        execMs={12}
        schemaTables={['t']}
        schemaColumns={{ t: ['a'] }}
        sqlCompletion={() => null}
        sqlHover={() => null}
      />
    );

    expect(screen.getByTestId('message').textContent).toBe('Ready');
    expect(screen.getByTestId('cols').textContent).toBe('2');

    const cm = screen.getByTestId('cm');
    fireEvent.keyDown(cm, { key: 'Enter', metaKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});
