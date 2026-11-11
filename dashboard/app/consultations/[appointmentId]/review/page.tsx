'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DictationWidget from '@/components/custom/dictation-widget';
import {
  describeFieldValue,
  FieldInput,
} from '@/components/custom/client-report-field';
import {
  PINNED_MAP,
  type PinnedFieldDef,
} from '@/lib/consultation/client-report-contract';

interface PendingReport {
  id: string;
  channel: string;
  status: string;
  fields: Record<string, unknown>;
  unknownFields: string[];
  serviceConsent: boolean;
  featuringConsent: boolean;
  createdAt: string;
}

interface Conflict {
  key: string;
  clientValue: unknown;
  currentValue: unknown;
}

interface ReviewData {
  appointment: { id: string; scheduledAt: string; status: string; clientId: string };
  pendingReports: PendingReport[];
  consultationRecord: { fields: Record<string, unknown> } | null;
  conflicts: Conflict[];
}

type Choice = 'client' | 'current' | 'custom';

/**
 * Stylist review + voice-confirm merge page (part c).
 *
 * Shows the latest pending report next to the current consultation record,
 * with conflicts surfaced explicitly. The stylist resolves each conflict
 * (client value / current value / custom edit) and confirms explicitly.
 * Voice path: hold-to-dictate via the existing dictate tool feeds resolved
 * values (onFieldsUpdate) — dictation NEVER confirms by itself; only the
 * Confirm button merges, and only after every conflict has an explicit
 * choice. Unresolved conflicts disable confirmation (the endpoint enforces
 * the same rule server-side).
 */
export default function ReviewPage() {
  const params = useParams();
  const rawId = params.appointmentId;
  const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [data, setData] = useState<ReviewData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, unknown>>({});
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmErrorFields, setConfirmErrorFields] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;
    fetch(`/api/consultations/${appointmentId}/client-report`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLoadError(json.error ?? 'Failed to load review data.');
          return;
        }
        setData(json as ReviewData);
        const latest = (json as ReviewData).pendingReports[0];
        if (latest) setResolved({ ...(latest.fields as Record<string, unknown>) });
      })
      .catch(() => setLoadError('Failed to load review data (network error).'));
  }, [appointmentId]);

  if (!appointmentId) {
    return <main className="max-w-3xl mx-auto p-6">Missing appointment id.</main>;
  }
  if (loadError) {
    return <main className="max-w-3xl mx-auto p-6">{loadError}</main>;
  }
  if (!data) {
    return <main className="max-w-3xl mx-auto p-6">Loading…</main>;
  }
  const latest = data.pendingReports[0];
  if (!latest) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">No pending reports</h1>
        <p className="text-sm text-gray-700">
          Appointment {data.appointment.id} has no pending client reports to review.
        </p>
      </main>
    );
  }

  const conflictKeys = new Set(data.conflicts.map((c) => c.key));
  const unresolved = data.conflicts.filter((c) => !choices[c.key]).map((c) => c.key);
  const defFor = (key: string): PinnedFieldDef | undefined => PINNED_MAP.get(key);

  function setResolvedValue(key: string, v: unknown) {
    setResolved((prev) => {
      const next = { ...prev };
      if (v === undefined || v === '' || (typeof v === 'string' && v.trim() === '')) {
        delete next[key];
      } else {
        next[key] = v;
      }
      return next;
    });
  }

  function applyChoice(key: string, choice: Choice, conflict: Conflict) {
    setChoices((prev) => ({ ...prev, [key]: choice }));
    if (choice === 'client') setResolved((prev) => ({ ...prev, [key]: conflict.clientValue }));
    if (choice === 'current') setResolved((prev) => ({ ...prev, [key]: conflict.currentValue }));
  }

  async function confirm() {
    setConfirming(true);
    setConfirmError(null);
    setConfirmErrorFields([]);
    try {
      const res = await fetch(
        `/api/consultations/${appointmentId}/client-report/${latest.id}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolvedFields: resolved }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirmError(json.error ?? 'Confirmation failed.');
        if (Array.isArray(json.conflicts)) setConfirmErrorFields(json.conflicts as string[]);
        if (Array.isArray(json.fields)) setConfirmErrorFields(json.fields as string[]);
        return;
      }
      setConfirmed(true);
    } catch {
      setConfirmError('Confirmation failed (network error).');
    } finally {
      setConfirming(false);
    }
  }

  if (confirmed) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Report confirmed.</h1>
        <p className="text-sm text-gray-700">
          The pending report was merged into the consultation record. Allergies were recorded
          exactly as stated, never interpreted.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-1">Review client report</h1>
      <p className="text-sm text-gray-700 mb-4">
        Appointment {data.appointment.id} · {new Date(data.appointment.scheduledAt).toLocaleString()} ·{' '}
        {data.appointment.status} · channel: {latest.channel} · submitted{' '}
        {new Date(latest.createdAt).toLocaleString()}
      </p>
      <p className="text-sm mb-1">
        Service consent: {latest.serviceConsent ? 'Yes' : 'No'} · Featuring consent:{' '}
        {latest.featuringConsent ? 'Yes' : 'No'}
      </p>
      {latest.unknownFields.length > 0 && (
        <p className="text-sm mb-4">Client marked unknown: {latest.unknownFields.join(', ')}</p>
      )}

      {data.conflicts.length > 0 && (
        <section className="border border-amber-300 bg-amber-50 rounded p-4 mb-6">
          <h2 className="font-medium mb-2">Conflicts — resolve each one explicitly</h2>
          <p className="text-xs text-gray-700 mb-3">
            A conflict means the client&apos;s value differs from the current record. Nothing
            here is merged until you choose, per field.
          </p>
          {data.conflicts.map((c) => {
            const def = defFor(c.key);
            return (
              <div key={c.key} className="mb-4">
                <p className="text-sm font-medium">{def?.label ?? c.key}</p>
                <p className="text-sm">
                  Client: {def ? describeFieldValue(def, c.clientValue) : JSON.stringify(c.clientValue)}
                  {' · '}Current:{' '}
                  {def ? describeFieldValue(def, c.currentValue) : JSON.stringify(c.currentValue)}
                </p>
                <div className="flex gap-4 text-sm mt-1">
                  <label>
                    <input
                      type="radio"
                      name={`choice-${c.key}`}
                      checked={choices[c.key] === 'client'}
                      onChange={() => applyChoice(c.key, 'client', c)}
                    />{' '}
                    Client value
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`choice-${c.key}`}
                      checked={choices[c.key] === 'current'}
                      onChange={() => applyChoice(c.key, 'current', c)}
                    />{' '}
                    Current value
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`choice-${c.key}`}
                      checked={choices[c.key] === 'custom'}
                      onChange={() => setChoices((prev) => ({ ...prev, [c.key]: 'custom' }))}
                    />{' '}
                    Custom
                  </label>
                </div>
                {choices[c.key] === 'custom' && def && (
                  <div className="mt-2">
                    <FieldInput
                      def={def}
                      value={resolved[c.key]}
                      onChange={(v) => setResolvedValue(c.key, v)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="mb-6">
        <h2 className="font-medium mb-2">Resolved values (edit anything before confirming)</h2>
        {Object.keys(resolved).length === 0 && (
          <p className="text-sm text-gray-600">No fields in this report.</p>
        )}
        {Object.entries(resolved).map(([key, value]) => {
          const def = defFor(key);
          if (!def) return null;
          if (conflictKeys.has(key) && choices[key] !== 'custom') return null;
          return (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium mb-1">{def.label}</label>
              <FieldInput def={def} value={value} onChange={(v) => setResolvedValue(key, v)} />
            </div>
          );
        })}
      </section>

      <section className="border-t pt-4 mb-6">
        <h2 className="font-medium mb-2">Dictate resolutions by voice</h2>
        <p className="text-xs text-gray-600 mb-2">
          Hold to dictate — spoken values feed the resolved fields above (and count as custom
          resolutions for conflicts). Dictation never confirms anything by itself; you still
          press Confirm.
        </p>
        <DictationWidget
          currentFields={resolved}
          onFieldsUpdate={(updates) => {
            for (const [key, v] of Object.entries(updates)) {
              const def = defFor(key);
              if (!def) continue;
              setResolvedValue(key, v);
              if (conflictKeys.has(key)) {
                setChoices((prev) => ({ ...prev, [key]: 'custom' }));
              }
            }
          }}
        />
      </section>

      {confirmError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm">
          <p>{confirmError}</p>
          {confirmErrorFields.length > 0 && (
            <ul className="list-disc ml-5 mt-1">
              {confirmErrorFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        className="bg-black text-white rounded px-5 py-2 disabled:opacity-50"
        disabled={confirming || unresolved.length > 0}
        onClick={confirm}
      >
        {unresolved.length > 0
          ? `Resolve ${unresolved.length} conflict${unresolved.length > 1 ? 's' : ''} to confirm`
          : confirming
            ? 'Confirming…'
            : 'Confirm and merge'}
      </button>
      {data.pendingReports.length > 1 && (
        <p className="text-xs text-gray-600 mt-3">
          {data.pendingReports.length - 1} older pending report(s) exist for this appointment;
          this page reviews the latest. Older reports remain pending until reviewed.
        </p>
      )}
    </main>
  );
}
