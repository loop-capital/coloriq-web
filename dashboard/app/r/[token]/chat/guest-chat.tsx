'use client';

import { useState } from 'react';
import {
  describeFieldValue,
  FieldInput,
} from '@/components/custom/client-report-field';
import type { PinnedFieldDef } from '@/lib/consultation/client-report-contract';

/**
 * Door 2 — Dmitri guest chat (guest collection door, fast follow).
 *
 * SCOPE HONESTY: this is a SCRIPTED guided questionnaire, not Dmitri
 * himself and not the full Dmitri assistant (separate spec, separate persona
 * work). There is no LLM persona here, no advice, no shade recommendations,
 * no predictions, and no interpretation: fixed questions in design-group
 * order, answers recorded as stated, and the full answer set shown for the
 * client's explicit go-ahead before anything is sent. It shares the form
 * door's endpoint, pinned contract, and pending semantics exactly — the
 * only difference is the channel label ('guest-chat').
 *
 * "I don't know" (or Next with no answer) records the field as unknown —
 * never guessed, never filled from assumption. String-list steps offer an
 * explicit "None of these" (recorded as an empty list = none reported),
 * distinct from unknown. Inspiration is words only; no images are collected.
 */
export default function GuestChat({
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
  // Steps: 0..fields.length-1 = fields, then service consent, featuring
  // consent, then the review screen.
  const SERVICE_STEP = fields.length;
  const FEATURING_STEP = fields.length + 1;
  const REVIEW_STEP = fields.length + 2;

  const [step, setStep] = useState(0);
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
      } else {
        // Empty lists are KEPT here: "None of these" is an explicit answer.
        next[key] = v;
      }
      return next;
    });
  }

  function markUnknown(key: string) {
    setUnknownKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function nextFromField(def: PinnedFieldDef) {
    if (values[def.key] === undefined && !unknownKeys.includes(def.key)) {
      markUnknown(def.key);
    }
    setStep(step + 1);
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
          channel: 'guest-chat',
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
  const back = step > 0 ? <button className="underline text-sm mr-4" onClick={() => setStep(step - 1)}>Back</button> : null;

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-1">Hi {clientName}.</h1>
      <p className="text-sm text-gray-700 mb-2">
        Your appointment with {stylistName} is {when}.
      </p>
      <p className="text-sm bg-gray-50 border rounded p-3 mb-6">
        This is a guided questionnaire, not Dmitri. It gives no advice, shade
        recommendations, or predictions — it only records what you say, in your
        words, for your stylist to review at your appointment. Describe looks in
        words; photos are not collected here. Prefer the form instead?{' '}
        <a className="underline" href={`/r/${token}`}>
          Switch to the form
        </a>
        .
      </p>

      {step < fields.length && (() => {
        const def = fields[step];
        const isUnknown = unknownKeys.includes(def.key);
        return (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Question {step + 1} of {fields.length + 2}
            </p>
            <p className="text-base font-medium mb-2">{def.label}</p>
            <FieldInput
              def={def}
              value={values[def.key]}
              onChange={(v) => setValue(def.key, v)}
              disabled={isUnknown}
            />
            <div className="flex gap-3 mt-4">
              {back}
              {def.kind === 'stringList' && (
                <button
                  className="border rounded px-4 py-2 text-sm"
                  onClick={() => {
                    setValue(def.key, []);
                    setStep(step + 1);
                  }}
                >
                  None of these
                </button>
              )}
              <button
                className="border rounded px-4 py-2 text-sm"
                onClick={() => {
                  markUnknown(def.key);
                  setStep(step + 1);
                }}
              >
                I don&apos;t know
              </button>
              <button
                className="bg-black text-white rounded px-4 py-2 text-sm"
                onClick={() => nextFromField(def)}
              >
                Next
              </button>
            </div>
          </div>
        );
      })()}

      {step === SERVICE_STEP && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Question {step + 1} of {fields.length + 2}</p>
          <p className="text-base font-medium mb-2">
            Service photos: may photos be taken and used for your consultation and service for
            this appointment?
          </p>
          <label className="mr-4 text-sm">
            <input type="radio" name="service-consent-chat" checked={serviceConsent === true} onChange={() => setServiceConsent(true)} /> Yes
          </label>
          <label className="text-sm">
            <input type="radio" name="service-consent-chat" checked={serviceConsent === false} onChange={() => setServiceConsent(false)} /> No
          </label>
          <p className="text-xs text-gray-600 mt-1 mb-4">
            Your answers are still sent even if you answer No — this only affects photos.
          </p>
          <div className="flex gap-3">
            {back}
            <button
              className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
              disabled={serviceConsent === null}
              onClick={() => setStep(step + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === FEATURING_STEP && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Question {step + 1} of {fields.length + 2}</p>
          <p className="text-base font-medium mb-2">
            Featuring (optional): may photos from this appointment be featured by PLEIJ and
            COLORiq?
          </p>
          <label className="flex items-start gap-2 text-sm mb-4">
            <input type="checkbox" checked={featuringConsent} onChange={(e) => setFeaturingConsent(e.target.checked)} />
            <span>
              Yes, feature them.
              <span className="block text-xs text-gray-600">
                Optional — not required for your appointment. Never shared with sponsors or
                third parties.
              </span>
            </span>
          </label>
          <div className="flex gap-3">
            {back}
            <button className="bg-black text-white rounded px-4 py-2 text-sm" onClick={() => setStep(step + 1)}>
              Review my answers
            </button>
          </div>
        </div>
      )}

      {step === REVIEW_STEP && (
        <div>
          <p className="text-base font-medium mb-3">Review — this is exactly what will be sent:</p>
          <ul className="text-sm mb-4">
            {fields.map((def) => (
              <li key={def.key} className="mb-1">
                <span className="font-medium">{def.label}:</span>{' '}
                {unknownKeys.includes(def.key)
                  ? 'I don’t know'
                  : values[def.key] === undefined
                    ? '—'
                    : describeFieldValue(def, values[def.key])}
              </li>
            ))}
            <li className="mb-1">
              <span className="font-medium">Service photos:</span> {serviceConsent ? 'Yes' : 'No'}
            </li>
            <li className="mb-1">
              <span className="font-medium">Featuring (optional):</span> {featuringConsent ? 'Yes' : 'No'}
            </li>
          </ul>
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
          <div className="flex gap-3">
            {back}
            <button
              className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? 'Sending…' : 'Send to my stylist'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
