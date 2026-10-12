/**
 * ColorIq — Camera Capture Types
 *
 * Shared TypeScript types for the PWA camera workflow.
 * Aligned with Prisma schema enums and dashboard/lib/camera-types.ts
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum HairType {
  STRAIGHT = 'straight',
  WAVY = 'wavy',
  CURLY = 'curly',
  COILY = 'coily',
}

export enum LightingCondition {
  NATURAL = 'natural',
  FLUORESCENT = 'fluorescent',
  LED = 'led',
  TUNGSTEN = 'tungsten',
  MIXED = 'mixed',
}

export enum SessionStatus {
  PENDING = 'pending',
  CAPTURING = 'capturing',
  ANALYZING = 'analyzing',
  COMPLETE = 'complete',
  ERROR = 'error',
}

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum HairAngle {
  ROOTS = 'roots',
  MID = 'mid',
  ENDS = 'ends',
}

export enum PorosityEstimate {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface LightingConditions {
  source: LightingCondition;
  notes?: string;
}

export interface PhotoSession {
  id: string;
  clientId: string | null;
  stylistId: string | null;
  hairType: HairType | string;
  lightingConditions: LightingConditions | null;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  photos: Photo[];
  analysisResults: AnalysisResult[];
}

export interface Photo {
  id: string;
  sessionId: string | null;
  angle: HairAngle | string;
  url: string;
  storageKey: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  analysisStatus: AnalysisStatus;
  colorProfile: ColorProfile | null;
  createdAt: string;
  updatedAt: string;
  analysisResult: AnalysisResult | null;
}

export interface ColorProfile {
  sections: {
    roots?: ColorSection;
    mid?: ColorSection;
    ends?: ColorSection;
  };
  overall: {
    dominantHex: string;
    warmthIndex: number;
    lightness: number;
    saturation: number;
  };
}

export interface ColorSection {
  rgb: { r: number; g: number; b: number };
  hex: string;
  confidence: number;
  regionPixels?: number;
}

export interface AnalysisResult {
  id: string;
  photoId: string | null;
  sessionId: string | null;

  // Core color analysis
  dominantColor: string;
  dominantColorName: string;
  rgbR: number;
  rgbG: number;
  rgbB: number;

  // Underlying pigment analysis
  underlyingPigment: string;
  warmthCoolnessRatio: number;

  // Hair condition metrics
  porosityEstimate: PorosityEstimate | string;
  damageLevel: string; // "none" | "minimal" | "moderate" | "severe"
  cuticleVisibility: number;

  // Confidence and quality metrics
  confidenceScore: number;
  lightingQuality: string;
  angleAccuracy: string;

  // Processing metadata
  processedAt: string;
  modelVersion: string;

  // Raw analysis payload
  analysisData: Record<string, unknown> | null;

  createdAt: string;
}

// ─── API Request / Response Types ─────────────────────────────────────────────

// POST /api/sessions
export interface CreateSessionRequest {
  clientId?: string;
  stylistId?: string;
  hairType: HairType | string;
  lightingConditions?: LightingConditions;
}

export interface CreateSessionResponse {
  success: boolean;
  data?: PhotoSession;
  error?: { code: string; message: string };
}

// GET /api/sessions
export interface ListSessionsRequest {
  status?: SessionStatus;
  clientId?: string;
  limit?: number;
  offset?: number;
}

export interface ListSessionsResponse {
  success: boolean;
  data?: PhotoSession[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
  error?: { code: string; message: string };
}

// GET /api/sessions/:id
export interface GetSessionResponse {
  success: boolean;
  data?: PhotoSession;
  error?: { code: string; message: string };
}

// POST /api/sessions/:id/complete
export interface CompleteSessionRequest {
  generateFormulation?: boolean;
  targetLevel?: number;
  targetTone?: string;
  brandPreference?: string;
}

export interface CompleteSessionResponse {
  success: boolean;
  data?: {
    session: PhotoSession;
    aggregatedProfile?: ColorProfile;
    formulation?: {
      id: string;
      recommendedShade: string;
      developerVolume: number;
      processingTime: number;
      ratio: string;
      brand: string;
    };
  };
  error?: { code: string; message: string };
}

// POST /api/photos/upload (presigned URL mode)
export interface PresignedUploadRequest {
  sessionId: string;
  angle: HairAngle | string;
  contentType?: string;
  contentLength?: number;
}

export interface PresignedUploadResponse {
  success: boolean;
  data?: {
    id: string;
    sessionId: string;
    angle: string;
    uploadUrl: string;
    url: string;
    analysisStatus: AnalysisStatus;
    createdAt: string;
  };
  error?: { code: string; message: string };
}

// GET /api/photos/:id
export interface GetPhotoResponse {
  success: boolean;
  data?: Photo;
  error?: { code: string; message: string };
}

// POST /api/photos/:id/analyze
export interface AnalyzePhotoRequest {
  forceReanalyze?: boolean;
  modelVersion?: string;
}

export interface AnalyzePhotoResponse {
  success: boolean;
  data?: {
    photoId: string;
    analysisStatus: AnalysisStatus;
    estimatedTimeSeconds: number;
    modelVersion: string;
  };
  error?: { code: string; message: string };
}

// GET /api/photos/:id/analysis
export interface GetAnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: { code: string; message: string };
}
