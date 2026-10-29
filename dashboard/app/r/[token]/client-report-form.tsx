'use client';

import { useState } from 'react';
import { FieldInput } from '@/components/custom/client-report-field';
import type { PinnedFieldDef } from '@/lib/consultation/client-report-contract';

/**
 * Door 1 — magic-link self-report form (client component).
 *
 * Renders the client-reportable pinned fields grouped in walk order, plus the
 * split consent questions. Unanswered fields are OMITTED (unknown), never
 * guessed; the per-field "I don't know" box marks them explicitly unknown.
 * Submits to POST /api/consultations/[appointmentId]/client-report with
 * channel 'form'. The submission lands PENDING for stylist review — nothing
 * here confirms a consultation or overwrites stylist/photo values.
 *
 * Consent labels below are FUNCTIONAL prompts only, NOT cleared consent
 * wording: exact (b) wording is Gideon-gated (item 4's payload gate) and
 * must replace these labels before any payload ships under cleared wording.
 */
export default function ClientReportForm({
  token,
  appointmentId,
  clientName,
  stylistName,
  scheduledAt,
  fields,
}: {
  token: string;
  appointmentId: string;
  clientName: string;
  stylistName: string;
  scheduledAt: string;
  fields: PinnedFieldDef[];
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [unknownKeys, setUnknownKeys] = useState<string[]>([]);
  const [serviceConsent, setServiceConsent] = useState<boolean | null>(null);
  const [featuringConsent, setFeaturingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function setValue(key: string, v: unknown) {
    setValues((prev) => {
      const next = { ...prev };
      if (v === undefined || v === '' || (typeof v === 'string' && v.trim() === '')) {
        delete next[key];
      } else if (Array.isArray(v) && v.length === 0) {
        // Unchecked-all in the form means "not answered", not "none" —
        // omit it (unknown). The chat door has an explicit "None" answer.
        delete next[key];
      } else {
        next[key] = v;
      }
      return next;
    });
  }

  function toggleUnknown(key: string, on: boolean) {
    setUnknownKeys((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)));
    if (on) {
      setValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function submit() {
    if (serviceConsent === null) {
      setError('Please answer the service photos question (Yes or No) before sending.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setErrorFields([]);
    try {
      const res = await fetch(`/api/consultations/${appointmentId}/client-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          channel: 'form',
          fields: values,
          service_consent: serviceConsent,
          featuring_consent: featuringConsent,
          unknownFields: unknownKeys,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.');
        if (Array.isArray(data.fields)) setErrorFields(data.fields as string[]);
        return;
      }
      setDone(true);
    } catch {
      setError('Submission failed (network error). Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Thanks, {clientName}.</h1>
        <p className="text-sm text-gray-700">
          Your answers were saved as a pending report for your appointment with {stylistName}.
          Your stylist will review them with you at the appointment — nothing here changes
          your consultation until they confirm it.
        </p>
      </main>
    );
  }

  const when = new Date(scheduledAt).toLocaleString();
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-1">Hi {clientName}.</h1>
      <p className="text-sm text-gray-700 mb-4">
        Your appointment with {stylistName} is {when}. Answer what you can — leave blank
        anything you don&apos;t know, and never guess. Your stylist reviews everything with
        you at the appointment.
      </p>
      <p className="text-sm mb-6">
        Prefer to answer as a chat?{' '}
        <a className="underline" href={`/r/${token}/chat`}>
          Switch to the guided chat
        </a>
        .
      </p>

      {fields.map((def) => {
        const isUnknown = unknownKeys.includes(def.key);
        return (
          <div key={def.key} className="mb-5">
            <label className="block text-sm font-medium mb-1">{def.label}</label>
            <FieldInput
              def={def}
              value={values[def.key]}
              onChange={(v) => setValue(def.key, v)}
              disabled={isUnknown}
            />
            <label className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <input
                type="checkbox"
                checked={isUnknown}
                onChange={(e) => toggleUnknown(def.key, e.target.checked)}
              />
              I don&apos;t know
            </label>
          </div>
        );
      })}

      <div className="border-t pt-4 mt-6">
        <p className="text-sm font-medium mb-2">Photos — two separate questions</p>
        <div className="mb-4">
          <p className="text-sm mb-1">
            Service photos: may photos be taken and used for your consultation and service for
            this appointment?
          </p>
          <label className="mr-4 text-sm">
            <input
              type="radio"
              name="service-consent"
              checked={serviceConsent === true}
              onChange={() => setServiceConsent(true)}
            />{' '}
            Yes
          </label>
          <label className="text-sm">
            <input
              type="radio"
              name="service-consent"
              checked={serviceConsent === false}
              onChange={() => setServiceConsent(false)}
            />{' '}
            No
          </label>
          <p className="text-xs text-gray-600 mt-1">
            Your answers above are still sent even if you answer No — this only affects photos.
          </p>
        </div>
        <div className="mb-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={featuringConsent}
              onChange={(e) => setFeaturingConsent(e.target.checked)}
            />
            <span>
              Featuring (optional): may photos from this appointment be featured by PLEIJ and
              COLORiq?
              <span className="block text-xs text-gray-600">
                Optional — not required for your appointment. Never shared with sponsors or
                third parties.
              </span>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm">
          <p>{error}</p>
          {errorFields.length > 0 && (
            <ul className="list-disc ml-5 mt-1">
              {errorFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        className="bg-black text-white rounded px-5 py-2 disabled:opacity-50"
        disabled={submitting}
        onClick={submit}
      >
        {submitting ? 'Sending…' : 'Send to my stylist'}
      </button>
    </main>
  );
}
