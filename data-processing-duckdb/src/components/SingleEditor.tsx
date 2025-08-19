import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { autocompletion } from '@codemirror/autocomplete';
import ResultsPanel from '@/components/ResultsPanel';

export interface SingleEditorProps {
  sql: string;
  onChange: (v: string) => void;
  onRun: () => void;
  message: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  execMs: number | null;
  schemaTables: string[];
  schemaColumns: Record<string, string[]>;
  sqlCompletion: any;
  sqlHover: any;
}

export default function SingleEditor(props: SingleEditorProps) {
  const { sql, onChange, onRun, message, columns, rows, execMs, schemaTables, schemaColumns, sqlCompletion, sqlHover } = props;
  return (
    <>
      <CodeMirror
        value={sql}
        height="220px"
        extensions={[sqlLang(), autocompletion({ override: [sqlCompletion] }), sqlHover]}
        onChange={onChange}
        basicSetup={{ lineNumbers: true }}
        theme="dark"
        onKeyDown={(e: any) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onRun();
          }
        }}
      />
      <div className="text-base-content/70 mt-1 text-sm">{message}</div>
      <ResultsPanel
        title="Output"
        columns={columns}
        rows={rows}
        message={message}
        executionMs={execMs}
        schemaTables={schemaTables}
        schemaColumns={schemaColumns}
        enablePagination={true}
      />
    </>
  );
}
