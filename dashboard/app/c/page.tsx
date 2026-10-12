'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

type Phase = 'code' | 'ready' | 'success' | 'error';

export default function MobileUploadPage() {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [phase, setPhase] = useState<Phase>('code');
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [validating, setValidating] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-validate when all 4 digits entered
  const validateCode = useCallback(async (code: string) => {
    setValidating(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/sessions?code=${code}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSessionCode(code);
        setPhase('ready');
      } else {
        setErrorMsg(data.error || 'Invalid or expired code');
        setPhase('error');
      }
    } catch {
      setErrorMsg('Network error. Try again.');
      setPhase('error');
    } finally {
      setValidating(false);
    }
  }, []);

  useEffect(() => {
    const code = digits.join('');
    if (code.length === 4 && phase === 'code') {
      validateCode(code);
    }
  }, [digits, phase, validateCode]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-focus next
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = pasted.split('');
      while (newDigits.length < 4) newDigits.push('');
      setDigits(newDigits);
      const nextEmpty = newDigits.findIndex((d) => d === '');
      const focusIdx = nextEmpty === -1 ? 3 : nextEmpty;
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const handleUpload = async (file: File) => {
    if (!file || !sessionCode) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/sessions/${sessionCode}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhase('success');
      } else {
        setErrorMsg(data.error || 'Upload failed');
        setPhase('error');
      }
    } catch {
      setErrorMsg('Upload failed. Try again.');
      setPhase('error');
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const reset = () => {
    setDigits(['', '', '', '']);
    setPhase('code');
    setErrorMsg('');
    setSessionCode('');
    inputRefs.current[0]?.focus();
  };

  // Auto-reset after success
  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(reset, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#0A0A0F',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #9333EA, #EC4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(147, 51, 234, 0.3)',
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
            CG
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#A1A1AA',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          ColorIq
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* CODE PHASE */}
        {phase === 'code' && (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}
          >
            <div style={{ color: '#A1A1AA', fontSize: 14, marginBottom: 24 }}>
              Enter the code from the iPad
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 32,
              }}
              onPaste={handlePaste}
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: 60,
                    height: 72,
                    textAlign: 'center',
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#F5F5F7',
                    background: '#161620',
                    border: digit ? '2px solid #9333EA' : '2px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    outline: 'none',
                    fontFamily: 'var(--font-mono), monospace',
                    caretColor: 'transparent',
                    transition: 'border-color 0.2s',
                  }}
                />
              ))}
            </div>

            {validating && (
              <div style={{ color: '#A1A1AA', fontSize: 13, marginTop: 8 }}>
                Validating...
              </div>
            )}
          </motion.div>
        )}

        {/* READY PHASE */}
        {phase === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}
          >
            <div style={{ color: '#A1A1AA', fontSize: 14, marginBottom: 32 }}>
              Session <span style={{ color: '#9333EA', fontWeight: 600 }}>{sessionCode}</span> ready
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              {/* Camera button */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '28px 24px',
                  background: 'linear-gradient(135deg, #9333EA, #EC4899)',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(147, 51, 234, 0.3)',
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Camera size={28} color="#fff" strokeWidth={2} />
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  Take Photo
                </span>
              </button>

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '28px 24px',
                  background: '#1E1E2D',
                  border: '2px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Upload size={28} color="#A1A1AA" strokeWidth={2} />
                <span style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600 }}>
                  Upload Photo
                </span>
              </button>
            </div>

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCameraCapture}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </motion.div>
        )}

        {/* SUCCESS PHASE */}
        {phase === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <CheckCircle2 size={64} color="#10B981" strokeWidth={1.5} />
            </motion.div>
            <div style={{ color: '#10B981', fontSize: 18, fontWeight: 600, marginTop: 16 }}>
              Photo sent to iPad ✓
            </div>
          </motion.div>
        )}

        {/* ERROR PHASE */}
        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center' }}
          >
            <AlertCircle size={48} color="#EF4444" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <div style={{ color: '#EF4444', fontSize: 14, marginBottom: 24 }}>
              {errorMsg}
            </div>
            <button
              onClick={reset}
              style={{
                padding: '12px 32px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#F5F5F7',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
