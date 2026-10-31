'use client';

import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { backupNow, importCsvFile, openRestoreFile } from './actions';
import MoreMenu from './MoreMenu';
import SearchBox from './SearchBox';
import TypeFilter from './TypeFilter';
import ZoomControls, { HeightControls } from './ZoomControls';

export default function Toolbar() {
  const restoreRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const entries = useStore((s) => s.entries);
  const hiddenIds = useStore((s) => s.hiddenIds);
  const trashCount = useStore((s) => s.trash.length);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const openModal = useStore((s) => s.openModal);
  const hidden = new Set(hiddenIds);
  const visible = entries.filter((e) => !hidden.has(String(e.id))).length;
  const allVisible = visible === entries.length;

  return (
    <header className="sticky top-0 z-30 flex h-[calc(var(--header-h)+env(safe-area-inset-top))] flex-none items-center gap-2 overflow-x-auto border-b border-line bg-panel px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md [scrollbar-width:thin] [&>*]:flex-none">
      <h1 className="mr-auto whitespace-nowrap text-[17px] font-extrabold sm:text-[19px]">
        <span className="hidden md:inline">My Bible Timeline</span>
        <span className="md:hidden">Timeline</span>
      </h1>
      <SearchBox />
      <TypeFilter />
      <button
        className={`btn max-w-[150px] ${allVisible ? '' : 'btn-active'}`}
        title="Choose which entries are visible"
        onClick={() => openModal({ kind: 'filter' })}
      >
        <span className="truncate">{allVisible ? 'Entries: All' : `Entries: ${visible}/${entries.length}`}</span>
      </button>
      <button className="btn btn-primary" onClick={() => openModal({ kind: 'form', id: null })}>
        + Add
      </button>
      <div className="hidden gap-1.5 sm:flex">
        <button className="btn" onClick={backupNow}>
          Backup
        </button>
        <button className="btn" onClick={() => restoreRef.current?.click()}>
          Restore
        </button>
      </div>
      <div className="hidden sm:flex">
        <HeightControls />
      </div>
      <button className="btn hidden sm:inline-flex" onClick={toggleTheme}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <ZoomControls />
      <button className="btn" onClick={() => openModal({ kind: 'trash' })}>
        Trash <span className="tabular-nums">{trashCount}</span>
      </button>
      <MoreMenu onRestore={() => restoreRef.current?.click()} onImportCsv={() => csvRef.current?.click()} />
      <input
        ref={restoreRef}
        type="file"
        accept=".btlbackup,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) openRestoreFile(f);
        }}
      />
      <input
        ref={csvRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) importCsvFile(f);
        }}
      />
    </header>
  );
}
