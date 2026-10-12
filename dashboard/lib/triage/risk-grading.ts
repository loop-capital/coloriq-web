// COLORiq Emergency Triage — Risk Grading Engine
// Safety-critical logic: when in doubt, escalate. A false HIGH is an inconvenience;
// a missed EMERGENCY is a liability.

export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'

export type Symptom =
  | 'too_dark'
  | 'too_light'
  | 'brassy_orange'
  | 'green_cast'
  | 'muddy_toner'
  | 'banding'
  | 'uneven_lift'
  | 'hot_roots'
  | 'color_grab'
  | 'faded_too_fast'
  | 'breakage'
  | 'scalp_irritation'
  | 'allergic_reaction'

export type ProductType = 'permanent' | 'demi' | 'semi' | 'bleach' | 'toner' | 'unknown'

export type ScalpSymptom = 'itching' | 'burning' | 'swelling' | 'blistering' | 'pain' | 'none'
export type HairIntegrity = 'normal' | 'stretchy_when_wet' | 'gummy' | 'snapping' | 'mushy_ends'
export type SystemicSymptom = 'difficulty_breathing' | 'dizziness' | 'nausea' | 'facial_swelling' | 'none'

export interface TriageInput {
  symptoms: Symptom[]
  productType?: ProductType
  developerVolume?: string
  processingMinutes?: number
  heatUsed?: boolean
  hairCondition: 'healthy' | 'normal' | 'compromised' | 'severely_damaged'
  previousBleach?: boolean
  // Safety signals — always collected, never skipped
  scalpSymptoms: ScalpSymptom[]
  hairIntegrity: HairIntegrity[]
  systemicSymptoms: SystemicSymptom[]
}

export interface RiskAssessment {
  grade: RiskGrade
  triggers: string[]
  immediateActions: string[]
  canProceedWithCorrection: boolean
  requiresMedicalAttention: boolean
  disclaimer: string
}

const DISCLAIMER =
  'This assessment is a professional aid, not medical advice. ' +
  'If the client shows signs of allergic reaction or chemical burn, ' +
  'seek medical attention immediately.'

/**
 * Grade the risk of a color correction situation.
 * Escalation-first: any safety signal pushes the grade up.
 */
export function gradeRisk(input: TriageInput): RiskAssessment {
  const triggers: string[] = []
  // Ref object prevents TS from narrowing grade through closure mutation
  const gradeRef: { current: RiskGrade } = { current: 'LOW' }

  const escalate = (to: RiskGrade, reason: string) => {
    const order: RiskGrade[] = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']
    if (order.indexOf(to) > order.indexOf(gradeRef.current)) {
      gradeRef.current = to
    }
    triggers.push(reason)
  }

  // ── EMERGENCY: systemic / severe safety signals ──
  const systemic = input.systemicSymptoms.filter(s => s !== 'none')
  if (systemic.length > 0) {
    escalate('EMERGENCY', `Systemic symptoms reported: ${systemic.join(', ')}. Possible severe allergic reaction.`)
  }
  if (input.scalpSymptoms.includes('blistering')) {
    escalate('EMERGENCY', 'Scalp blistering indicates chemical burn.')
  }
  if (input.scalpSymptoms.includes('swelling')) {
    escalate('EMERGENCY', 'Scalp swelling indicates significant allergic or chemical reaction.')
  }
  if (input.symptoms.includes('allergic_reaction')) {
    escalate('EMERGENCY', 'Allergic reaction reported by stylist.')
  }

  // ── HIGH: breakage risk, scalp distress, aggressive chemistry on weak hair ──
  const breakageSignals = input.hairIntegrity.filter(h => h !== 'normal')
  if (breakageSignals.length > 0) {
    escalate('HIGH', `Hair integrity compromised: ${breakageSignals.join(', ')}. Further chemical service risks breakage.`)
  }
  if (input.symptoms.includes('breakage')) {
    escalate('HIGH', 'Active breakage reported.')
  }
  if (input.scalpSymptoms.includes('burning') || input.scalpSymptoms.includes('pain')) {
    escalate('HIGH', 'Scalp burning or pain reported — chemical irritation in progress.')
  }
  if (input.scalpSymptoms.includes('itching')) {
    escalate('HIGH', 'Scalp itching may indicate developing allergic sensitivity.')
  }
  if (input.symptoms.includes('scalp_irritation')) {
    escalate('HIGH', 'Scalp irritation reported.')
  }
  // Bleach on already-compromised hair is high risk
  if (input.productType === 'bleach' && (input.hairCondition === 'compromised' || input.hairCondition === 'severely_damaged')) {
    escalate('HIGH', 'Lightener applied to compromised hair — elevated breakage risk.')
  }
  // High-volume developer + heat + long processing = aggressive
  const vol = parseInt(input.developerVolume || '0', 10)
  if (vol >= 30 && input.heatUsed && (input.processingMinutes || 0) > 30) {
    escalate('HIGH', 'Aggressive processing (30V+, heat, 30+ min) — assess integrity before any correction.')
  }
  // Severely damaged hair + any chemical correction needed
  if (input.hairCondition === 'severely_damaged' && input.symptoms.some(s => !['faded_too_fast'].includes(s))) {
    escalate('HIGH', 'Severely damaged hair requires bond-rebuilding before any corrective color.')
  }

  // ── MEDIUM: correctable color problems ──
  const mediumSymptoms: Symptom[] = ['banding', 'uneven_lift', 'hot_roots', 'color_grab', 'too_dark', 'too_light', 'green_cast']
  if (input.symptoms.some(s => mediumSymptoms.includes(s))) {
    escalate('MEDIUM', 'Color correction needed — correctable with proper technique.')
  }

  // Multiple medium factors escalate
  const mediumCount = input.symptoms.filter(s => mediumSymptoms.includes(s)).length
  if (mediumCount >= 3) {
    escalate('HIGH', 'Multiple concurrent color problems — complexity elevates risk.')
  }

  // ── LOW: minor tone issues (default) ──
  if (gradeRef.current === 'LOW' && input.symptoms.length > 0) {
    triggers.push('Minor tonal correction — standard corrective techniques apply.')
  }

  // ── Build response ──
  const isEmergency = gradeRef.current === 'EMERGENCY'
  const isHigh = gradeRef.current === 'HIGH'

  const immediateActions: string[] = []
  if (isEmergency) {
    immediateActions.push(
      'Rinse the client\'s hair and scalp thoroughly with lukewarm water NOW.',
      'Do NOT apply any further chemical product.',
      'If breathing difficulty, facial swelling, or spreading reaction: call emergency services.',
      'Document everything: products used, timing, symptoms, photos.',
      'Advise the client to seek medical attention promptly.',
    )
  } else if (isHigh) {
    immediateActions.push(
      'Stop all chemical processing. Rinse if product is still on the hair.',
      'Perform a strand elasticity test before considering any correction.',
      'Do NOT re-apply lightener or high-volume developer today.',
      'If scalp symptoms persist or worsen, advise medical evaluation.',
    )
  } else {
    immediateActions.push(
      'Assess the hair\'s condition and elasticity.',
      'Review the corrective plan below before proceeding.',
      'Take "before" photos for the client record.',
    )
  }

  return {
    grade: gradeRef.current,
    triggers,
    immediateActions,
    canProceedWithCorrection: !isEmergency && !isHigh,
    requiresMedicalAttention: isEmergency,
    disclaimer: DISCLAIMER,
  }
}

/** Human-readable label for each symptom (UI) */
export const SYMPTOM_LABELS: Record<Symptom, string> = {
  too_dark: 'Too dark',
  too_light: 'Too light / over-lifted',
  brassy_orange: 'Brassy / orange',
  green_cast: 'Green cast',
  muddy_toner: 'Muddy / dull toner',
  banding: 'Banding (visible lines)',
  uneven_lift: 'Uneven / patchy lift',
  hot_roots: 'Hot roots',
  color_grab: 'Color grabbed (ends too dark)',
  faded_too_fast: 'Faded too fast',
  breakage: 'Breakage',
  scalp_irritation: 'Scalp irritation',
  allergic_reaction: 'Allergic reaction signs',
}

export const RISK_COLORS: Record<RiskGrade, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  EMERGENCY: '#EF4444',
}

export const RISK_DESCRIPTIONS: Record<RiskGrade, string> = {
  LOW: 'Minor correction. Standard techniques apply.',
  MEDIUM: 'Correctable with careful technique. Follow the plan.',
  HIGH: 'Stop and assess. Do not proceed with chemical correction today without resolving the risk factors.',
  EMERGENCY: 'Immediate action required. Rinse now. Seek medical help if symptoms indicate allergic reaction or burn.',
}
