import React from 'react';

export default function Notebook(props: {
  id: string;
  label: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onRename: (id: string, label: string) => void;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { id, label, isOpen, onToggle, onRename, headerRight, children } = props;
  return (
    <div className="border border-base-300 rounded bg-base-100">
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
           onClick={() => onToggle(id)}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base-content/70" aria-hidden>
            {isOpen ? 'expand_more' : 'chevron_right'}
          </span>
          <input
            className="input input-ghost input-sm font-semibold px-1"
            value={label}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onRename(id, e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {headerRight}
        </div>
      </div>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}
