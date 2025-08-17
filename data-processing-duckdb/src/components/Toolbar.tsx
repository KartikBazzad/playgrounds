import React from 'react';

interface ToolbarProps {
  title: string;
  running: boolean;
  ready: boolean;
  notebookMode: boolean;
  setNotebookMode: (v: (prev: boolean) => boolean) => void;

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
  runQualityReport: () => void;

  // Single editor actions
  canDownload: boolean;
  onShare: () => void;
  onSaveGist: () => void;
  onCopySQL: () => void;
  onDownloadCSV: () => void;
  onRun: () => void;

  // Notebook
  onAddCell: () => void;
  onRunAll: () => void;

  // Refs for outside-click close behavior
  snippetsRef: React.RefObject<HTMLDivElement>;
  datasetsRef: React.RefObject<HTMLDivElement>;
  menuRef: React.RefObject<HTMLDivElement>;
}

export default function Toolbar(props: ToolbarProps) {
  const {
    title, running, ready, notebookMode, setNotebookMode,
    snippetsOpen, setSnippetsOpen, snippet, applySnippet,
    datasetsOpen, setDatasetsOpen, dataset, loadDataset,
    menuOpen, setMenuOpen, installHttpfs, loadSampleAction, parquetDemo, resetDb, runQualityReport,
    canDownload, onShare, onSaveGist, onCopySQL, onDownloadCSV, onRun,
    onAddCell, onRunAll,
    snippetsRef, datasetsRef, menuRef,
  } = props;

  return (
    <div className="card vstack" style={{ gap: 8 }}>
      <div className="hstack toolbar" style={{ justifyContent: 'space-between' }}>
        <strong>{title} {running && <span className="spinner" style={{ marginLeft: 8 }} />}</strong>
        <div className="hstack" style={{ gap: 8 }}>
          {/* Snippets */}
          <div className="dropdown" ref={snippetsRef}>
            <button className="icon-btn" aria-label="Snippets" title="Snippets" onClick={() => setSnippetsOpen((s) => !s)} disabled={!ready}>
              <span className="material-symbols-outlined">code</span>
            </button>
            {snippetsOpen && (
              <div className="menu" onMouseLeave={() => setSnippetsOpen(() => false)}>
                <button onClick={() => { setSnippetsOpen(() => false); applySnippet('load_sample'); }}>
                  {snippet === 'load_sample' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} Load Sample
                </button>
                <button onClick={() => { setSnippetsOpen(() => false); applySnippet('quality_report'); }}>
                  {snippet === 'quality_report' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} Quality Report
                </button>
                <button onClick={() => { setSnippetsOpen(() => false); applySnippet('parquet_demo'); }}>
                  {snippet === 'parquet_demo' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} Parquet Demo
                </button>
                <button onClick={() => { setSnippetsOpen(() => false); applySnippet('aggregation'); }}>
                  {snippet === 'aggregation' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} Aggregation by city
                </button>
                <button onClick={() => { setSnippetsOpen(() => false); applySnippet('join_example'); }}>
                  {snippet === 'join_example' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} Join example
                </button>
              </div>
            )}
          </div>

          {/* Datasets */}
          <div className="dropdown" ref={datasetsRef}>
            <button className="icon-btn" aria-label="Datasets" title="Datasets" onClick={() => setDatasetsOpen((s) => !s)} disabled={!ready}>
              <span className="material-symbols-outlined">dataset</span>
            </button>
            {datasetsOpen && (
              <div className="menu" onMouseLeave={() => setDatasetsOpen(() => false)}>
                <button onClick={() => { setDatasetsOpen(() => false); loadDataset('people_local'); }}>
                  {dataset === 'people_local' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} People (local CSV)
                </button>
                <button onClick={() => { setDatasetsOpen(() => false); loadDataset('tips_remote'); }}>
                  {dataset === 'tips_remote' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} Tips (remote CSV)
                </button>
                <button onClick={() => { setDatasetsOpen(() => false); loadDataset('tpch_lineitem'); }}>
                  {dataset === 'tpch_lineitem' && <span className="material-symbols-outlined" style={{marginRight:8}}>check</span>} TPCH Lineitem (Parquet)
                </button>
              </div>
            )}
          </div>

          {/* Secondary actions */}
          <div className="dropdown" ref={menuRef}>
            <button className="icon-btn" aria-label="More actions" title="More actions" onClick={() => setMenuOpen((m) => !m)}>
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {menuOpen && (
              <div className="menu" onMouseLeave={() => setMenuOpen(() => false)}>
                <button onClick={installHttpfs}><span className="material-symbols-outlined" style={{marginRight:8}}>cloud_download</span> Install httpfs</button>
                <button onClick={loadSampleAction}><span className="material-symbols-outlined" style={{marginRight:8}}>download</span> Load Sample</button>
                <button onClick={parquetDemo}><span className="material-symbols-outlined" style={{marginRight:8}}>table</span> Parquet demo</button>
                <button onClick={resetDb}><span className="material-symbols-outlined" style={{marginRight:8}}>restart_alt</span> Reset</button>
                <button onClick={runQualityReport}><span className="material-symbols-outlined" style={{marginRight:8}}>fact_check</span> Quality Report</button>
              </div>
            )}
          </div>

          {/* Single editor-only controls */}
          {!notebookMode && (
            <>
              <button className="icon-btn" aria-label="Share link" title="Share link" onClick={onShare} disabled={!ready}>
                <span className="material-symbols-outlined">link</span>
              </button>
              <button className="icon-btn" aria-label="Save as Gist" title="Save as Gist" onClick={onSaveGist} disabled={!ready}>
                <span className="material-symbols-outlined">save</span>
              </button>
              <button className="icon-btn" aria-label="Copy SQL" title="Copy SQL" onClick={onCopySQL} disabled={!ready}>
                <span className="material-symbols-outlined">content_copy</span>
              </button>
              <button className="icon-btn" aria-label="Download CSV" title="Download CSV" onClick={onDownloadCSV} disabled={!ready || !canDownload}>
                <span className="material-symbols-outlined">download</span>
              </button>
              <button className="icon-btn" aria-label="Run" title="Run (Cmd/Ctrl+Enter)" onClick={onRun} disabled={!ready || running}>
                <span className="material-symbols-outlined">play_arrow</span>
              </button>
            </>
          )}

          {/* Notebook controls */}
          {notebookMode && (
            <>
              <button className="icon-btn" aria-label="Add cell" title="Add cell" onClick={onAddCell}>
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className="icon-btn" aria-label="Run all" title="Run all" onClick={onRunAll} disabled={!ready}>
                <span className="material-symbols-outlined">play_arrow</span>
              </button>
            </>
          )}
          <button className="icon-btn" aria-label="Toggle mode" title={notebookMode ? 'Switch to Single Editor' : 'Switch to Notebook'} onClick={() => setNotebookMode((v) => !v)}>
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>
        </div>
      </div>
    </div>
  );
}
