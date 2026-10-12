'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, AlertTriangle, Star } from 'lucide-react';

interface Stats {
  summary: {
    total: number;
    nailedIt: number;
    neededAdjustment: number;
    missed: number;
    firstTryAccuracy: number;
    avgRating: number | null;
    retrainingCount: number;
  };
  byService: Record<string, { total: number; nailedIt: number; accuracy: number }>;
  trend: Array<{ week: string; total: number; accuracy: number }>;
  needsRetraining: Array<{
    id: string;
    formulation_id: string | null;
    service_type: string | null;
    outcome: string;
    rating: number | null;
    adjustment_notes: string | null;
    created_at: string | null;
  }>;
}

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function AccuracyPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/accuracy/stats?period=${period}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error('[accuracy] stats load failed', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const s = stats?.summary;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--cg-bg-deep)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>
              Formula{' '}
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Accuracy
              </span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
              How formulas perform in the real world — rated by stylists after every service
            </p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm"
            style={{ color: 'var(--cg-text-primary)' }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mt-20" />
        ) : !s || s.total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="font-medium" style={{ color: 'var(--cg-text-primary)' }}>No accuracy data yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
                Stylists will be prompted to rate formula outcomes after each completed session.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs" style={{ color: 'var(--cg-text-secondary)' }}>First-try accuracy</p>
                  </div>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'var(--cg-text-primary)' }}>
                    {s.firstTryAccuracy}%
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
                    {s.nailedIt} of {s.total} nailed it
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <p className="text-xs" style={{ color: 'var(--cg-text-secondary)' }}>Avg rating</p>
                  </div>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'var(--cg-text-primary)' }}>
                    {s.avgRating != null ? `${s.avgRating}/5` : '—'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
                    stylist ratings
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <p className="text-xs" style={{ color: 'var(--cg-text-secondary)' }}>Needed adjustment</p>
                  </div>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'var(--cg-text-primary)' }}>
                    {s.neededAdjustment}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
                    {s.total > 0 ? Math.round((s.neededAdjustment / s.total) * 100) : 0}% of formulas
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-xs" style={{ color: 'var(--cg-text-secondary)' }}>Need retraining</p>
                  </div>
                  <p className="text-3xl font-bold mt-1" style={{ color: 'var(--cg-text-primary)' }}>
                    {s.retrainingCount}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
                    flagged for review
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Trend */}
            {stats.trend.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Accuracy trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-32">
                    {stats.trend.map((t) => (
                      <div key={t.week} className="flex-1 flex flex-col items-center" title={`${t.week}: ${t.accuracy}% (${t.total})`}>
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${Math.max(t.accuracy, 4)}%`,
                            background: t.accuracy >= 80 ? '#34d399' : t.accuracy >= 60 ? '#fbbf24' : '#f87171',
                            opacity: 0.8,
                          }}
                        />
                        <span className="text-[10px] mt-1 text-white/40">{t.week.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* By service type */}
            {Object.keys(stats.byService).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Accuracy by service type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.byService)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([service, v]) => (
                        <div key={service} className="flex items-center gap-3">
                          <span className="text-sm w-40 truncate" style={{ color: 'var(--cg-text-primary)' }}>
                            {service}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${v.accuracy}%`,
                                background: v.accuracy >= 80 ? '#34d399' : v.accuracy >= 60 ? '#fbbf24' : '#f87171',
                              }}
                            />
                          </div>
                          <span className="text-sm w-24 text-right" style={{ color: 'var(--cg-text-secondary)' }}>
                            {v.accuracy}% ({v.total})
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Retraining queue */}
            {stats.needsRetraining.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Formulas needing retraining review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.needsRetraining.map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/[0.03]">
                        <div>
                          <span className="font-medium">{r.service_type || 'Unspecified service'}</span>
                          {r.adjustment_notes && (
                            <p className="text-xs text-white/40 mt-0.5">{r.adjustment_notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {r.rating != null && (
                            <span className="text-xs text-white/50">{r.rating}/5</span>
                          )}
                          <Badge style={{
                            background: 'rgba(248,113,113,0.12)',
                            color: '#f87171',
                          }}>
                            {r.outcome.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
