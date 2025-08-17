import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { autocompletion } from '@codemirror/autocomplete';
import ResultsPanel from '@/components/ResultsPanel';

export interface NotebookCellData {
  id: string;
  sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  message: string;
  running: boolean;
  execMs?: number | null;
}

export interface NotebookCellProps {
  index: number;
  cell: NotebookCellData;
  schemaTables: string[];
  schemaColumns: Record<string, string[]>;
  sqlCompletion: any;
  sqlHover: any;
  onFocus: (id: string) => void;
  onChange: (id: string, sql: string) => void;
  onRun: (id: string) => void;
  onAddBelow: (id: string) => void;
  onMove: (id: string, delta: 1 | -1) => void;
  onDelete: (id: string) => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  ready: boolean;
}

export default function NotebookCell(props: NotebookCellProps) {
  const { index, cell, schemaTables, schemaColumns, sqlCompletion, sqlHover, onFocus, onChange, onRun, onAddBelow, onMove, onDelete, disableMoveUp, disableMoveDown, ready } = props;
  return (
    <div className="card vstack" style={{ gap: 8 }}>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <strong>Cell {index + 1} {cell.running && <span className="spinner" style={{ marginLeft: 8 }} />}</strong>
        <div className="hstack" style={{ gap: 6 }}>
          <button className="icon-btn" aria-label="Run cell" title="Run cell (Cmd/Ctrl+Enter)" onClick={() => onRun(cell.id)} disabled={!ready || cell.running}>
            <span className="material-symbols-outlined">play_arrow</span>
          </button>
          <button className="icon-btn" aria-label="Add cell below" title="Add cell below" onClick={() => onAddBelow(cell.id)}>
            <span className="material-symbols-outlined">add</span>
          </button>
          <button className="icon-btn" aria-label="Move up" title="Move up" onClick={() => onMove(cell.id, -1)} disabled={disableMoveUp}>
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
          <button className="icon-btn" aria-label="Move down" title="Move down" onClick={() => onMove(cell.id, 1)} disabled={disableMoveDown}>
            <span className="material-symbols-outlined">arrow_downward</span>
          </button>
          <button className="icon-btn" aria-label="Delete cell" title="Delete cell" onClick={() => onDelete(cell.id)}>
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      <div onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          onRun(cell.id);
        }
      }}>
        <CodeMirror
          value={cell.sql}
          height="180px"
          extensions={[sqlLang(), autocompletion({ override: [sqlCompletion] }), sqlHover]}
          onFocus={() => onFocus(cell.id)}
          onChange={(v: string) => onChange(cell.id, v)}
          basicSetup={{ lineNumbers: true }}
          theme="dark"
        />
      </div>
      <ResultsPanel
        title={`Cell ${index + 1}`}
        columns={cell.columns}
        rows={cell.rows}
        message={cell.message}
        executionMs={cell.execMs ?? null}
        schemaTables={schemaTables}
        schemaColumns={schemaColumns}
        enablePagination={false}
      />
    </div>
  );
}
