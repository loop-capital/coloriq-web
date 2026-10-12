'use client'

import { useEffect, useState } from 'react'
import { Play, Clock, BookOpen, Award, ExternalLink, GraduationCap, Lightbulb } from 'lucide-react'
import { fetchRelevantContent, ByondEduContent } from '@/lib/byondedu-content'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContextualEducationProps {
  brand: string
  service: string
  shades: string[]
  hairType?: string
  compact?: boolean
}

/* ------------------------------------------------------------------ */
/*  Styles (inline, matching COLORiq dark theme)                   */
/* ------------------------------------------------------------------ */

const sectionCard = {
  marginTop: 24,
  padding: 24,
  borderRadius: 16,
  background: 'rgba(30,30,45,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
}

const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 16,
  fontSize: 16,
  fontWeight: 700,
  color: '#F5F5F7',
}

const shimmer = {
  height: 80,
  borderRadius: 12,
  background:
    'linear-gradient(90deg, rgba(30,30,45,0.6) 25%, #1E1E2D 50%, rgba(30,30,45,0.6) 75%)',
  backgroundSize: '200% 100%',
  animation: 'cg-shimmer 2s ease-in-out infinite',
}

const verifiedBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  background: 'rgba(16,185,129,0.1)',
  color: '#10B981',
  border: '1px solid rgba(16,185,129,0.2)',
}

const typeIcon = {
  'pro-tip': Lightbulb,
  'micro-lesson': Play,
  course: GraduationCap,
} as const

const typeLabel = {
  'pro-tip': 'Pro Tip',
  'micro-lesson': 'Micro-Lesson',
  course: 'Course',
} as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ContextualEducation({
  brand,
  service,
  shades,
  hairType,
  compact = false,
}: ContextualEducationProps) {
  const [items, setItems] = useState<ByondEduContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const data = await fetchRelevantContent({
          brand,
          service,
          shades,
          hairType,
          contentType: compact ? 'pro-tip' : undefined,
          limit: compact ? 2 : 3,
        })
        if (!cancelled) {
          setItems(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [brand, service, shades.join(','), hairType, compact])

  /* Don't render if nothing relevant and not loading */
  if (!loading && !error && items.length === 0) return null

  const headerText = brand
    ? `📚 ${brand} Education`
    : '📚 From the Experts'

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <BookOpen size={18} style={{ color: '#9333EA' }} />
        {headerText}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={shimmer} />
          {!compact && <div style={shimmer} />}
          {!compact && <div style={shimmer} />}
        </div>
      )}

      {/* Content cards */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <ContentCard key={item.id} item={item} compact={compact} />
          ))}
        </div>
      )}

      {/* Footer link */}
      {!loading && items.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <a
            href={`https://byondedu.com/explore?brand=${encodeURIComponent(brand)}&service=${encodeURIComponent(service)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: '#9333EA',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 500,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
          >
            See more on ByondEdu <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ContentCard({
  item,
  compact,
}: {
  item: ByondEduContent
  compact?: boolean
}) {
  const Icon = typeIcon[item.type]

  const cardBase = {
    display: 'flex',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    background: 'rgba(22,22,32,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'border-color 0.2s ease, background 0.2s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
  } as const

  if (compact && item.type === 'pro-tip') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        style={cardBase}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(147,51,234,0.2)'
          e.currentTarget.style.background = 'rgba(22,22,32,0.7)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.background = 'rgba(22,22,32,0.5)'
        }}
      >
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <Icon size={16} style={{ color: '#9333EA' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>
              {typeLabel[item.type]}
            </span>
            {item.brand?.verified && (
              <span style={verifiedBadge}>
                <Award size={10} /> Official {item.brand.name} Education
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F7', margin: '0 0 4px 0' }}>
            {item.title}
          </p>
          <p style={{ fontSize: 12, color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
            {item.text}
          </p>
          <p style={{ fontSize: 11, color: '#71717A', marginTop: 6 }}>
            By {item.creator.name}
          </p>
        </div>
      </a>
    )
  }

  /* Full view — thumbnail + meta for all types */
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={cardBase}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(147,51,234,0.2)'
        e.currentTarget.style.background = 'rgba(22,22,32,0.7)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
        e.currentTarget.style.background = 'rgba(22,22,32,0.5)'
      }}
    >
      {/* Thumbnail */}
      {item.thumbnail ? (
        <div
          style={{
            width: compact ? 64 : 96,
            height: compact ? 48 : 64,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
            background: '#1E1E2D',
            position: 'relative',
          }}
        >
          <img
            src={item.thumbnail}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
          {item.type === 'micro-lesson' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(147,51,234,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={12} fill="white" color="white" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            width: compact ? 64 : 96,
            height: compact ? 48 : 64,
            borderRadius: 8,
            background: 'rgba(147,51,234,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} style={{ color: '#9333EA' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {typeLabel[item.type]}
          </span>
          {item.brand?.verified && (
            <span style={verifiedBadge}>
              <Award size={10} /> Verified
            </span>
          )}
        </div>

        <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7', margin: '0 0 4px 0', lineHeight: 1.4 }}>
          {item.title}
        </p>

        {item.text && !compact && (
          <p style={{ fontSize: 12, color: '#A1A1AA', margin: '0 0 6px 0', lineHeight: 1.5 }}>
            {item.text}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#71717A' }}>
            By {item.creator.name}
          </span>
          {item.duration && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#71717A' }}>
              <Clock size={10} />
              {formatDuration(item.duration)}
            </span>
          )}
        </div>
      </div>

      {/* Arrow for courses */}
      {item.type === 'course' && (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#9333EA',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View Course <ExternalLink size={12} />
          </span>
        </div>
      )}
    </a>
  )
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}h ${rm}m`
  }
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}
