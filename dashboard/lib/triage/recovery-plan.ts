// COLORiq Emergency Triage — Recovery Plan Generator
// Bridges triage inputs to the corrective-color engine, producing a
// numbered, printable action plan.

import {
  diagnose,
  prioritizeIssues,
  type CorrectiveIssue,
  type HairState,
} from '@/lib/corrective-color/engine'
import {
  gradeRisk,
  type TriageInput,
  type RiskAssessment,
  type RiskGrade,
  type Symptom,
} from './risk-grading'

export interface RecoveryStep {
  stepNumber: number
  title: string
  detail: string
  timing?: string
  warning?: string
}

export interface RecoveryPlan {
  riskAssessment: RiskAssessment
  issues: CorrectiveIssue[]
  steps: RecoveryStep[]
  formulas: CorrectiveIssue['suggestedFormulas']
  homeCare: string[]
  generatedAt: string
}

/** Map triage symptoms to corrective-engine issue IDs */
const SYMPTOM_TO_ISSUE: Partial<Record<Symptom, string>> = {
  hot_roots: 'hot_roots',
  green_cast: 'green_cast',
  muddy_toner: 'muddy_toner',
  brassy_orange: 'orange_bands',
  banding: 'orange_bands',
  uneven_lift: 'uneven_lift',
  color_grab: 'color_grab',
  breakage: 'hollow_ends',
  too_dark: 'overfilled_red', // closest: over-deposit correction path
}

/** Build a HairState for the corrective engine from triage inputs */
function buildHairState(input: TriageInput): HairState {
  const porosity = input.hairIntegrity.some(h => ['gummy', 'mushy_ends'].includes(h))
    ? 'high'
    : input.hairCondition === 'compromised' || input.hairCondition === 'severely_damaged'
      ? 'high'
      : 'normal'

  return {
    currentLevel: 7, // default mid-level; refined if photo analysis available
    currentTone: input.symptoms.includes('green_cast') ? 'A'
      : input.symptoms.includes('brassy_orange') ? 'R'
      : 'N',
    targetLevel: 7,
    targetTone: 'N',
    porosity,
    condition: input.hairCondition === 'severely_damaged' ? 'damaged'
      : input.hairCondition === 'compromised' ? 'damaged'
      : input.previousBleach ? 'bleached'
      : 'previously_colored',
    previousLightener: input.previousBleach || input.productType === 'bleach',
    banding: input.symptoms.includes('banding'),
    hotRoots: input.symptoms.includes('hot_roots'),
    multipleColors: input.symptoms.includes('uneven_lift'),
  }
}

/**
 * Generate a full recovery plan from triage inputs.
 * For EMERGENCY/HIGH: safety steps only, no chemical correction.
 * For MEDIUM/LOW: full corrective plan from the engine.
 */
export function generateRecoveryPlan(input: TriageInput): RecoveryPlan {
  const riskAssessment = gradeRisk(input)
  const generatedAt = new Date().toISOString()
  const steps: RecoveryStep[] = []
  let stepNumber = 1

  const addStep = (title: string, detail: string, timing?: string, warning?: string) => {
    steps.push({ stepNumber: stepNumber++, title, detail, timing, warning })
  }

  // ── Phase 1: Immediate safety actions (all grades) ──
  riskAssessment.immediateActions.forEach((action, i) => {
    addStep(
      i === 0 ? 'Immediate action' : `Immediate action (${i + 1})`,
      action,
      undefined,
      riskAssessment.grade === 'EMERGENCY' ? 'Do not delay.' : undefined,
    )
  })

  let issues: CorrectiveIssue[] = []
  let formulas: CorrectiveIssue['suggestedFormulas'] = []
  let homeCare: string[] = []

  // ── EMERGENCY: no chemical plan ──
  if (riskAssessment.grade === 'EMERGENCY') {
    addStep(
      'Document the incident',
      'Record all products used (brand, shade, developer, mix ratio), application timing, ' +
      'and symptom onset. Take dated photos of the scalp and hair. ' +
      'This record protects both the client and the salon.',
    )
    addStep(
      'Follow up',
      'Check in with the client within 24 hours. If symptoms persist or worsen, ' +
      'insist on medical evaluation. Do not schedule corrective color until cleared.',
      '24-hour follow-up',
    )
    return { riskAssessment, issues, steps, formulas, homeCare, generatedAt }
  }

  // ── HIGH: stabilization before correction ──
  if (riskAssessment.grade === 'HIGH') {
    addStep(
      'Stabilize before correcting',
      'No chemical correction today. Recommend a bond-building treatment (Olaplex No. 1 & 2 ' +
      'or K18) and a deep conditioning mask. Re-assess elasticity in 7–14 days before ' +
      'scheduling the corrective service.',
      '7–14 days',
      'Applying color to compromised hair risks breakage the client will blame on the correction.',
    )
    // Still provide the corrective preview so the stylist can plan the follow-up
    issues = prioritizeIssues(diagnose(buildHairState(input)))
    if (issues.length > 0) {
      addStep(
        'Plan the corrective service',
        `When hair is stable, address: ${issues.map(i => i.name).join(', ')}. ` +
        'Book adequate time — corrective services should never be rushed.',
      )
    }
    homeCare = [
      'Bond-building treatment weekly until elasticity improves',
      'No heat styling until hair passes the stretch test',
      'Sulfate-free, acidic-pH shampoo and conditioner',
    ]
    return { riskAssessment, issues, steps, formulas, homeCare, generatedAt }
  }

  // ── MEDIUM / LOW: full corrective plan from the engine ──
  const hairState = buildHairState(input)
  issues = prioritizeIssues(diagnose(hairState))

  // If the engine found nothing, fall back to symptom-mapped issues
  if (issues.length === 0) {
    // Generic guidance when no engine match
    addStep(
      'Assess and clarify',
      'No specific corrective pattern matched. Clarify the hair to remove surface ' +
      'buildup, then re-assess tone in natural light before choosing a corrective formula.',
      '10 min',
    )
  }

  for (const issue of issues) {
    const formula = issue.suggestedFormulas[0]
    if (!formula) continue

    addStep(
      `Correct: ${issue.name}`,
      `${issue.neutralizationStrategy}`,
    )

    // Formula detail step
    const productLines = formula.products
      .map(p => `${p.brand} ${p.shade} + ${p.developer} (${p.ratio}) — ${p.amount}`)
      .join('\n')
    addStep(
      `Formula: ${formula.name}`,
      `${formula.purpose}\n${productLines}\nSectioning: ${formula.sectioning}`,
      formula.processingTime,
      formula.notes.length > 0 ? formula.notes.join(' ') : undefined,
    )
    formulas.push(...issue.suggestedFormulas)

    // Processing notes as warnings
    for (const note of issue.processingNotes.slice(0, 2)) {
      // folded into detail above to keep step count manageable
    }
  }

  // ── Aftercare ──
  const allHomeCare = new Set<string>()
  for (const issue of issues) {
    for (const tip of issue.homeCare) allHomeCare.add(tip)
  }
  homeCare = [...allHomeCare]
  if (homeCare.length > 0) {
    addStep(
      'Aftercare plan',
      'Send the client home with:\n' + homeCare.map(h => `• ${h}`).join('\n'),
    )
  }

  addStep(
    'Document and follow up',
    'Log this triage session to the client record (done automatically). ' +
    'Schedule a 2-week check-in to assess how the correction is holding.',
    '2-week follow-up',
  )

  return { riskAssessment, issues, steps, formulas, homeCare, generatedAt }
}

/** Format a recovery plan as printable text */
export function formatPlanForPrint(plan: RecoveryPlan, clientName?: string): string {
  const lines: string[] = []
  lines.push('COLORiq CORRECTIVE RECOVERY PLAN')
  lines.push(`Generated: ${new Date(plan.generatedAt).toLocaleString()}`)
  if (clientName) lines.push(`Client: ${clientName}`)
  lines.push(`Risk grade: ${plan.riskAssessment.grade}`)
  lines.push('')
  lines.push('RISK TRIGGERS:')
  for (const t of plan.riskAssessment.triggers) lines.push(`  • ${t}`)
  lines.push('')
  lines.push('ACTION PLAN:')
  for (const s of plan.steps) {
    lines.push(`  ${s.stepNumber}. ${s.title}`)
    lines.push(`     ${s.detail.split('\n').join('\n     ')}`)
    if (s.timing) lines.push(`     Timing: ${s.timing}`)
    if (s.warning) lines.push(`     ⚠ ${s.warning}`)
    lines.push('')
  }
  if (plan.homeCare.length > 0) {
    lines.push('AFTERCARE:')
    for (const h of plan.homeCare) lines.push(`  • ${h}`)
    lines.push('')
  }
  lines.push('—')
  lines.push(plan.riskAssessment.disclaimer)
  return lines.join('\n')
}
