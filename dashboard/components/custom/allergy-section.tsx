'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AllergyAlert } from './allergy-alert';

interface Allergy {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string | null;
}

const SEVERITY_COLOR: Record<string, string> = {
  mild: '#fbbf24',
  moderate: '#fb923c',
  severe: '#f87171',
};

export function AllergySection({ clientId }: { clientId: string }) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [legacyFlags, setLegacyFlags] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ allergen: '', severity: 'moderate', notes: '' });
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/allergies`);
      if (res.ok) {
        const data = await res.json();
        setAllergies(data.allergies || []);
        setLegacyFlags(data.legacyFlags || []);
      }
    } catch (err) {
      console.error('[allergies] load failed', err);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.allergen.trim()) {
      toast({ title: 'Allergen name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/allergies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to record allergy');
      toast({ title: 'Allergy recorded' });
      setShowForm(false);
      setForm({ allergen: '', severity: 'moderate', notes: '' });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (allergyId: string) => {
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/allergies/${allergyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      toast({ title: 'Allergy removed' });
      load();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to remove allergy', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4" /> Allergies
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3 mr-1" /> Add allergy
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {(allergies.length > 0 || legacyFlags.length > 0) && (
          <AllergyAlert allergies={allergies} legacyFlags={legacyFlags} compact />
        )}

        {showForm && (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-white/10">
            <label className="text-xs">
              Allergen / ingredient *
              <input type="text" required value={form.allergen}
                onChange={(e) => setForm({ ...form, allergen: e.target.value })}
                placeholder="e.g. PPD, ammonia, resorcinol"
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs">
              Severity
              <select value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm">
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </label>
            <label className="text-xs col-span-2">
              Notes
              <input type="text" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Reaction history, details..."
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save allergy'}</Button>
            </div>
          </form>
        )}

        {allergies.length === 0 && legacyFlags.length === 0 ? (
          <p className="text-sm text-white/40">No allergies recorded.</p>
        ) : (
          <div className="space-y-2">
            {allergies.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/[0.03]">
                <div>
                  <span className="font-medium">{a.allergen}</span>
                  <Badge className="ml-2" style={{ background: 'rgba(255,255,255,0.06)', color: SEVERITY_COLOR[a.severity] }}>
                    {a.severity}
                  </Badge>
                  {a.notes && <p className="text-xs text-white/40 mt-0.5">{a.notes}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} title="Remove allergy">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
