'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, Sparkles, Droplets, ShieldCheck, ExternalLink,
  ChevronRight, AlertCircle, Palette, Heart, Share2, BookOpen
} from 'lucide-react'

interface PortalData {
  client: {
    name: string
    firstName: string
    totalVisits: number
    lastVisit: string | null
    nextAppointment: string | null
    memberSince: string
  }
  stylist: {
    name: string
    handle: string | null
    avatar: string | null
  } | null
  hairProfile: any
  conditions: string[]
  privacy: string
  photos: Array<{
    id: string
    beforeUrl: string | null
    afterUrl: string
    caption: string | null
    date: string
    levelBefore: number | null
    levelAfter: number | null
    toneBefore: string | null
    toneAfter: string | null
    developer: number | null
    processingTime: number | null
    formula: { name: string; brand: string; line: string } | null
  }>
  visits: Array<{
    id: string
    date: string
    serviceType: string | null
    notes: string | null
  }>
}

// Auto-generate maintenance tips based on formula and hair profile
function getMaintenanceTips(data: PortalData): string[] {
  const tips: string[] = []
  const profile = data.hairProfile as any
  const latestPhoto = data.photos[0]

  // Based on level
  if (latestPhoto?.levelAfter && latestPhoto.levelAfter >= 8) {
    tips.push('Use a purple shampoo once a week to maintain brightness and neutralize yellow tones.')
    tips.push('Avoid hot water when washing — lukewarm preserves color molecules longer.')
  }

  // Based on porosity
  if (profile?.porosity === 'high') {
    tips.push('Your hair is high porosity — use a deep conditioner weekly to seal moisture in.')
    tips.push('Apply a leave-in conditioner before heat styling to prevent further damage.')
  } else if (profile?.porosity === 'low') {
    tips.push('Low porosity hair benefits from lightweight, water-based products that won\'t sit on the surface.')
  }

  // Based on tone
  if (latestPhoto?.toneAfter === 'A' || latestPhoto?.toneAfter === 'V') {
    tips.push('Cool tones fade faster — avoid clarifying shampoos and use color-safe formulas only.')
  }

  // Based on conditions
  if (data.conditions?.includes('damaged') || data.conditions?.includes('dry_brittle')) {
    tips.push('Limit heat styling and always use a heat protectant spray.')
    tips.push('Consider a bond-building treatment like Olaplex No.3 between services.')
  }

  // General
  tips.push('Schedule your next appointment before color fade becomes noticeable — your stylist can recommend the ideal interval.')

  return tips
}

export default function ClientPortalPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/v1/portal/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('Portal not found')
        return r.json()
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#9333EA] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-sm">Loading your color history...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="text-center p-8">
          <AlertCircle size={48} className="mx-auto mb-4 text-white/20" />
          <h2 className="text-lg font-semibold text-white mb-2">Portal Not Found</h2>
          <p className="text-sm text-white/40">This link may have expired or been disabled. Contact your stylist for a new link.</p>
        </div>
      </div>
    )
  }

  const tips = getMaintenanceTips(data)

  return (
    <div className="min-h-screen pb-12" style={{ background: '#0A0A0F', backgroundImage: 'linear-gradient(180deg, #0A0A0F 0%, #12101F 100%)' }}>
      {/* Hero */}
      <div className="relative">
        {/* Latest transformation */}
        {data.photos.length > 0 && data.photos[0].afterUrl && (
          <div className="relative w-full h-64 md:h-80 overflow-hidden">
            <img
              src={data.photos[0].afterUrl}
              alt="Your latest color"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/40 to-transparent" />
          </div>
        )}

        {/* Client greeting */}
        <div className="relative px-5 md:px-8 -mt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              Hey {data.client.firstName}! ✨
            </h1>
            <p className="text-sm text-white/50">Here's your color journey</p>
          </motion.div>
        </div>
      </div>

      <div className="px-5 md:px-8 mt-6 space-y-6 max-w-2xl mx-auto">
        {/* Stylist Card */}
        {data.stylist && (
          <motion.div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.15)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9333EA] to-[#EC4899] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {data.stylist.avatar ? (
                <img src={data.stylist.avatar} alt={data.stylist.name} className="w-full h-full object-cover" />
              ) : (
                data.stylist.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{data.stylist.name}</p>
              {data.stylist.handle && (
                <p className="text-xs text-[#EC4899]">@{data.stylist.handle}</p>
              )}
              <p className="text-[10px] text-white/30 mt-0.5">Your colorist · {data.client.totalVisits} visits</p>
            </div>
            <button
              onClick={() => window.open(`https://instagram.com/${data.stylist?.handle}`, '_blank')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Follow
            </button>
          </motion.div>
        )}

        {/* Next Appointment */}
        {data.client.nextAppointment && (
          <motion.div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.15)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center">
              <Calendar size={18} className="text-[#14b8a6]" />
            </div>
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider font-semibold">Next Appointment</p>
              <p className="text-sm font-semibold text-white">
                {new Date(data.client.nextAppointment).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </motion.div>
        )}

        {/* Color History */}
        {data.photos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xs uppercase tracking-wider font-semibold text-white/30 mb-3">Color History</h2>
            <div className="space-y-3">
              {data.photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {/* Before/After photos */}
                  <div className="grid grid-cols-2 gap-0.5">
                    {photo.beforeUrl && (
                      <div className="relative aspect-square">
                        <img src={photo.beforeUrl} alt="Before" className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white/80">Before</span>
                      </div>
                    )}
                    {photo.afterUrl && (
                      <div className="relative aspect-square">
                        <img src={photo.afterUrl} alt="After" className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white/90" style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)' }}>After</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/30">
                        {new Date(photo.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      {photo.formula && (
                        <span className="text-[10px] text-[#9333EA] font-medium">{photo.formula.brand}</span>
                      )}
                    </div>

                    {/* Formula card */}
                    {photo.formula && (
                      <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.1)' }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Palette size={10} className="text-[#9333EA]" />
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-[#9333EA]/60">Formula</span>
                        </div>
                        <p className="text-xs text-white/70 font-medium">{photo.formula.name}</p>
                        <p className="text-[10px] text-white/30">{photo.formula.brand} · {photo.formula.line}</p>
                      </div>
                    )}

                    {/* Level/Tone change */}
                    {(photo.levelBefore || photo.levelAfter) && (
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>Level {photo.levelBefore || '?'} → {photo.levelAfter || '?'}</span>
                        {photo.toneAfter && <span className="text-[#9333EA]">{photo.toneAfter}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Maintenance Tips */}
        {tips.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-xs uppercase tracking-wider font-semibold text-white/30 mb-3">Care Tips for Your Color</h2>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Droplets size={14} className="text-[#14b8a6] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/60 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Products Used (placeholder for future affiliate layer) */}
        <motion.div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={12} className="text-[#F59E0B]" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-white/30">Recommended Products</h2>
          </div>
          <p className="text-xs text-white/20 italic">Your stylist hasn't added product recommendations yet. Check back soon!</p>
        </motion.div>

        {/* Footer */}
        <div className="text-center pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)' }}>
              <Sparkles size={12} color="#0A0A0F" />
            </div>
            <span className="text-xs font-bold text-white/40">ColorIq</span>
          </div>
          <p className="text-[10px] text-white/15">Powered by AI color science</p>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'My Color Journey', url: window.location.href })
              }
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/30 border border-white/6 hover:bg-white/5 transition-colors"
          >
            <Share2 size={12} />
            Share My Color History
          </button>
        </div>
      </div>
    </div>
  )
}
