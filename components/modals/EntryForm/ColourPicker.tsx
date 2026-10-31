'use client';

import { useState } from 'react';
import { PALETTE } from '@/lib/sample';

interface Props {
  value: string;
  onChange(c: string): void;
}

/** The 15 preset colours plus a custom colour (picker or hex). */
export default function ColourPicker({ value, onChange }: Props) {
  const [hex, setHex] = useState(value.toUpperCase());
  const [error, setError] = useState('');
  const choose = (c: string) => {
    onChange(c);
    setHex(c.toUpperCase());
    setError('');
  };
  return (
    <div>
      <div className="grid grid-cols-[repeat(5,44px)] gap-2" role="radiogroup" aria-label="Preset colours">
        {PALETTE.map((c) => {
          const sel = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={sel}
              aria-label={c}
              onClick={() => choose(c)}
              className="h-11 w-11 rounded-full border-[3px] border-white p-0"
              style={{ background: c, boxShadow: sel ? '0 0 0 3px #111827' : '0 0 0 1px #0005' }}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-[46px_1fr_auto] gap-[7px]">
        <input
          type="color"
          aria-label="Custom colour"
          className="h-11 w-[46px] cursor-pointer rounded-lg border border-line bg-transparent"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#0EA5E9'}
          onChange={(e) => choose(e.target.value)}
        />
        <input className="field-input" aria-label="Colour code" value={hex} onChange={(e) => setHex(e.target.value)} />
        <button
          type="button"
          className="btn"
          onClick={() => (/^#[0-9a-f]{6}$/i.test(hex.trim()) ? choose(hex.trim()) : setError('Use a colour like #0EA5E9'))}
        >
          Use colour
        </button>
      </div>
      {error && <small className="mt-1 block font-bold text-danger">{error}</small>}
    </div>
  );
}
