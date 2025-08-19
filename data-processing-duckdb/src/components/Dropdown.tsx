import React, { useEffect, useRef, useState } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  alignEnd?: boolean; // right-align the menu
  containerClassName?: string;
  triggerClassName?: string;
  menuClassName?: string; // extra classes for the menu container
  widthClassName?: string; // e.g., w-64, w-72
}

export default function Dropdown(props: DropdownProps) {
  const {
    trigger,
    children,
    alignEnd,
    containerClassName,
    triggerClassName,
    menuClassName,
    widthClassName,
  } = props;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div
      ref={ref}
      className={`dropdown ${alignEnd ? 'dropdown-end' : ''} ${containerClassName || ''} ${open ? 'dropdown-open' : ''}`}
    >
      <div
        tabIndex={0}
        role="button"
        className={'btn btn-ghost btn-sm btn-square'}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </div>
      <ul
        tabIndex={0}
        className={`dropdown-content menu bg-base-100 rounded-box shadow-xl border border-base-300 p-2 z-50 ${widthClassName || ''} ${menuClassName || ''}`}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </ul>
    </div>
  );
}
