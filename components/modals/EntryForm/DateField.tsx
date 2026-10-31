'use client';

import { ENGLISH_MONTHS, HEBREW_MONTHS } from '@/lib/dates';

export interface DateValue {
  year: string;
  month: string;
  day: string;
  era: 'BCE' | 'CE';
  approx: boolean;
}

interface Props {
  label: string;
  value: DateValue;
  onChange(v: DateValue): void;
  disabled?: boolean;
}

/** Year, optional English/Hebrew month, optional day, BCE/CE and the ≈ (approximate) flag. */
export default function DateField({ label, value, onChange, disabled }: Props) {
  const set = (patch: Partial<DateValue>) => onChange({ ...value, ...patch });
  const id = label.toLowerCase();
  return (
    <fieldset
      disabled={disabled}
      className={`m-0 grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1.7fr)_66px] items-center gap-[7px] border-0 p-0 md:grid-cols-[46px_80px_minmax(150px,1fr)_68px_auto_auto] ${disabled ? 'opacity-45' : ''}`}
    >
      <legend className="sr-only">{label} date</legend>
      <b aria-hidden>{label}</b>
      <input
        id={`${id}-year`}
        className="field-input"
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="Year"
        aria-label={`${label} year`}
        value={value.year}
        onChange={(e) => set({ year: e.target.value })}
      />
      <select className="field-input" aria-label={`${label} month`} value={value.month} onChange={(e) => set({ month: e.target.value })}>
        <option value="">Month (optional)</option>
        <optgroup label="English months">
          {Object.entries(ENGLISH_MONTHS).map(([k, v]) => (
            <option key={k} value={k}>
              {v[0]}
            </option>
          ))}
        </optgroup>
        <optgroup label="Hebrew months">
          {Object.entries(HEBREW_MONTHS).map(([k, v]) => (
            <option key={k} value={k}>
              {v[0]} / {v[1]}
            </option>
          ))}
        </optgroup>
      </select>
      <input
        className="field-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        placeholder="Day"
        aria-label={`${label} day`}
        value={value.day}
        onChange={(e) => set({ day: e.target.value })}
      />
      <span className="col-span-2 flex gap-1 md:col-span-1" role="group" aria-label={`${label} era`}>
        {(['BCE', 'CE'] as const).map((era) => (
          <button
            key={era}
            type="button"
            className={`btn flex-1 ${value.era === era ? 'btn-active' : ''}`}
            aria-pressed={value.era === era}
            onClick={() => set({ era })}
          >
            {era}
          </button>
        ))}
      </span>
      <label className="col-span-2 flex min-h-[44px] items-center gap-2 font-bold md:col-span-1" title="Approximate date">
        <input type="checkbox" className="h-5 w-5" checked={value.approx} onChange={(e) => set({ approx: e.target.checked })} /> ≈
        <span className="sr-only">approximate</span>
      </label>
    </fieldset>
  );
}
