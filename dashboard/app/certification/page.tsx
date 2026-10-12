'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Check, ChevronRight, Lock, Sparkles, FlaskConical,
  BookOpen, Target, TrendingUp, Clock, ShieldCheck, AlertCircle
} from 'lucide-react'

// ─── Certification Requirements ───────────────────────────────────────────────

interface Requirement {
  id: string
  label: string
  description: string
  icon: typeof FlaskConical
  target: number
  current: number
  unit: string
}

interface CertificationStatus {
  isCertified: boolean
  certifiedAt: string | null
  requirements: Requirement[]
  assessmentPassed: boolean
  assessmentScore: number | null
  overallProgress: number
}

// ─── Assessment Questions ─────────────────────────────────────────────────────

interface Question {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  category: string
}

const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: 'A client with natural level 5 hair wants to go to a level 8 golden blonde. What developer volume is most appropriate for maximum lift?',
    options: ['10 Vol', '20 Vol', '30 Vol', '40 Vol'],
    correct: 2,
    explanation: '30 Vol provides 3 levels of lift, taking level 5 to level 8. 40 Vol risks over-processing on previously colored hair.',
    category: 'Developer',
  },
  {
    id: 'q2',
    question: 'A level 7 formula shows unwanted orange/yellow warmth after processing. Which tone family would best neutralize it?',
    options: ['Gold (G)', 'Ash (A)', 'Copper (K)', 'Red (R)'],
    correct: 1,
    explanation: 'Ash tones contain blue/green pigments that counteract orange/yellow warmth (opposite on the color wheel).',
    category: 'Tone Theory',
  },
  {
    id: 'q3',
    question: 'For gray coverage on a client with 50%+ gray, which formula approach is most reliable?',
    options: [
      'Use a high-lift blonde with 40 Vol',
      'Mix natural + natural-natural (N + NN) for extra deposit',
      'Apply fashion color directly over gray',
      'Use 10 Vol with a level lighter than target',
    ],
    correct: 1,
    explanation: 'NN (double natural) formulas have extra pigment concentration needed to penetrate resistant gray cuticle. Mixing N + NN balances tone and coverage.',
    category: 'Gray Coverage',
  },
  {
    id: 'q4',
    question: 'A client has high porosity hair from previous bleaching. How should you adjust your formulation?',
    options: [
      'Use a higher developer volume',
      'Fill the hair with a warm protein filler first, then formulate 1-2 levels lighter',
      'Apply the formula for the full processing time',
      'Skip strand tests since the hair is already processed',
    ],
    correct: 1,
    explanation: 'High porosity hair absorbs color quickly and unevenly. Filling replaces missing underlying pigment. Formulating lighter compensates for over-absorption.',
    category: 'Porosity',
  },
  {
    id: 'q5',
    question: 'What is the underlying pigment exposed at level 7 during a lightening service?',
    options: ['Red-orange', 'Orange', 'Yellow-orange', 'Pale yellow'],
    correct: 2,
    explanation: 'Level 7 exposes yellow-orange underlying pigment. Understanding underlying pigment is essential for choosing the correct toner.',
    category: 'Level Theory',
  },
  {
    id: 'q6',
    question: 'A client wants a "lived-in bronde" look. What service type best describes this?',
    options: [
      'Global single-process color',
      'Balayage or hand-painted highlights with a root shadow',
      'Full head of foils with a gloss',
      'Direct dye application',
    ],
    correct: 1,
    explanation: 'Lived-in bronde = balayage technique for natural dimension + root shadow for low-maintenance grow-out. It creates a seamless blend between brunette and blonde.',
    category: 'Technique',
  },
  {
    id: 'q7',
    question: 'When mixing color with developer, what is the correct ratio for most permanent color lines?',
    options: ['1:1', '1:1.5', '1:2', '2:1'],
    correct: 1,
    explanation: '1:1.5 is the most common ratio for permanent color (e.g., 50g color + 75ml developer). However, always check the specific brand instructions.',
    category: 'Mixing',
  },
  {
    id: 'q8',
    question: 'A client has metallic dye in their hair history. What is the safest approach?',
    options: [
      'Proceed with standard lightening',
      'Perform a strand test and consult with the client about potential risks before proceeding',
      'Apply bleach immediately to remove it',
      'Use permanent color over it',
    ],
    correct: 1,
    explanation: 'Metallic dyes can react unpredictably with oxidative color and bleach, potentially causing breakage or heat. A strand test is mandatory before any chemical service.',
    category: 'Safety',
  },
  {
    id: 'q9',
    question: 'What does a "filler" do when applied to porous hair before a color service?',
    options: [
      'Adds moisture only',
      'Replaces missing underlying pigment so the final color has something to build on',
      'Removes previous color',
      'Seals the cuticle permanently',
    ],
    correct: 1,
    explanation: 'A filler replaces the warm underlying pigments that porous hair has lost. Without filling, cool/ash formulas turn muddy or green on porous hair.',
    category: 'Porosity',
  },
  {
    id: 'q10',
    question: 'A formula from the library is rated 92% confidence. What does this indicate?',
    options: [
      'The formula will work on every client',
      'The formula has a high probability of achieving the expected result based on aggregate data from similar hair profiles',
      'The developer volume is 92',
      'The client satisfaction score is 92/100',
    ],
    correct: 1,
    explanation: 'Confidence scores reflect how well a formula has performed across similar hair profiles (level, porosity, condition). Higher confidence = more reliable prediction.',
    category: 'Platform',
  },
]

const PASSING_SCORE = 7 // 70%

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CertificationPage() {
  const [status, setStatus] = useState<CertificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAssessment, setShowAssessment] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showResult, setShowResult] = useState(false)
  const [assessmentResult, setAssessmentResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/certification/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      } else {
        // Fallback demo status
        setStatus({
          isCertified: false,
          certifiedAt: null,
          assessmentPassed: false,
          assessmentScore: null,
          overallProgress: 35,
          requirements: [
            { id: 'formulations', label: 'Formulations Created', description: 'Create at least 25 formulations in ColorIq', icon: FlaskConical, target: 25, current: 8, unit: '' },
            { id: 'accuracy', label: 'Formula Accuracy', description: 'Maintain 80%+ average confidence on your formulas', icon: Target, target: 80, current: 72, unit: '%' },
            { id: 'community', label: 'Community Engagement', description: 'Receive 10+ likes on your posts', icon: TrendingUp, target: 10, current: 3, unit: '' },
            { id: 'active', label: 'Active Days', description: 'Be active for at least 14 days', icon: Clock, target: 14, current: 5, unit: '' },
            { id: 'assessment', label: 'Assessment', description: 'Pass the color formulation assessment (70%+)', icon: BookOpen, target: 1, current: 0, unit: '' },
          ],
        })
      }
    } catch {
      setStatus({
        isCertified: false,
        certifiedAt: null,
        assessmentPassed: false,
        assessmentScore: null,
        overallProgress: 35,
        requirements: [
          { id: 'formulations', label: 'Formulations Created', description: 'Create at least 25 formulations', icon: FlaskConical, target: 25, current: 8, unit: '' },
          { id: 'accuracy', label: 'Formula Accuracy', description: 'Maintain 80%+ confidence', icon: Target, target: 80, current: 72, unit: '%' },
          { id: 'community', label: 'Community Engagement', description: 'Receive 10+ likes', icon: TrendingUp, target: 10, current: 3, unit: '' },
          { id: 'active', label: 'Active Days', description: 'Active for 14+ days', icon: Clock, target: 14, current: 5, unit: '' },
          { id: 'assessment', label: 'Assessment', description: 'Pass the assessment (70%+)', icon: BookOpen, target: 1, current: 0, unit: '' },
        ],
      })
    }
    setLoading(false)
  }

  const handleAnswer = () => {
    if (selectedAnswer === null) return
    setAnswers(prev => ({ ...prev, [ASSESSMENT_QUESTIONS[currentQ].id]: selectedAnswer }))
    setShowExplanation(true)
  }

  const nextQuestion = () => {
    setShowExplanation(false)
    setSelectedAnswer(null)
    if (currentQ < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentQ(c => c + 1)
    } else {
      // Calculate score
      let correct = 0
      for (const [qId, answer] of Object.entries({ ...answers, [ASSESSMENT_QUESTIONS[currentQ].id]: selectedAnswer! })) {
        const q = ASSESSMENT_QUESTIONS.find(q => q.id === qId)
        if (q && q.correct === answer) correct++
      }
      const score = Math.round((correct / ASSESSMENT_QUESTIONS.length) * 100)
      const passed = correct >= PASSING_SCORE
      setAssessmentResult({ score, passed })
      setShowAssessment(false)
      setShowResult(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="animate-pulse text-white/20">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--cg-bg-deep)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] text-[#71717A] uppercase tracking-[0.1em] font-semibold">Professional Development</p>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F7] flex items-center gap-3">
                <span className="text-3xl">✦</span>
                ColorIq <span className="gradient-text-teal">Certified</span>
              </h1>
              <p className="text-sm text-[#A1A1AA] mt-2 max-w-lg">
                Earn the CGC badge — a recognized credential that shows clients and peers you've mastered AI-assisted color formulation.
              </p>
            </div>
            {status?.isCertified && (
              <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.15), rgba(236,72,153,0.15))', border: '1px solid rgba(147,51,234,0.3)' }}>
                <Award size={32} className="text-[#9333EA]" />
                <span className="text-[10px] font-bold text-[#9333EA] uppercase tracking-wider">Certified</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Assessment in progress */}
        <AnimatePresence>
          {showAssessment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 rounded-2xl p-6"
              style={{ background: 'rgba(30,30,45,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Progress */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs text-white/40">Question {currentQ + 1} of {ASSESSMENT_QUESTIONS.length}</span>
                <span className="text-xs font-medium text-[#9333EA]">{ASSESSMENT_QUESTIONS[currentQ].category}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/5 mb-6">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9333EA] to-[#EC4899] transition-all duration-500"
                  style={{ width: `${((currentQ + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <h3 className="text-lg font-semibold text-white mb-6 leading-relaxed">
                {ASSESSMENT_QUESTIONS[currentQ].question}
              </h3>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {ASSESSMENT_QUESTIONS[currentQ].options.map((option, i) => {
                  const isCorrect = i === ASSESSMENT_QUESTIONS[currentQ].correct
                  const isSelected = selectedAnswer === i
                  const showFeedback = showExplanation

                  return (
                    <button
                      key={i}
                      onClick={() => !showExplanation && setSelectedAnswer(i)}
                      disabled={showExplanation}
                      className="w-full text-left p-4 rounded-xl text-sm transition-all flex items-center gap-3"
                      style={{
                        background: showFeedback
                          ? isCorrect ? 'rgba(34,197,94,0.1)' : isSelected ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)'
                          : isSelected ? 'rgba(147,51,234,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${
                          showFeedback
                            ? isCorrect ? 'rgba(34,197,94,0.3)' : isSelected ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'
                            : isSelected ? 'rgba(147,51,234,0.3)' : 'rgba(255,255,255,0.06)'
                        }`,
                        color: showFeedback
                          ? isCorrect ? '#22c55e' : isSelected ? '#ef4444' : 'rgba(255,255,255,0.5)'
                          : isSelected ? '#F5F5F7' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          borderColor: showFeedback
                            ? isCorrect ? '#22c55e' : isSelected ? '#ef4444' : 'rgba(255,255,255,0.15)'
                            : isSelected ? '#9333EA' : 'rgba(255,255,255,0.15)',
                          background: showFeedback && isCorrect ? '#22c55e' : 'transparent',
                          color: showFeedback && isCorrect ? 'white' : 'inherit',
                        }}>
                        {showFeedback && isCorrect ? <Check size={12} /> : String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.15)' }}>
                    <p className="text-xs text-[#9333EA] font-semibold mb-1">Explanation</p>
                    <p className="text-sm text-white/60 leading-relaxed">{ASSESSMENT_QUESTIONS[currentQ].explanation}</p>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                {!showExplanation ? (
                  <button
                    onClick={handleAnswer}
                    disabled={selectedAnswer === null}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    {currentQ < ASSESSMENT_QUESTIONS.length - 1 ? 'Next Question' : 'See Results'}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assessment Result */}
        {showResult && assessmentResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 rounded-2xl p-8 text-center"
            style={{
              background: assessmentResult.passed
                ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(147,51,234,0.1))'
                : 'rgba(30,30,45,0.8)',
              border: `1px solid ${assessmentResult.passed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {assessmentResult.passed ? (
              <>
                <Award size={48} className="mx-auto mb-4 text-[#9333EA]" />
                <h2 className="text-2xl font-bold text-white mb-2">Assessment Passed!</h2>
                <p className="text-4xl font-bold text-[#22c55e] mb-2">{assessmentResult.score}%</p>
                <p className="text-sm text-white/50 mb-6">You answered {Math.round(assessmentResult.score * ASSESSMENT_QUESTIONS.length / 100)} of {ASSESSMENT_QUESTIONS.length} correctly</p>
                <p className="text-sm text-white/40">Complete the remaining requirements to earn your CGC badge.</p>
              </>
            ) : (
              <>
                <AlertCircle size={48} className="mx-auto mb-4 text-[#F59E0B]" />
                <h2 className="text-2xl font-bold text-white mb-2">Not Quite Yet</h2>
                <p className="text-4xl font-bold text-[#F59E0B] mb-2">{assessmentResult.score}%</p>
                <p className="text-sm text-white/50 mb-6">You need 70% to pass. Review the topics below and try again.</p>
                <button
                  onClick={() => { setShowResult(false); setShowAssessment(true); setCurrentQ(0); setAnswers({}); setSelectedAnswer(null); setShowExplanation(false) }}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Retake Assessment
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Requirements Progress */}
        {!showAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Requirements</h2>
            <div className="space-y-3 mb-8">
              {status?.requirements.map((req) => {
                const progress = Math.min((req.current / req.target) * 100, 100)
                const isComplete = req.current >= req.target
                const isAssessment = req.id === 'assessment'

                return (
                  <div
                    key={req.id}
                    className="rounded-xl p-4 flex items-center gap-4"
                    style={{
                      background: isComplete ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isComplete ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isComplete ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}
                    >
                      {isComplete ? (
                        <Check size={18} className="text-[#22c55e]" />
                      ) : (
                        <req.icon size={18} className="text-white/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white">{req.label}</p>
                        <span className="text-xs font-mono" style={{ color: isComplete ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                          {req.current}{req.unit} / {req.target}{req.unit}
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mb-2">{req.description}</p>
                      <div className="w-full h-1.5 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${progress}%`,
                            background: isComplete
                              ? '#22c55e'
                              : 'linear-gradient(90deg, #9333EA, #EC4899)',
                          }}
                        />
                      </div>
                    </div>
                    {isAssessment && !isComplete && (
                      <button
                        onClick={() => setShowAssessment(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-white hover:opacity-90 transition-opacity flex-shrink-0"
                      >
                        Start
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Overall Progress */}
            <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30 mb-3">Overall Progress</p>
              <div className="flex items-center justify-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="url(#gradient)" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - (status?.overallProgress || 0) / 100)}`}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#9333EA" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">{status?.overallProgress || 0}%</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    {status?.isCertified ? 'You are certified!' : 'Keep going!'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    {status?.isCertified
                      ? 'Your CGC badge is active on your profile.'
                      : `${status?.requirements.filter(r => r.current >= r.target).length || 0} of ${status?.requirements.length || 5} complete`}
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 rounded-2xl p-6" style={{ background: 'rgba(30,30,45,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">CGC Benefits</h3>
              <div className="space-y-3">
                {[
                  { icon: ShieldCheck, text: '✦ CGC badge on your profile, posts, and formulas' },
                  { icon: TrendingUp, text: 'Priority ranking in search and the community feed' },
                  { icon: Sparkles, text: 'Eligible for Elite/Signature creator tier' },
                  { icon: BookOpen, text: 'Eligible to become a ByondEdu educator' },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <benefit.icon size={16} className="text-[#9333EA] flex-shrink-0" />
                    <p className="text-sm text-white/60">{benefit.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
