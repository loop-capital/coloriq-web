'use client'

// Badge definitions — centralized so badges are consistent everywhere
export const BADGE_CONFIG: Record<string, {
  label: string
  shortLabel: string
  bg: string
  color: string
  border: string
  icon?: string
  description: string
}> = {
  'byondu-educator': {
    label: 'ByondEdu Educator',
    shortLabel: 'EDU',
    bg: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(6,182,212,0.2))',
    color: '#14b8a6',
    border: 'rgba(20,184,166,0.3)',
    icon: '🎓',
    description: 'Verified ByondEdu educator with published courses',
  },
  'founding-pro': {
    label: 'Founding Professional',
    shortLabel: 'FOUNDING',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,179,8,0.2))',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.3)',
    icon: '⭐',
    description: 'Founding beta tester — helped shape ColorIq',
  },
  'coloriq-certified': {
    label: 'ColorIq Certified',
    shortLabel: 'CGC',
    bg: 'linear-gradient(135deg, rgba(147,51,234,0.2), rgba(236,72,153,0.2))',
    color: '#9333EA',
    border: 'rgba(147,51,234,0.3)',
    icon: '✦',
    description: 'Completed ColorIq certification program',
  },
  'verified-colorist': {
    label: 'Verified Colorist',
    shortLabel: '✓',
    bg: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.2))',
    color: '#22c55e',
    border: 'rgba(34,197,94,0.3)',
    description: 'License and experience verified',
  },
}

// Tier badge (creator_tier field)
export const TIER_BADGE: Record<string, {
  label: string
  bg: string
  color: string
  border: string
}> = {
  community: {
    label: 'COMMUNITY',
    bg: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.3)',
    border: 'rgba(255,255,255,0.08)',
  },
  pro: {
    label: 'PRO',
    bg: 'rgba(20,184,166,0.15)',
    color: '#14b8a6',
    border: 'rgba(20,184,166,0.25)',
  },
  elite: {
    label: 'ELITE',
    bg: 'rgba(245,158,11,0.15)',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.25)',
  },
  signature: {
    label: 'SIGNATURE',
    bg: 'rgba(236,72,153,0.15)',
    color: '#EC4899',
    border: 'rgba(236,72,153,0.25)',
  },
}

// Single badge pill
function BadgePill({ badgeId, size = 'sm' }: { badgeId: string; size?: 'sm' | 'md' | 'lg' }) {
  const config = BADGE_CONFIG[badgeId]
  if (!config) return null

  const sizeClasses = {
    sm: 'text-[8px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-1',
    lg: 'text-xs px-2.5 py-1.5',
  }

  return (
    <span
      title={config.description}
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider cursor-default ${sizeClasses[size]}`}
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.icon && <span className="text-[inherit]">{config.icon}</span>}
      {size === 'lg' ? config.label : config.shortLabel}
    </span>
  )
}

// Tier badge pill
function TierBadge({ tier, size = 'sm' }: { tier: string; size?: 'sm' | 'md' }) {
  const config = TIER_BADGE[tier] || TIER_BADGE.community

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-1',
  }

  return (
    <span
      className={`inline-flex items-center rounded font-bold uppercase tracking-wider ${sizeClasses[size]}`}
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  )
}

// Badge row — shows all badges for a user
export function BadgeRow({
  badges = [],
  tier = 'community',
  showTier = true,
  size = 'sm',
}: {
  badges?: string[]
  tier?: string
  showTier?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const hasBadges = badges.length > 0 || showTier
  if (!hasBadges) return null

  return (
    <div className="flex flex-wrap items-center gap-1">
      {showTier && tier && tier !== 'community' && <TierBadge tier={tier} size={size === 'lg' ? 'md' : 'sm'} />}
      {badges.map((badgeId) => (
        <BadgePill key={badgeId} badgeId={badgeId} size={size} />
      ))}
    </div>
  )
}

// Full profile badge card — for profile pages
export function ProfileBadgeCard({
  badges = [],
  byonduProfileUrl,
}: {
  badges?: string[]
  byonduProfileUrl?: string | null
}) {
  if (badges.length === 0) return null

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30 mb-3">Badges & Credentials</p>
      <div className="space-y-2.5">
        {badges.map((badgeId) => {
          const config = BADGE_CONFIG[badgeId]
          if (!config) return null
          return (
            <div key={badgeId} className="flex items-center gap-3">
              <BadgePill badgeId={badgeId} size="md" />
              <p className="text-xs text-white/50">{config.description}</p>
            </div>
          )
        })}
      </div>
      {byonduProfileUrl && badges.includes('byondu-educator') && (
        <a
          href={byonduProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 text-xs text-[#14b8a6] hover:text-[#14b8a6]/80 transition-colors"
        >
          <span>🎓</span>
          View ByondEdu Courses →
        </a>
      )}
    </div>
  )
}

export default BadgeRow
