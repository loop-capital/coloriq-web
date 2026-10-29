'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { HAIR_LEVELS, BRANDS, LINES_BY_BRAND } from '@/lib/products'
import { HairSwatch } from '@/components/ui/hair-swatch'
import { ColorCircle } from '@/components/ui/color-circle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ColorWheel3D } from '@/components/custom'
import { AllergyAlert } from '@/components/custom/allergy-alert'
import { ScaleWidget } from '@/components/scale-widget'
import { EditFormula, type FormulaIngredient } from '@/components/edit-formula'
import { ScaleBowl, type BowlIngredient } from '@/components/scale-bowl'
import { Camera, Upload, X, Sparkles, Droplets, FlaskConical, ChevronRight, ChevronLeft, RotateCcw, Save, AlertTriangle, Smartphone, User, Search, UserPlus, Target, ChartNoAxesColumn } from 'lucide-react'
import { ProductSearch, type SelectedProduct } from '@/components/product-search'
import { StockCheck } from '@/components/stock-check'
import VisualOutcomeSimulator from '@/components/visual-outcome/VisualOutcomeSimulator'
import ContextualEducation from '@/components/education/ContextualEducation'
import CorrectiveColorPanel, { CorrectiveBadge } from '@/lib/corrective-color/CorrectiveColorPanel'
import DictationWidget from '@/components/custom/dictation-widget'
import { diagnose, type CorrectiveIssue, type HairState } from '@/lib/corrective-color/engine'
import type { ToneFamily } from '@/lib/products'
import { getStoredAuthToken } from '@/lib/cookie-keys';
import { buildResultHandoffUrl } from '@/lib/result-handoff';

const STEPS = [
  { id: 1, title: 'Photo', desc: 'Capture or upload hair photo' },
  { id: 2, title: 'Hair Assessment', desc: 'Texture, pattern, density, level & tone' },
  { id: 3, title: 'Chemical History', desc: 'Past treatments & sensitivities' },
  { id: 4, title: 'Target Look', desc: 'Desired color result' },
  { id: 5, title: 'Condition', desc: 'Hair health & problem indicators' },
  { id: 6, title: 'Results', desc: 'Your custom formula' },
]

const POROSITY = [
  { value: 'low', label: 'Low', color: '#9333EA' },
  { value: 'normal', label: 'Normal', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
]

const TEXTURES = [
  { value: 'fine', label: 'Fine', desc: 'Thin strands, processes faster' },
  { value: 'medium', label: 'Medium', desc: 'Average strand diameter' },
  { value: 'coarse', label: 'Coarse', desc: 'Thick strands, takes longer' },
]

const HAIR_PATTERNS = [
  { value: 'straight', label: 'Straight', type: 'Type 1' },
  { value: 'wavy', label: 'Wavy', type: 'Type 2' },
  { value: 'curly', label: 'Curly', type: 'Type 3' },
  { value: 'coily', label: 'Coily', type: 'Type 4' },
]

const DENSITIES = [
  { value: 'thin', label: 'Thin', desc: 'Low density' },
  { value: 'medium', label: 'Medium', desc: 'Average density' },
  { value: 'thick', label: 'Thick', desc: 'High density' },
]

const SERVICE_TYPES = [
  { value: 'full_head', label: 'Full Head', desc: 'All-over application' },
  { value: 'retouch', label: 'Retouch', desc: 'Root regrowth only' },
  { value: 'balayage', label: 'Balayage', desc: 'Hand-painted highlights' },
  { value: 'foils', label: 'Foils', desc: 'Foil highlights/lowlights' },
  { value: 'corrective', label: 'Corrective', desc: 'Color correction' },
  { value: 'gloss_toner', label: 'Gloss/Toner', desc: 'Tone refresh or gloss' },
]

const CHEMICAL_HISTORY_ITEMS = [
  { value: 'box_dye', label: 'Box Dye', desc: 'Drugstore/home color kit — MAJOR HAZARD', warning: true },
  { value: 'metallic_salts', label: 'Metallic Salts', desc: 'Metallic dye or mineral buildup — HARD STOP for lightening', warning: false },
  { value: 'henna', label: 'Henna', desc: 'Henna color — lightener = green disaster', warning: false },
  { value: 'keratin', label: 'Keratin Treatment', desc: 'Keratin smoothing in last 6 months', warning: false },
  { value: 'relaxer', label: 'Relaxer / Straightening', desc: 'Chemical relaxer or Japanese straightening', warning: false },
  { value: 'hard_water', label: 'Hard Water', desc: 'Hard water or well water at home', warning: false },
  { value: 'medication', label: 'Medication/Mineral Buildup', desc: 'Thyroid meds, iron, copper, etc.', warning: false },
]

const SENSITIVITIES = [
  { value: 'ppd_allergy', label: 'PPD Allergy', desc: 'Allergic to PPD — use PPD-free alternatives', warning: true },
  { value: 'pregnancy', label: 'Pregnancy', desc: 'Client is pregnant' },
  { value: 'breastfeeding', label: 'Breastfeeding', desc: 'Client is breastfeeding' },
  { value: 'chemotherapy', label: 'Active Chemotherapy', desc: 'Currently receiving chemo' },
]

const LAST_CHEMICAL_TIMES = [
  { value: 'never', label: 'Never' },
  { value: '6_plus_months', label: '6+ months ago' },
  { value: '3_to_6_months', label: '3-6 months ago' },
  { value: '1_to_3_months', label: '1-3 months ago' },
  { value: '3_to_4_weeks', label: '3-4 weeks ago' },
  { value: '1_to_2_weeks', label: '1-2 weeks ago' },
  { value: 'this_week', label: 'This week' },
]

const PROBLEM_INDICATORS = [
  { value: 'banding', label: 'Banding', desc: 'Visible color bands from overlapping', field: 'banding' },
  { value: 'previousLightener', label: 'Previous Lightener', desc: 'Has bleach/lightener in hair', field: 'previousLightener' },
  { value: 'greenCast', label: 'Green Cast', desc: 'Unwanted green tone present', field: 'greenCast' },
  { value: 'overAshy', label: 'Over-Ashy', desc: 'Too cool/gray result', field: 'overAshy' },
  { value: 'hollowEnds', label: 'Hollow Ends', desc: 'Ends appear hollow or see-through', field: 'hollowEnds' },
  { value: 'hotRoots', label: 'Hot Roots', desc: 'Warmer/lighter roots than mids', field: 'hotRoots' },
  { value: 'multipleColors', label: 'Multiple Colors', desc: 'Different colors on different sections', field: 'multipleColors' },
  { value: 'muddyToner', label: 'Muddy Toner', desc: 'Toner has gone muddy/ashy', field: 'muddyToner' },
  { value: 'colorGrab', label: 'Color Grab', desc: 'Ends absorbing color unevenly', field: 'colorGrab' },
]

const CONDITION_TYPES = [
  { value: 'virgin', label: 'Virgin Hair', desc: 'Never chemically treated' },
  { value: 'bleached', label: 'Bleached/Lightened', desc: 'Lifted from natural' },
  { value: 'gray_coverage', label: 'Gray Coverage Needed', desc: 'Requires gray blending or coverage' },
  { value: 'oily_scalp', label: 'Oily Scalp', desc: 'Excess sebum production on scalp' },
  { value: 'previously_colored', label: 'Previously Colored', desc: 'Has existing color deposit' },
  { value: 'damaged', label: 'Damaged', desc: 'Over-processed or compromised' },
  { value: 'dry_brittle', label: 'Dry/Brittle', desc: 'Lacks moisture, prone to breakage' },
  { value: 'highly_damaged', label: 'Highly Damaged', desc: 'Severely compromised, needs repair' },
]

const TONES = [
  { value: 'N', label: 'Natural', color: '#9C8B7A' }, { value: 'A', label: 'Ash', color: '#8A7D6E' },
  { value: 'G', label: 'Gold', color: '#C4A35A' }, { value: 'K', label: 'Copper', color: '#B87333' },
  { value: 'R', label: 'Red', color: '#A03030' }, { value: 'V', label: 'Violet', color: '#7B68A6' },
  { value: 'P', label: 'Pearl', color: '#B8B0C4' }, { value: 'B', label: 'Beige', color: '#C4B5A0' },
  { value: 'M', label: 'Mahogany', color: '#6B3A3A' }, { value: 'Ch', label: 'Chocolate', color: '#4A2C2A' },
  { value: 'W', label: 'Warm', color: '#D4A574' }, { value: 'C', label: 'Cool', color: '#7D8B9A' },
]

// Brands & lines now fetched from API (salon inventory)


const toneMap: Record<string, ToneFamily> = { N: 'neutral', A: 'ash', G: 'golden', R: 'red', V: 'violet', K: 'copper', B: 'beige', P: 'pearl', M: 'mahogany', Ch: 'chocolate', W: 'warm', C: 'cool' }
const revToneMap: Record<string, string> = { neutral: 'N', ash: 'A', golden: 'G', red: 'R', violet: 'V', copper: 'K', beige: 'B', pearl: 'P', mahogany: 'M', chocolate: 'Ch', warm: 'W', cool: 'C' }

const card = { background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 32px' }

// Blend level base color with tone color (toneWeight 0-1, higher = more tone influence)
function blendColor(levelHex: string, toneHex: string, toneWeight = 0.35): string {
  const parse = (h: string) => {
    const v = parseInt(h.replace('#', ''), 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const [lr, lg, lb] = parse(levelHex)
  const [tr, tg, tb] = parse(toneHex)
  const r = Math.round(lr + (tr - lr) * toneWeight)
  const g = Math.round(lg + (tg - lg) * toneWeight)
  const b = Math.round(lb + (tb - lb) * toneWeight)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
const btnPrimary = { padding: '12px 24px', background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold' as const, cursor: 'pointer' as const, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }
const btnOutline = { padding: '12px 24px', border: '1px solid rgba(255,255,255,0.12)', color: '#A1A1AA', borderRadius: 12, cursor: 'pointer' as const, background: 'transparent', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }

// Merge a flat object of dotted-key updates (e.g. { 'condition.grayPercent': 40 })
// into state immutably, creating nested objects as needed.
function applyDottedUpdates<T>(prev: T, updates: Record<string, unknown>): T {
  let next: any = prev
  for (const [path, value] of Object.entries(updates)) {
    const keys = path.split('.')
    const setDeep = (obj: any, ks: string[]): any => {
      if (ks.length === 0) return value
      const [head, ...rest] = ks
      const base = obj && typeof obj === 'object' ? obj : {}
      return { ...base, [head]: setDeep(base[head], rest) }
    }
    next = setDeep(next, keys)
  }
  return next as T
}

const TONE_CODES = ['N', 'A', 'G', 'K', 'R', 'V', 'P', 'B', 'M', 'Ch', 'W', 'C']

// Normalize a tone value from a previous consultation into a wizard tone letter.
function normalizeToneCode(t: unknown): string | null {
  if (typeof t !== 'string' || t.length === 0) return null
  if (TONE_CODES.includes(t)) return t
  const mapped = revToneMap[t] || revToneMap[t.toLowerCase()]
  if (mapped) return mapped
  if (t.toLowerCase() === 'natural') return 'N'
  return null
}

// Map GET /api/clients/[id]/last-consultation response fields onto fd updates.
// Only emits dotted keys for values that validate against the wizard options;
// unknown/missing fields are ignored.
function consultationToFd(c: any): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  if (!c || typeof c !== 'object') return updates
  const inList = (v: unknown, list: string[]): v is string => typeof v === 'string' && list.includes(v)
  const level = (v: unknown) => (typeof v === 'number' && v >= 1 && v <= 10 ? v : null)

  if (inList(c.texture, TEXTURES.map((t) => t.value))) updates.texture = c.texture
  if (inList(c.hairPattern, HAIR_PATTERNS.map((t) => t.value))) updates.hairPattern = c.hairPattern
  if (inList(c.density, DENSITIES.map((t) => t.value))) updates.density = c.density

  const cl = level(c.currentLevel); if (cl !== null) updates.currentLevel = cl
  const tl = level(c.targetLevel); if (tl !== null) updates.targetLevel = tl
  const ct = normalizeToneCode(c.currentTone); if (ct) updates.currentTone = ct
  const tt = normalizeToneCode(c.targetTone); if (tt) updates.targetTone = tt

  const svc = c.serviceType || c.lastServiceType
  if (inList(svc, SERVICE_TYPES.map((o) => o.value))) updates.serviceType = svc
  if (inList(c.lastChemicalService, LAST_CHEMICAL_TIMES.map((o) => o.value))) updates.lastChemicalService = c.lastChemicalService

  const chemValues = CHEMICAL_HISTORY_ITEMS.map((o) => o.value)
  if (Array.isArray(c.chemicalHistory)) {
    updates.chemicalHistory = c.chemicalHistory.filter((v: unknown) => chemValues.includes(v as string))
  }
  const sensValues = SENSITIVITIES.map((o) => o.value)
  if (Array.isArray(c.sensitivities)) {
    updates.sensitivities = c.sensitivities.filter((v: unknown) => sensValues.includes(v as string))
  }

  // Nested condition fields as dotted keys
  if (inList(c.conditionType, CONDITION_TYPES.map((o) => o.value))) updates['condition.type'] = c.conditionType
  if (inList(c.porosity, ['low', 'normal', 'high'])) updates['condition.porosity'] = c.porosity
  if (typeof c.grayPercent === 'number' && c.grayPercent >= 0 && c.grayPercent <= 100) updates['condition.grayPercent'] = c.grayPercent
  const problemFields = PROBLEM_INDICATORS.map((o) => o.field)
  if (Array.isArray(c.problemIndicators)) {
    for (const p of c.problemIndicators) {
      if (typeof p === 'string' && problemFields.includes(p)) updates[`condition.${p}`] = true
    }
  }
  return updates
}

function FormulatePageContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [photo, setPhoto] = useState<string | null>(null)
  const photoRef = useRef<string | null>(null)
  photoRef.current = photo
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  // Vision analysis - calls /api/vision-analyze with the photo base64
  const analyzePhoto = async () => {
    if (!photo) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/vision-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo }),
      })
      const data = await res.json()
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis)
        const toneMap: Record<string, string> = {
          neutral: 'N', ash: 'A', golden: 'G', copper: 'C', red: 'R',
          violet: 'V', pearl: 'P', beige: 'B', mahogany: 'M', chocolate: 'CH',
          warm: 'W', cool: 'CO',
        }
        setFd(prev => ({
          ...prev,
          currentLevel: data.analysis.currentLevel,
          currentTone: toneMap[data.analysis.currentTone] || 'N',
          condition: {
            ...prev.condition,
            grayPercent: data.analysis.grayPercent,
            porosity: data.analysis.damageIndicators?.porosityEstimate || prev.condition.porosity,
          },
        }))
        setStep(2)
      }
    } catch (e) {
      console.error('[Vision analysis error]', e)
    } finally {
      setAnalyzing(false)
    }
  }

  const [fd, setFd] = useState({
    currentLevel: 5, currentTone: 'N', targetLevel: 7, targetTone: 'N',
    hairType: 'normal',
    texture: 'medium',
    hairPattern: 'straight',
    density: 'medium',
    serviceType: 'full_head',
    chemicalHistory: [] as string[],
    sensitivities: [] as string[],
    lastChemicalService: 'never',
    condition: { type: 'previously_colored', porosity: 'normal', grayPercent: 0, highlights: false, highlightedPercent: 0, banding: false, hotRoots: false, previousLightener: false, multipleColors: false, greenCast: false, muddyToner: false, overAshy: false, colorGrab: false, hollowEnds: false },
    brandPreference: '', linePreference: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formulaView, setFormulaView] = useState<'edit' | 'bowl'>('edit')
  const [formulaIngredients, setFormulaIngredients] = useState<FormulaIngredient[]>([])
  const [formulaDeveloper, setFormulaDeveloper] = useState({ name: '20 Vol Cream', volume: 20 })
  const [formulaRatio, setFormulaRatio] = useState('1:1.5')
  const [brands] = useState<string[]>(BRANDS)
  const [shades, setShades] = useState<Array<{shadeCode: string; shadeName: string; quantity: number; line?: string | null}>>([])
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // Phase 1 item 6: the saved formulation id, captured from the save
  // response so the Results step can hand it to capture. Null until the
  // formula is saved — never invented, cleared whenever a new result
  // replaces the current one (see handleSubmit / reset paths).
  const [formulationId, setFormulationId] = useState<string | null>(null)
  const router = useRouter()
  const [checkingPhoto, setCheckingPhoto] = useState(false)
  const [salonId, setSalonId] = useState<string>('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientAllergies, setClientAllergies] = useState<Array<{ allergen: string; severity: string }>>([])
  const [clientLegacyFlags, setClientLegacyFlags] = useState<string[]>([])

  // Fetch allergy flags whenever the linked client changes — warn before formulating
  useEffect(() => {
    if (!clientId) {
      setClientAllergies([])
      setClientLegacyFlags([])
      return
    }
    fetch(`/api/v1/clients/${clientId}/allergies`)
      .then((r) => (r.ok ? r.json() : { allergies: [], legacyFlags: [] }))
      .then((d) => {
        setClientAllergies(d.allergies || [])
        setClientLegacyFlags(d.legacyFlags || [])
      })
      .catch(() => {})
    // Also check patch test status — a failed test blocks oxidative color
    fetch(`/api/v1/clients/${clientId}/patch-tests`)
      .then((r) => (r.ok ? r.json() : { status: 'never_tested' }))
      .then((d) => {
        if (d.status === 'failed') {
          setClientAllergies((prev) => [
            ...prev,
            { allergen: 'Failed patch test — do not apply oxidative color', severity: 'severe' },
          ])
        }
      })
      .catch(() => {})
  }, [clientId])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Array<{id: string; name: string; phone?: string}>>([])
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [convertTargetBrand, setConvertTargetBrand] = useState('')
  const [converting, setConverting] = useState(false)
  const [conversionResult, setConversionResult] = useState<any>(null)

  // Fetch salon context and shades on mount
  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch('/api/auth/me')
        const authData = await authRes.json()
        setSalonId(authData?.user?.id || 'default')
      } catch (e) { /* non-critical */ }
    })()
  }, [])

  // Auto-select line when brand changes
  useEffect(() => {
    if (!fd.brandPreference) { setFd(p => ({ ...p, linePreference: '' })); return }
    const lines = LINES_BY_BRAND[fd.brandPreference] || []
    if (lines.length === 1) {
      setFd(p => ({ ...p, linePreference: lines[0] }))
    } else {
      setFd(p => ({ ...p, linePreference: '' }))
    }
  }, [fd.brandPreference])

  // Prefill from URL params (receiving end of the questionnaire's "Save & Formulate").
  // Only params matching real fd fields are mapped; unknown params are ignored.
  useEffect(() => {
    const run = async () => {
      const cid = searchParams.get('clientId')
      if (cid) {
        setClientId(cid)
        const cname = searchParams.get('clientName')
        if (cname) setClientName(cname)
        // Prior-visit baseline first; fresh questionnaire params below take precedence
        await loadLastConsultation(cid)
      }
      const updates: Record<string, unknown> = {}
      const pick = (param: string, allowed: string[]): string | null => {
        const v = searchParams.get(param)
        return v && allowed.includes(v) ? v : null
      }
      const texture = pick('texture', TEXTURES.map((t) => t.value))
      if (texture) updates.texture = texture
      const hairPattern = pick('hairPattern', HAIR_PATTERNS.map((t) => t.value))
      if (hairPattern) updates.hairPattern = hairPattern
      const density = pick('density', DENSITIES.map((t) => t.value))
      if (density) updates.density = density
      const porosity = pick('porosity', ['low', 'normal', 'high'])
      if (porosity) updates['condition.porosity'] = porosity
      const grayRaw = searchParams.get('grayPercent')
      if (grayRaw !== null) {
        const g = parseInt(grayRaw, 10)
        if (!isNaN(g) && g >= 0 && g <= 100) updates['condition.grayPercent'] = g
      }
      const scalpType = searchParams.get('scalpType')
      if (scalpType && CONDITION_TYPES.some((o) => o.value === scalpType)) updates['condition.type'] = scalpType
      const sensRaw = searchParams.get('sensitivities')
      if (sensRaw) {
        const known = SENSITIVITIES.map((o) => o.value)
        updates.sensitivities = sensRaw.split(',').map((s) => s.trim()).filter((s) => known.includes(s))
      }
      if (Object.keys(updates).length > 0) {
        setFd((prev) => applyDottedUpdates(prev, updates))
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search clients
  useEffect(() => {
    if (!clientSearch || clientSearch.length < 2) { setClientResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        const data = await res.json()
        setClientResults(data.clients || [])
      } catch (e) { console.error('Client search failed:', e) }
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch])

  // Load a repeat client's most recent consultation and prefill the wizard.
  // Zero callers existed before this; wired into selectClient and URL prefill.
  const loadLastConsultation = async (id: string) => {
    try {
      const token = getStoredAuthToken()
      const res = await fetch(`/api/clients/${id}/last-consultation`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (res.ok && data?.consultation) {
        const updates = consultationToFd(data.consultation)
        if (Object.keys(updates).length > 0) {
          setFd((prev) => applyDottedUpdates(prev, updates))
          toast({ title: 'Last visit loaded', description: 'Consultation prefilled from the client\u2019s previous visit.' })
        }
      }
    } catch (e) {
      console.error('Failed to load last consultation:', e)
    }
  }

  const selectClient = (c: { id: string; name: string; phone?: string }) => {
    setClientId(c.id)
    setClientName(c.name)
    setClientPhone(c.phone || '')
    setShowClientSearch(false)
    setClientSearch('')
    setClientResults([])
    loadLastConsultation(c.id)
  }

  // Phase 1 item 6: "Photograph this result" — route to capture carrying
  // the current session + formulation references as URL parameters
  // (?sessionId=…&formulaId=…). buildResultHandoffUrl drops any id that is
  // not a valid UUID, so a path with no saved formulation / no phone-code
  // session routes to plain /capture (existing behavior) instead of
  // forwarding a made-up id.
  const handlePhotographResult = () => {
    router.push(buildResultHandoffUrl(sessionId, formulationId))
  }

  const handleSaveFormula = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/formulations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          salonId,
          stylistId: salonId,
          formData: fd,
          result,
          ingredients: formulaIngredients,
          developer: formulaDeveloper,
          ratio: formulaRatio,
          photoUrl: photo,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        if (data.formulationId) setFormulationId(data.formulationId)
        if (data.clientId && !clientId) setClientId(data.clientId)
        toast({ title: 'Saved', description: clientName ? `Formula saved for ${clientName}` : 'Formula saved to library' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
    setSaving(false)
  }

  // Voice dictation: merge the widget's dotted-key updates into the wizard state
  const handleDictationUpdate = (updates: Record<string, unknown>) => {
    setFd((prev) => applyDottedUpdates(prev, updates))
  }

  // Generate session code for phone upload
  const generateSessionCode = async () => {
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salonId: 'default' }) })
      const data = await res.json()
      // POST /api/sessions returns { success, data: { sessionId, code, expiresAt } }
      const payload = data?.data || data
      if (payload?.code) {
        setSessionCode(payload.code)
        if (payload.sessionId) setSessionId(payload.sessionId)
      }
    } catch (e) { console.error('Failed to generate session code:', e) }
  }

  // Read the phone-uploaded photo back into the photo step.
  // Uses the session id (the 4-digit code is marked used after upload, so the
  // code lookup would 404 — the id lookup keeps working).
  const fetchSessionPhoto = async (): Promise<boolean> => {
    if (!sessionId || photoRef.current) return false
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
      const data = await res.json()
      const url = data?.data?.photoUrl
      if (res.ok && url) {
        setPhoto(url)
        toast({ title: 'Phone photo received', description: 'The uploaded photo is ready for analysis.' })
        return true
      }
    } catch (e) {
      console.error('Phone upload check failed:', e)
    }
    return false
  }

  const checkPhoneUpload = async () => {
    setCheckingPhoto(true)
    try {
      const found = await fetchSessionPhoto()
      if (!found) toast({ title: 'No photo yet', description: 'Upload from the phone first, then check again.' })
    } finally {
      setCheckingPhoto(false)
    }
  }

  // Auto-poll for the phone upload while a session is active and no photo yet
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let attempts = 0
    const poll = async () => {
      if (cancelled || photoRef.current) return
      attempts++
      const found = await fetchSessionPhoto()
      if (!cancelled && !found && attempts < 40) setTimeout(poll, 3000)
    }
    poll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Handle product selection from ProductSearch
  const handleProductSelect = (product: SelectedProduct) => {
    const newIngredient: FormulaIngredient = {
      id: `ing-${Date.now()}`,
      name: product.shadeName,
      brand: product.brand,
      shadeCode: product.shadeCode,
      series: product.line,
      targetGrams: product.targetGrams,
      color: product.color,
      order: formulaIngredients.length,
    }
    setFormulaIngredients(prev => [...prev, newIngredient])
    setShowProductSearch(false)
  }

  const handleConvertBrand = async () => {
    if (!convertTargetBrand || converting) return
    setConverting(true)
    setConversionResult(null)
    try {
      const shades = (result.steps || [])
        .filter((s: any) => s.role === 'primary' || s.role === 'secondary')
        .map((s: any) => ({ shadeCode: s.product?.shadeCode, brand: result.brand, line: result.line, grams: s.grams }))
      const res = await fetch('/api/formulate/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shades, targetBrand: convertTargetBrand, developerVolume: result.developerVolume || 20 }),
      })
      const data = await res.json()
      if (data.success) setConversionResult(data.data)
      else toast({ title: 'Conversion failed', description: data.error || 'No equivalent shades found', variant: 'destructive' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
    setConverting(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/formulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fd, currentTone: toneMap[fd.currentTone] || fd.currentTone, targetTone: toneMap[fd.targetTone] || fd.targetTone }) })
      if (!res.ok) throw new Error('Formulation failed')
      const data = await res.json()
      setResult(data.data)
      setFormulationId(null)
      // Convert API result to EditFormula ingredients
      const ingredients: FormulaIngredient[] = (data.data?.steps || [])
        .filter((s: any) => s.role === 'primary' || s.role === 'secondary')
        .map((s: any, idx: number) => ({
          id: `ing-${idx}`,
          name: s.product?.shadeName || 'Unknown',
          brand: data.data?.brand || 'Unknown',
          shadeCode: s.product?.shadeCode || '?',
          series: data.data?.line || '',
          targetGrams: s.grams || 20,
          color: HAIR_LEVELS[s.product?.level]?.hex || '#7D5038',
          order: idx,
        }))
      setFormulaIngredients(ingredients)
      if (data.data?.developerVolume) {
        setFormulaDeveloper({ name: `${data.data.developerVolume} Vol`, volume: data.data.developerVolume })
      }
      setFormulaView('edit')
      setStep(6)
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }) }
    setLoading(false)
  }

  const lvlDiff = fd.targetLevel - fd.currentLevel

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F5F5F7', padding: '16px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 4 }}>Create <span style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Formulation</span></h1>
            <p style={{ color: '#A1A1AA', fontSize: 14 }}>Formulate with absolute precision in 6 steps</p>
          </div>
          <button type="button" onClick={() => { setFd({ currentLevel: 5, currentTone: 'N', targetLevel: 7, targetTone: 'N', hairType: 'normal', texture: 'medium', hairPattern: 'straight', density: 'medium', serviceType: 'full_head', chemicalHistory: [], sensitivities: [], lastChemicalService: 'never', condition: { type: 'previously_colored', porosity: 'normal', grayPercent: 0, highlights: false, highlightedPercent: 0, banding: false, hotRoots: false, previousLightener: false, multipleColors: false, greenCast: false, muddyToner: false, overAshy: false, colorGrab: false, hollowEnds: false }, brandPreference: '', linePreference: '' }); setResult(null); setPhoto(null); setFormulationId(null); setStep(1) }} style={btnOutline}><RotateCcw size={14} /> Reset</button>
        </div>

        {/* Allergy / patch-test safety alert for linked client */}
        {(clientAllergies.length > 0 || clientLegacyFlags.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <AllergyAlert allergies={clientAllergies} legacyFlags={clientLegacyFlags} />
          </div>
        )}

        {/* Voice Dictation */}
        <div style={{ ...card, marginBottom: 16, padding: '12px 20px' }}>
          <p style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0 0 8px 0' }}>Voice dictation</p>
          <DictationWidget onFieldsUpdate={handleDictationUpdate} currentFields={fd as unknown as Record<string, unknown>} />
        </div>

        {/* Client Picker */}
        <div style={{ ...card, marginBottom: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: clientId ? 'rgba(147,51,234,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} style={{ color: clientId ? '#9333EA' : '#71717A' }} />
            </div>
            <div>
              {clientId || clientName ? (
                <>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7', margin: 0 }}>{clientName || 'Client Selected'}</p>
                  {clientPhone && <p style={{ fontSize: 12, color: '#71717A', margin: 0 }}>{clientPhone}</p>}
                </>
              ) : (
                <p style={{ fontSize: 14, color: '#71717A', margin: 0 }}>No client linked — walk-in consultation</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
            {clientId ? (
              <button type="button" onClick={() => { setClientId(null); setClientName(''); setClientPhone('') }} style={{ ...btnOutline, padding: '6px 12px', fontSize: 12 }}><X size={12} /> Clear</button>
            ) : (
              <>
                <button type="button" onClick={() => setShowClientSearch(!showClientSearch)} style={{ ...btnOutline, padding: '6px 12px', fontSize: 12 }}><Search size={12} /> Search</button>
                <button type="button" onClick={() => { setShowClientSearch(false); setClientName('Walk-in Client'); setClientPhone('') }} style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12 }}><UserPlus size={12} /> Walk-in</button>
              </>
            )}
            {showClientSearch && !clientId && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 320, background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Search size={14} style={{ color: '#71717A' }} />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    autoFocus
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#F5F5F7', fontSize: 14, outline: 'none' }}
                  />
                  <button type="button" onClick={() => setShowClientSearch(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} style={{ color: '#71717A' }} /></button>
                </div>
                {/* New client inline */}
                {clientSearch.length >= 2 && (
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Phone number (optional)"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F7', fontSize: 13, marginBottom: 8, outline: 'none' }}
                    />
                    <button type="button" onClick={() => { setClientName(clientSearch); setShowClientSearch(false); setClientSearch('') }} style={{ width: '100%', padding: '8px 12px', background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: 8, color: '#9333EA', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <UserPlus size={12} style={{ display: 'inline', marginRight: 6 }} />
                      Create new client: {clientSearch}
                    </button>
                  </div>
                )}
                {/* Search results */}
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {clientResults.map(c => (
                    <button type="button" key={c.id} onClick={() => selectClient(c)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#F5F5F7', cursor: 'pointer', borderRadius: 8, display: 'block' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(147,51,234,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{c.name}</p>
                      {c.phone && <p style={{ fontSize: 12, color: '#71717A', margin: 0 }}>{c.phone}</p>}
                    </button>
                  ))}
                  {clientSearch.length >= 2 && clientResults.length === 0 && (
                    <p style={{ padding: 12, fontSize: 13, color: '#71717A', textAlign: 'center' }}>No clients found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#9333EA', color: '#fff' }}>{step}</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#F5F5F7' }}>{STEPS[step - 1].title}</p>
                <p className="text-xs" style={{ color: '#71717A' }}>{STEPS[step - 1].desc}</p>
              </div>
            </div>
            {step < STEPS.length && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#71717A' }}>Next</p>
                <p className="text-xs" style={{ color: '#A1A1AA' }}>{STEPS[step].title}</p>
              </div>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-1.5 rounded-full transition-all duration-300" style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', width: `${step / STEPS.length * 100}%` }} />
          </div>
          <p className="text-[10px] mt-1 text-right" style={{ color: '#71717A' }}>Step {step} of {STEPS.length}</p>
        </div>

        {/* STEP 1: Photo */}
        {step === 1 && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Camera style={{ color: '#9333EA' }} /> Capture Hair Photo</h2>
            <p style={{ color: '#A1A1AA', fontSize: 14, marginBottom: 16 }}>Take a clear photo of the client's current hair. Ensure hair is dry for accurate color analysis.</p>
            {photo ? (
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
                <img src={photo} alt="Hair" style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />
                <button type="button" onClick={() => setPhoto(null)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
              </div>
            ) : (
              <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <button type="button" onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.capture='environment'; i.onchange=(e:any) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => setPhoto(ev.target?.result as string); r.readAsDataURL(f) }}; i.click() }}
                  style={{ padding: 32, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 16, background: 'rgba(255,255,255,0.02)', color: '#F5F5F7', cursor: 'pointer', fontSize: 16, textAlign: 'center' }}>
                  <Camera style={{ width: 28, height: 28, color: '#71717A', margin: '0 auto 8px', display: 'block' }} /> Take Photo
                </button>
                <button type="button" onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e:any) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = (ev) => setPhoto(ev.target?.result as string); r.readAsDataURL(f) }}; i.click() }}
                  style={{ padding: 32, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 16, background: 'rgba(255,255,255,0.02)', color: '#F5F5F7', cursor: 'pointer', fontSize: 16, textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: 22, height: 18, border: '2px solid #71717A', borderRadius: 3, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 4, background: '#71717A', borderRadius: '2px 2px 0 0' }} />
                    </div>
                    <span style={{ position: 'absolute', bottom: -2, right: 0, width: 14, height: 14, background: '#9333EA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 'bold', lineHeight: 1 }}>+</span>
                  </div>
                  Upload Photo
                </button>
              </div>
              <div style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}><p style={{ fontSize: 13, color: '#A1A1AA', textAlign: 'center', margin: 0 }}>For best results, photograph the back of the head in natural light. Show 2–3 inches of root area for accurate level detection.</p></div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              {/* Session code for phone-to-iPad upload */}
              {!photo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Smartphone size={14} style={{ color: '#71717A' }} />
                  {sessionCode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#71717A' }}>Phone upload code:</span>
                      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: '#9333EA', fontFamily: 'monospace' }}>{sessionCode}</span>
                      <span style={{ fontSize: 11, color: '#71717A' }}>→ getCOLORiq.co/c</span>
                      <button type="button" onClick={checkPhoneUpload} disabled={checkingPhoto} style={{ fontSize: 12, color: '#9333EA', background: 'none', border: 'none', cursor: checkingPhoto ? 'wait' : 'pointer', textDecoration: 'underline' }}>
                        {checkingPhoto ? 'Checking…' : 'Check for upload'}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={generateSessionCode} style={{ fontSize: 12, color: '#9333EA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Get phone upload code
                    </button>
                  )}
                </div>
              )}
              {photo && <p style={{ fontSize: 12, color: '#71717A' }}>Photo captured ✓</p>}
              <button type="button" onClick={photo ? analyzePhoto : () => setStep(2)} style={btnPrimary}>{analyzing ? 'Analyzing photo...' : photo ? 'Analyze & Continue' : 'Next: Hair Assessment'} <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 2: Hair Assessment */}
        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><ChartNoAxesColumn style={{ color: '#9333EA' }} /> Hair Assessment</h2>
            <p style={{ color: '#71717A', fontSize: 13, marginBottom: 16 }}>Texture, pattern, density, level & tone</p>
            {/* Texture */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Texture</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {TEXTURES.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, texture: o.value }))}
                    style={{ padding: 14, borderRadius: 12, border: fd.texture === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.texture === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: fd.texture === o.value ? '#9333EA' : '#F5F5F7', cursor: 'pointer', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Pattern */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Hair Pattern</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {HAIR_PATTERNS.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, hairPattern: o.value }))}
                    style={{ padding: 14, borderRadius: 12, border: fd.hairPattern === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.hairPattern === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: fd.hairPattern === o.value ? '#9333EA' : '#F5F5F7', cursor: 'pointer', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#71717A', marginBottom: 2 }}>{o.type}</p>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Density</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {DENSITIES.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, density: o.value }))}
                    style={{ padding: 14, borderRadius: 12, border: fd.density === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.density === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: fd.density === o.value ? '#9333EA' : '#F5F5F7', cursor: 'pointer', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Level */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Current Level</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(HAIR_LEVELS).map(([l, i]) => <HairSwatch key={l} color={i.hex} label={i.name} level={Number(l)} isActive={fd.currentLevel === Number(l)} onClick={() => setFd(p => ({ ...p, currentLevel: Number(l) }))} />)}
              </div>
            </div>

            {/* Current Tone */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Current Tone</Label>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
                <div style={{ cursor: 'pointer' }}>
                  <ColorWheel3D tones={TONES.map(t => ({ value: t.value, label: t.label, color: t.color }))} selected={fd.currentTone || 'N'} onSelect={(val) => { setFd(p => ({ ...p, currentTone: val })) }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 48 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {TONES.slice(0, 6).map(t => <ColorCircle key={t.value} color={t.color} label={t.label} isActive={fd.currentTone === t.value} onClick={() => setFd(p => ({ ...p, currentTone: t.value }))} />)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {TONES.slice(6, 12).map(t => <ColorCircle key={t.value} color={t.color} label={t.label} isActive={fd.currentTone === t.value} onClick={() => setFd(p => ({ ...p, currentTone: t.value }))} />)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button type="button" onClick={() => setStep(1)} style={btnOutline}><ChevronLeft size={16} /> Back</button>
              <button type="button" onClick={() => setStep(3)} style={btnPrimary}>Next: Chemical History <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 3: Chemical History */}
        {step === 3 && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical style={{ color: '#9333EA' }} /> Chemical History</h2>
            <p style={{ color: '#71717A', fontSize: 13, marginBottom: 24 }}>Past treatments that affect formulation</p>

            {/* Service Type */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'block' }}>Last Service</Label>
              <p style={{ color: '#71717A', fontSize: 12, marginBottom: 8 }}>What was your last color service?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {SERVICE_TYPES.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, serviceType: o.value }))}
                    style={{ padding: 14, borderRadius: 12, border: fd.serviceType === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.serviceType === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: fd.serviceType === o.value ? '#9333EA' : '#F5F5F7', cursor: 'pointer', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chemical History */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'block' }}>Chemical History</Label>
              <p style={{ color: '#71717A', fontSize: 12, marginBottom: 8 }}>Past treatments that affect formulation</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {CHEMICAL_HISTORY_ITEMS.map(o => {
                  const active = fd.chemicalHistory.includes(o.value)
                  return (
                    <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, chemicalHistory: active ? p.chemicalHistory.filter(v => v !== o.value) : [...p.chemicalHistory, o.value] }))}
                      style={{ padding: 14, borderRadius: 12, border: active ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: active ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: '#F5F5F7', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{o.warning && <AlertTriangle size={14} style={{ color: '#FBBF24' }} />}{o.label}</p>
                        <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: active ? 'none' : '2px solid rgba(255,255,255,0.2)', background: active ? '#9333EA' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {active && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sensitivities & Contraindications */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'block' }}>Sensitivities & Contraindications</Label>
              <p style={{ color: '#71717A', fontSize: 12, marginBottom: 8 }}>Safety-critical information</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {SENSITIVITIES.map(o => {
                  const active = fd.sensitivities.includes(o.value)
                  return (
                    <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, sensitivities: active ? p.sensitivities.filter(v => v !== o.value) : [...p.sensitivities, o.value] }))}
                      style={{ padding: 14, borderRadius: 12, border: active ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: active ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: '#F5F5F7', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: active ? 'none' : '2px solid rgba(255,255,255,0.2)', background: active ? '#9333EA' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {active && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{o.warning && <AlertTriangle size={14} style={{ color: '#FBBF24' }} />}{o.label}</p>
                        <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Last Chemical Service */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'block' }}>Last Chemical Service</Label>
              <p style={{ color: '#71717A', fontSize: 12, marginBottom: 8 }}>How recently was the last treatment?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LAST_CHEMICAL_TIMES.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, lastChemicalService: o.value }))}
                    style={{ padding: '8px 16px', borderRadius: 20, border: fd.lastChemicalService === o.value ? '1px solid rgba(147,51,234,0.6)' : '1px solid rgba(255,255,255,0.12)', background: fd.lastChemicalService === o.value ? 'rgba(30,30,45,0.6)' : 'rgba(30,30,45,0.6)', color: fd.lastChemicalService === o.value ? '#9333EA' : '#A1A1AA', cursor: 'pointer', fontSize: 13, fontWeight: fd.lastChemicalService === o.value ? 600 : 400 }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setStep(2)} style={btnOutline}><ChevronLeft size={16} /> Back</button>
              <button type="button" onClick={() => setStep(4)} style={btnPrimary}>Next: Target Look <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 4: Target Look */}
        {step === 4 && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Target style={{ color: '#9333EA' }} /> Target Look</h2>
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Target Level</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(HAIR_LEVELS).map(([l, i]) => <HairSwatch key={l} color={i.hex} label={i.name} level={Number(l)} isActive={fd.targetLevel === Number(l)} onClick={() => setFd(p => ({ ...p, targetLevel: Number(l) }))} />)}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Target Tone</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  {TONES.slice(0, 6).map(t => <ColorCircle key={t.value} color={t.color} label={t.label} isActive={fd.targetTone === t.value} onClick={() => setFd(p => ({ ...p, targetTone: t.value }))} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  {TONES.slice(6, 12).map(t => <ColorCircle key={t.value} color={t.color} label={t.label} isActive={fd.targetTone === t.value} onClick={() => setFd(p => ({ ...p, targetTone: t.value }))} />)}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Brand</Label>
                <Select value={fd.brandPreference} onValueChange={v => setFd(p => ({ ...p, brandPreference: v, linePreference: '' }))}>
                  <SelectTrigger style={{ background: 'rgba(30,30,45,0.6)', borderColor: 'rgba(255,255,255,0.08)', color: '#F5F5F7', width: '100%' }}><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent style={{ background: 'rgba(30,30,45,0.9)' }}>{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Line</Label>
                <Select value={fd.linePreference} onValueChange={v => setFd(p => ({ ...p, linePreference: v }))} disabled={!fd.brandPreference}>
                  <SelectTrigger style={{ background: 'rgba(30,30,45,0.6)', borderColor: 'rgba(255,255,255,0.08)', color: '#F5F5F7', width: '100%' }}><SelectValue placeholder={fd.brandPreference ? "Select line" : "Select brand first"} /></SelectTrigger>
                  <SelectContent style={{ background: 'rgba(30,30,45,0.9)' }}>{(LINES_BY_BRAND[fd.brandPreference] || []).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Level Change</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
              <div>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: blendColor(HAIR_LEVELS[fd.currentLevel]?.hex, TONES.find(t => t.value === fd.currentTone)?.color || '#9C8B7A'), border: '2px solid rgba(255,255,255,0.08)' }} />
                <p style={{ fontSize: 10, color: '#71717A', marginTop: 4, textAlign: 'center' }}>{TONES.find(t => t.value === fd.currentTone)?.label}</p>
              </div>
              <div style={{ fontSize: 12, color: '#71717A', textAlign: 'center' }}>Level {fd.currentLevel} → Level {fd.targetLevel} ({lvlDiff > 0 ? '+' : ''}{lvlDiff})</div>
              <div>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: blendColor(HAIR_LEVELS[fd.targetLevel]?.hex, TONES.find(t => t.value === fd.targetTone)?.color || '#9C8B7A'), border: '2px solid rgba(147,51,234,0.4)' }} />
                <p style={{ fontSize: 10, color: '#9333EA', marginTop: 4, textAlign: 'center' }}>{TONES.find(t => t.value === fd.targetTone)?.label}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setStep(3)} style={btnOutline}><ChevronLeft size={16} /> Back</button>
              <button type="button" onClick={() => setStep(5)} style={btnPrimary}>Next: Condition <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 5: Condition */}
        {step === 5 && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><ChartNoAxesColumn style={{ color: '#9333EA' }} /> Hair Condition</h2>
            <p style={{ color: '#71717A', fontSize: 13, marginBottom: 24 }}>Assess the hair's condition and history. These details directly affect the formula.</p>

            {/* Hair Condition */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'block' }}>Hair Condition</Label>
              <p style={{ color: '#71717A', fontSize: 12, marginBottom: 8 }}>Current state of the hair</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {CONDITION_TYPES.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, condition: { ...p.condition, type: o.value } }))}
                    style={{ padding: 12, borderRadius: 12, border: fd.condition.type === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.condition.type === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: fd.condition.type === o.value ? '#9333EA' : '#F5F5F7', cursor: 'pointer', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 10, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Porosity */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Porosity</Label>
              <div style={{ display: 'flex', gap: 12 }}>
                {POROSITY.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, condition: { ...p.condition, porosity: o.value } }))}
                    style={{ flex: 1, padding: 16, borderRadius: 12, border: fd.condition.porosity === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.condition.porosity === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: o.color, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: fd.condition.porosity === o.value ? '#F5F5F7' : '#A1A1AA' }}>{o.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Gray Coverage */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600 }}>Gray Coverage</Label>
                <span style={{ color: '#F5F5F7', fontWeight: 'bold' }}>{fd.condition.grayPercent}%</span>
              </div>
              <input type="range" min={0} max={100} value={fd.condition.grayPercent} onChange={e => setFd(p => ({ ...p, condition: { ...p.condition, grayPercent: Number(e.target.value) } }))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: "#71717A", marginTop: 4 }}><span>No gray</span><span>Partial</span><span>Full coverage needed</span></div>
            </div>

            {/* Highlights */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input type="checkbox" id="hl" checked={fd.condition.highlights} onChange={e => setFd(p => ({ ...p, condition: { ...p.condition, highlights: e.target.checked } }))} style={{ accentColor: '#9333EA' }} />
              <label htmlFor="hl" style={{ fontSize: 14, color: '#F5F5F7', cursor: 'pointer' }}>Highlights Present</label>
            </div>

            {/* Problem Indicators */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'block' }}>Problem Indicators</Label>
              <p style={{ color: '#71717A', fontSize: 12, marginBottom: 8 }}>Select any issues present</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {PROBLEM_INDICATORS.map(o => {
                  const active = (fd.condition as any)[o.field]
                  return (
                    <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, condition: { ...p.condition, [o.field]: !active } }))}
                      style={{ padding: 12, borderRadius: 12, border: active ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: active ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: '#F5F5F7', cursor: 'pointer', textAlign: 'center' }}>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>{o.label}</p>
                      <p style={{ fontSize: 10, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Consultation Summary */}
            <div style={{ background: 'rgba(22,22,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Consultation Summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 13 }}>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Current</span><span>Level {fd.currentLevel} {TONES.find(t => t.value === fd.currentTone)?.label || fd.currentTone}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Target</span><span style={{ color: '#9333EA' }}>Level {fd.targetLevel} {TONES.find(t => t.value === fd.targetTone)?.label || fd.targetTone}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Texture</span><span style={{ textTransform: 'capitalize' }}>{TEXTURES.find(h => h.value === fd.texture)?.label || fd.texture}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Pattern</span><span style={{ textTransform: 'capitalize' }}>{HAIR_PATTERNS.find(h => h.value === fd.hairPattern)?.label || fd.hairPattern}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Density</span><span style={{ textTransform: 'capitalize' }}>{DENSITIES.find(h => h.value === fd.density)?.label || fd.density}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Condition</span><span style={{ textTransform: 'capitalize' }}>{CONDITION_TYPES.find(c => c.value === fd.condition.type)?.label || fd.condition.type.replace('_', ' ')}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Porosity</span><span style={{ textTransform: 'capitalize' }}>{fd.condition.porosity}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Gray</span><span>{fd.condition.grayPercent}%</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Service</span><span style={{ textTransform: 'capitalize' }}>{SERVICE_TYPES.find(s => s.value === fd.serviceType)?.label || fd.serviceType.replace('_', ' ')}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Chemical History</span><span>{fd.chemicalHistory.length === 0 ? 'None' : fd.chemicalHistory.map(v => CHEMICAL_HISTORY_ITEMS.find(c => c.value === v)?.label || v).join(', ')}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Sensitivities</span><span>{fd.sensitivities.length === 0 ? 'None' : fd.sensitivities.map(v => SENSITIVITIES.find(s => s.value === v)?.label || v).join(', ')}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Last Service</span><span>{LAST_CHEMICAL_TIMES.find(t => t.value === fd.lastChemicalService)?.label || fd.lastChemicalService.replace('_', ' ')}</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setStep(4)} style={btnOutline}><ChevronLeft size={16} /> Back</button>
              <button type="button" onClick={handleSubmit} disabled={loading} style={btnPrimary}>
                {loading ? <><Sparkles className="animate-spin" size={16} /> Generating...</> : <>Generate Formula <FlaskConical size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Results */}
        {step === 6 && result && (
          <div style={{ ...card, padding: 32 }}>
            {/* Header with Edit/Mix toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'white', borderRadius: 4, fontSize: 11, fontWeight: 'bold', color: 'black', fontFamily: 'system-ui, sans-serif' }}>Ai</span><span>Your Formula</span></h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setFormulaView('edit')} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: formulaView === 'edit' ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: formulaView === 'edit' ? 'rgba(147,51,234,0.1)' : 'transparent', color: formulaView === 'edit' ? '#9333EA' : '#71717A', cursor: 'pointer' }}>Edit</button>
                <button type="button" onClick={() => setFormulaView('bowl')} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: formulaView === 'bowl' ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: formulaView === 'bowl' ? 'rgba(147,51,234,0.1)' : 'transparent', color: formulaView === 'bowl' ? '#9333EA' : '#71717A', cursor: 'pointer' }}>Mix</button>
              </div>
            </div>
            {/* Hard Stops */}
            {result.hardStops && result.hardStops.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#EF4444', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🛑 Safety Stops</h3>
                {result.hardStops.map((stop: any, i: number) => (
                  <div key={i} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <p style={{ color: '#F5F5F7', fontSize: 14 }}>{stop.message}</p>
                    <p style={{ color: '#A1A1AA', fontSize: 12, marginTop: 4, textTransform: 'capitalize' }}>{stop.type}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Safer Alternatives */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#10B981', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>💡 Safer Alternatives</h3>
                {result.alternatives.map((alt: string, i: number) => (
                  <div key={i} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <p style={{ color: '#F5F5F7', fontSize: 14 }}>{alt}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings (card style) */}
            {result.warnings && result.warnings.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#F59E0B', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>⚠️ Warnings</h3>
                {result.warnings.map((w: string, i: number) => (
                  <div key={i} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <p style={{ color: '#F5F5F7', fontSize: 14 }}>{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Professional Assessment */}
            {result.assessment && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#3B82F6', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Professional Assessment</h3>
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 16 }}>
                  <p style={{ color: '#F5F5F7', fontSize: 14, lineHeight: 1.6 }}>{result.assessment}</p>
                </div>
              </div>
            )}

            {/* Strand Test Recommended */}
            {result.strandTestRecommended && (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🔬</span>
                <span style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600 }}>Strand Test Recommended</span>
              </div>
            )}

            {/* Underlying Pigment */}
            {result.underlyingPigment && (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p style={{ color: '#71717A', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Underlying Pigment</p>
                <p style={{ color: '#F5F5F7', fontSize: 14 }}>{result.underlyingPigment.description}</p>
              </div>
            )}

            {/* Product Quantity */}
            {result.quantity && (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p style={{ color: '#71717A', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Product Quantity</p>
                <p style={{ color: '#F5F5F7', fontSize: 14 }}>{result.quantity.description}</p>
              </div>
            )}

            {/* Multi-Session Plan */}
            {result.multiSessionPlan && result.multiSessionPlan.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#F5F5F7', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📋 Multi-Session Plan</h3>
                {result.multiSessionPlan.map((step: string, i: number) => (
                  <div key={i} style={{ background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(147,51,234,0.2)', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>{i + 1}</span>
                    <p style={{ color: '#F5F5F7', fontSize: 14 }}>{step}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings inline (legacy style) */}
            {result.warnings?.map((w: string, i: number) => <div key={`w-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FBBF24', marginBottom: 8 }}><AlertTriangle size={16} /><span>{w}</span></div>)}

            {/* Visual Outcome Simulator */}
            <VisualOutcomeSimulator input={fd as any} result={result} />

            {/* Brand Conversion */}
            <div style={{ marginBottom: 0, padding: 16, background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F7', marginBottom: 6 }}>🔄 Brand Conversion</h3>
              <p style={{ fontSize: 14, color: '#A1A1AA', marginBottom: 12 }}>Convert this formula to a different brand's equivalent shades.</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select
                  value={convertTargetBrand}
                  onChange={e => setConvertTargetBrand(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(22,22,32,0.8)', color: '#F5F5F7', fontSize: 14, cursor: 'pointer' }}
                >
                  <option value="">Select target brand...</option>
                  {brands.filter(b => b !== result.brand).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleConvertBrand}
                  className="convert-formula-btn"
                  disabled={!convertTargetBrand || converting}
                  style={{ padding: '10px 20px', borderRadius: 10, backgroundColor: '#9333EA', color: 'white', border: 'none', fontWeight: 600, fontSize: 14, cursor: !convertTargetBrand || converting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >Convert Formula</button>
              </div>
              {conversionResult && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.2)', borderRadius: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#9333EA', marginBottom: 8 }}>Converted to {convertTargetBrand}</p>
                  {conversionResult.shades?.map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < conversionResult.shades.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <span style={{ fontSize: 13, color: '#F5F5F7' }}>{s.shadeCode} — {s.shadeName}</span>
                      <span style={{ fontSize: 12, color: '#71717A' }}>{s.grams}g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stock Check */}
            <div style={{ marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <StockCheck
                steps={result.steps || []}
                salonId={salonId}
                onAcceptAlternative={(originalCode, altCode) => {
                  setFormulaIngredients(prev => prev.map(ing =>
                    ing.shadeCode === originalCode ? { ...ing, shadeCode: altCode, name: altCode } : ing
                  ))
                  toast({ title: 'Alternative applied', description: `Swapped ${originalCode} → ${altCode}` })
                }}
              />
            </div>

            {formulaView === 'edit' ? (
              <EditFormula
                ingredients={formulaIngredients}
                developer={formulaDeveloper}
                mixingRatio={formulaRatio}
                onIngredientsChange={setFormulaIngredients}
                onDeveloperChange={setFormulaDeveloper}
                onRatioChange={setFormulaRatio}
                onAddProduct={() => setShowProductSearch(true)}
                onSave={handleSaveFormula}
                onStartWeighing={() => setFormulaView('bowl')}
              />
            ) : (
              <ScaleBowl
                ingredients={formulaIngredients.map((i, idx) => ({ ...i, order: idx })) as BowlIngredient[]}
                onComplete={(weights) => console.log('Final weights:', weights)}
              />
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => { setResult(null); setFormulaIngredients([]); setFormulaView('edit'); setSaved(false); setFormulationId(null); setClientId(null); setClientName(''); setClientPhone(''); setStep(1) }} style={{ ...btnOutline, flex: 1, justifyContent: 'center' }}><RotateCcw size={14} /> New Formula</button>
              <button type="button" onClick={handleSaveFormula} disabled={saving || saved} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: saved ? 0.6 : 1 }}><Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save to Library'}</button>
            </div>

            {/* Phase 1 item 6: result-screen → capture handoff */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={handlePhotographResult} style={{ ...btnPrimary, justifyContent: 'center', width: '100%' }}><Camera size={14} /> Photograph this result</button>
              {!sessionId && !formulationId && (
                <p style={{ color: '#71717A', fontSize: 12, textAlign: 'center', margin: 0 }}>Save the formula first to link the photo to this result.</p>
              )}
            </div>

            {/* Contextual Education */}
            {result && formulaIngredients.length > 0 && (
              <ContextualEducation
                brand={result.brand || fd.brandPreference || ''}
                service={fd.serviceType || ''}
                shades={formulaIngredients.map(i => i.shadeCode).filter(Boolean)}
                hairType={`${fd.texture || ''}_${fd.hairPattern || ''}`}
                compact={false}
              />
            )}

            {/* Corrective Color Assistant */}
            {result && (
              <CorrectiveColorPanel
                hairState={{
                  currentLevel: fd.currentLevel,
                  currentTone: fd.currentTone as any,
                  targetLevel: fd.targetLevel,
                  targetTone: fd.targetTone as any,
                  porosity: fd.condition.porosity as 'low' | 'normal' | 'high',
                  condition: fd.condition.type,
                  banding: fd.condition.banding || false,
                  hotRoots: fd.condition.hotRoots || false,
                  previousLightener: fd.condition.previousLightener || false,
                  multipleColors: fd.condition.multipleColors || false,
                }}
                onApplyFix={(fix) => {
                  toast({
                    title: `Applied: ${fix.name}`,
                    description: fix.neutralizationStrategy.slice(0, 80) + '...',
                  })
                }}
              />
            )}
          </div>
        )}

        {/* ProductSearch Modal */}
        {showProductSearch && (
          <ProductSearch
            salonId={salonId}
            onSelect={handleProductSelect}
            onClose={() => setShowProductSearch(false)}
            excludeIds={formulaIngredients.map(i => i.shadeCode)}
          />
        )}
      </div>
    </div>
  )
}

export default function FormulatePage() {
  return (
    <Suspense fallback={null}>
      <FormulatePageContent />
    </Suspense>
  )
}
