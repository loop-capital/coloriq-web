'use client'

import { motion } from 'framer-motion'
import { Camera, Target, Sparkles, CheckCircle, Shield, ClipboardList, Palette, BarChart3, FlaskConical, ChartNoAxesColumn, Package, DollarSign, Scale, History, ArrowRight, Mail } from 'lucide-react'
import ColorMatchHero from '@/components/color-match-hero'

export default function LandingPage() {
  const btnPrimary = { padding: '12px 24px', background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: 'white', border: 'none', borderRadius: 999, fontWeight: 'bold' as const, cursor: 'pointer' as const, fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A1A', color: '#F5F5F7', overflow: 'hidden' }}>
      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,10,26,0.8)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>COLORiq</span>
          </div>
          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
            <a href="#how-it-works" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>How it Works</a>
            <a href="#color-match" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>Color Match</a>
            <a href="#features" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>Features</a>
            <a href="#tools" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>Color Tools</a>
            <a href="#pricing" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>Pricing</a>
          </div>
          <a href="/login" style={{ ...btnPrimary, padding: '8px 20px', fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign In</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 0' }}>
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'rgba(147,51,234,0.15)', filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 800 }}>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 24 }}>
            Stop Guessing.<br /><span style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Start Formulating.</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.5)', maxWidth: 600, margin: '0 auto 20px', lineHeight: 1.6 }}>
            AI-powered hair color formulation that analyzes your client's hair and delivers a precise formula — shades, developer, ratios, and processing time — in seconds.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(147,51,234,0.3)', background: 'rgba(147,51,234,0.1)', color: '#9333EA', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 999, marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
            3,273 professional shades · 21 color brands · 90%+ formulation accuracy
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            <a href="/beta" style={{ ...btnPrimary, padding: '16px 32px', boxShadow: '0 0 40px rgba(147,51,234,0.2)', textDecoration: 'none' }}>Join the Beta <ArrowRight size={18} /></a>
            <a href="#how-it-works" style={{ ...btnPrimary, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>See How It Works</a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '128px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p style={{ color: '#9333EA', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Simple by Design</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>Six steps. Zero guesswork.</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, maxWidth: 500, margin: '0 auto' }}>From photo to professional formula.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: <Camera size={22} />, title: 'Photo', desc: 'Capture or upload hair photo', step: '01' },
              { icon: <ClipboardList size={22} />, title: 'Hair Assessment', desc: 'Texture, density, level & tone', step: '02' },
              { icon: <FlaskConical size={22} />, title: 'Chemical History', desc: 'Past treatments & sensitivities', step: '03' },
              { icon: <Target size={22} />, title: 'Target Look', desc: 'Desired color across your brands', step: '04' },
              { icon: <ChartNoAxesColumn size={22} />, title: 'Condition', desc: 'Hair health & problem flags', step: '05' },
              { icon: <CheckCircle size={22} />, title: 'Your Formula', desc: 'Ratios, developer, timing & AI score', step: '06' },
            ].map((s, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(236,72,153,0.15))', border: '1px solid rgba(147,51,234,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>{s.icon}</div>
                  <span style={{ fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.03)' }}>{s.step}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Color Match Feature */}
      <ColorMatchHero />

      <section id="tools" style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p style={{ color: '#9333EA', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Color Management Suite</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>Everything you need at the bowl</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>Formulation is just the start. ColorIq is a complete color management platform for professional salons.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { icon: <History size={22} />, title: 'Formula History & Timeline', desc: 'Every formula saved to client profile. Track what worked, revisit past colors, and rebook with one tap. Complete service timeline per client.' },
              { icon: <DollarSign size={22} />, title: 'Cost Calculator & Pricing', desc: 'Real-time cost per service based on product usage. Set pricing rules, track margins, and ensure every service is profitable.' },
              { icon: <Scale size={22} />, title: 'Bluetooth Scale Integration', desc: 'Acaia precision scales (0.1g accuracy) for exact gram measurements. Auto-capture weight at the bowl for accurate cost tracking.' },
              { icon: <Package size={22} />, title: 'Inventory Management', desc: 'Track color stock levels, set reorder alerts, and auto-deduct usage per service. Never run out of a shade mid-appointment.' },
              { icon: <BarChart3 size={22} />, title: 'Salon Analytics', desc: 'Color service revenue, most popular shades, product usage trends, and stylist performance — all in one dashboard.' },
              { icon: <Shield size={22} />, title: 'Client Safety Flags', desc: 'Automatic alerts for metallic dye, henna, previous chemical treatments, and allergies. Safety checks before every formulation.' },
              { icon: <Package size={22} />, title: 'Formula Marketplace', desc: 'Browse and purchase verified formulas from top stylists. Every formula includes before/after photos, client hair profile, and step-by-step instructions. Pay per use, from $2.99 — creators earn 70% on every use.' },
              { icon: <DollarSign size={22} />, title: 'Sell Your Formulas', desc: 'Monetize your expertise. Upload your signature formulas with photos and instructions. Set your price and earn every time another stylist purchases your creation.' },
              { icon: <ClipboardList size={22} />, title: 'Community Feed', desc: 'Share your best work, get feedback from fellow stylists, and discover trending techniques. Build a following and establish yourself as a color authority.' },
              { icon: <Palette size={22} />, title: 'Color Management System', desc: 'Centralized color catalog across all brands. Create custom shade palettes, organize by client preference, and streamline your color selection workflow.' },
            ].map((f, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section id="features" style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p style={{ color: '#9333EA', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>AI-Powered</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>The science behind the color</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { icon: <Sparkles size={22} />, title: 'AI Photo Analysis', desc: 'See what the eye sometimes misses. Our AI detects hair level, tone, porosity, and condition from a single photo. Flags safety concerns before they become problems.' },
              { icon: <Palette size={22} />, title: 'Precision Formulation', desc: 'The right formula, every time. Calculates exact shade mix, developer volume, and processing time based on 10+ variables — including your client\'s unique hair history.' },
              { icon: <BarChart3 size={22} />, title: 'Result Scoring & Learning', desc: 'Every formulation makes the next one better. Our AI compares before and after photos, scoring color accuracy, condition, and evenness.' },
              { icon: <ClipboardList size={22} />, title: 'Smart Questionnaire', desc: 'Covers treatment history, allergies, texture, and desired outcomes. The AI uses every answer to refine its recommendation and flag potential reactions.' },
            ].map((f, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, rgba(147,51,234,0.12), rgba(236,72,153,0.12))', border: '1px solid rgba(147,51,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC4899', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community & Marketplace */}
      <section id="community" style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p style={{ color: '#9333EA', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Community</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>Share, discover, and sell formulas</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>Connect with stylists worldwide. Buy proven formulas, sell your signature mixes, and build your brand.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {[
              { icon: <Package size={22} />, title: 'Formula Marketplace', desc: 'Browse and purchase verified formulas from top stylists. Every formula includes before/after photos, client hair profile, and step-by-step instructions. Pay per use, from $2.99 — creators earn 70% on every use.' },
              { icon: <DollarSign size={22} />, title: 'Sell Your Formulas', desc: 'Monetize your expertise. Upload your signature formulas with photos and instructions. Set your price and earn every time another stylist purchases your creation.' },
              { icon: <ClipboardList size={22} />, title: 'Community Feed', desc: 'Share your best work, get feedback from fellow stylists, and discover trending techniques. Build a following and establish yourself as a color authority.' },
              { icon: <Shield size={22} />, title: 'Verified Reviews', desc: 'Every purchased formula can be reviewed by the buyer. Build trust with verified ratings and detailed feedback on formula accuracy and results.' },
            ].map((f, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, rgba(147,51,234,0.12), rgba(236,72,153,0.12))', border: '1px solid rgba(147,51,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC4899', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#9333EA', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Simple Pricing</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>Choose Your Plan</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>Professional color management that pays for itself. Start free, upgrade when you're ready.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { name: 'Starter', price: '$29', period: '/mo', desc: '1 brand', features: ['Unlimited formulations', '1 color brand', 'AI learning system', 'Client history'], highlight: false },
              { name: 'Salon', price: '$49', period: '/mo', desc: '3 brands', features: ['3 color brands', 'Color Management System', 'Advanced AI', 'Priority support'], highlight: true },
              { name: 'Pro', price: '$79', period: '/mo', desc: '5 brands', features: ['5 color brands', 'Inventory tracking', 'Scale integration', 'Client management'], highlight: false },
              { name: 'Elite', price: '$119', period: '/mo', desc: 'Unlimited brands', features: ['Unlimited brands', 'Full inventory', 'Custom reporting', 'API access'], highlight: false },
            ].map((t, i) => (
              <div key={i} style={{ position: 'relative', border: t.highlight ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.08)', background: t.highlight ? 'rgba(147,51,234,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24 }}>
                {t.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: 'white', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase' }}>Popular</div>}
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</h3>
                <p style={{ fontSize: 32, fontWeight: 900, marginTop: 12 }}>{t.price}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>{t.period}</span></p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{t.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {t.features.map((f, j) => <li key={j} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}><span style={{ color: '#9333EA', marginRight: 6 }}>✓</span>{f}</li>)}
                </ul>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>After beta · Beta testers get permanent discount</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Color Match */}
      <section id="color-match" style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <ColorMatchHero />
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 28, color: 'white', margin: '0 auto 32px', letterSpacing: '-0.02em' }}>COLORiq</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>Your next great formulation starts here.</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, marginBottom: 40 }}>Join 50 founding stylists shaping the future of professional hair color. Free during beta. No credit card required.</p>
          <a href="/beta" style={{ ...btnPrimary, padding: '16px 40px', boxShadow: '0 0 40px rgba(147,51,234,0.2)', textDecoration: 'none' }}>Join the Beta <ArrowRight size={18} /></a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>ColorIq · AI Hair Color Formulation for Professionals</span>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>© 2026 ColorIq Inc.</p>
        </div>
      </footer>
    </main>
  )
}
