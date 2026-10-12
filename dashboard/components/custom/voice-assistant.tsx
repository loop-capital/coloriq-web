'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// =====================================================
// COLORGENIUS VOICE ASSISTANT — Push-to-Talk Component
// With toggle, billing awareness, and disabled state
// =====================================================

type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

interface VoiceAssistantProps {
  clientId?: string
  context?: {
    clientName?: string
    currentFormula?: Record<string, unknown>
    brands?: Record<string, string[]>
  }
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function VoiceAssistant({ clientId, context, position = 'bottom-right' }: VoiceAssistantProps) {
  const [state, setState] = useState<AssistantState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [billing, setBilling] = useState<{ billedMinutes: number; billedCents: number; monthlyTotal: number } | null>(null)
  const [voiceDisabledMidUse, setVoiceDisabledMidUse] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    setSpeechSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  }, [])

  // ── Check if assistant is enabled ──
  useEffect(() => {
    fetch('/api/assistant')
      .then(r => r.json())
      .then(data => {
        if (data.success) setEnabled(data.enabled)
        else setEnabled(false)
      })
      .catch(() => setEnabled(false))
  }, [])

  // ── Start listening ──
  const startListening = useCallback(() => {
    if (!speechSupported) {
      setState('error')
      setResponse('Voice input not supported. Try Chrome or Edge.')
      return
    }

    setTranscript('')
    setResponse('')
    setState('listening')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1]
      const text = result[0].transcript
      setTranscript(text)
      if (result.isFinal) askAssistant(text)
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'no-speech') {
        setState('idle')
        setTranscript('')
      } else {
        setState('error')
        setResponse('Could not hear you. Try again.')
        setTimeout(() => setState('idle'), 3000)
      }
    }

    recognition.onend = () => {
      if (state === 'listening') setState('idle')
    }

    recognitionRef.current = recognition
    recognition.start()

    timeoutRef.current = setTimeout(() => {
      recognition.stop()
      setState('idle')
    }, 15000)
  }, [speechSupported, state])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  // ── Ask the AI assistant ──
  const askAssistant = useCallback(async (question: string) => {
    setState('processing')

    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, clientId, context }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'VOICE_DISABLED') {
          setEnabled(false)
          setVoiceDisabledMidUse(true)
          setExpanded(true)
          setState('idle')
          return
        }
        setResponse(data.error || 'Sorry, I had trouble with that.')
        setState('error')
        setTimeout(() => setState('idle'), 3000)
        return
      }

      setResponse(data.answer)
      if (data.billing) setBilling(data.billing)
      speak(data.answer)
    } catch {
      setResponse('Connection error. Check your network.')
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [clientId, context])

  // ── Text-to-speech ──
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setState('idle')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith('en'))
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => setState('speaking')
    utterance.onend = () => {
      setState('idle')
      setTranscript('')
      setTimeout(() => setResponse(''), 5000)
    }
    utterance.onerror = () => setState('idle')

    window.speechSynthesis.speak(utterance)
  }, [])

  // ── Handle press ──
  const handlePressStart = useCallback(() => {
    if (enabled === false) {
      setExpanded(true)
      return
    }
    if (state === 'speaking') {
      window.speechSynthesis.cancel()
      setState('idle')
      return
    }
    if (state === 'idle' || state === 'error') {
      startListening()
    }
  }, [state, startListening, enabled])

  const handlePressEnd = useCallback(() => {
    if (state === 'listening') stopListening()
  }, [state, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      window.speechSynthesis?.cancel()
    }
  }, [])

  // ── Position ──
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  }

  const stateColors: Record<AssistantState, string> = {
    idle: 'bg-[#9333EA]',
    listening: 'bg-red-500 animate-pulse',
    processing: 'bg-[#F59E0B]',
    speaking: 'bg-[#9333EA]',
    error: 'bg-[#EF4444]',
  }

  const stateIcons: Record<AssistantState, React.ReactNode> = {
    idle: <MicIcon />,
    listening: <MicIcon />,
    processing: <SpinnerIcon />,
    speaking: <SpeakerIcon />,
    error: <MicIcon />,
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Disabled panel — enabling this is admin-only, not self-service */}
      {enabled === false && expanded && (
        <div className="mb-3 max-w-[220px] rounded-2xl border border-white/[0.06] p-4 shadow-xl"
          style={{ background: 'rgba(20, 20, 35, 0.95)', backdropFilter: 'blur(16px)' }}>
          <p className="text-sm text-[#F5F5F7] mb-1">Voice Assistant is off</p>
          <p className="text-xs text-[#71717A]">
            {voiceDisabledMidUse
              ? 'This salon’s voice assistant was turned off.'
              : 'Ask ColorIq to turn this on for your salon — it’s billed per question.'}
          </p>
        </div>
      )}

      {/* Response bubble */}
      {(transcript || response) && expanded && enabled !== false && (
        <div className="mb-3 max-w-xs rounded-2xl border border-white/[0.06] p-4 shadow-xl"
          style={{ background: 'rgba(20, 20, 35, 0.95)', backdropFilter: 'blur(16px)' }}>
          {transcript && (
            <div className="mb-2">
              <p className="text-[11px] text-[#71717A] mb-0.5">You said:</p>
              <p className="text-sm text-[#A3A3A3] italic">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}
          {response && (
            <div>
              <p className="text-[11px] text-[#9333EA] mb-0.5">ColorIq:</p>
              <p className="text-sm text-[#F5F5F7] leading-relaxed">{response}</p>
              {billing && (
                <p className="text-[10px] text-[#71717A] mt-2">
                  {billing.billedMinutes.toFixed(1)} min · ${(billing.billedCents / 100).toFixed(3)} · {billing.monthlyTotal.toFixed(1)} min this month
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Label */}
        {expanded && state !== 'idle' && enabled !== false && (
          <div className="px-3 py-1.5 rounded-full border border-white/[0.06]"
            style={{ background: 'rgba(20, 20, 35, 0.9)' }}>
            <p className="text-xs text-[#A3A3A3] whitespace-nowrap">
              {state === 'listening' ? 'Listening...' :
               state === 'processing' ? 'Thinking...' :
               state === 'speaking' ? 'Speaking...' : 'Tap to ask'}
            </p>
          </div>
        )}

        {/* Main button */}
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onClick={() => setExpanded(!expanded)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            enabled === false ? 'bg-[#71717A] opacity-60' : stateColors[state]
          } hover:scale-105 active:scale-95`}
          style={{
            boxShadow: state === 'listening'
              ? '0 0 0 4px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2)'
              : enabled === false
                ? '0 4px 20px rgba(113, 113, 122, 0.2)'
                : '0 4px 20px rgba(147, 51, 234, 0.3)',
          }}
          title={enabled === false ? 'Not enabled for your salon' : speechSupported ? 'Hold to speak' : 'Voice not supported'}
        >
          {enabled === false ? <LockIcon /> : stateIcons[state]}
        </button>
      </div>

      {/* Quick questions (when idle, expanded, enabled) */}
      {state === 'idle' && expanded && !response && enabled && (
        <div className="mt-3 max-w-[200px] space-y-1.5">
          {[
            'What developer for level 6 to 9?',
            'How long should this process?',
            'Is this safe with PPD allergy?',
            'My toner went too ashy',
          ].map((hint) => (
            <button key={hint} onClick={() => { setExpanded(true); askAssistant(hint) }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#A3A3A3] border border-white/[0.06] hover:bg-white/[0.03] hover:text-[#F5F5F7] transition-colors"
              style={{ background: 'rgba(20, 20, 35, 0.8)' }}>
              {hint}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Icons ──

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="white"/><path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M12 19V23M8 23H16" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
  )
}
function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2V15H6L11 19V5Z" fill="white"/><path d="M15.54 8.46C16.48 9.4 17.02 10.65 17.02 12C17.02 13.35 16.48 14.6 15.54 15.54" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M18.07 5.93C19.95 7.81 21 10.34 21 13C21 15.66 19.95 18.19 18.07 20.07" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
  )
}
function SpinnerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
  )
}
function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" fill="white" opacity="0.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
  )
}
