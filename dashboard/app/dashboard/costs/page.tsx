'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, Users, Scissors } from 'lucide-react';

interface CostSummary {
  avgCostPerService: number;
  totalProductCost: number;
  services: number;
  benchmark: number;
}

interface TrendPoint {
  week: string;
  avgCost: number;
  services: number;
}

interface StylistRow {
  stylistId: string;
  name: string;
  avgCost: number;
  totalCost: number;
  services: number;
}

interface CategoryRow {
  category: string;
  avgCost: number;
  services: number;
}

interface CostStats {
  period: string;
  summary: CostSummary;
  trend: TrendPoint[];
  stylists: StylistRow[];
  categories: CategoryRow[];
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

export default function CostsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/costs/stats?period=${period}`);
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const s = stats?.summary;
  const underBenchmark = s ? s.avgCostPerService <= s.benchmark : true;
  const maxTrend = Math.max(s?.benchmark || 8, ...(stats?.trend.map((t) => t.avgCost) || [0])) * 1.2;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--cg-bg-deep)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>
              Cost <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Analytics</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--cg-text-secondary)' }}>
              Real product cost per service, from weighed grams — not estimates
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
          <p className="text-sm" style={{ color: 'var(--cg-text-secondary)' }}>Loading cost data…</p>
        )}

        {!loading && s && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Avg / service</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: underBenchmark ? '#10B981' : '#EF4444' }}>
                  ${s.avgCostPerService.toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: '#71717A' }}>product cost</p>
              </div>
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Benchmark</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>${s.benchmark.toFixed(2)}</p>
                <p className="text-xs" style={{ color: underBenchmark ? '#10B981' : '#EF4444' }}>
                  {underBenchmark ? '✓ Under target' : '⚠ Over target'}
                </p>
              </div>
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Scissors className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Services</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>{s.services}</p>
                <p className="text-xs" style={{ color: '#71717A' }}>in period</p>
              </div>
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: '#71717A' }}>Total product</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>${s.totalProductCost.toFixed(2)}</p>
                <p className="text-xs" style={{ color: '#71717A' }}>wholesale cost</p>
              </div>
            </div>

            {/* Trend chart with benchmark line */}
            {stats && stats.trend.length > 0 && (
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cg-text-primary)' }}>
                  Avg cost per service by week (dashed line = ${s.benchmark.toFixed(2)} benchmark)
                </h2>
                <div className="relative">
                  <div className="flex items-end gap-1 h-32">
                    {stats.trend.map((t) => (
                      <div key={t.week} className="flex-1 flex flex-col items-center justify-end h-full" title={`${t.week}: $${t.avgCost} (${t.services} services)`}>
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${Math.max(4, (t.avgCost / maxTrend) * 100)}%`,
                            background: t.avgCost <= s.benchmark
                              ? 'linear-gradient(180deg, #10B981, #059669)'
                              : 'linear-gradient(180deg, #EF4444, #DC2626)',
                            opacity: t.services > 0 ? 0.85 : 0.2,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Benchmark line */}
                  <div
                    className="absolute w-full border-t-2 border-dashed"
                    style={{
                      borderColor: '#A855F7',
                      bottom: `${(s.benchmark / maxTrend) * 100}%`,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: '#52525B' }}>{stats.trend[0]?.week}</span>
                  <span className="text-[10px]" style={{ color: '#52525B' }}>{stats.trend[stats.trend.length - 1]?.week}</span>
                </div>
              </div>
            )}

            {/* By service category */}
            {stats && stats.categories.length > 0 && (
              <div className="p-4 rounded-2xl" style={cardStyle}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cg-text-primary)' }}>By service type</h2>
                <div className="space-y-2">
                  {stats.categories.map((c) => (
                    <div key={c.category} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--cg-text-primary)' }}>{c.category}</p>
                        <p className="text-xs" style={{ color: '#71717A' }}>{c.services} services</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: c.avgCost <= s.benchmark ? '#10B981' : '#EF4444' }}>
                        ${c.avgCost.toFixed(2)}
                      </p>
                    </div>
                  ))}
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
                        <p className="text-xs" style={{ color: '#71717A' }}>{row.services} services · ${row.totalCost.toFixed(2)} total</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: row.avgCost <= s.benchmark ? '#10B981' : '#EF4444' }}>
                        ${row.avgCost.toFixed(2)}<span className="text-xs font-normal" style={{ color: '#71717A' }}> /svc</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!stats || stats.summary.services === 0) && (
              <div className="p-8 rounded-2xl text-center" style={cardStyle}>
                <p className="text-sm" style={{ color: 'var(--cg-text-secondary)' }}>
                  No completed color bar sessions in this period yet. Cost data appears automatically as sessions complete.
                  Set product costs in Inventory for accurate numbers.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
