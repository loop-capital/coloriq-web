'use client';

import { TONE_LETTERS } from '@/lib/consultation/field-mapping';
import type { PinnedFieldDef } from '@/lib/consultation/client-report-contract';

/**
 * One input renderer for a pinned contract field, shared by the form door,
 * the guest-chat door, and the stylist review page. Kinds map 1:1 to the
 * dictate FieldKind set, so a value produced here always validates against
 * the pinned contract.
 */
export function FieldInput({
  def,
  value,
  onChange,
  disabled = false,
}: {
  def: PinnedFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const base = 'w-full border rounded px-3 py-2 bg-white disabled:opacity-50';
  if (def.kind === 'level') {
    return (
      <select
        className={base}
        disabled={disabled}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        <option value="">—</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            Level {n}
          </option>
        ))}
      </select>
    );
  }
  if (def.kind === 'tone') {
    return (
      <select
        className={base}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      >
        <option value="">—</option>
        {Object.entries(TONE_LETTERS).map(([letter, name]) => (
          <option key={letter} value={letter}>
            {name} ({letter})
          </option>
        ))}
      </select>
    );
  }
  if (def.kind === 'enum') {
    return (
      <select
        className={base}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      >
        <option value="">—</option>
        {(def.enumValues ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (def.kind === 'stringList') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-col gap-1">
        {(def.enumValues ?? []).map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(o.value)}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, o.value]);
                else onChange(selected.filter((v) => v !== o.value));
              }}
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  // string
  const text = typeof value === 'string' ? value : '';
  if ((def.maxLength ?? 64) > 100) {
    return (
      <textarea
        className={base}
        rows={3}
        maxLength={def.maxLength}
        disabled={disabled}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.label}
      />
    );
  }
  return (
    <input
      className={base}
      type="text"
      maxLength={def.maxLength}
      disabled={disabled}
      value={text}
      onChange={(e) => onChange(e.target.value)}
      placeholder={def.label}
    />
  );
}

/** Human-readable rendering of a stored value, for review screens. */
export function describeFieldValue(def: PinnedFieldDef, value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (def.kind === 'tone' && typeof value === 'string') {
    const name = TONE_LETTERS[value.toUpperCase() as keyof typeof TONE_LETTERS];
    return name ? `${name} (${value.toUpperCase()})` : value;
  }
  if (def.kind === 'enum' && typeof value === 'string') {
    return def.enumValues?.find((o) => o.value === value)?.label ?? value;
  }
  if (def.kind === 'stringList') {
    const items = Array.isArray(value) ? value : [value];
    if (items.length === 0) return 'None reported';
    return items
      .map((v) => def.enumValues?.find((o) => o.value === v)?.label ?? String(v))
      .join(', ');
  }
  return String(value);
}
