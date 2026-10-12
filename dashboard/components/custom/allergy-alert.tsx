'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface AllergyAlertProps {
  allergies: Array<{ allergen: string; severity: string; notes?: string | null }>;
  legacyFlags?: string[];
  compact?: boolean;
}

/**
 * Prominent warning banner shown whenever a client record is opened or a
 * formula is created for a client with recorded allergies or a failed patch test.
 */
export function AllergyAlert({ allergies, legacyFlags = [], compact = false }: AllergyAlertProps) {
  const hasSevere = allergies.some((a) => a.severity === 'severe');
  const total = allergies.length + legacyFlags.length;
  if (total === 0) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${compact ? 'p-3' : ''}`}
      style={{
        background: hasSevere ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
        borderColor: hasSevere ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)',
      }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {hasSevere ? (
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--cg-text-primary)' }}>
            {hasSevere ? 'Severe allergy alert' : 'Allergy alert'} — check formula before applying
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {allergies.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  background: a.severity === 'severe' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)',
                  color: a.severity === 'severe' ? '#f87171' : '#fbbf24',
                }}
                title={a.notes || undefined}
              >
                {a.allergen} ({a.severity})
              </span>
            ))}
            {legacyFlags.map((f, i) => (
              <span
                key={`legacy-${i}`}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}
                title="From client intake record"
              >
                {f}
              </span>
            ))}
          </div>
          {!compact && (
            <p className="text-xs mt-2" style={{ color: 'var(--cg-text-secondary)' }}>
              Verify the formula contains none of these ingredients before mixing or applying.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
