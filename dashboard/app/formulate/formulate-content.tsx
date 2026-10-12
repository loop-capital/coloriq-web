'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { HAIR_LEVELS, BRANDS, LINES_BY_BRAND } from '@/lib/products'
import { blendColor } from '@/lib/color-utils'
import { HairSwatch } from '@/components/ui/hair-swatch'
import { ColorCircle } from '@/components/ui/color-circle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ColorWheel3D } from '@/components/custom'
import { ScaleWidget } from '@/components/scale-widget'
import { EditFormula, type FormulaIngredient } from '@/components/edit-formula'
import { ScaleBowl, type BowlIngredient } from '@/components/scale-bowl'
import { Camera, Upload, X, Sparkles, Droplets, FlaskConical, ChevronRight, ChevronLeft, RotateCcw, Save, AlertTriangle, Smartphone, User, Search, UserPlus, Target, LoaderCircle, ChartNoAxesColumn } from 'lucide-react'
import { ProductSearch, type SelectedProduct } from '@/components/product-search'
import { StockCheck } from '@/components/stock-check'
import CorrectiveColorPanel, { CorrectiveBadge } from '@/lib/corrective-color/CorrectiveColorPanel'
import { diagnose, type CorrectiveIssue, type HairState } from '@/lib/corrective-color/engine'
import type { ToneFamily } from '@/lib/products'
import VisualOutcomeSimulator from '@/components/visual-outcome/VisualOutcomeSimulator'
import ConversionPanel from '@/components/conversion/ConversionPanel'
import ContextualEducation from '@/components/education/ContextualEducation'

const STEPS = [
  { id: 1, title: 'Photo', desc: 'Capture or upload hair photo' },
  { id: 2, title: 'Hair Assessment', desc: 'Texture, pattern, density, level & tone' },
  { id: 3, title: 'Chemical History', desc: 'Past treatments & sensitivities' },
  { id: 4, title: 'Target Look', desc: 'Desired color result' },
  { id: 5, title: 'Condition', desc: 'Hair health & problem indicators' },
  { id: 6, title: 'Results', desc: 'Your custom formula' },
]

type ConditionType = 'virgin' | 'previously_colored' | 'damaged' | 'highly_damaged' | 'bleached' | 'gray_coverage' | 'oily_scalp' | 'dry_brittle'
type PorosityType = 'low' | 'normal' | 'high'
type TextureType = 'fine' | 'medium' | 'coarse'
type HairPatternType = 'straight' | 'wavy' | 'curly' | 'coily'
type DensityType = 'thin' | 'medium' | 'thick'
type ServiceType = 'full_head' | 'retouch' | 'balayage' | 'foils' | 'corrective' | 'gloss_toner'
type LastServiceType = 'this_week' | '1-2_weeks' | '3-4_weeks' | '1-3_months' | '3-6_months' | '6+_months' | 'never'

const TEXTURES = [
  { value: 'fine' as TextureType, label: 'Fine', desc: 'Thin strands, processes faster' },
  { value: 'medium' as TextureType, label: 'Medium', desc: 'Average strand diameter' },
  { value: 'coarse' as TextureType, label: 'Coarse', desc: 'Thick strands, takes longer' },
]

const HAIR_PATTERNS = [
  { value: 'straight' as HairPatternType, label: 'Straight', desc: 'Type 1' },
  { value: 'wavy' as HairPatternType, label: 'Wavy', desc: 'Type 2' },
  { value: 'curly' as HairPatternType, label: 'Curly', desc: 'Type 3' },
  { value: 'coily' as HairPatternType, label: 'Coily', desc: 'Type 4' },
]

const DENSITIES = [
  { value: 'thin' as DensityType, label: 'Thin', desc: 'Low density' },
  { value: 'medium' as DensityType, label: 'Medium', desc: 'Average density' },
  { value: 'thick' as DensityType, label: 'Thick', desc: 'High density' },
]

const SERVICE_TYPES = [
  { value: 'full_head' as ServiceType, label: 'Full Head', desc: 'All-over application' },
  { value: 'retouch' as ServiceType, label: 'Retouch', desc: 'Root regrowth only' },
  { value: 'balayage' as ServiceType, label: 'Balayage', desc: 'Hand-painted highlights' },
  { value: 'foils' as ServiceType, label: 'Foils', desc: 'Foil highlights/lowlights' },
  { value: 'corrective' as ServiceType, label: 'Corrective', desc: 'Color correction' },
  { value: 'gloss_toner' as ServiceType, label: 'Gloss/Toner', desc: 'Tone refresh or gloss' },
]

const SENSITIVITIES = [
  { value: 'ppdAllergy', label: 'PPD Allergy', desc: 'Allergic to PPD — use PPD-free alternatives', icon: '⚠️' },
  { value: 'pregnancy', label: 'Pregnancy', desc: 'Client is pregnant', icon: '🤰' },
  { value: 'breastfeeding', label: 'Breastfeeding', desc: 'Client is breastfeeding', icon: '🤱' },
  { value: 'activeChemo', label: 'Active Chemotherapy', desc: 'Currently receiving chemo', icon: '⚕️' },
]

const CHEMICAL_HISTORY = [
  { value: 'boxDye', label: '⚠️ Box Dye', desc: 'Drugstore/home color kit — MAJOR HAZARD', danger: true },
  { value: 'metallicSalts', label: 'Metallic Salts', desc: 'Metallic dye or mineral buildup — HARD STOP for lightening', danger: true },
  { value: 'henna', label: 'Henna', desc: 'Henna color — lightener = green disaster', danger: true },
  { value: 'keratinTreatment', label: 'Keratin Treatment', desc: 'Keratin smoothing in last 6 months', danger: false },
  { value: 'relaxer', label: 'Relaxer / Straightening', desc: 'Chemical relaxer or Japanese straightening', danger: false },
  { value: 'hardWater', label: 'Hard Water', desc: 'Hard water or well water at home', danger: false },
  { value: 'medicationBuildup', label: 'Medication/Mineral Buildup', desc: 'Thyroid meds, iron, copper, etc.', danger: false },
]

const LAST_SERVICE_OPTIONS = [
  { value: 'never' as LastServiceType, label: 'Never' },
  { value: '6+_months' as LastServiceType, label: '6+ months ago' },
  { value: '3-6_months' as LastServiceType, label: '3–6 months ago' },
  { value: '1-3_months' as LastServiceType, label: '1–3 months ago' },
  { value: '3-4_weeks' as LastServiceType, label: '3–4 weeks ago' },
  { value: '1-2_weeks' as LastServiceType, label: '1–2 weeks ago' },
  { value: 'this_week' as LastServiceType, label: 'This week' },
]

const CONDITION_TYPES = [
  { value: 'virgin' as ConditionType, label: 'Virgin Hair', desc: 'Never chemically treated' },
  { value: 'bleached' as ConditionType, label: 'Bleached/Lightened', desc: 'Lifted from natural' },
  { value: 'gray_coverage' as ConditionType, label: 'Gray Coverage Needed', desc: 'Requires gray blending or coverage' },
  { value: 'oily_scalp' as ConditionType, label: 'Oily Scalp', desc: 'Excess sebum production on scalp' },
  { value: 'previously_colored' as ConditionType, label: 'Previously Colored', desc: 'Has existing color deposit' },
  { value: 'damaged' as ConditionType, label: 'Damaged', desc: 'Over-processed or compromised' },
  { value: 'dry_brittle' as ConditionType, label: 'Dry/Brittle', desc: 'Lacks moisture, prone to breakage' },
  { value: 'highly_damaged' as ConditionType, label: 'Highly Damaged', desc: 'Severely compromised, needs repair' },
]

const POROSITY = [
  { value: 'low' as PorosityType, label: 'Low', color: '#9333EA' },
  { value: 'normal' as PorosityType, label: 'Normal', color: '#F59E0B' },
  { value: 'high' as PorosityType, label: 'High', color: '#EF4444' },
]

const TONES = [
  { value: 'N', label: 'Natural', color: '#9C8B7A' }, { value: 'A', label: 'Ash', color: '#8A7D6E' },
  { value: 'G', label: 'Gold', color: '#C4A35A' }, { value: 'K', label: 'Copper', color: '#B87333' },
  { value: 'R', label: 'Red', color: '#A03030' }, { value: 'V', label: 'Violet', color: '#7B68A6' },
  { value: 'P', label: 'Pearl', color: '#B8B0C4' }, { value: 'B', label: 'Beige', color: '#C4B5A0' },
  { value: 'M', label: 'Mahogany', color: '#6B3A3A' }, { value: 'Ch', label: 'Chocolate', color: '#4A2C2A' },
  { value: 'W', label: 'Warm', color: '#D4A574' }, { value: 'C', label: 'Cool', color: '#7D8B9A' },
]

const PROBLEM_INDICATORS = [
  { key: 'banding', label: 'Banding', desc: 'Visible color bands from overlapping' },
  { key: 'hotRoots', label: 'Hot Roots', desc: 'Warmer/lighter roots than mids' },
  { key: 'previousLightener', label: 'Previous Lightener', desc: 'Has bleach/lightener in hair' },
  { key: 'multipleColors', label: 'Multiple Colors', desc: 'Different colors on different sections' },
  { key: 'greenCast', label: 'Green Cast', desc: 'Unwanted green tone present' },
  { key: 'muddyToner', label: 'Muddy Toner', desc: 'Toner has gone muddy/ashy' },
  { key: 'overAshy', label: 'Over-Ashy', desc: 'Too cool/gray result' },
  { key: 'colorGrab', label: 'Color Grab', desc: 'Ends absorbing color unevenly' },
  { key: 'hollowEnds', label: 'Hollow Ends', desc: 'Ends appear hollow or see-through' },
]

// Brands & lines now fetched from API (salon inventory)

const toneMap: Record<string, ToneFamily> = { N: 'neutral', A: 'ash', G: 'golden', R: 'red', V: 'violet', K: 'copper', B: 'beige', P: 'pearl', M: 'mahogany', Ch: 'chocolate', W: 'warm', C: 'cool' }
const revToneMap: Record<string, string> = { neutral: 'N', ash: 'A', golden: 'G', red: 'R', violet: 'V', copper: 'K', beige: 'B', pearl: 'P', mahogany: 'M', chocolate: 'Ch', warm: 'W', cool: 'C' }

const card = { background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 32px' }

// Blend level base color with tone color (toneWeight 0-1, higher = more tone influence)
// Re-exported from color-utils for backwards compatibility
export { blendColor } from '@/lib/color-utils'
const btnPrimary = { padding: '12px 24px', background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold' as const, cursor: 'pointer' as const, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }
const btnOutline = { padding: '12px 24px', border: '1px solid rgba(255,255,255,0.12)', color: '#A1A1AA', borderRadius: 12, cursor: 'pointer' as const, background: 'transparent', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }
const btnPinkOutline = { padding: '12px 24px', border: '1px solid rgba(236,72,153,0.4)', color: '#EC4899', borderRadius: 12, cursor: 'pointer' as const, background: 'transparent', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }
const btnPurpleOutline = { padding: '12px 24px', border: '1.5px solid #9333EA', color: '#9333EA', borderRadius: 12, cursor: 'pointer' as const, background: 'transparent', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }

export default function FormulatePage() {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [photo, setPhoto] = useState<string | null>(null)
  const [fd, setFd] = useState({
    currentLevel: 5, currentTone: 'N', targetLevel: 7, targetTone: 'N',
    texture: 'medium' as TextureType, hairPattern: 'straight' as HairPatternType, density: 'medium' as DensityType,
    serviceType: 'full_head' as ServiceType,
    condition: { type: 'previously_colored' as ConditionType, porosity: 'normal' as PorosityType, grayPercent: 0, highlights: false, highlightedPercent: 0, banding: false, hotRoots: false, previousLightener: false, multipleColors: false, greenCast: false, muddyToner: false, overAshy: false, colorGrab: false, hollowEnds: false },
    brandPreference: '', linePreference: '',
    sensitivity: { ppdAllergy: false, pregnancy: false, breastfeeding: false, activeChemo: false },
    chemicalHistory: { boxDye: false, metallicSalts: false, henna: false, keratinTreatment: false, relaxer: false, hardWater: false, medicationBuildup: false, lastService: 'never' as LastServiceType },
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formulaView, setFormulaView] = useState<'edit' | 'bowl'>('edit')
  const [formulaIngredients, setFormulaIngredients] = useState<FormulaIngredient[]>([])
  const [formulaDeveloper, setFormulaDeveloper] = useState({ name: '20 Vol Cream', volume: 20 })
  const [formulaRatio, setFormulaRatio] = useState('1:1.5')
  const [brands, setBrands] = useState<string[]>(BRANDS)
  const [shades, setShades] = useState<Array<{shadeCode: string; shadeName: string; quantity: number; line?: string | null}>>([])
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [salonId, setSalonId] = useState<string>('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Array<{id: string; name: string; phone?: string}>>([])
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [listed, setListed] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualProducts, setManualProducts] = useState<Array<{ brand: string; shadeCode: string; shadeName: string; grams: number; developerVol: number; processingTime: string; notes: string }>>([{
    brand: '', shadeCode: '', shadeName: '', grams: 20, developerVol: 20, processingTime: '30 min', notes: ''
  }])

  // Fetch salon context and available brands on mount
  useEffect(() => {
    (async () => {
      try {
        const authRes = await fetch('/api/auth/me')
        const authData = await authRes.json()
        const userId = authData?.user?.id || 'default'
        setSalonId(userId)

        // Fetch salon's configured brands
        const brandsRes = await fetch(`/api/user/brands?salonId=${userId}`)
        const brandsData = await brandsRes.json()
        if (brandsData?.brands?.length > 0) {
          setBrands(brandsData.brands)
        }
      } catch (e) { /* non-critical — falls back to all brands */ }
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

  const selectClient = (c: { id: string; name: string; phone?: string }) => {
    setClientId(c.id)
    setClientName(c.name)
    setClientPhone(c.phone || '')
    setShowClientSearch(false)
    setClientSearch('')
    setClientResults([])
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

  const handleListMarketplace = async () => {
    if (saving || listed) return
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
          isPublic: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setListed(true)
        if (data.clientId && !clientId) setClientId(data.clientId)
        toast({ title: 'Listed', description: 'Formula listed on marketplace!' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to list', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
    setSaving(false)
  }

  // Generate session code for phone upload
  const generateSessionCode = async () => {
    try {
      const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salonId: 'default' }) })
      const data = await res.json()
      if (data.code) setSessionCode(data.code)
    } catch (e) { console.error('Failed to generate session code:', e) }
  }

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

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fd,
          chemical_history: fd.chemicalHistory,
          sensitivity_flags: fd.sensitivity,
          service_type: fd.serviceType,
          texture: fd.texture,
          hair_pattern: fd.hairPattern,
          density: fd.density,
        })
      })
      if (!res.ok) throw new Error('Formulation failed')
      const data = await res.json()
      setResult(data.data)
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

  // Helper to get checked chemical history labels
  const getCheckedChemicalHistory = () => {
    return CHEMICAL_HISTORY.filter(ch => fd.chemicalHistory[ch.value as keyof typeof fd.chemicalHistory]).map(ch => ch.label)
  }

  // Helper to get checked sensitivity labels
  const getCheckedSensitivities = () => {
    return SENSITIVITIES.filter(s => fd.sensitivity[s.value as keyof typeof fd.sensitivity]).map(s => s.label)
  }

  // Reset handler
  const handleReset = () => {
    setFd({
      currentLevel: 5, currentTone: 'N', targetLevel: 7, targetTone: 'N',
      texture: 'medium', hairPattern: 'straight', density: 'medium',
      serviceType: 'full_head',
      condition: { type: 'previously_colored', porosity: 'normal', grayPercent: 0, highlights: false, highlightedPercent: 0, banding: false, hotRoots: false, previousLightener: false, multipleColors: false, greenCast: false, muddyToner: false, overAshy: false, colorGrab: false, hollowEnds: false },
      brandPreference: '', linePreference: '',
      sensitivity: { ppdAllergy: false, pregnancy: false, breastfeeding: false, activeChemo: false },
      chemicalHistory: { boxDye: false, metallicSalts: false, henna: false, keratinTreatment: false, relaxer: false, hardWater: false, medicationBuildup: false, lastService: 'never' },
    })
    setResult(null)
    setPhoto(null)
    setStep(1)
    setSaved(false)
    setListed(false)
    setManualEntry(false)
    setManualProducts([{ brand: '', shadeCode: '', shadeName: '', grams: 20, developerVol: 20, processingTime: '30 min', notes: '' }])
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F5F5F7', padding: '16px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 4 }}>Create <span style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Formulation</span></h1>
            <p style={{ color: '#A1A1AA', fontSize: 14 }}>Formulate with absolute precision in 6 steps</p>
          </div>
          <button type="button" onClick={handleReset} style={btnOutline}><RotateCcw size={14} /> Reset</button>
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

        {/* Step indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: '#9333EA', color: '#fff' }}>
                {step}
              </div>
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
            <div className="h-1.5 rounded-full transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', width: `${(step / STEPS.length) * 100}%` }} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#71717A' }}>Phone upload code:</span>
                      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: '#9333EA', fontFamily: 'monospace' }}>{sessionCode}</span>
                      <span style={{ fontSize: 11, color: '#71717A' }}>→ coloriq.co/c</span>
                    </div>
                  ) : (
                    <button type="button" onClick={generateSessionCode} style={{ fontSize: 12, color: '#9333EA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Get phone upload code
                    </button>
                  )}
                </div>
              )}
              {photo && <p style={{ fontSize: 12, color: '#71717A' }}>Photo captured ✓</p>}
              <button type="button" onClick={() => setStep(2)} style={btnPrimary}>Next: Hair Assessment <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 2: Hair Assessment */}
        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ChartNoAxesColumn style={{ color: '#9333EA' }} /> Hair Assessment</h2>
            <p style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 24 }}>Texture, pattern, density, level & tone</p>

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
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
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
            <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical style={{ color: '#9333EA' }} /> Chemical History</h2>
            <p style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 24 }}>Past treatments that affect formulation</p>

            {/* A. Service Type */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Service Type</h3>
              <p style={{ color: '#71717A', fontSize: 13, marginBottom: 12 }}>What type of service are you performing?</p>
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

            {/* B. Chemical History */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Chemical History</h3>
              <p style={{ color: '#71717A', fontSize: 13, marginBottom: 12 }}>Past treatments that affect formulation</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {CHEMICAL_HISTORY.map(ch => {
                  const isActive = fd.chemicalHistory[ch.value as keyof typeof fd.chemicalHistory] as boolean
                  const isDanger = ch.danger
                  return (
                    <button type="button" key={ch.value} onClick={() => setFd(p => ({ ...p, chemicalHistory: { ...p.chemicalHistory, [ch.value]: !isActive } }))}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: isActive
                          ? (isDanger ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(147,51,234,0.4)')
                          : '1px solid rgba(255,255,255,0.06)',
                        background: isActive
                          ? (isDanger ? 'rgba(239,68,68,0.08)' : 'rgba(147,51,234,0.08)')
                          : 'rgba(30,30,45,0.6)',
                        color: isActive ? (isDanger ? '#EF4444' : '#9333EA') : '#F5F5F7',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{ch.label}</p>
                        <p style={{ fontSize: 11, color: isActive ? (isDanger ? 'rgba(239,68,68,0.7)' : 'rgba(147,51,234,0.7)') : '#71717A', marginTop: 2 }}>{ch.desc}</p>
                      </div>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: isActive ? (isDanger ? '2px solid #EF4444' : '2px solid #9333EA') : '2px solid rgba(255,255,255,0.2)',
                        background: isActive ? (isDanger ? '#EF4444' : '#9333EA') : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        {isActive && <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* C. Sensitivity Flags */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sensitivities & Contraindications</h3>
              <p style={{ color: '#71717A', fontSize: 13, marginBottom: 12 }}>Safety-critical information</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SENSITIVITIES.map(s => {
                  const isActive = fd.sensitivity[s.value as keyof typeof fd.sensitivity] as boolean
                  return (
                    <label key={s.value} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: isActive ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      background: isActive ? 'rgba(239,68,68,0.05)' : 'rgba(30,30,45,0.6)',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={e => setFd(p => ({ ...p, sensitivity: { ...p.sensitivity, [s.value]: e.target.checked } }))}
                        style={{ accentColor: '#EF4444', width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 16, marginRight: 4 }}>{s.icon}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F7', margin: 0 }}>{s.label}</p>
                        <p style={{ fontSize: 11, color: '#71717A', margin: 0 }}>{s.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* D. Last Service Date */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Last Chemical Service</h3>
              <p style={{ color: '#71717A', fontSize: 13, marginBottom: 12 }}>How recently was the last treatment?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LAST_SERVICE_OPTIONS.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, chemicalHistory: { ...p.chemicalHistory, lastService: o.value } }))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      border: fd.chemicalHistory.lastService === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      background: fd.chemicalHistory.lastService === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)',
                      color: fd.chemicalHistory.lastService === o.value ? '#9333EA' : '#F5F5F7',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
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
            <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ChartNoAxesColumn style={{ color: '#9333EA' }} /> Hair Condition</h2>
            <p style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 24 }}>Assess the hair's condition and history. These details directly affect the formula.</p>

            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Hair Condition</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {CONDITION_TYPES.map(o => (
                  <button type="button" key={o.value} onClick={() => setFd(p => ({ ...p, condition: { ...p.condition, type: o.value } }))}
                    style={{ padding: 14, borderRadius: 12, border: fd.condition.type === o.value ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: fd.condition.type === o.value ? 'rgba(147,51,234,0.08)' : 'rgba(30,30,45,0.6)', color: fd.condition.type === o.value ? '#9333EA' : '#F5F5F7', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</p>
                    <p style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

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

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600 }}>Gray Coverage</Label>
                <span style={{ color: '#F5F5F7', fontWeight: 'bold' }}>{fd.condition.grayPercent}%</span>
              </div>
              <input type="range" min={0} max={100} value={fd.condition.grayPercent} onChange={e => setFd(p => ({ ...p, condition: { ...p.condition, grayPercent: Number(e.target.value) } }))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: "#71717A", marginTop: 4 }}><span>No gray</span><span>Partial</span><span>Full coverage needed</span></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input type="checkbox" id="hl" checked={fd.condition.highlights} onChange={e => setFd(p => ({ ...p, condition: { ...p.condition, highlights: e.target.checked } }))} style={{ accentColor: '#9333EA' }} />
              <label htmlFor="hl" style={{ fontSize: 14, color: '#F5F5F7', cursor: 'pointer' }}>Highlights Present</label>
            </div>

            {/* Problem Indicators */}
            <div style={{ marginBottom: 24 }}>
              <Label style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>Problem Indicators</Label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {PROBLEM_INDICATORS.map(pi => {
                  const isActive = fd.condition[pi.key as keyof typeof fd.condition] as boolean
                  return (
                    <label key={pi.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: isActive ? '1px solid rgba(147,51,234,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      background: isActive ? 'rgba(147,51,234,0.05)' : 'rgba(30,30,45,0.4)',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={e => setFd(p => ({ ...p, condition: { ...p.condition, [pi.key]: e.target.checked } }))}
                        style={{ accentColor: '#9333EA', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#F5F5F7', margin: 0 }}>{pi.label}</p>
                        <p style={{ fontSize: 11, color: '#71717A', margin: 0 }}>{pi.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Consultation Summary */}
            <div style={{ background: 'rgba(22,22,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 }}>Consultation Summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 13 }}>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Current</span><span>Level {fd.currentLevel} {TONES.find(t => t.value === fd.currentTone)?.label || fd.currentTone}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Target</span><span style={{ color: '#9333EA' }}>Level {fd.targetLevel} {TONES.find(t => t.value === fd.targetTone)?.label || fd.targetTone}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Texture</span><span style={{ textTransform: 'capitalize' }}>{fd.texture}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Pattern</span><span style={{ textTransform: 'capitalize' }}>{fd.hairPattern}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Density</span><span style={{ textTransform: 'capitalize' }}>{fd.density}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Condition</span><span style={{ textTransform: 'capitalize' }}>{CONDITION_TYPES.find(c => c.value === fd.condition.type)?.label || fd.condition.type.replace(/_/g, ' ')}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Porosity</span><span style={{ textTransform: 'capitalize' }}>{fd.condition.porosity}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Gray</span><span>{fd.condition.grayPercent}%</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Service</span><span>{SERVICE_TYPES.find(s => s.value === fd.serviceType)?.label || fd.serviceType}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Chemical History</span><span>{getCheckedChemicalHistory().join(', ') || 'None'}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Sensitivities</span><span>{getCheckedSensitivities().join(', ') || 'None'}</span></div>
                <div><span style={{ display: 'block', fontSize: 12, color: '#71717A' }}>Last Service</span><span>{LAST_SERVICE_OPTIONS.find(o => o.value === fd.chemicalHistory.lastService)?.label}</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" onClick={() => setStep(4)} style={btnOutline}><ChevronLeft size={16} /> Back</button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setManualEntry(true)} style={btnPurpleOutline}><FlaskConical size={16} /> My Formula</button>
                <button type="button" onClick={handleSubmit} disabled={loading} style={btnPrimary}>
                  {loading ? <><LoaderCircle className="animate-spin" size={16} style={{ color: '#F59E0B' }} /> Generating...</> : <>Generate Formula <FlaskConical size={16} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Formula Entry */}
        {step === 5 && manualEntry && (
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FlaskConical style={{ color: '#EC4899' }} /> Add Formula Manually</h2>
            <p style={{ color: '#A1A1AA', fontSize: 13, marginBottom: 24 }}>Enter your custom formula products below.</p>

            {manualProducts.map((prod, idx) => (
              <div key={idx} style={{ background: 'rgba(22,22,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Product {idx + 1}</p>
                  {manualProducts.length > 1 && (
                    <button type="button" onClick={() => setManualProducts(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Brand</Label>
                    <Select value={prod.brand} onValueChange={v => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, brand: v } : p))}>
                      <SelectTrigger style={{ background: 'rgba(30,30,45,0.6)', borderColor: 'rgba(255,255,255,0.08)', color: '#F5F5F7', width: '100%' }}><SelectValue placeholder="Select brand" /></SelectTrigger>
                      <SelectContent style={{ background: 'rgba(30,30,45,0.9)' }}>{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Shade Code</Label>
                    <input type="text" value={prod.shadeCode} onChange={e => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, shadeCode: e.target.value } : p))} placeholder="e.g. 7/0" style={{ width: '100%', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F7', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Product Name</Label>
                    <input type="text" value={prod.shadeName} onChange={e => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, shadeName: e.target.value } : p))} placeholder="e.g. Medium Blonde" style={{ width: '100%', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F7', fontSize: 14, outline: 'none' }} />
                  </div>
                  <div>
                    <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Grams</Label>
                    <input type="number" min={1} value={prod.grams} onChange={e => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, grams: Number(e.target.value) } : p))} style={{ width: '100%', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F7', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Developer Volume</Label>
                    <Select value={String(prod.developerVol)} onValueChange={v => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, developerVol: Number(v) } : p))}>
                      <SelectTrigger style={{ background: 'rgba(30,30,45,0.6)', borderColor: 'rgba(255,255,255,0.08)', color: '#F5F5F7', width: '100%' }}><SelectValue placeholder="Select vol" /></SelectTrigger>
                      <SelectContent style={{ background: 'rgba(30,30,45,0.9)' }}>
                        <SelectItem value="10">10 Vol</SelectItem>
                        <SelectItem value="20">20 Vol</SelectItem>
                        <SelectItem value="30">30 Vol</SelectItem>
                        <SelectItem value="40">40 Vol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Processing Time</Label>
                    <input type="text" value={prod.processingTime} onChange={e => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, processingTime: e.target.value } : p))} placeholder="e.g. 30 min" style={{ width: '100%', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F7', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <Label style={{ color: '#F5F5F7', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Notes</Label>
                  <textarea value={prod.notes} onChange={e => setManualProducts(prev => prev.map((p, i) => i === idx ? { ...p, notes: e.target.value } : p))} placeholder="Optional notes..." rows={2} style={{ width: '100%', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: '#F5F5F7', fontSize: 14, outline: 'none', resize: 'vertical' }} />
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setManualProducts(prev => [...prev, { brand: '', shadeCode: '', shadeName: '', grams: 20, developerVol: 20, processingTime: '30 min', notes: '' }])} style={{ ...btnOutline, width: '100%', justifyContent: 'center', marginBottom: 16 }}><FlaskConical size={14} /> Add Another Product</button>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setManualEntry(false)} style={btnOutline}><ChevronLeft size={16} /> Cancel</button>
              <button type="button" onClick={() => {
                // Build result object matching FormulationResult shape
                const steps = manualProducts.map((prod, idx) => ({
                  role: idx === 0 ? 'primary' : 'secondary',
                  product: {
                    shadeCode: prod.shadeCode,
                    shadeName: prod.shadeName || prod.shadeCode,
                    brand: prod.brand,
                    line: '',
                    level: fd.targetLevel,
                    tone: revToneMap[fd.targetTone] || fd.targetTone,
                  },
                  grams: prod.grams,
                  developer: { volume: prod.developerVol, type: 'cream' },
                  notes: prod.notes,
                }))
                const manualResult = {
                  brand: manualProducts[0]?.brand || fd.brandPreference || 'Custom',
                  line: '',
                  steps,
                  totalGrams: manualProducts.reduce((sum, p) => sum + p.grams, 0),
                  developerVolume: manualProducts[0]?.developerVol || 20,
                  mixingRatio: '1:1.5',
                  processingTime: manualProducts[0]?.processingTime || '30 min',
                  assessment: 'Manually entered formula.',
                  warnings: [],
                  hardStops: [],
                  alternatives: [],
                  strandTestRecommended: false,
                }
                setResult(manualResult)
                // Convert to EditFormula ingredients
                const ingredients: FormulaIngredient[] = steps.map((s: any, idx: number) => ({
                  id: `ing-${idx}`,
                  name: s.product.shadeName || 'Unknown',
                  brand: s.product.brand || 'Custom',
                  shadeCode: s.product.shadeCode || '?',
                  series: s.product.line || '',
                  targetGrams: s.grams || 20,
                  color: HAIR_LEVELS[s.product?.level]?.hex || '#7D5038',
                  order: idx,
                }))
                setFormulaIngredients(ingredients)
                setFormulaDeveloper({ name: `${manualResult.developerVolume} Vol`, volume: manualResult.developerVolume })
                setFormulaRatio(manualResult.mixingRatio)
                setFormulaView('edit')
                setManualEntry(false)
                setStep(6)
              }} style={btnPrimary}><Save size={16} /> Done</button>
            </div>
          </div>
        )}

        {/* STEP 6: Results */}
        {step === 6 && result && (
          <div style={{ ...card, padding: 32 }}>
            {/* Header with Edit/Mix toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>✅ Your Formula</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setFormulaView('edit')} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: formulaView === 'edit' ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: formulaView === 'edit' ? 'rgba(147,51,234,0.1)' : 'transparent', color: formulaView === 'edit' ? '#9333EA' : '#71717A', cursor: 'pointer' }}>Edit</button>
                <button type="button" onClick={() => setFormulaView('bowl')} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: formulaView === 'bowl' ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.06)', background: formulaView === 'bowl' ? 'rgba(147,51,234,0.1)' : 'transparent', color: formulaView === 'bowl' ? '#9333EA' : '#71717A', cursor: 'pointer' }}>Mix</button>
              </div>
            </div>

            {/* Safety Assessment */}
            {result?.hardStops && result.hardStops.length > 0 && (
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

            {result?.alternatives && result.alternatives.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#10B981', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>💡 Safer Alternatives</h3>
                {result.alternatives.map((alt: string, i: number) => (
                  <div key={i} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <p style={{ color: '#F5F5F7', fontSize: 14 }}>{alt}</p>
                  </div>
                ))}
              </div>
            )}

            {result?.warnings && result.warnings.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#F59E0B', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>⚠️ Warnings</h3>
                {result.warnings.map((w: string, i: number) => (
                  <div key={i} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <p style={{ color: '#F5F5F7', fontSize: 14 }}>{w}</p>
                  </div>
                ))}
              </div>
            )}

            {result?.assessment && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#3B82F6', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>💡 Professional Assessment</h3>
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 16 }}>
                  <p style={{ color: '#F5F5F7', fontSize: 14, lineHeight: 1.6 }}>{result.assessment}</p>
                </div>
              </div>
            )}

            {result?.strandTestRecommended && (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🔬</span>
                <span style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600 }}>Strand Test Recommended</span>
              </div>
            )}

            {result?.underlyingPigment && (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p style={{ color: '#71717A', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Underlying Pigment</p>
                <p style={{ color: '#F5F5F7', fontSize: 14 }}>{result.underlyingPigment.description}</p>
              </div>
            )}

            {result?.quantity && (
              <div style={{ marginBottom: 24, padding: 16, background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p style={{ color: '#71717A', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Product Quantity</p>
                <p style={{ color: '#F5F5F7', fontSize: 14 }}>{result.quantity.description}</p>
              </div>
            )}

            {result?.multiSessionPlan && result.multiSessionPlan.length > 0 && (
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

            {/* Original warnings display */}
            {result.warnings?.map((w: string, i: number) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FBBF24', marginBottom: 8 }}><AlertTriangle size={16} /><span>{w}</span></div>)}

            {/* Visual Outcome Simulator */}
            <VisualOutcomeSimulator input={fd as any} result={result} />

            {/* Brand Conversion */}
            <ConversionPanel
              formulaShades={(result.steps || [])
                .filter((s: any) => s.product?.shadeCode)
                .map((s: any) => ({
                  shadeCode: s.product.shadeCode,
                  brand: fd.brandPreference || 'schwarzkopf',
                  line: s.product.line || '',
                  grams: s.grams || 0,
                }))}
              currentBrand={fd.brandPreference || 'schwarzkopf'}
              developerVolume={result.steps?.[0]?.developer?.volume || 20}
            />

            {/* Stock Check */}
            <div style={{ marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <StockCheck
                steps={result.steps || []}
                salonId={salonId}
                onAcceptAlternative={(originalCode, altCode) => {
                  // Replace the shade code in the ingredients
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
                clientId={clientId}
                onComplete={(weights) => console.log('Final weights:', weights)}
              />
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" onClick={() => { setResult(null); setFormulaIngredients([]); setFormulaView('edit'); setSaved(false); setListed(false); setClientId(null); setClientName(''); setClientPhone(''); setStep(1) }} style={{ ...btnOutline, flex: 1, justifyContent: 'center' }}><RotateCcw size={14} /> New Formula</button>
              <button type="button" onClick={handleSaveFormula} disabled={saving || saved} style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: saved ? 0.6 : 1 }}><Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save to Library'}</button>
              <button type="button" onClick={handleListMarketplace} disabled={saving || listed} style={{ ...btnPinkOutline, flex: 1, justifyContent: 'center', opacity: listed ? 0.6 : 1 }}><Save size={14} /> {saving ? 'Listing...' : listed ? 'Listed ✓' : 'List on Marketplace'}</button>
            </div>

            {/* ByondEdu: Contextual Education */}
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
                  currentTone: fd.currentTone,
                  targetLevel: fd.targetLevel,
                  targetTone: fd.targetTone,
                  porosity: fd.condition.porosity as 'low' | 'normal' | 'high',
                  condition: fd.condition.type,
                  banding: fd.condition.banding,
                  hotRoots: fd.condition.hotRoots,
                  previousLightener: fd.condition.previousLightener,
                  multipleColors: fd.condition.multipleColors,
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
