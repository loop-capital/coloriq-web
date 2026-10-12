'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardList,
  Printer, ShieldCheck, Siren, Stethoscope, FlaskConical, HeartPulse, Save,
} from 'lucide-react'
import {
  gradeRisk, SYMPTOM_LABELS, RISK_COLORS, RISK_DESCRIPTIONS,
  type TriageInput, type Symptom, type RiskGrade,
  type ScalpSymptom, type HairIntegrity, type SystemicSymptom,
} from '@/lib/triage/risk-grading'
import {
  generateRecoveryPlan, formatPlanForPrint, type RecoveryPlan,
} from '@/lib/triage/recovery-plan'

// ── Step definitions ──
const STEPS = ['What happened?', 'What was applied?', 'Safety check', 'Hair history', 'Recovery plan'] as const

const SYMPTOM_GROUPS: { title: string; items: Symptom[] }[] = [
  { title: 'Color problems', items: ['too_dark', 'too_light', 'brassy_orange', 'green_cast', 'muddy_toner', 'faded_too_fast'] },
  { title: 'Application problems', items: ['banding', 'uneven_lift', 'hot_roots', 'color_grab'] },
  { title: 'Damage & safety', items: ['breakage', 'scalp_irritation', 'allergic_reaction'] },
]

const cardStyle = (selected: boolean, danger?: boolean): React.CSSProperties => ({
  padding: '12px 14px',
  borderRadius: 12,
  border: selected
    ? `2px solid ${danger ? '#EF4444' : '#9333EA'}`
    : '1px solid rgba(255,255,255,0.08)',
  background: selected
    ? danger ? 'rgba(239,68,68,0.08)' : 'rgba(147,51,234,0.08)'
    : 'rgba(255,255,255,0.02)',
  color: '#F5F5F7',
  fontSize: 13,
  fontWeight: selected ? 600 : 400,
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
})

function Chip({ label, selected, onToggle, danger }: { label: string; selected: boolean; onToggle: () => void; danger?: boolean }) {
  return (
    <button onClick={onToggle} style={cardStyle(selected, danger)}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {label}
        {selected && <Check size={14} color={danger ? '#EF4444' : '#9333EA'} />}
      </span>
    </button>
  )
}

export default function TriagePage() {
  const [step, setStep] = useState(0)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [productType, setProductType] = useState<TriageInput['productType']>('unknown')
  const [developerVolume, setDeveloperVolume] = useState('')
  const [processingMinutes, setProcessingMinutes] = useState('')
  const [heatUsed, setHeatUsed] = useState(false)
  const [scalpSymptoms, setScalpSymptoms] = useState<ScalpSymptom[]>([])
  const [hairIntegrity, setHairIntegrity] = useState<HairIntegrity[]>([])
  const [systemicSymptoms, setSystemicSymptoms] = useState<SystemicSymptom[]>([])
  const [hairCondition, setHairCondition] = useState<TriageInput['hairCondition']>('normal')
  const [previousBleach, setPreviousBleach] = useState(false)
  const [clientName, setClientName] = useState('')
  const [plan, setPlan] = useState<RecoveryPlan | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggle = <T,>(list: T[], item: T, set: (v: T[]) => void) => {
    set(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const buildInput = (): TriageInput => ({
    symptoms,
    productType,
    developerVolume: developerVolume || undefined,
    processingMinutes: processingMinutes ? parseInt(processingMinutes, 10) : undefined,
    heatUsed,
    hairCondition,
    previousBleach,
    scalpSymptoms: scalpSymptoms.length ? scalpSymptoms : (['none'] as ScalpSymptom[]),
    hairIntegrity: hairIntegrity.length ? hairIntegrity : (['normal'] as HairIntegrity[]),
    systemicSymptoms: systemicSymptoms.length ? systemicSymptoms : (['none'] as SystemicSymptom[]),
  })

  const generatePlan = () => {
    setPlan(generateRecoveryPlan(buildInput()))
    setStep(4)
  }

  const saveToRecord = async () => {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || undefined,
          input: buildInput(),
          riskGrade: plan.riskAssessment.grade,
          triggers: plan.riskAssessment.triggers,
          plan: {
            steps: plan.steps,
            issues: plan.issues.map(i => ({ id: i.id, name: i.name, severity: i.severity })),
            homeCare: plan.homeCare,
          },
        }),
      })
      if (res.ok) setSaved(true)
    } catch { /* non-blocking */ }
    setSaving(false)
  }

  const printPlan = () => {
    if (!plan) return
    const text = formatPlanForPrint(plan, clientName || undefined)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<pre style="font-family:monospace;padding:24px;white-space:pre-wrap;">${text.replace(/</g, '&lt;')}</pre>`)
      w.document.close()
      w.print()
    }
  }

  const canContinue = () => {
    if (step === 0) return symptoms.length > 0
    return true // safety check and history are optional-but-encouraged
  }

  const next = () => {
    if (step === 3) generatePlan()
    else if (canContinue()) setStep(s => Math.min(s + 1, 4))
  }

  const riskColor = plan ? RISK_COLORS[plan.riskAssessment.grade] : '#71717A'

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--cg-bg-deep)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {step > 0 && step < 4 && (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4 }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(239,68,68,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <HeartPulse size={20} color="#EF4444" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F7', margin: 0 }}>Color Correction Triage</h1>
            <p style={{ fontSize: 12, color: '#71717A', margin: 0 }}>Assess the situation, get a recovery plan</p>
          </div>
        </div>

        {/* Progress */}
        {step < 4 && (
          <div style={{ display: 'flex', gap: 6, margin: '16px 0 24px' }}>
            {STEPS.slice(0, 4).map((label, i) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: i <= step ? '#9333EA' : 'rgba(255,255,255,0.08)',
                }} />
                <p style={{ fontSize: 10, color: i === step ? '#F5F5F7' : '#52525B', margin: '6px 0 0', fontWeight: i === step ? 600 : 400 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {/* STEP 1: Symptoms */}
            {step === 0 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F7', marginBottom: 4 }}>What happened?</h2>
                <p style={{ fontSize: 13, color: '#71717A', marginBottom: 16 }}>Select everything that applies.</p>
                {SYMPTOM_GROUPS.map(group => (
                  <div key={group.title} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>
                      {group.title}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {group.items.map(s => (
                        <Chip
                          key={s}
                          label={SYMPTOM_LABELS[s]}
                          selected={symptoms.includes(s)}
                          onToggle={() => toggle(symptoms, s, setSymptoms)}
                          danger={group.title === 'Damage & safety'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 2: What was applied */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F7', marginBottom: 4 }}>What was applied?</h2>
                <p style={{ fontSize: 13, color: '#71717A', marginBottom: 16 }}>Help us understand the chemistry involved.</p>

                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Product type</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {(['permanent', 'demi', 'semi', 'bleach', 'toner', 'unknown'] as const).map(pt => (
                    <button key={pt} onClick={() => setProductType(pt)} style={cardStyle(productType === pt)}>
                      <span style={{ textTransform: 'capitalize' }}>{pt === 'semi' ? 'Semi' : pt}</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Developer vol</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['10', '20', '30', '40'].map(v => (
                        <button key={v} onClick={() => setDeveloperVolume(v)} style={{ ...cardStyle(developerVolume === v), textAlign: 'center' }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Processing (min)</p>
                    <input
                      type="number" value={processingMinutes}
                      onChange={e => setProcessingMinutes(e.target.value)}
                      placeholder="e.g. 35"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: '#F5F5F7', fontSize: 14 }}
                    />
                  </div>
                </div>

                <button onClick={() => setHeatUsed(!heatUsed)} style={cardStyle(heatUsed)}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    Heat was used during processing
                    {heatUsed && <Check size={14} color="#9333EA" />}
                  </span>
                </button>
              </div>
            )}

            {/* STEP 3: Safety check */}
            {step === 2 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={18} color="#10B981" />
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F7', margin: 0 }}>Safety check</h2>
                </div>
                <p style={{ fontSize: 13, color: '#71717A', marginBottom: 16 }}>
                  Quick check for signs that need immediate attention. Skip only if you're certain.
                </p>

                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Scalp symptoms</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {(['itching', 'burning', 'swelling', 'blistering', 'pain'] as ScalpSymptom[]).map(s => (
                    <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={scalpSymptoms.includes(s)}
                      onToggle={() => toggle(scalpSymptoms, s, setScalpSymptoms)} danger={s !== 'itching'} />
                  ))}
                </div>

                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Hair integrity (wet stretch test)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {(['stretchy_when_wet', 'gummy', 'snapping', 'mushy_ends'] as HairIntegrity[]).map(h => (
                    <Chip key={h} label={h.replace(/_/g, ' ')} selected={hairIntegrity.includes(h)}
                      onToggle={() => toggle(hairIntegrity, h, setHairIntegrity)} danger />
                  ))}
                </div>

                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Systemic symptoms</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['difficulty_breathing', 'dizziness', 'nausea', 'facial_swelling'] as SystemicSymptom[]).map(s => (
                    <Chip key={s} label={s.replace(/_/g, ' ')} selected={systemicSymptoms.includes(s)}
                      onToggle={() => toggle(systemicSymptoms, s, setSystemicSymptoms)} danger />
                  ))}
                </div>
                {(systemicSymptoms.length > 0 || scalpSymptoms.includes('blistering')) && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Siren size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 13, color: '#FCA5A5', margin: 0, fontWeight: 500 }}>
                      These symptoms need immediate attention. Rinse the client's hair now and consider medical help.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Hair history */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F7', marginBottom: 4 }}>Hair history</h2>
                <p style={{ fontSize: 13, color: '#71717A', marginBottom: 16 }}>Context helps us recommend the right correction.</p>

                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Overall condition</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {(['healthy', 'normal', 'compromised', 'severely_damaged'] as const).map(c => (
                    <button key={c} onClick={() => setHairCondition(c)} style={cardStyle(hairCondition === c, c === 'severely_damaged')}>
                      <span style={{ textTransform: 'capitalize' }}>{c.replace(/_/g, ' ')}</span>
                    </button>
                  ))}
                </div>

                <button onClick={() => setPreviousBleach(!previousBleach)} style={{ ...cardStyle(previousBleach), marginBottom: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    Previously bleached / lightened
                    {previousBleach && <Check size={14} color="#9333EA" />}
                  </span>
                </button>

                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#52525B', marginBottom: 8 }}>Client name (for the record)</p>
                <input
                  type="text" value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Optional — links this to the client record"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: '#F5F5F7', fontSize: 14 }}
                />
              </div>
            )}

            {/* STEP 5: Recovery plan */}
            {step === 4 && plan && (
              <div>
                {/* Risk banner */}
                <div style={{
                  padding: 16, borderRadius: 16, marginBottom: 16,
                  background: `${riskColor}12`, border: `1px solid ${riskColor}40`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {plan.riskAssessment.grade === 'EMERGENCY' ? <Siren size={22} color={riskColor} />
                      : plan.riskAssessment.grade === 'HIGH' ? <AlertTriangle size={22} color={riskColor} />
                      : <Stethoscope size={22} color={riskColor} />}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: riskColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {plan.riskAssessment.grade} risk
                      </p>
                      <p style={{ fontSize: 12, color: '#A1A1AA', margin: 0 }}>
                        {RISK_DESCRIPTIONS[plan.riskAssessment.grade]}
                      </p>
                    </div>
                  </div>
                  {plan.riskAssessment.triggers.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {plan.riskAssessment.triggers.map((t, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#A1A1AA', margin: '4px 0' }}>• {t}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Steps */}
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={16} color="#9333EA" /> Recovery plan
                </h3>
                {plan.steps.map(s => (
                  <div key={s.stepNumber} style={{
                    padding: 14, borderRadius: 12, marginBottom: 10,
                    border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(22,22,32,0.6)',
                  }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: s.warning ? 'rgba(239,68,68,0.12)' : 'rgba(147,51,234,0.12)',
                        color: s.warning ? '#EF4444' : '#9333EA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                      }}>
                        {s.stepNumber}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F7', margin: '0 0 4px' }}>{s.title}</p>
                        <p style={{ fontSize: 13, color: '#A1A1AA', margin: 0, whiteSpace: 'pre-wrap' }}>{s.detail}</p>
                        {s.timing && (
                          <p style={{ fontSize: 12, color: '#71717A', margin: '6px 0 0' }}>⏱ {s.timing}</p>
                        )}
                        {s.warning && (
                          <p style={{ fontSize: 12, color: '#FCA5A5', margin: '6px 0 0', fontWeight: 500 }}>⚠ {s.warning}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Disclaimer */}
                <p style={{ fontSize: 11, color: '#52525B', marginTop: 16, lineHeight: 1.5 }}>
                  {plan.riskAssessment.disclaimer}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={saveToRecord} disabled={saving || saved}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 12, border: 'none',
                      background: saved ? 'rgba(16,185,129,0.15)' : '#9333EA',
                      color: saved ? '#10B981' : '#fff', fontSize: 14, fontWeight: 600,
                      cursor: saving || saved ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Save size={16} /> {saved ? 'Saved to record' : saving ? 'Saving…' : 'Save to client record'}
                  </button>
                  <button
                    onClick={printPlan}
                    style={{
                      padding: '14px 18px', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)',
                      color: '#F5F5F7', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Printer size={16} /> Print
                  </button>
                </div>

                <button
                  onClick={() => { setStep(0); setPlan(null); setSaved(false); setSymptoms([]) }}
                  style={{ width: '100%', marginTop: 12, padding: 12, background: 'none', border: 'none', color: '#71717A', fontSize: 13, cursor: 'pointer' }}
                >
                  Start a new triage
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        {step < 4 && (
          <button
            onClick={next}
            disabled={!canContinue()}
            style={{
              width: '100%', marginTop: 20, padding: '14px', borderRadius: 12, border: 'none',
              background: canContinue() ? '#9333EA' : 'rgba(147,51,234,0.3)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: canContinue() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {step === 3 ? (<><FlaskConical size={16} /> Generate recovery plan</>) : (<>Continue <ChevronRight size={16} /></>)}
          </button>
        )}
      </div>
    </div>
  )
}
