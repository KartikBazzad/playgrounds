import React from 'react';
import { downloadLogs, clearLogs } from '@/lib/logService';
import Dropdown from '@/components/Dropdown';

interface ToolbarProps {
  title: string;
  running: boolean;
  ready: boolean;
  // Debug toggle
  debugLogs: boolean;
  setDebugLogs: (v: (prev: boolean) => boolean) => void;

  // Snippets
  snippetsOpen: boolean;
  setSnippetsOpen: (v: (prev: boolean) => boolean) => void;
  snippet: string;
  applySnippet: (key: string) => void;

  // Datasets
  datasetsOpen: boolean;
  setDatasetsOpen: (v: (prev: boolean) => boolean) => void;
  dataset: string;
  loadDataset: (key: string) => void;

  // Secondary actions
  menuOpen: boolean;
  setMenuOpen: (v: (prev: boolean) => boolean) => void;
  installHttpfs: () => void;
  loadSampleAction: () => void;
  parquetDemo: () => void;
  resetDb: () => void;
  resetSession: () => void;
  runQualityReport: () => void;

  // Notebook
  onAddCell: () => void;
  onRunAll: () => void;
  onExportWorkspace?: () => void;
  onImportWorkspace?: (file: File) => void;

  // Upload
  onUploadFile?: (file: File) => void;
  // Schema modal trigger
  onOpenSchema?: () => void;

  // Refs for outside-click close behavior
  snippetsRef: React.RefObject<HTMLDivElement>;
  datasetsRef: React.RefObject<HTMLDivElement>;
  menuRef: React.RefObject<HTMLDivElement>;
}

export default function Toolbar(props: ToolbarProps) {
  const {
    title, running, ready,
    debugLogs, setDebugLogs,
    snippet, applySnippet,
    dataset, loadDataset,
    installHttpfs, loadSampleAction, parquetDemo, resetDb, resetSession, runQualityReport,
    onRunAll,
    onExportWorkspace,
    onImportWorkspace,
    onUploadFile,
    onOpenSchema,
  } = props;

  return (
    <div className="bg-base-100 sticky top-0 border border-base-300 p-2 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <strong>{title}</strong>
          {running && <span className="loading loading-spinner loading-xs" />}
          <span className={`badge badge-sm ${ready ? 'badge-success' : 'badge-neutral'}`}>{ready ? 'Ready' : 'Init'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Upload */}
          {onUploadFile && (
            <label className="btn btn-ghost btn-sm btn-square" title="Upload file">
              <input
                type="file"
                accept=".csv,.tsv,.parquet,.json,.ndjson,text/csv,application/json,application/x-ndjson,application/octet-stream"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) { onUploadFile(f); e.currentTarget.value = '' as any; }
                }}
              />
              <span className="material-symbols-outlined">upload_file</span>
            </label>
          )}

          {/* Schema modal trigger */}
          {onOpenSchema && (
            <button className="btn btn-ghost btn-sm btn-square" title="View schema" onClick={onOpenSchema}>
              <span className="material-symbols-outlined">schema</span>
            </button>
          )}
          {/* Snippets */}
          <Dropdown
            alignEnd
            triggerClassName="btn m-1 btn-ghost btn-square"
            trigger={<span className="material-symbols-outlined">code</span>}
            widthClassName="w-64"
          >
            <li><button onClick={() => { applySnippet('load_sample'); }}>{snippet === 'load_sample' && <span className="material-symbols-outlined mr-1">check</span>}Load Sample</button></li>
            <li><button onClick={() => { applySnippet('quality_report'); }}>{snippet === 'quality_report' && <span className="material-symbols-outlined mr-1">check</span>}Quality Report</button></li>
            <li><button onClick={() => { applySnippet('parquet_demo'); }}>{snippet === 'parquet_demo' && <span className="material-symbols-outlined mr-1">check</span>}Parquet Demo</button></li>
            <li><button onClick={() => { applySnippet('aggregation'); }}>{snippet === 'aggregation' && <span className="material-symbols-outlined mr-1">check</span>}Aggregation by city</button></li>
            <li><button onClick={() => { applySnippet('join_example'); }}>{snippet === 'join_example' && <span className="material-symbols-outlined mr-1">check</span>}Join example</button></li>
          </Dropdown>

          {/* Datasets */}
          <Dropdown
            alignEnd
            triggerClassName="btn btn-ghost btn-sm btn-square"
            trigger={<span className="material-symbols-outlined">dataset</span>}
            widthClassName="w-72"
          >
            <li>
              <label>
                <input
                  type="file"
                  accept=".csv,.tsv,.parquet,.json,.ndjson,text/csv,application/json,application/x-ndjson,application/octet-stream"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) {
                      if (onUploadFile) onUploadFile(f);
                      e.currentTarget.value = '' as any;
                    }
                  }}
                />
                <span className="btn btn-ghost btn-sm btn-square justify-start"><span className="material-symbols-outlined mr-2">upload_file</span>Upload file…</span>
              </label>
            </li>
            <li><button onClick={() => { loadDataset('people_local'); }}>{dataset === 'people_local' && <span className="material-symbols-outlined mr-1">check</span>} People (local CSV)</button></li>
            <li><button onClick={() => { loadDataset('tips_remote'); }}>{dataset === 'tips_remote' && <span className="material-symbols-outlined mr-1">check</span>} Tips (remote CSV)</button></li>
            <li><button onClick={() => { loadDataset('tpch_lineitem'); }}>{dataset === 'tpch_lineitem' && <span className="material-symbols-outlined mr-1">check</span>} TPCH Lineitem (Parquet)</button></li>
          </Dropdown>

          {/* Secondary actions */}
          <Dropdown
            alignEnd
            triggerClassName="btn btn-ghost btn-sm btn-square"
            trigger={<span className="material-symbols-outlined">more_vert</span>}
            widthClassName="w-64"
          >
            <li><button onClick={installHttpfs}><span className="material-symbols-outlined mr-2">cloud_download</span>Install httpfs</button></li>
            <li><button onClick={loadSampleAction}><span className="material-symbols-outlined mr-2">download</span>Load Sample</button></li>
            <li><button onClick={parquetDemo}><span className="material-symbols-outlined mr-2">table</span>Parquet demo</button></li>
            <li><button onClick={resetDb}><span className="material-symbols-outlined mr-2">restart_alt</span>Reset</button></li>
            <li><button onClick={resetSession}><span className="material-symbols-outlined mr-2">restart_alt</span>Reset session</button></li>
            <li><button onClick={runQualityReport}><span className="material-symbols-outlined mr-2">fact_check</span>Quality Report</button></li>
            {onExportWorkspace && (
              <li><button onClick={onExportWorkspace}><span className="material-symbols-outlined mr-2">ios_share</span>Export workspace</button></li>
            )}
            {onImportWorkspace && (
              <li>
                <label>
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) {
                        onImportWorkspace(f);
                        e.currentTarget.value = '' as any;
                      }
                    }}
                  />
                  <span className="btn btn-ghost btn-sm btn-square justify-start"><span className="material-symbols-outlined mr-2">upload</span>Import workspace…</span>
                </label>
              </li>
            )}
            <li><button onClick={() => downloadLogs()}><span className="material-symbols-outlined mr-2">download</span>Download logs</button></li>
            <li><button onClick={() => clearLogs()}><span className="material-symbols-outlined mr-2">delete</span>Clear logs</button></li>
          </Dropdown>

          {/* Notebook controls */}
            <button className="btn btn-ghost btn-sm btn-square" aria-label="Run all" title="Run all" onClick={onRunAll} disabled={!ready}>
              <span className="material-symbols-outlined">play_arrow</span>
            </button>

          {/* Debug + Mode */}
          <button
            className={`btn btn-sm btn-square ${debugLogs ? 'btn-ghost' : 'btn-primary'}`}
            aria-label="Debug logs"
            title={debugLogs ? 'Disable debug logs' : 'Enable debug logs'}
            onClick={() => setDebugLogs((v) => !v)}
          >
            <span className="material-symbols-outlined">bug_report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
