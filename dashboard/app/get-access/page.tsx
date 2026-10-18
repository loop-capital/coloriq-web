import Link from 'next/link';

export const metadata = {
  title: 'Get Access — COLORiq',
  description: 'COLORiq is available by subscription. Get access for your salon.',
};

const TIERS = [
  { name: 'Solo', base: '$30', full: '$50', detail: '1 stylist · 1 scale' },
  { name: 'Team', base: '$60', full: '$100', detail: 'Up to 2 stylists · 1 scale' },
  { name: '5', base: '$90', full: '$215', detail: 'Up to 5 stylists · 1 scale' },
  { name: '10', base: '$150', full: '$249', detail: 'Up to 10 stylists · multiple scales' },
  { name: '20', base: '$200', full: '$299', detail: 'Up to 20 stylists · multiple scales' },
];

export default function GetAccessPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Get access to COLORiq</h1>
      <p style={{ fontSize: 17, color: '#444', marginBottom: 32 }}>
        COLORiq is available by subscription — there is no free tier. Pick the size
        that fits your salon. Base is the AI formulation engine; Full adds the
        complete color-management operations stack.
      </p>

      <div style={{ display: 'grid', gap: 12, marginBottom: 40 }}>
        {TIERS.map((t) => (
          <div
            key={t.name}
            style={{
              border: '1px solid #e2e2e2',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{t.name}</div>
              <div style={{ color: '#666', fontSize: 14 }}>{t.detail}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                Base <strong style={{ color: '#111' }}>{t.base}</strong>/mo
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>
                Full <strong style={{ color: '#111' }}>{t.full}</strong>/mo
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 15, color: '#444', marginBottom: 24 }}>
        Every tier includes color lines (2 for Solo/Team, 3 at 5 and 10, 5 at 20) —
        additional lines are $5/month. The formula marketplace is built in:
        creators earn 70% of every use.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link
          href="/register"
          style={{
            background: '#111',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Subscribe
        </Link>
        <Link
          href="/"
          style={{
            border: '1px solid #111',
            color: '#111',
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Back to home
        </Link>
      </div>

      <p style={{ fontSize: 14, color: '#666', marginTop: 32 }}>
        Salon owner? We&apos;re onboarding founding salons now — early partners who
        shape what COLORiq becomes. Mention it when you subscribe and we&apos;ll talk.
      </p>
    </main>
  );
}
