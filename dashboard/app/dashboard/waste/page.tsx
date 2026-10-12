'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, TrendingDown, AlertTriangle, Award } from 'lucide-react';

interface WasteSummary {
  totalWasteGrams: number;
  totalWasteCost: number;
  wastePct: number;
  benchmarkPct: number;
  sessions: number;
}

interface TrendPoint {
  week: string;
  wastePct: number;
  wasteGrams: number;
}

interface StylistRow {
  stylistId: string;
  name: string;
  wasteGrams: number;
  wasteCost: number;
  sessions: number;
  avgWastePerSession: number;
}

interface ProductRow {
  brand: string;
  shadeCode: string;
  wasteGrams: number;
  wasteCost: number;
}

interface WasteStats {
  period: string;
  summary: WasteSummary;
  trend: TrendPoint[];
  stylists: StylistRow[];
  topProducts: ProductRow[];
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

export default function WastePage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/waste/stats?period=${period}`);
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const s = stats?.summary;
  const underBenchmark = s ? s.wastePct <= s.benchmarkPct : true;
  const maxTrend = Math.max(10, ...(stats?.trend.map((t) => t.wastePct) || [0]));

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--cg-bg-deep)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>
              Waste <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Analytics</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
              Product mixed but never applied — the money left in the bowl
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={cardStyle}>
            {(['week', 'month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                style={{
                  background: period === p ? 'rgba(147,51,234,0.2)' : 'transparent',
                  color: period === p ? '#A855F7' : '#71717A',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-sm" style={{ color: 'var(--cg-text-secondary)' }}>Loading waste data…</p>
        )}

        {!loading && s && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Trash2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Waste</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>{s.totalWasteGrams}g</p>
                <p className="text-xs" style={{ color: '#71717A' }}>${s.totalWasteCost.toFixed(2)} in product</p>
              </div>
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Waste %</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: underBenchmark ? '#10B981' : '#EF4444' }}>{s.wastePct}%</p>
                <p className="text-xs" style={{ color: '#71717A' }}>of product mixed</p>
              </div>
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Award className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Benchmark</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>{s.benchmarkPct}%</p>
                <p className="text-xs" style={{ color: underBenchmark ? '#10B981' : '#EF4444' }}>
                  {underBenchmark ? '✓ Under target' : '⚠ Over target'}
                </p>
              </div>
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Sessions</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>{s.sessions}</p>
                <p className="text-xs" style={{ color: '#71717A' }}>in period</p>
              </div>
            </div>

            {/* Trend chart */}
            {stats && stats.trend.length > 0 && (
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cg-text-primary)' }}>
                  Waste % by week (last 12 weeks)
                </h2>
                <div className="flex items-end gap-1 h-32">
                  {stats.trend.map((t) => (
                    <div key={t.week} className="flex-1 flex flex-col items-center justify-end h-full" title={`${t.week}: ${t.wastePct}%`}>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.max(4, (t.wastePct / maxTrend) * 100)}%`,
                          background: t.wastePct <= 10
                            ? 'linear-gradient(180deg, #10B981, #059669)'
                            : 'linear-gradient(180deg, #EF4444, #DC2626)',
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: '#52525B' }}>{stats.trend[0]?.week}</span>
                  <span className="text-[10px]" style={{ color: '#52525B' }}>{stats.trend[stats.trend.length - 1]?.week}</span>
                </div>
              </div>
            )}

            {/* Per-stylist table */}
            {stats && stats.stylists.length > 0 && (
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cg-text-primary)' }}>By stylist</h2>
                <div className="space-y-2">
                  {stats.stylists.map((row) => (
                    <div key={row.stylistId} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--cg-text-primary)' }}>{row.name}</p>
                        <p className="text-xs" style={{ color: '#71717A' }}>{row.sessions} sessions · {row.avgWastePerSession}g avg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: 'var(--cg-text-primary)' }}>{row.wasteGrams}g</p>
                        <p className="text-xs" style={{ color: '#71717A' }}>${row.wasteCost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top wasted products */}
            {stats && stats.topProducts.length > 0 && (
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cg-text-primary)' }}>Most wasted products</h2>
                <div className="space-y-2">
                  {stats.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--cg-text-primary)' }}>{p.shadeCode}</p>
                        <p className="text-xs" style={{ color: '#71717A' }}>{p.brand}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: 'var(--cg-text-primary)' }}>{p.wasteGrams}g</p>
                        <p className="text-xs" style={{ color: '#71717A' }}>${p.wasteCost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!stats || stats.summary.sessions === 0) && (
              <div className="p-8 rounded-2xl text-center" style={cardStyle}>
                <p className="text-sm" style={{ color: 'var(--cg-text-secondary)' }}>
                  No completed color bar sessions in this period yet. Waste data appears automatically as sessions complete.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
