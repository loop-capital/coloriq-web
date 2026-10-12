'use client';

export default function BetaPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0A0A1A', color: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Join the Beta</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 32, lineHeight: 1.5 }}>Sign up and we'll notify you as soon as spots open. Beta testers get a permanent discount on all plans.</p>
        <form action="https://formspree.io/f/xkoenolr" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input type="text" name="name" placeholder="Your name" required
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none' }}
            />
            <input type="text" name="salon" placeholder="Your salon"
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none' }}
            />
          </div>
          <input type="email" name="email" placeholder="you@salon.com" required
            style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none' }}
          />
          <input type="text" name="instagram" placeholder="@yourinstagram"
            style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none' }}
          />
          <input type="text" name="brands_used" placeholder="Color brands you currently use"
            style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none' }}
          />
          <input type="text" name="brands_to_explore" placeholder="Color brands you'd like to explore"
            style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none' }}
          />
          <input type="hidden" name="source" value="beta-landing-page" />
          <button type="submit" style={{ padding: '14px 24px', width: '100%', background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: 'white', border: 'none', borderRadius: 999, fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }}>
            Join the Beta
          </button>
        </form>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 12, textAlign: 'center' }}>No spam. Unsubscribe anytime.</p>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a href="/" style={{ color: '#9333EA', fontSize: 14, textDecoration: 'none' }}>← Back to ColorIq</a>
        </div>
      </div>
    </main>
  );
}
