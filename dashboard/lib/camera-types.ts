/**
 * ColorIq — Camera Capture Types
 */

export type CameraFacing = 'user' | 'environment';

export type FlashMode = 'auto' | 'on' | 'off';

export type HairSection = 'roots' | 'midlengths' | 'ends';

export type HairType = 'straight' | 'wavy' | 'curly' | 'coily';

export type CaptureStep =
  | 'prep'
  | 'camera'
  | 'countdown'
  | 'burst'
  | 'preview'
  | 'lighting-check'
  | 'complete';

export interface CapturePhoto {
  id: string;
  section: HairSection;
  dataUrl: string;
  timestamp: string;
  width: number;
  height: number;
  fileSize: number;
  uploadProgress: number;
  uploadedUrl: string | null;
  uploadError: string | null;
}

export interface CameraState {
  step: CaptureStep;
  facing: CameraFacing;
  flash: FlashMode;
  zoom: number;
  isStreaming: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

export interface LightingAssessment {
  ok: boolean;
  brightness: 'dark' | 'good' | 'bright';
  warnings: string[];
}

export interface CaptureSession {
  id: string;
  hairType: HairType;
  photos: CapturePhoto[];
  currentSection: HairSection;
  startedAt: string;
}

/** Compress image to max 1080p, strip EXIF */
export async function compressImage(
  dataUrl: string,
  maxWidth = 1080,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Strip EXIF data from a data URL by re-drawing through canvas */
export function stripExif(dataUrl: string): Promise<string> {
  return compressImage(dataUrl, 1080, 0.9);
}

/** Haptic feedback */
export function haptic(duration = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

/** Generate unique ID */
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}