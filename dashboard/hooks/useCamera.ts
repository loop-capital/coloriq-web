'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  CameraState,
  CameraFacing,
  FlashMode,
  CaptureSession,
  CapturePhoto,
  HairSection,
  HairType,
  CaptureStep,
  LightingAssessment,
  uid,
  stripExif,
  haptic,
} from '@/lib/camera-types';

const SECTION_ORDER: HairSection[] = ['roots', 'midlengths', 'ends'];

const SECTION_PROMPTS: Record<HairSection, string> = {
  roots: '📸 Move camera close to the roots — upper scalp area',
  midlengths: '📸 Center the mid-lengths of the hair in frame',
  ends: '📸 Focus on the ends — show texture and condition',
};

function assessLighting(video: HTMLVideoElement): LightingAssessment {
  const canvas = document.createElement('canvas');
  const size = 100;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: true, brightness: 'good', warnings: [] };

  // Sample center region
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const sx = Math.max(0, (vw - size) / 2);
  const sy = Math.max(0, (vh - size) / 2);

  try {
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  } catch {
    return { ok: true, brightness: 'good', warnings: [] };
  }

  const data = ctx.getImageData(0, 0, size, size).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Perceived brightness (ITU BT.709)
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  const avg = sum / (size * size);

  const warnings: string[] = [];
  let brightness: LightingAssessment['brightness'] = 'good';

  if (avg < 30) {
    brightness = 'dark';
    warnings.push('⚠️ Too dark — move to brighter area or add lighting');
  } else if (avg > 220) {
    brightness = 'bright';
    warnings.push('⚠️ Too bright — reduce direct light to avoid glare');
  }

  return { ok: warnings.length === 0, brightness, warnings };
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaStreamTrack = useRef<MediaStreamTrack | null>(null);

  const [state, setState] = useState<CameraState>({
    step: 'prep',
    facing: 'user',
    flash: 'auto',
    zoom: 1,
    isStreaming: false,
    hasPermission: null,
    error: null,
  });

  const [session, setSession] = useState<CaptureSession>({
    id: uid(),
    hairType: 'straight',
    photos: [],
    currentSection: 'roots',
    startedAt: new Date().toISOString(),
  });

  const [countdown, setCountdown] = useState<number | null>(null);
  const [lightingCheck, setLightingCheck] = useState<LightingAssessment | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaStreamTrack.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const startStream = useCallback(
    async (facing: CameraFacing, flash: FlashMode) => {
      stopStream();
      setState((s) => ({ ...s, error: null }));

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facing,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        mediaStreamTrack.current = stream.getVideoTracks()[0] ?? null;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setState((s) => ({
          ...s,
          isStreaming: true,
          hasPermission: true,
        }));
      } catch (err: unknown) {
        const msg =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera permission in browser settings.'
            : err instanceof DOMException && err.name === 'NotFoundError'
              ? 'No camera found on this device.'
              : 'Could not start camera.';
        setState((s) => ({ ...s, hasPermission: false, error: msg }));
      }
    },
    [stopStream]
  );

  const toggleFacing = useCallback(() => {
    const next: CameraFacing = state.facing === 'user' ? 'environment' : 'user';
    setState((s) => ({ ...s, facing: next }));
    startStream(next, state.flash);
  }, [state.facing, state.flash, startStream]);

  const cycleFlash = useCallback(() => {
    const order: FlashMode[] = ['auto', 'on', 'off'];
    const idx = order.indexOf(state.flash);
    const next = order[(idx + 1) % order.length];
    setState((s) => ({ ...s, flash: next }));
    if (mediaStreamTrack.current) {
      const track = mediaStreamTrack.current;
      if ('torch' in track.getCapabilities()) {
        track.applyConstraints({
          advanced: [{ torch: next === 'on' || (next === 'auto' && true) } as MediaTrackConstraintSet],
        }).catch(() => {/* torch not supported */});
      }
    }
  }, [state.flash]);

  const setZoom = useCallback((zoom: number) => {
    const clamped = Math.max(1, Math.min(5, zoom));
    setState((s) => ({ ...s, zoom: clamped }));
    if (mediaStreamTrack.current) {
      mediaStreamTrack.current.applyConstraints({
        advanced: [{ zoom: clamped } as MediaTrackConstraintSet],
      }).catch(() => {/* zoom not supported */});
    }
  }, []);

  const triggerFocus = useCallback((x: number, y: number) => {
    if (mediaStreamTrack.current && 'focusDistance' in mediaStreamTrack.current.getCapabilities()) {
      mediaStreamTrack.current.applyConstraints({
        advanced: [{ focusDistance: 0.3 } as MediaTrackConstraintSet],
      }).catch(() => {/* focus not supported */});
    }
    haptic(30);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  const startCapture = useCallback(
    (hairType: HairType) => {
      const id = uid();
      setSession({
        id,
        hairType,
        photos: [],
        currentSection: 'roots',
        startedAt: new Date().toISOString(),
      });
      setState((s) => ({ ...s, step: 'camera' }));
      startStream(state.facing, state.flash);
    },
    [startStream, state.facing, state.flash]
  );

  const runLightingCheck = useCallback((): LightingAssessment | null => {
    if (!videoRef.current) return null;
    const assessment = assessLighting(videoRef.current);
    setLightingCheck(assessment);
    return assessment;
  }, []);

  const startCountdown = useCallback(() => {
    setState((s) => ({ ...s, step: 'countdown' }));
    setCountdown(3);
    haptic(50);

    const tick = setInterval(() => {
      setCountdown((n) => {
        if (n === null || n <= 1) {
          clearInterval(tick);
          // Fire capture
          captureFrame();
          return null;
        }
        haptic(30);
        return n - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadPhoto = useCallback(
    async (photo: CapturePhoto): Promise<string | null> => {
      // First update session with upload progress state
      setSession((s) => ({
        ...s,
        photos: s.photos.map((p) =>
          p.id === photo.id
            ? { ...p, uploadProgress: 0, uploadedUrl: null, uploadError: null }
            : p
        ),
      }));

      try {
        // Convert dataUrl to blob
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();

        // Get presigned URL from our API
        const apiRes = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            angle: photo.section,
            contentType: 'image/jpeg',
            contentLength: blob.size,
          }),
        });

        if (!apiRes.ok) {
          const err = await apiRes.json();
          throw new Error(err.error || 'Failed to get upload URL');
        }

        const { data } = await apiRes.json();
        const { uploadUrl, publicUrl } = data;

        // Upload directly to R2 via presigned URL
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        });

        if (!uploadRes.ok) {
          throw new Error(`R2 upload failed: ${uploadRes.status}`);
        }

        // Update photo with public URL and 100% progress
        setSession((s) => ({
          ...s,
          photos: s.photos.map((p) =>
            p.id === photo.id
              ? { ...p, uploadProgress: 100, uploadedUrl: publicUrl }
              : p
          ),
        }));

        return publicUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setSession((s) => ({
          ...s,
          photos: s.photos.map((p) =>
            p.id === photo.id
              ? { ...p, uploadError: msg }
              : p
          ),
        }));
        return null;
      }
    },
    [session.id]
  );

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    let dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Strip EXIF
    dataUrl = await stripExif(dataUrl);

    const photo: CapturePhoto = {
      id: uid(),
      section: session.currentSection,
      dataUrl,
      timestamp: new Date().toISOString(),
      width: canvas.width,
      height: canvas.height,
      fileSize: Math.round((dataUrl.length * 3) / 4), // base64 estimate
      uploadProgress: 0,
      uploadedUrl: null,
      uploadError: null,
    };

    setSession((s) => {
      const updated = [...s.photos, photo];
      return { ...s, photos: updated };
    });

    haptic(50);
    setState((s) => ({ ...s, step: 'preview' }));

    // Trigger background upload
    uploadPhoto(photo);
  }, [session.currentSection, uploadPhoto]);

  const burstCapture = useCallback(async () => {
    setState((s) => ({ ...s, step: 'burst' }));
    haptic(50);
    for (let i = 0; i < 3; i++) {
      await captureFrame();
      await new Promise((r) => setTimeout(r, 400));
    }
  }, [captureFrame]);

  const retake = useCallback(() => {
    setSession((s) => {
      const updated = s.photos.filter((p) => p.section !== s.currentSection);
      return { ...s, photos: updated };
    });
    setState((s) => ({ ...s, step: 'camera' }));
  }, []);

  const nextSection = useCallback(() => {
    const idx = SECTION_ORDER.indexOf(session.currentSection);
    if (idx < SECTION_ORDER.length - 1) {
      const next = SECTION_ORDER[idx + 1];
      setSession((s) => ({ ...s, currentSection: next }));
      setState((s) => ({ ...s, step: 'camera' }));
    } else {
      setState((s) => ({ ...s, step: 'complete' }));
    }
  }, [session.currentSection]);

  const getCurrentPrompt = useCallback((): string => {
    return SECTION_PROMPTS[session.currentSection];
  }, [session.currentSection]);

  const saveToGallery = useCallback((dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `coloriq-${session.currentSection}-${Date.now()}.jpg`;
    link.click();
  }, [session.currentSection]);

  return {
    videoRef,
    state,
    session,
    countdown,
    lightingCheck,
    // actions
    startCapture,
    toggleFacing,
    cycleFlash,
    setZoom,
    triggerFocus,
    startCountdown,
    burstCapture,
    retake,
    nextSection,
    runLightingCheck,
    getCurrentPrompt,
    saveToGallery,
    stopStream,
    uploadPhoto,
  };
}