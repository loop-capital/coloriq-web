import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, AlertCircle, X, CheckCircle } from 'lucide-react-native';

// ─── The Analysis Prompt ─────────────────────────────────────────────────────
const ANALYSIS_PROMPT = `You are COLORiq — a professional hair color analysis AI used by licensed stylists.

Analyze this hair photo and respond with ONLY valid JSON (no markdown, no code fences, no extra text):

{
  "level": [integer 1-10, where 1=black, 10=lightest blonde],
  "tone": "[neutral|ash|golden|copper|red|violet|pearl|beige|mahogany|chocolate|warm|cool]",
  "grayPercent": [integer 0-100],
  "condition": "[excellent|good|fair|damaged|severely_damaged]",
  "porosity": "[low|medium|high]",
  "highlights": [boolean],
  "isMultiTonal": [boolean],
  "damageIndicators": {
    "porosityEstimate": "[low|medium|high]",
    "splitEndDetected": [boolean],
    "drynessScore": [integer 0-100],
    "shineScore": [integer 0-100],
    "texture": "[smooth|rough|frizzy|brittle]"
  },
  "recommendations": ["up to 3 specific colorist notes"],
  "confidence": [float 0-1]
}

Guidelines:
- Assess overall hair color (ignore background and skin)
- Level 1 = natural black (not blue-black dye)
- Level 10 = lightest natural blonde
- Be conservative with gray estimates
- Look for shine/luster to assess condition
- Check for multiple tones indicating previous color work`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface HairAnalysisResult {
  level: number;
  tone: string;
  grayPercent: number;
  condition: string;
  porosity: string;
  highlights: boolean;
  isMultiTonal: boolean;
  damageIndicators: {
    porosityEstimate: string;
    splitEndDetected: boolean;
    drynessScore: number;
    shineScore: number;
    texture: string;
  };
  recommendations: string[];
  confidence: number;
  dominantHex?: string;
  secondaryHex?: string;
}

type AnalysisStatus = 'idle' | 'initializing' | 'capturing' | 'analyzing' | 'complete' | 'error';

interface Props {
  onResult: (result: HairAnalysisResult) => void;
  onCancel: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HairAnalysisCamera({ onResult, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<AnalysisStatus>('initializing');
  const [modelReady, setModelReady] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [result, setResult] = useState<HairAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Loading Gemma 3n model...');
  const cameraRef = useRef<CameraView>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelReadyRef = useRef(false);

  // ─── Model Status Check ────────────────────────────────────────────────────
  useEffect(() => {
    checkModelStatus();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const checkModelStatus = async () => {
    try {
      // Check native module availability first
      const { NativeModules } = await import('react-native');
      const liteRT = NativeModules.LiteRTLMNativeModule;
      
      if (!liteRT) {
        setError('LiteRT-LM native module not found. Check your build configuration.');
        setStatus('error');
        return;
      }

      // Poll model status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const modelStatus = await liteRT.getModelStatus();
          if (modelStatus.isLoaded) {
            modelReadyRef.current = true;
            setModelReady(true);
            setStatus('idle');
            setStatusMessage('Ready to analyze');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          } else if (modelStatus.error) {
            setError(`Model error: ${modelStatus.error}`);
            setStatus('error');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          } else if (modelStatus.progress !== undefined) {
            setModelLoadProgress(modelStatus.progress);
            setStatusMessage(`Loading model... ${Math.round(modelStatus.progress * 100)}%`);
          }
        } catch (e) {
          // Module not ready yet, keep polling
        }
      }, 1000);

      // Timeout after 60 seconds — use ref to avoid stale closure on modelReady state
      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (!modelReadyRef.current) {
          setError('Model loading timed out. Check your internet connection.');
          setStatus('error');
        }
      }, 60000);
    } catch (e: any) {
      setError(`Initialization error: ${e.message}`);
      setStatus('error');
    }
  };

  // ─── Camera Permission ─────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Camera size={64} color="#666" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            COLORiq needs your camera to analyze hair photos.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Model Loading ─────────────────────────────────────────────────────────
  if (status === 'initializing' || !modelReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#D4A574" />
          <Text style={styles.loadingTitle}>{statusMessage}</Text>
          {modelLoadProgress > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${modelLoadProgress * 100}%` }]} />
            </View>
          )}
          <Text style={styles.loadingDesc}>
            First load downloads ~2GB. This only happens once.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <AlertCircle size={64} color="#E74C3C" />
          <Text style={styles.errorTitle}>Analysis Error</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={checkModelStatus}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── AI Analysis Function ──────────────────────────────────────────────────
  const analyzeWithGemma = async (base64: string): Promise<HairAnalysisResult> => {
    const { NativeModules } = await import('react-native');
    const liteRT = NativeModules.LiteRTLMNativeModule;

    // Send to on-device Gemma model (base64 captured directly from camera)
    const resultText = await liteRT.analyzeImage(
      `data:image/jpeg;base64,${base64}`,
      ANALYSIS_PROMPT,
      {
        maxTokens: 1024,
        temperature: 0.1,
      }
    );

    // Parse the JSON response
    const jsonStr = resultText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    return JSON.parse(jsonStr);
  };

  // ─── Capture and Analyze ───────────────────────────────────────────────────
  const captureAndAnalyze = async () => {
    if (!cameraRef.current || status === 'analyzing') return;

    try {
      setStatus('capturing');
      setStatusMessage('Capturing...');

      // Take the photo — request base64 here to avoid FileReader (Web API not available in RN)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.uri || !photo?.base64) {
        throw new Error('Failed to capture photo');
      }

      setPreviewUri(photo.uri);
      setStatus('analyzing');
      setStatusMessage('Analyzing hair...');

      // Run AI analysis on-device
      const analysisResult = await analyzeWithGemma(photo.base64);
      
      // Add the image URI to the result
      const fullResult = {
        ...analysisResult,
        imageUrl: photo.uri,
      };

      setResult(fullResult);
      setStatus('complete');
      setStatusMessage('Analysis complete!');

      // Return result to parent after short delay
      setTimeout(() => {
        onResult(fullResult);
      }, 1500);

    } catch (err: any) {
      console.error('[HairAnalysisCamera] Error:', err);
      setError(err.message || 'Analysis failed');
      setStatus('error');
    }
  };

  // ─── Preview After Capture ─────────────────────────────────────────────────
  if (previewUri && (status === 'analyzing' || status === 'complete')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
          {status === 'analyzing' && (
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color="#D4A574" />
              <Text style={styles.analyzingText}>Analyzing hair color...</Text>
              <Text style={styles.analyzingSubtext}>Running on-device AI</Text>
            </View>
          )}
          {status === 'complete' && result && (
            <View style={styles.resultOverlay}>
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Analysis Complete</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Level:</Text>
                  <View style={[styles.levelBadge, { backgroundColor: getLevelColor(result.level) }]}>
                    <Text style={styles.levelText}>{result.level}</Text>
                  </View>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Tone:</Text>
                  <Text style={styles.resultValue}>{result.tone}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Gray:</Text>
                  <Text style={styles.resultValue}>{result.grayPercent}%</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Condition:</Text>
                  <Text style={styles.resultValue}>{result.condition}</Text>
                </View>
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round(result.confidence * 100)}%
                </Text>
                {result.recommendations.length > 0 && (
                  <View style={styles.recsContainer}>
                    {result.recommendations.map((rec, i) => (
                      <Text key={i} style={styles.recText}>• {rec}</Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Camera View ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <X size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.statusBadge}>
            <CheckCircle size={14} color="#4ADE80" />
            <Text style={styles.statusText}>Gemma Ready</Text>
          </View>
        </View>

        {/* Guide Overlay */}
        <View style={styles.guideOverlay}>
          <View style={styles.guideFrame}>
            <Text style={styles.guideText}>
              Position hair in frame
            </Text>
          </View>
        </View>

        {/* Capture Button */}
        <View style={styles.captureContainer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={captureAndAnalyze}
            disabled={status === 'analyzing'}
          >
            <View style={styles.captureButtonInner}>
              <Camera size={32} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.captureHint}>
            Tap to analyze hair color & condition
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLevelColor(level: number): string {
  const colors = [
    '#1a1a1a', '#2d1b0e', '#4a2c1a', '#6b3d1f', '#8b5a2b',
    '#a67c52', '#c4a35a', '#d4b96a', '#e8d08a', '#f5e6b8',
  ];
  return colors[level - 1] || '#888';
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  camera: {
    flex: 1,
  },
  // Permissions
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  // Loading
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4A574',
    borderRadius: 2,
  },
  // Error
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  // Buttons
  primaryButton: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#999',
  },
  // Camera UI
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
  },
  // Guide
  guideOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: width * 0.7,
    height: width * 0.9,
    borderWidth: 2,
    borderColor: 'rgba(212,165,116,0.5)',
    borderRadius: 16,
    borderStyle: 'dashed',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
  },
  guideText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  // Capture
  captureContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4A574',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  // Preview
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  analyzingSubtext: {
    color: '#999',
    fontSize: 13,
    marginTop: 4,
  },
  // Results
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4A574',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#999',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  confidenceText: {
    fontSize: 12,
    color: '#4ADE80',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  recsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  recText: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 4,
  },
});
