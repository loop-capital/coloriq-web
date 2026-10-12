'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX, Plus, FlaskConical } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PatchTest {
  id: string;
  test_date: string;
  product_brand?: string | null;
  product_shade?: string | null;
  result: 'pass' | 'fail' | 'reaction';
  notes?: string | null;
  expiry_date?: string | null;
}

type Status = 'current' | 'expired' | 'failed' | 'never_tested';

const STATUS_CONFIG: Record<Status, { label: string; icon: any; color: string; bg: string }> = {
  current: { label: 'Patch test current', icon: ShieldCheck, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  expired: { label: 'Patch test expired', icon: ShieldAlert, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  failed: { label: 'Patch test failed', icon: ShieldX, color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  never_tested: { label: 'Never patch tested', icon: ShieldAlert, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

export function PatchTestSection({ clientId }: { clientId: string }) {
  const [tests, setTests] = useState<PatchTest[]>([]);
  const [status, setStatus] = useState<Status>('never_tested');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ test_date: '', product_brand: '', product_shade: '', result: 'pass', notes: '' });
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/patch-tests`);
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
        setStatus(data.status || 'never_tested');
      }
    } catch (err) {
      console.error('[patch-test] load failed', err);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.test_date) {
      toast({ title: 'Test date required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/patch-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to record patch test');
      toast({ title: 'Patch test recorded' });
      setShowForm(false);
      setForm({ test_date: '', product_brand: '', product_shade: '', result: 'pass', notes: '' });
      load();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="w-4 h-4" /> Patch Tests
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge style={{ background: cfg.bg, color: cfg.color }}>
            <Icon className="w-3 h-3 mr-1" /> {cfg.label}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3 h-3 mr-1" /> Record test
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg border border-white/10">
            <label className="text-xs">
              Test date *
              <input type="date" required value={form.test_date}
                onChange={(e) => setForm({ ...form, test_date: e.target.value })}
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs">
              Result
              <select value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm">
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="reaction">Reaction</option>
              </select>
            </label>
            <label className="text-xs">
              Brand
              <input type="text" value={form.product_brand}
                onChange={(e) => setForm({ ...form, product_brand: e.target.value })}
                placeholder="e.g. Wella" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs">
              Shade
              <input type="text" value={form.product_shade}
                onChange={(e) => setForm({ ...form, product_shade: e.target.value })}
                placeholder="e.g. 7/0" className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs col-span-2">
              Notes
              <input type="text" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observations, reaction details..."
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-sm" />
            </label>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save test'}</Button>
            </div>
          </form>
        )}

        {tests.length === 0 ? (
          <p className="text-sm text-white/40">No patch tests recorded. Patch tests expire after 6 months.</p>
        ) : (
          <div className="space-y-2">
            {tests.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/[0.03]">
                <div>
                  <span className="font-medium">{new Date(t.test_date).toLocaleDateString()}</span>
                  {(t.product_brand || t.product_shade) && (
                    <span className="text-white/50 ml-2">{t.product_brand} {t.product_shade}</span>
                  )}
                  {t.notes && <p className="text-xs text-white/40 mt-0.5">{t.notes}</p>}
                </div>
                <Badge
                  style={{
                    background: t.result === 'pass' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                    color: t.result === 'pass' ? '#34d399' : '#f87171',
                  }}
                >
                  {t.result}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
