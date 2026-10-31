'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { suggestions } from '@/lib/search';
import { useStore } from '@/lib/store';
import type { Entry } from '@/lib/types';

const AnimatedPlaceholder = dynamic(() => import('../ui/aceternity/placeholders-input'), { ssr: false });

const PLACEHOLDERS = ['Search', 'Search a name…', 'Search a year, e.g. 1914', 'Search a Bible reference…'];

export default function SearchBox() {
  const query = useStore((s) => s.query);
  const setQuery = useStore((s) => s.setQuery);
  const entries = useStore((s) => s.entries);
  const lowEnd = useStore((s) => s.lowEnd);
  const focusEntry = useStore((s) => s.focusEntry);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => suggestions(entries, query).slice(0, 60), [entries, query]);

  const place = useCallback(() => {
    const r = inputRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(360, window.innerWidth - 24);
    setBox({
      left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)),
      top: Math.min(r.bottom + 7, Math.max(12, window.innerHeight - Math.min(360, window.innerHeight * 0.55) - 12)),
      width: Math.max(r.width, w),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!inputRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const choose = (e: Entry) => {
    setQuery(e.title);
    setOpen(false);
    focusEntry(e.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const buttons = listRef.current ? [...listRef.current.querySelectorAll<HTMLButtonElement>('button')] : [];
    if (e.key === 'ArrowDown' && buttons.length) {
      e.preventDefault();
      setOpen(true);
      buttons[0].focus();
    } else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter' && matches.length === 1) {
      e.preventDefault();
      choose(matches[0]);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      buttons[Math.min(buttons.length - 1, i + 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i <= 0) inputRef.current?.focus();
      else buttons[i - 1].focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  const showList = open && !!query.trim() && box;

  return (
    <div className="relative flex-none">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder={lowEnd ? 'Search' : ''}
        aria-label="Search entries"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-expanded={!!showList}
        className="field-input w-[150px] bg-panel sm:w-[190px]"
      />
      {!lowEnd && !query && !focused && <AnimatedPlaceholder placeholders={PLACEHOLDERS} />}
      {showList &&
        createPortal(
          <div
            ref={listRef}
            id="search-suggestions"
            role="listbox"
            onKeyDown={onListKeyDown}
            style={{ left: box.left, top: box.top, width: box.width }}
            className="fixed z-[2000] grid max-h-[min(360px,55vh)] gap-1 overflow-auto rounded-[13px] border border-line bg-panel-solid p-[7px] shadow-2xl"
          >
            {matches.length ? (
              matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(m)}
                  className="grid min-h-[44px] w-full grid-cols-[1fr_auto] items-center gap-2.5 rounded-[9px] px-[11px] text-left hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
                >
                  <b className="truncate">{m.title}</b>
                  <small className="font-semibold text-muted">{m.type}</small>
                </button>
              ))
            ) : (
              <div className="px-[11px] py-2.5 font-semibold text-muted">No names start with this text.</div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
