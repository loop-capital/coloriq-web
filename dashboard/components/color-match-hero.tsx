'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image as ImageIcon, X, Loader2, ArrowRight, Sparkles, Droplets } from 'lucide-react'

interface ColorMatchHeroProps {
  onMatchComplete?: (result: ColorMatchResult) => void
}

export interface ColorMatchResult {
  success: boolean
  extractedColor: {
    primaryHex: string
    colorFamily: string
    level: number
    toneFamily: string
    secondaryTone?: string
  }
  matchedFormula: {
    id: string
    brand: string
    line: string
    shadeCode: string
    shadeName: string
    level: number
    tone: string
    secondaryTone?: string
    mixingRatio: string
    developerRequired: string
  } | null
  confidence: number
  matchDetails: {
    levelDistance: number
    toneMatch: boolean
    brand?: string
    colorName: string
  }
  prefillQuery?: string
}

export default function ColorMatchHero({ onMatchComplete }: ColorMatchHeroProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ColorMatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Max 10MB.')
      return
    }

    setError(null)
    setResult(null)
    setLoading(true)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/color-match', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }
      setResult(data as ColorMatchResult)
      onMatchComplete?.(data as ColorMatchResult)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [onMatchComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0])
    }
  }, [processFile])

  const handleReset = () => {
    setPreviewUrl(null)
    setResult(null)
    setError(null)
    setLoading(false)
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[#9333EA] font-semibold text-sm uppercase tracking-[0.15em] mb-4">
            AI Color Match
          </p>
          <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Find Your Color Match
          </h2>
          <p className="text-white/50 text-lg max-w-lg mx-auto">
            Upload any hair inspiration photo and get an instant COLORiq formula match
          </p>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
          >
            {/* Upload Dropzone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative mx-auto max-w-2xl rounded-3xl border-2 border-dashed p-8 md:p-12
                transition-all duration-300 cursor-pointer
                ${dragActive
                  ? 'border-[#9333EA] bg-[#9333EA]/10 shadow-[0_0_40px_rgba(147,51,234,0.15)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                }
                ${previewUrl ? 'pb-6' : ''}
              `}
              onClick={() => {
                if (!previewUrl && !loading) document.getElementById('color-match-input')?.click()
              }}
            >
              <input
                id="color-match-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                disabled={loading}
              />

              {/* Preview */}
              <AnimatePresence>
                {previewUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-8 relative"
                  >
                    <div className="relative mx-auto w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={previewUrl}
                        alt="Uploaded inspiration"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {!loading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReset()
                        }}
                        className="absolute top-0 right-1/2 translate-x-[calc(50%+5rem)] md:translate-x-[calc(50%+8rem)] p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
                      >
                        <X size={16} className="text-white/80" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Content */}
              {!previewUrl && (
                <div className="text-center">
                  <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333EA]/20 to-[#EC4899]/20 border border-[#9333EA]/20 flex items-center justify-center">
                    <Upload size={28} className="text-[#9333EA]" />
                  </div>
                  <p className="text-lg font-semibold text-white mb-2">
                    {dragActive ? 'Drop your photo here' : 'Upload a hair inspiration photo'}
                  </p>
                  <p className="text-sm text-white/40 mb-6">
                    Drag & drop or click to browse · JPEG, PNG, WebP · Max 10MB
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {['Instagram', 'Pinterest', 'Camera Roll'].map((source) => (
                      <span
                        key={source}
                        className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50"
                      >
                        <ImageIcon size={12} className="inline mr-1.5 -mt-0.5" />
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mt-6"
                >
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-[#9333EA]/10 border border-[#9333EA]/20">
                    <Loader2 size={18} className="text-[#9333EA] animate-spin" />
                    <span className="text-sm font-medium text-[#9333EA]">
                      Analyzing hair color with AI...
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 text-center"
                  >
                    <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 inline-block px-4 py-2 rounded-lg">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <ColorMatchResultComponent
            result={result}
            previewUrl={previewUrl}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Result Component (inline in the same file for single-file delivery) ─────

function ColorMatchResultComponent({
  result,
  previewUrl,
  onReset,
}: {
  result: ColorMatchResult
  previewUrl: string | null
  onReset: () => void
}) {
  const { extractedColor, matchedFormula, confidence, matchDetails, prefillQuery } = result

  const confidenceLabel = confidence >= 85 ? 'High' : confidence >= 60 ? 'Medium' : 'Review Needed'
  const confidenceColor = confidence >= 85 ? 'text-emerald-400' : confidence >= 60 ? 'text-amber-400' : 'text-red-400'
  const confidenceBg = confidence >= 85 ? 'bg-emerald-400/10 border-emerald-400/20' : confidence >= 60 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20'

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-3xl"
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Image + Extracted Color */}
        <div className="space-y-4">
          {/* Inspiration Photo */}
          {previewUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-square max-w-[280px] mx-auto md:mx-0">
              <img src={previewUrl} alt="Inspiration" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md px-4 py-2 text-xs text-white/70">
                Inspiration Photo
              </div>
            </div>
          )}

          {/* Extracted Color Swatch */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/40 mb-4 flex items-center gap-2">
              <Droplets size={14} className="text-[#9333EA]" />
              Extracted Color
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl border-2 border-white/10 shadow-lg"
                style={{ backgroundColor: extractedColor.primaryHex }}
              />
              <div>
                <p className="text-2xl font-black text-white">{extractedColor.primaryHex}</p>
                <p className="text-sm text-white/50">{extractedColor.colorFamily}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Level {extractedColor.level}
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                {extractedColor.toneFamily}
              </span>
              {extractedColor.secondaryTone && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                  Secondary: {extractedColor.secondaryTone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Matched Formula */}
        <div className="space-y-4">
          {/* Match Card */}
          <div className="rounded-2xl border border-[#9333EA]/20 bg-gradient-to-br from-[#9333EA]/10 to-[#EC4899]/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/40 flex items-center gap-2">
                <Sparkles size={14} className="text-[#EC4899]" />
                Matched Formula
              </p>
              <div className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${confidenceBg} ${confidenceColor}`}>
                {confidence}% Match
              </div>
            </div>

            {matchedFormula ? (
              <div className="space-y-4">
                {/* Brand & Shade */}
                <div>
                  <p className="text-sm text-white/50 mb-1">{matchedFormula.brand}</p>
                  <h3 className="text-2xl font-black text-white leading-tight">
                    {matchedFormula.shadeName}
                  </h3>
                  <p className="text-sm text-white/40 mt-1">
                    {matchedFormula.line} · {matchedFormula.shadeCode}
                  </p>
                </div>

                {/* Formula Specs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Level</p>
                    <p className="text-lg font-bold text-white">{matchedFormula.level}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Tone</p>
                    <p className="text-lg font-bold text-white capitalize">{matchedFormula.tone}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Mix Ratio</p>
                    <p className="text-lg font-bold text-white">{matchedFormula.mixingRatio}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Developer</p>
                    <p className="text-lg font-bold text-white">{matchedFormula.developerRequired}</p>
                  </div>
                </div>

                {/* Match Details */}
                <div className="space-y-2 pt-2">
                  {matchDetails.levelDistance === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Exact level match
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {matchDetails.levelDistance} level difference
                    </div>
                  )}
                  {matchDetails.toneMatch && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Tone family match
                    </div>
                  )}
                </div>

                {/* CTA */}
                <a
                  href={prefillQuery ? `/formulate?${prefillQuery}` : '/formulate'}
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #9333EA, #EC4899)',
                    boxShadow: '0 0 40px rgba(147,51,234,0.2)',
                  }}
                >
                  Get This Formula
                  <ArrowRight size={18} />
                </a>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/50 text-sm mb-2">No matching formula found.</p>
                <p className="text-white/30 text-xs">
                  Try uploading a clearer photo with good lighting.
                </p>
              </div>
            )}
          </div>

          {/* Try Another */}
          <button
            onClick={onReset}
            className="w-full py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            Upload Another Photo
          </button>
        </div>
      </div>
    </motion.div>
  )
}
