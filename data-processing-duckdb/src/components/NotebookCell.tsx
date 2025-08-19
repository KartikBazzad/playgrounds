import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { autocompletion } from '@codemirror/autocomplete';
import ResultsPanel from '@/components/ResultsPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface NotebookCellData {
  id: string;
  title: string;
  sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  message: string;
  running: boolean;
  execMs?: number | null;
  mode?: 'sql' | 'md';
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
  onChangeMode: (id: string, mode: 'sql' | 'md') => void;
  onChangeTitle: (id: string, title: string) => void;
  onRun: (id: string) => void;
  onAddBelow: (id: string) => void;
  onMove: (id: string, delta: 1 | -1) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onCopyMarkdown?: (id: string) => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  ready: boolean;
}

export default function NotebookCell(props: NotebookCellProps) {
  const { index, cell, schemaTables, schemaColumns, sqlCompletion, sqlHover, onFocus, onChange, onChangeMode, onChangeTitle, onRun, onAddBelow, onMove, onDelete, onShare, onCopyMarkdown, disableMoveUp, disableMoveDown, ready } = props;
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [resultsCollapsed, setResultsCollapsed] = useState<boolean>(false);
  const mode: 'sql' | 'md' = cell.mode || 'sql';
  const [mdPreview, setMdPreview] = useState<boolean>(true);
  return (
    <div className="card bg-base-100 border border-base-300 p-3">
      <div className="flex items-center py-1 justify-between">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm btn-square" aria-label={collapsed ? 'Expand cell' : 'Collapse cell'} title={collapsed ? 'Expand cell' : 'Collapse cell'} onClick={() => setCollapsed((v) => !v)}>
            <span className="material-symbols-outlined">{collapsed ? 'expand_more' : 'expand_less'}</span>
          </button>
          <input
            className="input input-bordered input-sm"
            value={cell.title}
            onChange={(e) => onChangeTitle(cell.id, e.target.value)}
            placeholder={`Cell ${index + 1}`}
            aria-label="Cell title"
          />
          {cell.running && <span className="loading loading-spinner loading-xs" />}
          {typeof cell.execMs === 'number' && (
            <span className="badge badge-outline whitespace-nowrap" title="Execution time">
              {Math.round((cell.execMs)).toFixed(2)} ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn btn-ghost btn-sm btn-square" aria-label="Toggle SQL/Markdown" title={mode === 'sql' ? 'Switch to Markdown' : 'Switch to SQL'} onClick={() => {
            const nextMode = mode === 'sql' ? 'md' : 'sql';
            onChangeMode(cell.id, nextMode);
          }}>
            <span className="material-symbols-outlined">{mode === 'sql' ? 'notes' : 'data_object'}</span>
          </button>
          {mode === 'sql' && (
            <button className="btn btn-ghost btn-sm btn-square" aria-label="Run cell" title="Run cell (Cmd/Ctrl+Enter)" onClick={() => onRun(cell.id)} disabled={!ready || cell.running}>
              <span className="material-symbols-outlined">play_arrow</span>
            </button>
          )}
          {mode === 'sql' && (
            <button className="btn btn-ghost btn-sm btn-square" aria-label="Share cell SQL" title="Share cell SQL" onClick={() => onShare && onShare(cell.id)}>
              <span className="material-symbols-outlined">link</span>
            </button>
          )}
          <button className="btn btn-ghost btn-sm btn-square" aria-label="Copy as Markdown" title="Copy as Markdown" onClick={() => onCopyMarkdown && onCopyMarkdown(cell.id)}>
            <span className="material-symbols-outlined">description</span>
          </button>
          <button className="btn btn-ghost btn-sm btn-square" aria-label="Add cell below" title="Add cell below (Shift+Enter after run)" onClick={() => onAddBelow(cell.id)}>
            <span className="material-symbols-outlined">add</span>
          </button>
          <button className="btn btn-ghost btn-sm btn-square" aria-label="Move up" title="Move up" onClick={() => onMove(cell.id, -1)} disabled={disableMoveUp}>
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
          <button className="btn btn-ghost btn-sm btn-square" aria-label="Move down" title="Move down" onClick={() => onMove(cell.id, 1)} disabled={disableMoveDown}>
            <span className="material-symbols-outlined">arrow_downward</span>
          </button>
          <button className="btn btn-ghost btn-sm btn-square" aria-label="Delete cell" title="Delete cell" onClick={() => onDelete(cell.id)}>
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      {!collapsed && mode === 'sql' && (
        <div onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onRun(cell.id);
            return;
          }
          if (e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            onRun(cell.id);
            onAddBelow(cell.id);
            return;
          }
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
            e.preventDefault();
            setCollapsed((v) => !v);
            return;
          }
          if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
            e.preventDefault();
            setResultsCollapsed((v) => !v);
            return;
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
      )}
      {!collapsed && mode === 'md' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setMdPreview(false)} disabled={!mdPreview}>Edit</button>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setMdPreview(true)} disabled={mdPreview}>Preview</button>
          </div>
          {!mdPreview && (
            <textarea
              className="textarea textarea-bordered min-h-[140px] font-mono"
              value={cell.sql}
              onFocus={() => onFocus(cell.id)}
              onChange={(e) => onChange(cell.id, e.target.value)}
              placeholder="Write Markdown..."
            />
          )}
          {mdPreview && (
            <div className="prose max-w-none p-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.sql || '*Empty markdown*'}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
      {!collapsed && mode === 'sql' && (
        <ResultsPanel
          title={cell.title}
          columns={cell.columns}
          rows={cell.rows}
          message={cell.message}
          executionMs={cell.execMs ?? null}
          schemaTables={schemaTables}
          schemaColumns={schemaColumns}
          enablePagination={false}
          collapsed={resultsCollapsed}
        />
      )}
    </div>
  );
}
