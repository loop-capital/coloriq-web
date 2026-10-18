// ============================================================
// GalleryUploadScreen — Upload Before/After Photos to Gallery
// Step 1: Select formula  →  Step 2: Capture Before/After
// Step 3: Add tags     →  Step 4: Submit
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  X,
  RotateCcw,
  Camera,
  ChevronRight,
  ChevronLeft,
  Zap,
  FlaskConical,
  Image as ImageIcon,
  Check,
} from 'lucide-react-native';
import { apiRequest, getAuthToken, uploadPhotoMultipart, API_BASE, notifyUnauthorized } from '../api/client';

// ─── Theme ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0A0A1A',
  card: '#12121F',
  cardBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#F5F5F7',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.35)',
  purple: '#9333EA',
  pink: '#EC4899',
  teal: '#14B8A6',
  success: '#22C55E',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormulaOption {
  id: string;
  name: string;
  brand: string;
  line: string;
  clientName: string;
  developerVol?: number;
  processingTime?: number;
  shades: string[];
}

interface PhotoFile {
  uri: string;
  type: 'before' | 'after';
}

const STEPS = ['Select Formula', 'Capture Photos', 'Add Details', 'Review'] as const;
type Step = typeof STEPS[number];

// ─── Component ─────────────────────────────────────────────────────────────

export default function GalleryUploadScreen({ navigation }: any) {
  const [currentStep, setCurrentStep] = useState<Step>('Select Formula');
  const [formulas, setFormulas] = useState<FormulaOption[]>([]);
  const [selectedFormula, setSelectedFormula] = useState<FormulaOption | null>(null);
  const [formulaLoading, setFormulaLoading] = useState(false);
  const [formulaLoadError, setFormulaLoadError] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoFile[]>([]);
  const [capturingType, setCapturingType] = useState<'before' | 'after'>('before');
  const [showCamera, setShowCamera] = useState(false);

  const [caption, setCaption] = useState('');
  const [hairType, setHairType] = useState('');
  const [porosity, setPorosity] = useState('');
  const [levelBefore, setLevelBefore] = useState('');
  const [levelAfter, setLevelAfter] = useState('');
  const [toneBefore, setToneBefore] = useState('');
  const [toneAfter, setToneAfter] = useState('');
  const [developerVol, setDeveloperVol] = useState('');
  const [processingTime, setProcessingTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Fetch formulas on mount
  useEffect(() => {
    fetchFormulas();
  }, []);

  const fetchFormulas = async () => {
    try {
      setFormulaLoading(true);
      setFormulaLoadError(null);
      const response = await apiRequest<{ items?: any[]; formulas?: any[] }>('/v1/formulas/list?limit=100');
      const items = response.items || response.formulas || [];
      const mapped: FormulaOption[] = items.map((f: any) => ({
        id: f.id,
        name: f.name || 'Untitled Formula',
        brand: f.brand || f.productBrand || 'Unknown',
        line: f.productLine || '',
        clientName: f.clientName || 'Unknown',
        developerVol: f.developerVolume || f.developer_vol || 20,
        processingTime: f.processingTime || f.processing_time || 30,
        shades: (f.components || [])
          .filter((c: any) => c.componentType === 'color' || c.shadeCode)
          .map((c: any) => c.shadeCode || c.shade_code || ''),
      }));
      setFormulas(mapped);
    } catch (e) {
      setFormulas([]);
      setFormulaLoadError(e instanceof Error ? e.message : 'Failed to load your formulas.');
    } finally {
      setFormulaLoading(false);
    }
  };

  // ─── Step Navigation ─────────────────────────────────────────────────────

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
    } else {
      navigation.goBack();
    }
  };

  // ─── Camera ────────────────────────────────────────────────────────────────

  const startCapture = (type: 'before' | 'after') => {
    setCapturingType(type);
    setShowCamera(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });
      if (photo?.uri) {
        setCapturedPhotos((prev) => {
          const filtered = prev.filter((p) => p.type !== capturingType);
          return [...filtered, { uri: photo.uri, type: capturingType }];
        });
        setShowCamera(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const removePhoto = (type: 'before' | 'after') => {
    setCapturedPhotos((prev) => prev.filter((p) => p.type !== type));
  };

  // ─── Tags ──────────────────────────────────────────────────────────────────

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedFormula) {
      Alert.alert('Error', 'Please select a formula');
      return;
    }

    const afterPhoto = capturedPhotos.find((p) => p.type === 'after');
    if (!afterPhoto) {
      Alert.alert('Error', 'After photo is required');
      return;
    }

    setSubmitting(true);
    try {
      // Build form data
      const formData = new FormData();
      formData.append('formulaId', selectedFormula.id);
      if (caption) formData.append('caption', caption);
      if (hairType) formData.append('hairType', hairType);
      if (porosity) formData.append('porosity', porosity);
      if (levelBefore) formData.append('levelBefore', levelBefore);
      if (levelAfter) formData.append('levelAfter', levelAfter);
      if (toneBefore) formData.append('toneBefore', toneBefore);
      if (toneAfter) formData.append('toneAfter', toneAfter);
      if (developerVol) formData.append('developerVol', developerVol);
      if (processingTime) formData.append('processingTime', processingTime);
      if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

      // After photo (required)
      const afterExt = afterPhoto.uri.split('.').pop() || 'jpg';
      formData.append('after', {
        uri: afterPhoto.uri,
        name: `after-${Date.now()}.${afterExt}`,
        type: afterExt === 'png' ? 'image/png' : 'image/jpeg',
      } as any);

      // Before photo (optional)
      const beforePhoto = capturedPhotos.find((p) => p.type === 'before');
      if (beforePhoto) {
        const beforeExt = beforePhoto.uri.split('.').pop() || 'jpg';
        formData.append('before', {
          uri: beforePhoto.uri,
          name: `before-${Date.now()}.${beforeExt}`,
          type: beforeExt === 'png' ? 'image/png' : 'image/jpeg',
        } as any);
      }

      // Get auth token
      let token = await getAuthToken();
      if (!token) {
        Alert.alert('Auth Error', 'Unable to authenticate. Please try again.');
        setSubmitting(false);
        return;
      }

      const headers: Record<string, string> = {};
      const cleanToken = token.replace(/[^A-Za-z0-9._~+/=-]/g, '');
      if (cleanToken) headers['Authorization'] = 'Bearer ' + cleanToken;

      const response = await fetch(`${API_BASE}/v1/gallery/photos/upload`, {
        method: 'POST',
        headers,
        body: formData as any,
      });

      if (!response.ok) {
        if (response.status === 401) await notifyUnauthorized();
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed: HTTP ${response.status}`);
      }

      Alert.alert(
        'Success!',
        'Your transformation has been uploaded to the gallery.',
        [
          {
            text: 'View Gallery',
            onPress: () => navigation.replace('Gallery'),
          },
          {
            text: 'Upload Another',
            onPress: () => resetForm(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('Select Formula');
    setSelectedFormula(null);
    setCapturedPhotos([]);
    setCaption('');
    setHairType('');
    setPorosity('');
    setLevelBefore('');
    setLevelAfter('');
    setToneBefore('');
    setToneAfter('');
    setDeveloperVol('');
    setProcessingTime('');
    setTags([]);
    setTagInput('');
  };

  // ─── Auto-populate from formula ────────────────────────────────────────────

  useEffect(() => {
    if (selectedFormula) {
      if (selectedFormula.developerVol) setDeveloperVol(String(selectedFormula.developerVol));
      if (selectedFormula.processingTime) setProcessingTime(String(selectedFormula.processingTime));
      // Auto-suggest tags from formula data
      const autoTags = [
        selectedFormula.brand?.toLowerCase(),
        selectedFormula.line?.toLowerCase(),
        ...selectedFormula.shades.map((s) => s.toLowerCase()),
      ].filter(Boolean) as string[];
      setTags((prev) => Array.from(new Set([...prev, ...autoTags])));
    }
  }, [selectedFormula]);

  // ─── Camera Modal ────────────────────────────────────────────────────────────

  if (showCamera) {
    if (!permission) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.purple} />
          </View>
        </SafeAreaView>
      );
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <Camera size={64} color={COLORS.purple} />
            <Text style={styles.permissionTitle}>Camera Access Needed</Text>
            <Text style={styles.permissionText}>
              COLORgenius needs camera access to capture hair photos.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowCamera(false)}>
              <Text style={styles.backBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
        />
        <SafeAreaView edges={['top']} style={styles.cameraTopBar}>
          <TouchableOpacity style={styles.cameraCloseBtn} onPress={() => setShowCamera(false)}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>
            Capture {capturingType === 'before' ? 'Before' : 'After'}
          </Text>
          <TouchableOpacity
            style={styles.cameraCloseBtn}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <RotateCcw size={22} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.cameraBottomBar}>
          <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={goBack}>
          {currentStep === 'Select Formula' ? (
            <X size={22} color={COLORS.textSecondary} />
          ) : (
            <ChevronLeft size={22} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload to Gallery</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepBar}>
        {STEPS.map((step, idx) => {
          const isActive = STEPS.indexOf(currentStep) >= idx;
          const isCurrent = STEPS.indexOf(currentStep) === idx;
          return (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isActive && styles.stepDotActive,
                  isCurrent && styles.stepDotCurrent,
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                ]}
              >
                {step}
              </Text>
              {idx < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    STEPS.indexOf(currentStep) > idx && styles.stepLineActive,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ─── Step 1: Select Formula ─────────────────────────────────────── */}
        {currentStep === 'Select Formula' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select a Formula</Text>
            <Text style={styles.stepSubtitle}>
              Choose the formula used for this transformation
            </Text>

            {formulaLoading ? (
              <ActivityIndicator size="large" color={COLORS.purple} style={{ marginTop: 40 }} />
            ) : formulaLoadError ? (
              <View style={styles.emptyState}>
                <FlaskConical size={48} color="rgba(255,255,255,0.06)" />
                <Text style={styles.emptyTitle}>Couldn&apos;t load your formulas</Text>
                <Text style={styles.emptySubtext}>{formulaLoadError}</Text>
                <TouchableOpacity onPress={fetchFormulas} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.purple }}>
                  <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : formulas.length === 0 ? (
              <View style={styles.emptyState}>
                <FlaskConical size={48} color="rgba(255,255,255,0.06)" />
                <Text style={styles.emptyTitle}>No formulas found</Text>
                <Text style={styles.emptySubtext}>
                  Save a formula first to upload gallery photos.
                </Text>
              </View>
            ) : (
              formulas.map((formula) => (
                <TouchableOpacity
                  key={formula.id}
                  style={[
                    styles.formulaCard,
                    selectedFormula?.id === formula.id && styles.formulaCardSelected,
                  ]}
                  onPress={() => setSelectedFormula(formula)}
                  activeOpacity={0.8}
                >
                  <View style={styles.formulaRow}>
                    <View style={styles.formulaIcon}>
                      <FlaskConical size={18} color={COLORS.purple} />
                    </View>
                    <View style={styles.formulaInfo}>
                      <Text style={styles.formulaName}>{formula.name}</Text>
                      <Text style={styles.formulaMeta}>
                        {formula.brand} · {formula.line}
                      </Text>
                      <Text style={styles.formulaClient}>
                        Client: {formula.clientName}
                      </Text>
                      {formula.shades.length > 0 && (
                        <View style={styles.shadeRow}>
                          {formula.shades.map((shade) => (
                            <View key={shade} style={styles.shadeChip}>
                              <Text style={styles.shadeChipText}>{shade}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    {selectedFormula?.id === formula.id && (
                      <View style={styles.checkBadge}>
                        <Check size={16} color="#FFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ─── Step 2: Capture Photos ────────────────────────────────────── */}
        {currentStep === 'Capture Photos' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Capture Photos</Text>
            <Text style={styles.stepSubtitle}>
              Take before and after photos of the transformation
            </Text>

            {/* Before Photo */}
            <View style={styles.photoSection}>
              <Text style={styles.photoLabel}>Before Photo</Text>
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => startCapture('before')}
              >
                {capturedPhotos.find((p) => p.type === 'before') ? (
                  <>
                    <Image
                      source={{ uri: capturedPhotos.find((p) => p.type === 'before')!.uri }}
                      style={styles.photoPreview}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => removePhoto('before')}
                    >
                      <X size={16} color="#FFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.photoPlaceholderInner}>
                    <Camera size={32} color={COLORS.textMuted} />
                    <Text style={styles.photoPlaceholderText}>Tap to capture</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* After Photo */}
            <View style={styles.photoSection}>
              <Text style={styles.photoLabel}>After Photo *</Text>
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => startCapture('after')}
              >
                {capturedPhotos.find((p) => p.type === 'after') ? (
                  <>
                    <Image
                      source={{ uri: capturedPhotos.find((p) => p.type === 'after')!.uri }}
                      style={styles.photoPreview}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => removePhoto('after')}
                    >
                      <X size={16} color="#FFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.photoPlaceholderInner}>
                    <Camera size={32} color={COLORS.purple} />
                    <Text style={styles.photoPlaceholderText}>Tap to capture</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Step 3: Add Details ───────────────────────────────────────── */}
        {currentStep === 'Add Details' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Add Details</Text>
            <Text style={styles.stepSubtitle}>
              Add technical info and tags for this transformation
            </Text>

            {/* Caption */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Caption</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the transformation..."
                placeholderTextColor={COLORS.textMuted}
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Technical Details Grid */}
            <View style={styles.techGrid}>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Hair Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Fine"
                  placeholderTextColor={COLORS.textMuted}
                  value={hairType}
                  onChangeText={setHairType}
                />
              </View>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Porosity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Normal"
                  placeholderTextColor={COLORS.textMuted}
                  value={porosity}
                  onChangeText={setPorosity}
                />
              </View>
            </View>

            <View style={styles.techGrid}>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Level Before</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-10"
                  placeholderTextColor={COLORS.textMuted}
                  value={levelBefore}
                  onChangeText={setLevelBefore}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Level After</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-10"
                  placeholderTextColor={COLORS.textMuted}
                  value={levelAfter}
                  onChangeText={setLevelAfter}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.techGrid}>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Tone Before</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Warm"
                  placeholderTextColor={COLORS.textMuted}
                  value={toneBefore}
                  onChangeText={setToneBefore}
                />
              </View>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Tone After</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ash"
                  placeholderTextColor={COLORS.textMuted}
                  value={toneAfter}
                  onChangeText={setToneAfter}
                />
              </View>
            </View>

            <View style={styles.techGrid}>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Developer Vol</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 20"
                  placeholderTextColor={COLORS.textMuted}
                  value={developerVol}
                  onChangeText={setDeveloperVol}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.techHalf}>
                <Text style={styles.inputLabel}>Processing Time (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 30"
                  placeholderTextColor={COLORS.textMuted}
                  value={processingTime}
                  onChangeText={setProcessingTime}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Tags */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tags</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Add a tag..."
                  placeholderTextColor={COLORS.textMuted}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={addTag}
                />
                <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
                  <Text style={styles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                      <TouchableOpacity onPress={() => removeTag(tag)}>
                        <X size={12} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ─── Step 4: Review ──────────────────────────────────────────────── */}
        {currentStep === 'Review' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review</Text>
            <Text style={styles.stepSubtitle}>
              Confirm your upload details
            </Text>

            {selectedFormula && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Formula</Text>
                <Text style={styles.reviewValue}>{selectedFormula.name}</Text>
                <Text style={styles.reviewSubtext}>
                  {selectedFormula.brand} · {selectedFormula.line}
                </Text>
              </View>
            )}

            <View style={styles.reviewPhotosRow}>
              {capturedPhotos.find((p) => p.type === 'before') && (
                <View style={styles.reviewPhotoWrap}>
                  <Text style={styles.reviewPhotoLabel}>Before</Text>
                  <Image
                    source={{ uri: capturedPhotos.find((p) => p.type === 'before')!.uri }}
                    style={styles.reviewPhoto}
                  />
                </View>
              )}
              {capturedPhotos.find((p) => p.type === 'after') && (
                <View style={styles.reviewPhotoWrap}>
                  <Text style={styles.reviewPhotoLabel}>After</Text>
                  <Image
                    source={{ uri: capturedPhotos.find((p) => p.type === 'after')!.uri }}
                    style={styles.reviewPhoto}
                  />
                </View>
              )}
            </View>

            {(caption || hairType || porosity) && (
              <View style={styles.reviewCard}>
                {caption && (
                  <>
                    <Text style={styles.reviewLabel}>Caption</Text>
                    <Text style={styles.reviewValue}>{caption}</Text>
                  </>
                )}
                <View style={styles.reviewTechRow}>
                  {hairType && (
                    <View style={styles.reviewTechItem}>
                      <Text style={styles.reviewTechLabel}>Hair Type</Text>
                      <Text style={styles.reviewTechValue}>{hairType}</Text>
                    </View>
                  )}
                  {porosity && (
                    <View style={styles.reviewTechItem}>
                      <Text style={styles.reviewTechLabel}>Porosity</Text>
                      <Text style={styles.reviewTechValue}>{porosity}</Text>
                    </View>
                  )}
                  {levelBefore && (
                    <View style={styles.reviewTechItem}>
                      <Text style={styles.reviewTechLabel}>Level Before</Text>
                      <Text style={styles.reviewTechValue}>{levelBefore}</Text>
                    </View>
                  )}
                  {levelAfter && (
                    <View style={styles.reviewTechItem}>
                      <Text style={styles.reviewTechLabel}>Level After</Text>
                      <Text style={styles.reviewTechValue}>{levelAfter}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {tags.length > 0 && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Tags</Text>
                <View style={styles.tagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={goBack}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </TouchableOpacity>

        {currentStep === 'Review' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Zap size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Submit Upload</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              currentStep === 'Select Formula' && !selectedFormula && styles.primaryBtnDisabled,
              currentStep === 'Capture Photos' &&
                !capturedPhotos.find((p) => p.type === 'after') &&
                styles.primaryBtnDisabled,
            ]}
            onPress={goNext}
            disabled={
              (currentStep === 'Select Formula' && !selectedFormula) ||
              (currentStep === 'Capture Photos' && !capturedPhotos.find((p) => p.type === 'after'))
            }
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <ChevronRight size={18} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Step Bar
  stepBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepDotActive: {
    backgroundColor: COLORS.purple,
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  stepLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  stepLabelActive: {
    color: COLORS.textSecondary,
  },
  stepLine: {
    position: 'absolute',
    top: 4,
    right: '-50%',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepLineActive: {
    backgroundColor: COLORS.purple,
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  stepContent: {
    gap: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },

  // Formula Cards
  formulaCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  formulaCardSelected: {
    borderColor: COLORS.purple,
    backgroundColor: 'rgba(147,51,234,0.08)',
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formulaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(147,51,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formulaInfo: {
    flex: 1,
  },
  formulaName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  formulaMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  formulaClient: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  shadeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  shadeChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shadeChipText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Photos
  photoSection: {
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  photoPlaceholderInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    height: 80,
  },
  techGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  techHalf: {
    flex: 1,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addTagBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addTagBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(147,51,234,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagChipText: {
    fontSize: 11,
    color: COLORS.purple,
  },

  // Review
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reviewSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reviewPhotosRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  reviewPhotoWrap: {
    flex: 1,
    gap: 6,
  },
  reviewPhotoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  reviewTechRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  reviewTechItem: {
    minWidth: 70,
  },
  reviewTechLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  reviewTechValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  primaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  // Camera modal
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F7',
  },

  // Permission
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F7',
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  permissionBtn: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  permissionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  backBtn: { marginTop: 12 },
  backBtnText: { color: '#9333EA', fontWeight: '600', fontSize: 14 },
});