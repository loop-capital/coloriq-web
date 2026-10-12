'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ContactMask } from '@/components/ui/contact-mask'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FlaskConical,
  Camera,
  User,
  Heart,
  ClipboardList,
  Edit3,
  ExternalLink,
  ImageIcon,
  Zap,
  TrendingUp,
  DollarSign,
  Star,
} from 'lucide-react'
import { PatchTestSection } from '@/components/custom/patch-test-section'
import { AllergySection } from '@/components/custom/allergy-section'
import { AllergyAlert } from '@/components/custom/allergy-alert'

interface Client {
  id: string
  salonId?: string
  name: string
  email?: string
  phone?: string
  notes?: string
  createdAt: string
  lastVisit?: string
  favoriteBrand?: string
  conditions?: Array<{
    type: string
    porosity: string
    grayPercent: number
    date: string
  }>
}

interface FormulaEntry {
  id: string
  clientId?: string
  clientName?: string
  name: string
  createdAt: string
  tags?: string[]
  formulation: {
    brand: string
    line: string
    developerVolume: number
    processingTime: number
    application: string
    coverage: string
    steps: Array<{
      productId?: string
      productName?: string
      shadeCode?: string
      grams: number
      role: string
      notes?: string
    }>
    notes: string[]
    warnings: string[]
  }
}

export default function ClientDetailPage() {
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  // Toast notifications disabled

  const [client, setClient] = useState<Client | null>(null)
  const [formulas, setFormulas] = useState<FormulaEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(`cg-fav-formulas-${clientId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  const toggleFavorite = (formulaId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(formulaId)) next.delete(formulaId)
      else next.add(formulaId)
      localStorage.setItem(`cg-fav-formulas-${clientId}`, JSON.stringify([...next]))
      return next
    })
  }

  useEffect(() => {
    if (!clientId) return
    loadClient()
  }, [clientId])

  const [safetyFlags, setSafetyFlags] = useState<{ allergies: any[]; legacyFlags: string[] }>({ allergies: [], legacyFlags: [] })

  const loadSafety = async (id: string) => {
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`/api/v1/clients/${id}/allergies`),
        fetch(`/api/v1/clients/${id}/patch-tests`),
      ])
      const aData = aRes.ok ? await aRes.json() : { allergies: [], legacyFlags: [] }
      const pData = pRes.ok ? await pRes.json() : { status: 'never_tested' }
      const failedTest = pData.status === 'failed'
      setSafetyFlags({
        allergies: [
          ...(aData.allergies || []),
          ...(failedTest ? [{ allergen: 'Failed patch test - do not apply oxidative color', severity: 'severe' }] : []),
        ],
        legacyFlags: aData.legacyFlags || [],
      })
    } catch {
      // safety data is best-effort; never block the client page
    }
  }

  const loadClient = async () => {
    setLoading(true)
    try {
      // Fetch client
      const res = await fetch(`/api/clients?id=${clientId}`)
      if (!res.ok) throw new Error('Failed to load client')
      const data = await res.json()
      setClient(data.client || null)

      loadSafety(clientId)

      // Fetch formulas for this client
      const formulaRes = await fetch(`/api/formulas?clientId=${clientId}`)
      if (formulaRes.ok) {
        const fData = await formulaRes.json()
        setFormulas(fData.formulas || [])
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to load client', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cg-deep)] text-white p-4 min-w-[768px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cg-accent)] mx-auto mt-20" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[var(--cg-deep)] text-white p-4 min-w-[768px]">
        <div className="max-w-4xl mx-auto text-center py-20">
          <User className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Client not found</h2>
          <p className="text-white/50 mb-6">This client may have been deleted or does not exist.</p>
          <Link href="/clients">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const initials = client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const latestCondition = client.conditions?.[client.conditions.length - 1]

  return (
    <div className="min-h-screen bg-[var(--cg-deep)] text-white p-4 min-w-[768px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Client Profile</h1>
        </div>
        <div className="flex gap-2">
          <Button
            
            onClick={() => router.push(`/questionnaire?clientId=${clientId}`)}
          >
            <ClipboardList className="mr-2 h-4 w-4" /> New Consultation
          </Button>
          <Button
            
            onClick={() => router.push(`/formulate?clientId=${clientId}`)}
          >
            <FlaskConical className="mr-2 h-4 w-4" /> Quick Formulate
          </Button>
          <Button
            
            onClick={() => router.push(`/service?clientId=${clientId}`)}
            className="!bg-gradient-to-r from-purple-600 to-pink-600 !text-white"
          >
            <Zap className="mr-2 h-4 w-4" /> New Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="card-glass">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--cg-accent)] to-[var(--cg-accent2)] flex items-center justify-center text-2xl font-bold mb-4">
                  {initials}
                </div>
                <h2 className="text-xl font-bold">{client.name}</h2>

                {client.favoriteBrand && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Heart className="h-3.5 w-3.5 text-[var(--cg-accent2)]" />
                    <span className="text-sm text-white/60">Prefers {client.favoriteBrand}</span>
                  </div>
                )}

                <div className="w-full mt-6 space-y-3 text-left">
                  {client.email && client.salonId && (
                    <ContactMask value={client.email} type="email" label="Email" salonId={client.salonId} />
                  )}
                  {client.phone && client.salonId && (
                    <ContactMask value={client.phone} type="phone" label="Phone" salonId={client.salonId} />
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-white/40 shrink-0" />
                    <span className="text-sm text-white/80">
                      Client since {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {client.lastVisit && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-white/40 shrink-0" />
                      <span className="text-sm text-white/80">
                        Last visit {new Date(client.lastVisit).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className="w-full mt-5 pt-4 border-t border-white/10">
                    <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}

                {latestCondition && (
                  <div className="w-full mt-5 pt-4 border-t border-white/10">
                    <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Latest Hair State</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{latestCondition.type.replace(/_/g, ' ')}</Badge>
                      <Badge>{latestCondition.porosity} porosity</Badge>
                      {latestCondition.grayPercent > 0 && (
                        <Badge>{latestCondition.grayPercent}% gray</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photo Gallery — Coming Soon */}
          <Card className="card-glass mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-[var(--cg-accent)]" />
                Photo Gallery
                <Badge className="text-[10px]">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-2 opacity-50">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2"
                  >
                    <ImageIcon className="h-6 w-6 text-white/20" />
                    <span className="text-xs text-white/30">
                      {i <= 2 ? 'Before' : 'After'} {i <= 2 ? i : i - 2}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-3 text-center">
                Before & after photo upload coming in next update
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 space-y-4">
            <PatchTestSection clientId={clientId} />
            <AllergySection clientId={clientId} />
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {(safetyFlags.allergies.length > 0 || safetyFlags.legacyFlags.length > 0) && (
            <AllergyAlert allergies={safetyFlags.allergies} legacyFlags={safetyFlags.legacyFlags} />
          )}
          {/* Formulation History */}
          <Card className="card-glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-[var(--cg-accent)]" />
                Formulation History
              </CardTitle>
              <Button
                
                size="sm"
                onClick={() => router.push(`/formulate?clientId=${clientId}`)}
                className="text-[var(--cg-accent)]"
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> New Formula
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {formulas.length === 0 ? (
                <div className="text-center py-10">
                  <FlaskConical className="h-8 w-8 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 mb-4">No formulations yet.</p>
                  <Button
                    
                    onClick={() => router.push(`/questionnaire?clientId=${clientId}`)}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" /> Start Consultation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formulas.map((formula) => (
                    <div
                      key={formula.id}
                      className="rounded-lg bg-white/[0.03] border border-white/10 p-4 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-white">{formula.name}</p>
                            <span className="text-xs text-white/40">
                              {new Date(formula.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                            <span>{formula.formulation.brand} {formula.formulation.line}</span>
                            <span>·</span>
                            <span>{formula.formulation.developerVolume} Vol Developer</span>
                            <span>·</span>
                            <span>{formula.formulation.processingTime} min</span>
                            <span>·</span>
                            <span className="capitalize">{formula.formulation.application.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {formula.formulation.steps.map((step, idx) => (
                              <Badge
                                key={idx}
                                
                                className="text-xs border-white/15 text-white/70"
                              >
                                {step.shadeCode || step.productName} ({step.grams}g)
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            
                            size="icon"
                            className={favorites.has(formula.id) ? "text-yellow-400" : "text-white/20 hover:text-yellow-400"}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(formula.id) }}
                            title={favorites.has(formula.id) ? "Remove favorite" : "Add to favorites"}
                          >
                            <Star className={`h-4 w-4 ${favorites.has(formula.id) ? "fill-current" : ""}`} />
                          </Button>
                          <Button
                            
                            size="icon"
                            className="text-white/40 hover:text-white"
                            onClick={() => router.push(`/formulate?formulaId=${formula.id}`)}
                            title="View formula"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {formula.formulation.notes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-white/40 line-clamp-2">
                            {formula.formulation.notes[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="card-glass">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[var(--cg-accent)]">{formulas.length}</p>
                <p className="text-xs text-white/50 mt-1">Formulas</p>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[var(--cg-accent2)]">
                  {client.conditions?.length || 0}
                </p>
                <p className="text-xs text-white/50 mt-1">Consultations</p>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {client.lastVisit
                    ? Math.ceil(
                        (Date.now() - new Date(client.lastVisit).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : '-'}
                </p>
                <p className="text-xs text-white/50 mt-1">Days Since Visit</p>
              </CardContent>
            </Card>
          </div>

          {/* Formula Insights — Vish Analytics */}
          {formulas.length > 0 && (
            <Card className="card-glass mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--cg-accent)]" />
                  Formula Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl p-3" style={{ background: 'rgba(147, 51, 234, 0.08)' }}>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-white/50">Avg Cost/Service</p>
                    <p className="text-lg font-mono font-bold text-[var(--cg-accent)]">
                      ${(formulas.reduce((s, f) => {
                        const steps = f.formulation.steps || [];
                        const cost = steps.reduce((c, step) => c + ((step.grams || 0) * 0.40), 0);
                        return s + cost;
                      }, 0) / formulas.length).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(236, 72, 153, 0.08)' }}>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-white/50">Most Used Brand</p>
                    <p className="text-lg font-bold text-[var(--cg-accent2)]">
                      {(() => {
                        const brands = formulas.map(f => f.formulation.brand).filter(Boolean);
                        const counts = brands.reduce((acc, b) => { acc[b] = (acc[b] || 0) + 1; return acc; }, {} as Record<string, number>);
                        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                      })()}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-white/50">Total Services</p>
                    <p className="text-lg font-bold text-[#10B981]">{formulas.length}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-white/50">Preferred Service</p>
                    <p className="text-sm font-bold text-[#F59E0B]">
                      {(() => {
                        const apps = formulas.map(f => f.formulation.application).filter(Boolean);
                        const counts = apps.reduce((acc, a) => { acc[a] = (acc[a] || 0) + 1; return acc; }, {} as Record<string, number>);
                        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                        return top.replace(/_/g, ' ');
                      })()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(147, 51, 234, 0.06)' }}>
                  <DollarSign className="w-3.5 h-3.5 text-[var(--cg-accent)] flex-shrink-0" />
                  <p className="text-[10px]" style={{ color: 'var(--cg-text-secondary)' }}>
                    Estimated lifetime value: <span className="font-mono font-bold text-white">${(formulas.length * 35).toFixed(0)}</span>
                    <span className="text-white/30 ml-2">(avg $35/service × {formulas.length} visits)</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
