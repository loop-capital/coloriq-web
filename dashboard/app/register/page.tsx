'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X } from 'lucide-react';
import { setStoredAuthToken } from '@/lib/cookie-keys';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0A0A0F' }} />}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handle, setHandle] = useState('');
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: form.get('handle'),
          email: form.get('email'),
          password: form.get('password'),
          display_name: form.get('display_name'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) setStoredAuthToken(data.token);
        setStep(2); // Move to profile setup
      } else {
        setError(data.error?.message || 'Registration failed');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram: form.get('instagram'),
          bio: form.get('bio'),
          salon: form.get('salon'),
          location: form.get('location'),
          specialties: (form.get('specialties') as string)?.split(',').map(s => s.trim()).filter(Boolean) || [],
          years_experience: parseInt(form.get('years_experience') as string) || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard');
      }
    } catch {
      setError('Failed to save profile');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(180deg, #0A0A1A 0%, #12111F 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="text-white font-black text-2xl tracking-tight">COLORiq</div>
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-1">Create Your Account</h1>
            <p className="text-sm text-center mb-8" style={{ color: '#71717A' }}>Join the ColorIq professional community</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Display Name</label>
                <input name="display_name" type="text" required placeholder="Tiche Opland"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Handle</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#71717A' }}>@</span>
                  <input name="handle" type="text" required minLength={3} maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    placeholder="tichehair"
                    value={handle}
                    onChange={(e) => { setHandle(e.target.value); setHandleAvailable(null); }}
                    className="w-full pl-8 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  {handleAvailable === true && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#10B981]" />}
                  {handleAvailable === false && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EF4444]" />}
                </div>
                <p className="text-[10px] mt-1" style={{ color: '#71717A' }}>This is your public profile URL: getCOLORiq.co/@handle</p>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Email</label>
                <input name="email" type="email" required placeholder="you@salon.com"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <p className="text-[10px] mt-1" style={{ color: '#71717A' }}>Private — never shown publicly</p>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Password</label>
                <input name="password" type="password" required minLength={8} placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: '#fff' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: '#71717A' }}>
              Already have an account? <a href="/login" className="text-[#9333EA] hover:underline">Sign in</a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-1">Complete Your Profile</h1>
            <p className="text-sm text-center mb-8" style={{ color: '#71717A' }}>Help clients and other stylists find you</p>

            <form onSubmit={handleProfile} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Instagram Handle</label>
                <input name="instagram" type="text" placeholder="@tichehair"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Salon Name</label>
                <input name="salon" type="text" placeholder="Pleij Salon"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Location</label>
                <input name="location" type="text" placeholder="Columbus, OH"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Bio</label>
                <textarea name="bio" rows={3} maxLength={500} placeholder="Tell clients about your specialty..."
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Specialties</label>
                <input name="specialties" type="text" placeholder="Balayage, Color Correction, Vivids"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <p className="text-[10px] mt-1" style={{ color: '#71717A' }}>Comma-separated</p>
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#A1A1AA' }}>Years of Experience</label>
                <input name="years_experience" type="number" min={0} max={60} placeholder="15"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>

              {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: '#fff' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save & Continue'}
              </button>

              <button type="button" onClick={() => router.push('/dashboard')}
                className="w-full py-2 rounded-xl text-sm transition-colors hover:bg-white/5"
                style={{ color: '#71717A' }}>
                Skip for now
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
