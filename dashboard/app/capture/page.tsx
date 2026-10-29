'use client';

import React from 'react';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  SwitchCamera,
  Zap,
  ZapOff,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Download,
  Info,
  AlertTriangle,
  ChevronDown,
  ScanFace,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { HairSection, HairType, haptic } from '@/lib/camera-types';
import { cn } from '@/lib/utils';

import {
  StraightHairIcon,
  WavyHairIcon,
  CurlyHairIcon,
  CoilyHairIcon,
} from '@/components/icons/hair-types';

/* ─── Sub-components ─── */

function HairTypeSelector({
  onSelect,
}: {
  onSelect: (type: HairType) => void;
}) {
  const options: { type: HairType; label: string; icon: React.ReactNode }[] = [
    { type: 'straight', label: 'Straight', icon: <StraightHairIcon size={32} /> },
    { type: 'wavy', label: 'Wavy', icon: <WavyHairIcon size={32} /> },
    { type: 'curly', label: 'Curly', icon: <CurlyHairIcon size={32} /> },
    { type: 'coily', label: 'Coily', icon: <CoilyHairIcon size={32} /> },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: '#F5F5F7' }}>
        Select Hair Type
      </h2>
      <p className="text-sm" style={{ color: '#71717A' }}>
        Choose your client's hair texture for optimal framing guidance.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ type, label, icon }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(type)}
            className="flex flex-col items-center gap-2 rounded-2xl p-5 text-left transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{icon}</span>
            <span className="text-sm font-semibold" style={{ color: '#F5F5F7' }}>
              {label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function SectionGuide({ section }: { section: HairSection }) {
  const content: Record<HairSection, { title: string; description: string; icon: string }> = {
    roots: {
      title: 'Roots',
      description: 'Pull hair away from scalp to show 2–3 inches of root area',
      icon: '🌱',
    },
    midlengths: {
      title: 'Mid-Lengths',
      description: 'Show the main body of the hair — color and texture',
      icon: '📏',
    },
    ends: {
      title: 'Ends',
      description: 'Capture texture, damage, and fading at the tips',
      icon: '✂️',
    },
  };
  const c = content[section];

  return (
    <motion.div
      key={section}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-x-0 bottom-24 flex justify-center px-4 z-10 pointer-events-none"
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm pointer-events-auto"
        style={{
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span className="text-xl">{c.icon}</span>
        <div>
          <p className="font-semibold" style={{ color: '#F5F5F7' }}>
            {c.title}
          </p>
          <p className="text-xs" style={{ color: '#A1A1AA' }}>
            {c.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function CountdownOverlay({ count }: { count: number | null }) {
  return (
    <AnimatePresence>
      {count !== null && (
        <motion.div
          key={count}
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(20,184,166,0.25)',
              border: '3px solid #9333EA',
              boxShadow: '0 0 40px rgba(20,184,166,0.4)',
            }}
          >
            <span className="text-5xl font-black" style={{ color: '#9333EA' }}>
              {count || ''}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LightingWarning({ assessment }: { assessment: { ok: boolean; warnings: string[] } | null }) {
  if (!assessment || assessment.ok) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 inset-x-4 z-20"
    >
      <div
        className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
        style={{
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.4)',
        }}
      >
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
        <div className="space-y-0.5">
          {assessment.warnings.map((w, i) => (
            <p key={i} style={{ color: '#FCD34D' }}>{w}</p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CameraControls({
  state,
  onToggleFacing,
  onCycleFlash,
  onZoomIn,
  onZoomOut,
  onCapture,
  onLightingCheck,
  currentPrompt,
}: {
  state: ReturnType<typeof useCamera>['state'];
  onToggleFacing: () => void;
  onCycleFlash: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCapture: () => void;
  onLightingCheck: () => void;
  currentPrompt: string;
}) {
  const flashIcons = { auto: Zap, on: Zap, off: ZapOff };
  const FlashIcon = flashIcons[state.flash];
  const flashLabels = { auto: 'Auto', on: 'On', off: 'Off' };

  return (
    <>
      {/* Top controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        {/* Flash */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCycleFlash}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            color: '#F5F5F7',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <FlashIcon className="h-3.5 w-3.5" style={{ color: state.flash === 'off' ? '#EF4444' : '#F59E0B' }} />
          {flashLabels[state.flash]}
        </motion.button>

        {/* Zoom */}
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onZoomOut}
            className="h-7 w-7 flex items-center justify-center rounded-full text-white text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            −
          </motion.button>
          <span className="text-xs font-semibold px-2" style={{ color: '#F5F5F7' }}>
            {state.zoom.toFixed(1)}×
          </span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onZoomIn}
            className="h-7 w-7 flex items-center justify-center rounded-full text-white text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            +
          </motion.button>
        </div>

        {/* Flip */}
        <motion.button
          whileTap={{ scale: 0.85, rotate: -15 }}
          onClick={onToggleFacing}
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <SwitchCamera className="h-4 w-4" style={{ color: '#F5F5F7' }} />
        </motion.button>
      </div>

      {/* Hair section guide */}
      {currentPrompt && (
        <SectionGuide section={(state as any).session?.currentSection || 'roots'} />
      )}

      {/* Bottom capture button */}
      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-4 z-20">
        <div className="flex items-center gap-6">
          {/* Lighting check */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onLightingCheck}
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <ScanFace className="h-5 w-5" style={{ color: '#A1A1AA' }} />
          </motion.button>

          {/* Main capture */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={onCapture}
            className="h-20 w-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #9333EA 0%, #0D9488 100%)',
              boxShadow: '0 0 0 4px rgba(20,184,166,0.25), 0 0 30px rgba(20,184,166,0.3)',
            }}
          >
            <div
              className="h-14 w-14 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)' }}
            />
          </motion.button>

          {/* Placeholder for symmetry */}
          <div className="h-12 w-12" />
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Tap to capture · 3-2-1 countdown
        </p>
      </div>
    </>
  );
}

function PhotoPreview({
  photo,
  onRetake,
  onConfirm,
  section,
}: {
  photo: {
    dataUrl: string;
    section: HairSection;
    uploadProgress: number;
    uploadedUrl: string | null;
    uploadError: string | null;
  };
  onRetake: () => void;
  onConfirm: () => void;
  section: HairSection;
}) {
  const isUploading = photo.uploadProgress > 0 && photo.uploadProgress < 100;
  const isUploaded = photo.uploadProgress === 100 && photo.uploadedUrl;
  const hasError = !!photo.uploadError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col"
      style={{ background: '#0A0A0A' }}
    >
      {/* Image */}
      <div className="flex-1 relative">
        <img
          src={photo.dataUrl}
          alt="Captured preview"
          className="w-full h-full object-contain"
        />

        {/* Upload status overlay */}
        {isUploading && (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: '#9333EA' }}>
                ☁️ Uploading to cloud...
              </span>
              <span className="text-xs font-medium" style={{ color: '#9333EA' }}>
                {photo.uploadProgress}%
              </span>
            </div>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${photo.uploadProgress}%`,
                  background: 'linear-gradient(90deg, #9333EA, #0D9488)',
                }}
              />
            </div>
          </div>
        )}

        {isUploaded && (
          <div
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: '#22C55E',
            }}
          >
            <Check className="h-3.5 w-3.5" />
            Uploaded
          </div>
        )}

        {hasError && (
          <div
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#EF4444',
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Upload failed
          </div>
        )}

        {/* Section badge */}
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold"
          style={{
            background: 'rgba(20,184,166,0.2)',
            border: '1px solid rgba(20,184,166,0.4)',
            color: '#9333EA',
          }}
        >
          {section.charAt(0).toUpperCase() + section.slice(1)} — Captured ✓
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 flex gap-4">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={onRetake}
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#A1A1AA' }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retake
        </Button>
        <Button
          className="flex-1 h-12"
          onClick={onConfirm}
          style={{
            background: 'linear-gradient(135deg, #9333EA 0%, #0D9488 100%)',
            color: '#0A0A0A',
          }}
        >
          <Check className="h-4 w-4 mr-2" />
          Use Photo
        </Button>
      </div>
    </motion.div>
  );
}

function HairGuideOverlay({ section }: { section: HairSection }) {
  const guideStyles: Record<HairSection, { label: string; rects: { x: number; y: number; w: number; h: number }[] }> = {
    roots: {
      label: 'Roots — upper 2–3 inches',
      rects: [{ x: 25, y: 10, w: 50, h: 30 }],
    },
    midlengths: {
      label: 'Mid-Lengths — main body',
      rects: [{ x: 20, y: 35, w: 60, h: 35 }],
    },
    ends: {
      label: 'Ends — tips and texture',
      rects: [{ x: 20, y: 65, w: 60, h: 28 }],
    },
  };
  const guide = guideStyles[section];

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {guide.rects.map((r, i) => (
        <div
          key={i}
          className="absolute border-2 rounded-lg"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: `${r.w}%`,
            height: `${r.h}%`,
            borderColor: 'rgba(20,184,166,0.5)',
            boxShadow: 'inset 0 0 20px rgba(20,184,166,0.1)',
          }}
        />
      ))}
      <div
        className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold"
        style={{
          top: `${guide.rects[0].y - 5}%`,
          background: 'rgba(20,184,166,0.15)',
          border: '1px solid rgba(20,184,166,0.3)',
          color: '#9333EA',
        }}
      >
        {guide.label}
      </div>
    </div>
  );
}

function ProgressDots({ current }: { current: 'roots' | 'midlengths' | 'ends' }) {
  const order = ['roots', 'midlengths', 'ends'] as const;
  const idx = order.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {order.map((s, i) => (
        <div
          key={s}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === idx ? 24 : 8,
            background: i <= idx ? '#9333EA' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  );
}

function CompleteScreen({
  session,
  onDone,
}: {
  session: ReturnType<typeof useCamera>['session'];
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#0F0F0F' }}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(20,184,166,0.15)', border: '2px solid #9333EA' }}
        >
          <Check className="h-10 w-10" style={{ color: '#9333EA' }} />
        </motion.div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>
            Capture Complete
          </h2>
          <p className="text-sm" style={{ color: '#71717A' }}>
            {session.photos.length} photos captured. Ready for analysis.
          </p>
        </div>

        {/* Thumbnails */}
        <div className="flex gap-3 w-full">
          {session.photos.map((p) => (
            <div
              key={p.id}
              className="flex-1 aspect-[3/4] rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <img
                src={p.dataUrl}
                alt={p.section}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <Button
          className="w-full h-12"
          onClick={onDone}
          style={{
            background: 'linear-gradient(135deg, #9333EA 0%, #0D9488 100%)',
            color: '#0A0A0A',
          }}
        >
          Continue to Analysis
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ─── Permission / Error state ─── */

function PermissionDenied({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0F0F0F' }}>
      <div className="max-w-sm text-center space-y-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Camera className="h-8 w-8" style={{ color: '#EF4444' }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: '#F5F5F7' }}>
          Camera Access Required
        </h2>
        <p className="text-sm" style={{ color: '#71717A' }}>{message}</p>
        <p className="text-xs" style={{ color: '#52525B' }}>
          Please allow camera access in your browser settings, then reload the page.
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

function CapturePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    videoRef,
    state,
    session,
    countdown,
    lightingCheck,
    startCapture,
    toggleFacing,
    cycleFlash,
    setZoom,
    triggerFocus,
    startCountdown,
    retake,
    nextSection,
    runLightingCheck,
    getCurrentPrompt,
    saveToGallery,
    stopStream,
    handoff,
  } = useCamera({
    externalSessionId: searchParams.get('sessionId'),
    externalFormulaId: searchParams.get('formulaId'),
  });

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleDone = () => {
    stopStream();
    // Serialize session to sessionStorage so the next page can pick it up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('captureSession', JSON.stringify(session));
    }
    router.push('/analyze');
  };

  // ── Permission denied ──
  if (state.hasPermission === false) {
    return <PermissionDenied message={state.error ?? 'Camera access denied.'} />;
  }

  // ── Complete ──
  if (state.step === 'complete') {
    return <CompleteScreen session={session} onDone={handleDone} />;
  }

  // ── Prep: Hair type selection ──
  if (state.step === 'prep') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: '#0F0F0F' }}
      >
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="text-center space-y-1">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}
            >
              <Camera className="h-7 w-7" style={{ color: '#9333EA' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>
              Hair Photo Capture
            </h1>
            <p className="text-sm" style={{ color: '#71717A' }}>
              We'll capture 3 sections: roots, mid-lengths, ends
            </p>
          </div>

          {handoff.active && (
            <div
              className="flex items-start gap-2.5 p-4 rounded-xl text-xs"
              style={{
                background: 'rgba(147,51,234,0.08)',
                border: '1px solid rgba(147,51,234,0.3)',
              }}
            >
              <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#9333EA' }} />
              <p style={{ color: '#F5F5F7' }}>
                Photographing a result — this photo will link to the formula it came from.
              </p>
            </div>
          )}

          <HairTypeSelector
            onSelect={(type) => {
              haptic(40);
              startCapture(type);
            }}
          />

          <div
            className="flex items-start gap-2.5 p-4 rounded-xl text-xs"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#9333EA' }} />
            <p style={{ color: '#71717A' }}>
              For best results: use natural or daylight lighting, capture on a solid
              neutral background, and ensure hair is dry with no heavy styling products.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Camera view ──
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#000' }}>
      {/* Video */}
      <div className="relative w-full h-screen">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            triggerFocus(x, y);
          }}
        />

        {/* Hair guide overlay */}
        <HairGuideOverlay section={session.currentSection} />

        {/* Lighting check warning */}
        <LightingWarning assessment={lightingCheck} />

        {/* Countdown overlay */}
        <CountdownOverlay count={countdown} />

        {/* Progress dots */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <ProgressDots current={session.currentSection} />
        </div>

        {/* Camera controls */}
        <CameraControls
          state={state}
          onToggleFacing={toggleFacing}
          onCycleFlash={cycleFlash}
          onZoomIn={() => setZoom(state.zoom + 0.5)}
          onZoomOut={() => setZoom(state.zoom - 0.5)}
          onCapture={startCountdown}
          onLightingCheck={runLightingCheck}
          currentPrompt={getCurrentPrompt()}
        />
      </div>

      {/* Photo preview overlay */}
      <AnimatePresence>
        {state.step === 'preview' && session.photos.length > 0 && (
          <PhotoPreview
            photo={session.photos[session.photos.length - 1]}
            onRetake={retake}
            onConfirm={nextSection}
            section={session.currentSection}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CapturePage() {
  // useSearchParams() above requires a Suspense boundary (same pattern as
  // the formulate page): without parameters this renders identically.
  return (
    <Suspense fallback={null}>
      <CapturePageContent />
    </Suspense>
  );
}