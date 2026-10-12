'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Unlink, ArrowRight } from 'lucide-react';

interface CloverStatus {
  connected: boolean;
  merchant_name?: string;
  merchant_id?: string;
  connect_url?: string;
}

export default function CloverCard() {
  const [status, setStatus] = useState<CloverStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clover/status', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch {
      setError('Failed to check Clover status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function handleDisconnect() {
    if (!confirm('Disconnect Clover? Color Bar charges will stop pushing to Clover orders.')) return;
    try {
      const res = await fetch('/api/clover/status', { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { setStatus(null); fetchStatus(); }
      else setError(data.error?.message || 'Disconnect failed');
    } catch {
      setError('Disconnect failed');
    }
  }

  return (
    <div className="rounded-2xl p-6 mb-6" style={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: '#00A650', color: '#fff' }}>Cl</div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: '#F5F5F7' }}>Clover</h2>
            <p className="text-xs" style={{ color: '#71717A' }}>POS &amp; payments</p>
          </div>
        </div>
        {loading ? null : status?.connected ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
            <span className="text-xs font-medium" style={{ color: '#10B981' }}>Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <XCircle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
            <span className="text-xs font-medium" style={{ color: '#EF4444' }}>Not Connected</span>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{error}</div>}

      {loading ? (
        <p className="text-sm" style={{ color: '#71717A' }}>Loading...</p>
      ) : status?.connected ? (
        <div>
          <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#71717A' }}>Merchant</p>
            <p className="text-sm font-medium" style={{ color: '#F5F5F7' }}>{status.merchant_name}</p>
          </div>
          <button onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
            style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Unlink className="w-3.5 h-3.5" /> Disconnect
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm mb-4" style={{ color: '#A1A1AA' }}>
            Connect Clover to push Color Bar formula charges directly onto a new order in your register.
          </p>
          <a href={status?.connect_url || '#'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#00A650', color: '#fff' }}>
            Connect Clover <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-[10px] mt-3" style={{ color: '#71717A' }}>You&apos;ll be redirected to Clover to authorize COLORiq.</p>
        </div>
      )}
    </div>
  );
}
