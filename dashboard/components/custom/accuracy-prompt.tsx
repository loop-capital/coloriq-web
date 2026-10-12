'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AccuracyPromptProps {
  formulationId?: string;
  formulaId?: string;
  clientId?: string;
  serviceType?: string;
  predictedLevel?: number;
  predictedTone?: string;
  onSubmitted?: () => void;
  onSkip?: () => void;
}

const OUTCOMES = [
  { value: 'nailed_it', label: 'Nailed it', icon: CheckCircle, color: '#34d399' },
  { value: 'needed_adjustment', label: 'Needed adjustment', icon: AlertCircle, color: '#fbbf24' },
  { value: 'missed', label: 'Missed', icon: XCircle, color: '#f87171' },
];

/**
 * Post-session outcome rating prompt. Records how the formula performed so
 * accuracy analytics (and the retraining flywheel) have real data.
 */
export function AccuracyPrompt({
  formulationId,
  formulaId,
  clientId,
  serviceType,
  predictedLevel,
  predictedTone,
  onSubmitted,
  onSkip,
}: AccuracyPromptProps) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [actualLevel, setActualLevel] = useState('');
  const [actualTone, setActualTone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!outcome) {
      toast({ title: 'Pick an outcome', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/accuracy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formulation_id: formulationId,
          formula_id: formulaId,
          client_id: clientId,
          service_type: serviceType,
          predicted_level: predictedLevel,
          actual_level: actualLevel ? parseInt(actualLevel, 10) : undefined,
          predicted_tone: predictedTone,
          actual_tone: actualTone || undefined,
          outcome,
          rating: rating || undefined,
          adjustment_notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to record outcome');
      toast({ title: 'Outcome recorded — thank you' });
      onSubmitted?.();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How did the formula perform?</CardTitle>
        <p className="text-xs text-white/50">Your rating improves future formulas and powers our accuracy tracking.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {OUTCOMES.map((o) => {
            const Icon = o.icon;
            const active = outcome === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setOutcome(o.value)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: active ? o.color : 'rgba(255,255,255,0.1)',
                  background: active ? `${o.color}1a` : 'rgba(255,255,255,0.03)',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: o.color }} />
                <span className="text-xs font-medium">{o.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <p className="text-xs mb-1 text-white/60">Star rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)}>
                <Star
                  className="w-6 h-6"
                  style={{ color: s <= rating ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}
                  fill={s <= rating ? '#fbbf24' : 'transparent'}
                />
              </button>
            ))}
          </div>
        </div>

        {(predictedLevel != null || predictedTone) && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              Actual level achieved {predictedLevel != null && <span className="text-white/40">(predicted: {predictedLevel})</span>}
              <input type="number" min={1} max={10} value={actualLevel}
                onChange={(e) => setActualLevel(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs">
              Actual tone {predictedTone && <span className="text-white/40">(predicted: {predictedTone})</span>}
              <input type="text" value={actualTone}
                onChange={(e) => setActualTone(e.target.value)}
                placeholder="e.g. neutral warm"
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
          </div>
        )}

        <label className="text-xs block">
          Adjustment notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you adjust? What would you change next time?"
            rows={2}
            className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
        </label>

        <div className="flex justify-end gap-2">
          {onSkip && <Button size="sm" variant="ghost" onClick={onSkip}>Skip</Button>}
          <Button size="sm" onClick={submit} disabled={saving || !outcome}>
            {saving ? 'Saving…' : 'Record outcome'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
