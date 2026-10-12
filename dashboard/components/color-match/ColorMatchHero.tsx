'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import { ColorMatchResult } from './ColorMatchResult'

interface MatchResponse {
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

export function ColorMatchHero() {
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [result, setResult] = useState<MatchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processFile(file)
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [])

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Max 10MB.')
      return
    }

    setError(null)
    setResult(null)
    setIsUploading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string)
      uploadAndAnalyze(file)
    }
    reader.readAsDataURL(file)
  }

  const uploadAndAnalyze = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/color-match', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data as MatchResponse)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsUploading(false)
    }
  }

  const clearResult = () => {
    setUploadedImage(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section id="color-match" style={{ padding: '128px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p style={{ color: '#9333EA', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>
              AI Color Match
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16 }}>
              Find Your Color Match
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, maxWidth: 520, margin: '0 auto' }}>
              Upload any hair inspiration photo and get an instant COLORiq formula match
            </p>
          </motion.div>
        </div>

        {/* Upload Area */}
        <AnimatePresence mode="wait">
          {!uploadedImage ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: dragActive ? '2px dashed #9333EA' : '2px dashed rgba(255,255,255,0.15)',
                  background: dragActive ? 'rgba(147,51,234,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 24,
                  padding: '48px 32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(147,51,234,0.2), rgba(236,72,153,0.2))',
                    border: '1px solid rgba(147,51,234,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}
                >
                  <Upload size={32} color="#9333EA" />
                </div>
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  Drop your inspiration photo here
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 8 }}>
                  or click to browse — we'll analyze the dominant hair color
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
                    JPG
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
                    PNG
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
                    WebP
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 24,
                padding: 24,
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Image Preview Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ImageIcon size={18} color="#9333EA" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Your Inspiration</span>
                </div>
                <button
                  onClick={clearResult}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <X size={14} /> Clear
                </button>
              </div>

              {/* Image + Result Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Left: Image */}
                <div
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.06)',
                    aspectRatio: '1',
                    position: 'relative',
                  }}
                >
                  <img
                    src={uploadedImage}
                    alt="Uploaded inspiration"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {isUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                      }}
                    >
                      <Loader2 size={32} color="#9333EA" style={{ animation: 'spin 1s linear infinite' }} />
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Analyzing colors...</p>
                    </div>
                  )}
                </div>

                {/* Right: Result */}
                <div>
                  {isUploading ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          border: '2px solid rgba(147,51,234,0.2)',
                          borderTopColor: '#9333EA',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Extracting dominant color...</p>
                    </div>
                  ) : error ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 8 }}>{error}</p>
                      <button
                        onClick={clearResult}
                        style={{
                          background: 'rgba(147,51,234,0.1)',
                          border: '1px solid rgba(147,51,234,0.2)',
                          borderRadius: 8,
                          padding: '8px 16px',
                          color: '#9333EA',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : result ? (
                    <ColorMatchResult data={result} onReset={clearResult} />
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}
