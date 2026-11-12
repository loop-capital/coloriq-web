// ============================================================
// FormulateScreen — 6-Step Hair Color Formulation
// Mobile version matching the COLORiq web dashboard
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  Palette,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Send,
  Bluetooth,
  Save,
  ShoppingBag,
  FlaskConical,
  Pencil,
} from 'lucide-react-native';
import {
  submitFormulation,
  type FormulationInput,
  type FormulationResult,
  createSession,
  getSession,
  claimColorBarPairingCode,
  sendFormulaToColorBar,
  type ColorBarPairingStep,
  saveFormulation,
} from '../api/client';
import {
  HAIR_LEVEL_NAMES,
  TONES,
  type ToneValue,
  TEXTURES,
  HAIR_PATTERNS,
  DENSITIES,
  SERVICE_TYPES,
  CHEMICAL_HISTORY_ITEMS,
  SENSITIVITIES,
  LAST_SERVICE_OPTIONS,
  CONDITION_TYPES,
  POROSITY,
  PROBLEM_INDICATORS,
  BRANDS,
  type TextureType,
  type HairPatternType,
  type DensityType,
  type ServiceType,
  type Porosity,
  type ConditionType,
  type LastServiceType,
} from '../types';
import EditFormulaForm from '../components/EditFormulaForm';
// Manual formula entry is handled inline via ManualFormulaForm below

// ─── Constants ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Photo', label: 'Photo' },
  { id: 2, title: 'Assessment', label: 'Hair Assessment' },
  { id: 3, title: 'History', label: 'Chemical History' },
  { id: 4, title: 'Target', label: 'Target Look' },
  { id: 5, title: 'Condition', label: 'Condition' },
  { id: 6, title: 'Review', label: 'Review & Generate' },
] as const;

const COLORS = {
  bg: '#0A0A1A',
  card: '#12121F',
  cardBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#F5F5F7',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.35)',
  purple: '#9333EA',
  purpleGlow: 'rgba(147,51,234,0.3)',
  pink: '#EC4899',
  pinkGlow: 'rgba(236,72,153,0.3)',
  chipBorder: 'rgba(255,255,255,0.12)',
  chipBg: 'rgba(255,255,255,0.05)',
  chipActiveBg: 'rgba(147,51,234,0.2)',
  chipActiveBorder: '#9333EA',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function levelColor(lvl: number): string {
  const colors = [
    '#1C1C1C', '#2E1A0E', '#3E2723', '#5D4037', '#795548',
    '#A1887F', '#C8A96E', '#D4B86A', '#E8D5A3', '#F5E6C8',
  ];
  return colors[lvl - 1] ?? '#888';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View style={stepIndicatorStyles.container}>
      <View style={stepIndicatorStyles.row}>
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isLast = step.id === STEPS.length;

          return (
            <React.Fragment key={step.id}>
              <View style={stepIndicatorStyles.stepItem}>
                <View
                  style={[
                    stepIndicatorStyles.circle,
                    isActive && stepIndicatorStyles.circleActive,
                    isCompleted && stepIndicatorStyles.circleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        stepIndicatorStyles.circleText,
                        (isActive || isCompleted) && stepIndicatorStyles.circleTextActive,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    stepIndicatorStyles.stepLabel,
                    isActive && stepIndicatorStyles.stepLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>
              {!isLast && (
                <View
                  style={[
                    stepIndicatorStyles.connector,
                    isCompleted && stepIndicatorStyles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const stepIndicatorStyles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingVertical: 12, backgroundColor: COLORS.bg },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepItem: { alignItems: 'center', flex: 1 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.chipBg,
  },
  circleActive: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.chipActiveBg,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  circleCompleted: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purple,
  },
  circleText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  circleTextActive: { color: COLORS.textPrimary },
  stepLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: { color: COLORS.purple, fontWeight: '600' },
  connector: {
    width: 16,
    height: 2,
    backgroundColor: COLORS.chipBorder,
    marginTop: 13,
  },
  connectorCompleted: { backgroundColor: COLORS.purple },
});

// ─── ChipSelector ────────────────────────────────────────────────────────────

interface ChipSelectorProps<T extends string> {
  label: string;
  options: { value: T; label: string; desc?: string; danger?: boolean }[];
  selected: T;
  onSelect: (value: T) => void;
  layout?: 'horizontal' | 'grid';
}

function ChipSelector<T extends string>({
  label,
  options,
  selected,
  onSelect,
  layout = 'horizontal',
}: ChipSelectorProps<T>) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.label}>{label}</Text>
      <View style={[chipStyles.row, layout === 'grid' && chipStyles.grid]}>
        {options.map((opt) => {
          const isSelected = opt.value === selected;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                chipStyles.chip,
                isSelected && chipStyles.chipActive,
                opt.danger && !isSelected && chipStyles.chipDanger,
                opt.danger && isSelected && chipStyles.chipDangerActive,
              ]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  chipStyles.chipText,
                  isSelected && chipStyles.chipTextActive,
                  opt.danger && !isSelected && chipStyles.chipTextDanger,
                ]}
              >
                {opt.label}
              </Text>
              {opt.desc && (
                <Text style={chipStyles.chipDesc} numberOfLines={1}>
                  {opt.desc}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: { marginVertical: 10 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    backgroundColor: COLORS.chipBg,
    alignItems: 'center',
    minHeight: 40,
  },
  chipActive: {
    backgroundColor: COLORS.chipActiveBg,
    borderColor: COLORS.chipActiveBorder,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  chipDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' },
  chipDangerActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: COLORS.danger },
  chipText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
  chipTextDanger: { color: COLORS.danger },
  chipDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});

// ─── MultiChipSelector ───────────────────────────────────────────────────────

interface MultiChipSelectorProps {
  label: string;
  options: { value: string; label: string; desc?: string; danger?: boolean; icon?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}

function MultiChipSelector({ label, options, selected, onToggle }: MultiChipSelectorProps) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.label}>{label}</Text>
      <View style={chipStyles.row}>
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                chipStyles.chip,
                isSelected && chipStyles.chipActive,
                opt.danger && !isSelected && chipStyles.chipDanger,
                opt.danger && isSelected && chipStyles.chipDangerActive,
              ]}
              onPress={() => onToggle(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[chipStyles.chipText, isSelected && chipStyles.chipTextActive]}>
                {opt.icon ? `${opt.icon} ` : ''}{opt.label}
              </Text>
              {opt.desc && (
                <Text style={chipStyles.chipDesc} numberOfLines={1}>
                  {opt.desc}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── LevelSlider ─────────────────────────────────────────────────────────────

interface LevelSliderProps {
  value: number;
  onChange: (level: number) => void;
  label?: string;
}

function LevelSlider({ value, onChange, label }: LevelSliderProps) {
  return (
    <View style={sliderStyles.container}>
      {label && <Text style={sliderStyles.label}>{label}</Text>}
      <Text style={sliderStyles.levelName}>
        Level {value} — {HAIR_LEVEL_NAMES[value] ?? ''}
      </Text>
      <View style={sliderStyles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
          <Pressable
            key={lvl}
            onPress={() => onChange(lvl)}
            style={[
              sliderStyles.dot,
              lvl === value && sliderStyles.dotActive,
              { backgroundColor: levelColor(lvl) },
            ]}
          >
            <Text
              style={[
                sliderStyles.dotLabel,
                lvl === value && sliderStyles.dotLabelActive,
              ]}
            >
              {lvl}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dotActive: {
    borderColor: COLORS.purple,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  dotLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  dotLabelActive: { color: '#FFF', fontWeight: '800' },
});

// ─── ToneSelector (uses TONES from types with color) ─────────────────────────

interface ToneSelectorProps {
  value: ToneValue;
  onChange: (tone: ToneValue) => void;
  label?: string;
}

function ToneSelector({ value, onChange, label }: ToneSelectorProps) {
  return (
    <View style={toneStyles.container}>
      {label && <Text style={toneStyles.label}>{label}</Text>}
      <View style={toneStyles.grid}>
        {TONES.map((tone) => {
          const selected = tone.value === value;
          return (
            <Pressable
              key={tone.value}
              onPress={() => onChange(tone.value)}
              style={[
                toneStyles.chip,
                selected && {
                  backgroundColor: tone.color + '40',
                  borderColor: tone.color,
                },
              ]}
            >
              <View
                style={[
                  toneStyles.colorDot,
                  { backgroundColor: tone.color },
                  selected && toneStyles.colorDotActive,
                ]}
              />
              <Text
                style={[
                  toneStyles.chipText,
                  selected && toneStyles.chipTextActive,
                ]}
              >
                {tone.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    backgroundColor: COLORS.chipBg,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colorDotActive: {
    borderColor: '#FFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
});

// ─── GraySlider ──────────────────────────────────────────────────────────────

function GraySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={grayStyles.container}>
      <Text style={grayStyles.label}>Gray Percentage</Text>
      <View style={grayStyles.row}>
        <Text style={grayStyles.value}>{value}%</Text>
        <View style={grayStyles.track}>
          <View style={[grayStyles.fill, { width: `${value}%` }]} />
        </View>
      </View>
      <View style={grayStyles.dotsRow}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <Pressable key={pct} onPress={() => onChange(pct)} style={grayStyles.dotBtn}>
            <View
              style={[
                grayStyles.dot,
                value >= pct && grayStyles.dotFilled,
              ]}
            />
            <Text style={grayStyles.dotLabel}>{pct}%</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const grayStyles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  value: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    width: 48,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.purple,
    borderRadius: 3,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dotBtn: { alignItems: 'center' },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.chipBorder,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  dotFilled: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purple,
  },
  dotLabel: { fontSize: 10, color: COLORS.textMuted },
});

// ─── Navigation Buttons ──────────────────────────────────────────────────────

function NavButtons({
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel,
  disabled,
  showAddFormula,
  onAddFormula,
}: {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
  showAddFormula?: boolean;
  onAddFormula?: () => void;
}) {
  const isFirst = step === 1;
  const isLast = step === totalSteps;

  return (
    <View style={navStyles.container}>
      <TouchableOpacity
        style={[navStyles.backBtn, isFirst && navStyles.backBtnDisabled]}
        onPress={onBack}
        disabled={isFirst}
      >
        <ChevronLeft size={18} color={isFirst ? COLORS.textMuted : COLORS.textSecondary} />
        <Text style={[navStyles.backText, isFirst && navStyles.backTextDisabled]}>Back</Text>
      </TouchableOpacity>

      {showAddFormula && onAddFormula && (
        <TouchableOpacity
          style={navStyles.myFormulaBtn}
          onPress={onAddFormula}
          activeOpacity={0.8}
        >
          <FlaskConical size={18} color={COLORS.purple} />
          <Text style={navStyles.myFormulaText}>My Formula</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[navStyles.nextBtn, disabled && navStyles.nextBtnDisabled]}
        onPress={onNext}
        disabled={disabled}
      >
        <Text style={navStyles.nextText}>{nextLabel || 'Next'}</Text>
        <ChevronRight size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const navStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },
  backBtnDisabled: { opacity: 0.5 },
  backText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  backTextDisabled: { color: COLORS.textMuted },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 12,
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  addFormulaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.pink,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addFormulaText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  myFormulaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.purple,
  },
  myFormulaText: { fontSize: 14, fontWeight: '600', color: COLORS.purple },
});

// ─── Result Card ─────────────────────────────────────────────────────────────

function ResultCard({ result, onSendToDevice, onEditFormula }: { result: FormulationResult; onSendToDevice?: () => void; onEditFormula?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!result || !result.steps) {
    return (
      <View style={resultStyles.card}>
        <Text style={resultStyles.emptyText}>No formula generated yet.</Text>
      </View>
    );
  }

  const handleSave = async (isPublic: boolean) => {
    if (saving || saved) return;
    setSaving(true);
    try {
      await saveFormulation({ ...result, isPublic });
      setSaved(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to save formula. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={resultStyles.card}>
      <View style={resultStyles.header}>
        <Sparkles size={20} color={COLORS.purple} />
        <Text style={resultStyles.headerTitle}>Your Formula</Text>
      </View>

      {result.hardStops && result.hardStops.length > 0 && (
        <View style={resultStyles.hardStops}>
          {result.hardStops.map((stop: { type: string; message: string }, i: number) => (
            <View key={i} style={resultStyles.hardStop}>
              <AlertTriangle size={16} color={COLORS.danger} />
              <Text style={resultStyles.hardStopText}>{stop.message}</Text>
            </View>
          ))}
        </View>
      )}

      {result.steps.map((step: { role: string; grams?: number; product?: { brand?: string; shadeCode?: string; name?: string; ratio?: string }; developer?: { volume: number }; notes?: string }, i: number) => (
        <View key={i} style={resultStyles.stepCard}>
          <View style={resultStyles.stepHeader}>
            <Text style={resultStyles.stepRole}>{step.role}</Text>
            {step.grams && <Text style={resultStyles.stepGrams}>{step.grams}g</Text>}
          </View>
          <Text style={resultStyles.stepProduct}>
            {step.product?.brand && `${step.product.brand} `}
            {step.product?.shadeCode && `(${step.product.shadeCode}) `}
            {step.product?.name || 'N/A'}
          </Text>
          {step.product?.ratio && (
            <Text style={resultStyles.stepMeta}>Ratio: {step.product.ratio}</Text>
          )}
          {step.developer?.volume && (
            <Text style={resultStyles.stepMeta}>Developer: {step.developer.volume}vol</Text>
          )}
          {step.notes && <Text style={resultStyles.stepNotes}>{step.notes}</Text>}
        </View>
      ))}

      <View style={resultStyles.metaSection}>
        {result.developerVolume && (
          <View style={resultStyles.metaRow}>
            <Text style={resultStyles.metaLabel}>Developer</Text>
            <Text style={resultStyles.metaValue}>{result.developerVolume}vol</Text>
          </View>
        )}
        {result.processingTime && (
          <View style={resultStyles.metaRow}>
            <Text style={resultStyles.metaLabel}>Processing Time</Text>
            <Text style={resultStyles.metaValue}>{result.processingTime}</Text>
          </View>
        )}
        {result.application && (
          <View style={resultStyles.metaRow}>
            <Text style={resultStyles.metaLabel}>Application</Text>
            <Text style={resultStyles.metaValue}>{result.application}</Text>
          </View>
        )}
        {result.brand && (
          <View style={resultStyles.metaRow}>
            <Text style={resultStyles.metaLabel}>Brand</Text>
            <Text style={resultStyles.metaValue}>{result.brand}</Text>
          </View>
        )}
        {result.line && (
          <View style={resultStyles.metaRow}>
            <Text style={resultStyles.metaLabel}>Line</Text>
            <Text style={resultStyles.metaValue}>{result.line}</Text>
          </View>
        )}
        {result.confidence && (
          <View style={resultStyles.metaRow}>
            <Text style={resultStyles.metaLabel}>Confidence</Text>
            <Text style={resultStyles.metaValue}>{result.confidence}%</Text>
          </View>
        )}
      </View>

      {result.warnings && result.warnings.length > 0 && (
        <View style={resultStyles.warnings}>
          {result.warnings.map((warn: string, i: number) => (
            <Text key={i} style={resultStyles.warningText}>• {warn}</Text>
          ))}
        </View>
      )}

      {result.notes && (
        <View style={resultStyles.notesBox}>
          <Text style={resultStyles.notesText}>{result.notes}</Text>
        </View>
      )}

      {result.strandTestRecommended && (
        <View style={resultStyles.strandTest}>
          <AlertTriangle size={16} color={COLORS.warning} />
          <Text style={resultStyles.strandTestText}>Strand test recommended</Text>
        </View>
      )}

      {/* Save / Marketplace Buttons */}
      {saved ? (
        <View style={resultStyles.savedCheck}>
          <CheckCircle2 size={20} color={COLORS.success} />
          <Text style={resultStyles.savedText}>Saved!</Text>
        </View>
      ) : (
        <View style={resultStyles.actionRow}>
          <TouchableOpacity
            style={[resultStyles.saveBtn, saving && resultStyles.saveBtnDisabled]}
            onPress={() => handleSave(false)}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Save size={16} color="#FFF" />
            <Text style={resultStyles.saveBtnText}>Save to My Formulas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[resultStyles.marketBtn, saving && resultStyles.marketBtnDisabled]}
            onPress={() => handleSave(true)}
            activeOpacity={0.8}
            disabled={saving}
          >
            <ShoppingBag size={16} color={COLORS.pink} />
            <Text style={resultStyles.marketBtnText}>List on Marketplace</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Formula Button */}
      {onEditFormula && (
        <TouchableOpacity
          style={resultStyles.editBtn}
          onPress={onEditFormula}
          activeOpacity={0.8}
        >
          <Pencil size={18} color={COLORS.purple} />
          <Text style={resultStyles.editBtnText}>Edit Formula</Text>
        </TouchableOpacity>
      )}

      {/* Send to Color Bar iPad Button */}
      {onSendToDevice && (
        <TouchableOpacity
          style={resultStyles.sendBtn}
          onPress={onSendToDevice}
          activeOpacity={0.8}
        >
          <Bluetooth size={18} color="#FFF" />
          <Text style={resultStyles.sendBtnText}>Send to Color Bar iPad</Text>
          <Send size={16} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const resultStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 8,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  hardStops: { marginBottom: 16, gap: 8 },
  hardStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  hardStopText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', flex: 1 },
  stepCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.purple,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepRole: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepGrams: { fontSize: 12, fontWeight: '600', color: COLORS.pink },
  stepProduct: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  stepMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  stepNotes: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
  metaSection: { marginTop: 12, gap: 8 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  metaLabel: { fontSize: 13, color: COLORS.textSecondary },
  metaValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  warnings: { marginTop: 12, gap: 4 },
  warningText: { fontSize: 12, color: COLORS.warning },
  notesBox: {
    backgroundColor: 'rgba(147,51,234,0.05)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.1)',
  },
  notesText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  strandTest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 10,
  },
  strandTestText: { color: COLORS.warning, fontSize: 13, fontWeight: '600' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.purple,
    marginTop: 12,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.purple,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  marketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.pink,
  },
  marketBtnDisabled: { opacity: 0.4 },
  marketBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.pink,
  },
  savedCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  savedText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
});

// ─── Summary Section (Step 6) ────────────────────────────────────────────────

function SummarySection({
  formData,
}: {
  formData: FormState;
}) {
  const items = [
    { label: 'Texture', value: capitalize(formData.texture) },
    { label: 'Density', value: capitalize(formData.density) },
    { label: 'Pattern', value: capitalize(formData.hairPattern) },
    { label: 'Current Level', value: `${formData.currentLevel} — ${HAIR_LEVEL_NAMES[formData.currentLevel]}` },
    { label: 'Current Tone', value: TONES.find((t) => t.value === formData.currentTone)?.label || formData.currentTone },
    { label: 'Target Level', value: `${formData.targetLevel} — ${HAIR_LEVEL_NAMES[formData.targetLevel]}` },
    { label: 'Target Tone', value: TONES.find((t) => t.value === formData.targetTone)?.label || formData.targetTone },
    { label: 'Last Color Service', value: SERVICE_TYPES.find((s) => s.value === formData.lastServiceType)?.label || formData.lastServiceType },
    { label: 'Service Type (Today)', value: SERVICE_TYPES.find((s) => s.value === formData.serviceType)?.label || formData.serviceType },
    { label: 'Condition', value: CONDITION_TYPES.find((c) => c.value === formData.conditionType)?.label || formData.conditionType },
    { label: 'Porosity', value: capitalize(formData.porosity) },
    { label: 'Gray %', value: `${formData.grayPercent}%` },
    { label: 'Chemical History', value: formData.chemicalHistory.length > 0 ? formData.chemicalHistory.map((c) => CHEMICAL_HISTORY_ITEMS.find((i) => i.value === c)?.label || c).join(', ') : 'None' },
    { label: 'Sensitivities', value: formData.sensitivities.length > 0 ? formData.sensitivities.map((s) => SENSITIVITIES.find((i) => i.value === s)?.label || s).join(', ') : 'None' },
    { label: 'Last Service', value: LAST_SERVICE_OPTIONS.find((l) => l.value === formData.lastChemicalService)?.label || formData.lastChemicalService },
    { label: 'Brand Preference', value: formData.brandPreference || 'None' },
  ];

  return (
    <View style={summaryStyles.container}>
      <Text style={summaryStyles.title}>Review Your Selections</Text>
      {items.map((item, i) => (
        <View key={i} style={summaryStyles.row}>
          <Text style={summaryStyles.label}>{item.label}</Text>
          <Text style={summaryStyles.value} numberOfLines={2}>
            {item.value}
          </Text>
        </View>
      ))}

      {formData.problemIndicators.length > 0 && (
        <View style={summaryStyles.problemsSection}>
          <Text style={summaryStyles.problemsTitle}>Problem Indicators</Text>
          <View style={summaryStyles.problemsRow}>
            {formData.problemIndicators.map((key) => {
              const indicator = PROBLEM_INDICATORS.find((p) => p.key === key);
              return (
                <View key={key} style={summaryStyles.problemChip}>
                  <Text style={summaryStyles.problemChipText}>
                    {indicator?.label || key}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  label: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  problemsSection: { marginTop: 12 },
  problemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  problemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  problemChip: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  problemChipText: { fontSize: 11, color: COLORS.danger, fontWeight: '600' },
});

// ─── Form State Type ─────────────────────────────────────────────────────────

interface FormState {
  currentLevel: number;
  currentTone: ToneValue;
  targetLevel: number;
  targetTone: ToneValue;
  texture: TextureType;
  hairPattern: HairPatternType;
  density: DensityType;
  serviceType: ServiceType;
  lastServiceType: ServiceType;
  chemicalHistory: string[];
  sensitivities: string[];
  lastChemicalService: string;
  conditionType: ConditionType;
  porosity: Porosity;
  grayPercent: number;
  problemIndicators: string[];
  brandPreference: string;
  developerPreference: string;
  sessionCode: string;
  sessionId: string;
}

const INITIAL_STATE: FormState = {
  currentLevel: 5,
  currentTone: 'N',
  targetLevel: 7,
  targetTone: 'A',
  texture: 'medium',
  hairPattern: 'straight',
  density: 'medium',
  serviceType: 'full_head',
  lastServiceType: 'full_head',
  chemicalHistory: [],
  sensitivities: [],
  lastChemicalService: 'never',
  conditionType: 'previously_colored',
  porosity: 'normal',
  grayPercent: 0,
  problemIndicators: [],
  brandPreference: '',
  developerPreference: '',
  sessionCode: '',
  sessionId: '',
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function FormulateScreen({ navigation, route }: any) {
  const initialStep = route?.params?.initialStep;
  const autoPopulateData = route?.params?.autoPopulateData;
  // Passed from NewServiceScreen when a client was selected first — was
  // previously read nowhere in this screen, so the formula generated here
  // was never actually attached to the client who was picked for it.
  const clientId: string | undefined = route?.params?.clientId;
  const [step, setStep] = useState(typeof initialStep === 'number' && initialStep >= 1 && initialStep <= 6 ? initialStep : 1);
  const [formData, setFormData] = useState<FormState>(() => {
    if (autoPopulateData) {
      return { ...INITIAL_STATE, ...autoPopulateData };
    }
    return INITIAL_STATE;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FormulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual formula entry state
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Phone upload code state
  const [sessionCode, setSessionCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessionCodeLoading, setSessionCodeLoading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Color Bar pairing state — send this formula to a paired iPad
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [linkingToColorBar, setLinkingToColorBar] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [savingFormula, setSavingFormula] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleArray = useCallback((field: 'chemicalHistory' | 'sensitivities' | 'problemIndicators', value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  }, []);

  const handleSaveToLibrary = useCallback(async (isPublic = false) => {
    if (!result) return;
    setSavingFormula(true);
    try {
      const payload = {
        name: `Formula ${new Date().toLocaleDateString()}`,
        brand: result.brand || formData.brandPreference || 'Custom',
        line: result.line || '',
        developerVolume: String(result.developerVolume || ''),
        processingTime: String(result.processingTime || ''),
        application: result.application || '',
        notes: result.notes || '',
        isPublic,
        components: result.steps.map((step: any) => ({
          componentType: 'color',
          brand: step.product?.brand || '',
          shadeCode: step.product?.shadeCode || '',
          shadeName: step.product?.name || '',
          grams: step.grams || 0,
          developerVolume: step.developer?.volume ? String(step.developer.volume) : undefined,
          notes: step.notes || undefined,
        })),
      };
      await saveFormulation(payload);
      Alert.alert('Success', isPublic ? 'Formula listed on Marketplace!' : 'Formula saved to your library!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save formula');
    } finally {
      setSavingFormula(false);
    }
  }, [result, formData.brandPreference]);

  const handleManualEntrySaved = useCallback((manualResult: FormulationResult) => {
    setShowManualEntry(false);
    setResult(manualResult);
    setStep(6);
  }, []);

  const handleNext = useCallback(() => {
    if (step < 6) {
      setStep((s) => s + 1);
      setError(null);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
      setError(null);
    }
  }, [step]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const input: FormulationInput = {
        currentLevel: formData.currentLevel,
        currentTone: formData.currentTone,
        targetLevel: formData.targetLevel,
        targetTone: formData.targetTone,
        texture: formData.texture,
        hairPattern: formData.hairPattern,
        density: formData.density,
        serviceType: formData.serviceType,
        chemicalHistory: formData.chemicalHistory,
        sensitivities: formData.sensitivities,
        lastChemicalService: formData.lastChemicalService,
        condition: {
          type: formData.conditionType,
          porosity: formData.porosity,
          grayPercent: formData.grayPercent,
          banding: formData.problemIndicators.includes('banding'),
          hotRoots: formData.problemIndicators.includes('hotRoots'),
          previousLightener: formData.problemIndicators.includes('previousLightener'),
          multipleColors: formData.problemIndicators.includes('multipleColors'),
          greenCast: formData.problemIndicators.includes('greenCast'),
          muddyToner: formData.problemIndicators.includes('muddyToner'),
          overAshy: formData.problemIndicators.includes('overAshy'),
          colorGrab: formData.problemIndicators.includes('colorGrab'),
          hollowEnds: formData.problemIndicators.includes('hollowEnds'),
        },
        brandPreference: formData.brandPreference || undefined,
        linePreference: formData.developerPreference || undefined,
      };

      const response = await submitFormulation(input);
      setResult((response.data ?? response) as any);
    } catch (err: any) {
      setError(err.message || 'Failed to generate formula');
      Alert.alert('Formulation Failed', err.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  }, [formData]);

  const handleReset = useCallback(() => {
    setFormData(INITIAL_STATE);
    setStep(1);
    setResult(null);
    setError(null);
    setSessionCode('');
    setSessionId('');
    setUploadedPhotos([]);
    setShowPairingModal(false);
    setPairingCodeInput('');
    setSendSuccess(false);
    setShowManualEntry(false);
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [pollInterval]);

  // ─── Phone Upload Code ───────────────────────────────────────────────────

  const handleGetSessionCode = useCallback(async () => {
    setSessionCodeLoading(true);
    setError(null);
    try {
      const response = await createSession();
      setSessionCode(response.code);
      setSessionId(response.sessionId);

      // Start polling for uploaded photos
      if (pollInterval) clearInterval(pollInterval);
      const interval = setInterval(async () => {
        try {
          const session = await getSession(response.code);
          if (session.photos && session.photos.length > 0) {
            setUploadedPhotos(session.photos);
          }
        } catch (err) {
          // Silently ignore polling errors
        }
      }, 3000);
      setPollInterval(interval);
    } catch (err: any) {
      setError(err.message || 'Failed to generate session code');
      Alert.alert('Error', err.message || 'Failed to generate session code');
    } finally {
      setSessionCodeLoading(false);
    }
  }, [pollInterval]);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  // ─── Send to a Paired Color Bar iPad ──────────────────────────────────────
  // Previously this called getDevices()/sendFormulaToDevice() against a
  // fingerprint-based "salon_devices" pairing that had no salonId on the
  // request, no matching /formula route to receive it, and nothing on the
  // ColorBarScreen side that ever polled for or displayed an incoming
  // formula — every path here was a dead end. Replaced with the pairing
  // code flow: the iPad displays a code (POST /v1/color-bar/pairing), the
  // phone claims it here, then hands off the generated steps as a real
  // color_bar_sessions row the iPad picks up by polling that same code.

  const handleSendToDevice = useCallback(() => {
    if (!result) return;
    setShowPairingModal(true);
  }, [result]);

  const handleConfirmPairing = useCallback(async () => {
    if (!result) return;
    const code = pairingCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Enter the code', 'Type the code shown on the Color Bar iPad.');
      return;
    }

    setLinkingToColorBar(true);
    try {
      await claimColorBarPairingCode(code);

      const steps: ColorBarPairingStep[] = result.steps.map((s) => ({
        product: s.product?.name || s.product?.line || 'Product',
        shadeCode: s.product?.shadeCode || s.product?.shade || '',
        brand: s.product?.brand || '',
        targetGrams: s.grams,
        role: s.role,
      }));

      await sendFormulaToColorBar({ clientId, steps, pairingCode: code });

      setSendSuccess(true);
      setShowPairingModal(false);
      setPairingCodeInput('');
      Alert.alert('Sent', 'Formula sent to the Color Bar iPad. Head over to weigh it out.');
    } catch (err: any) {
      Alert.alert('Couldn’t link', err.message || 'Check the code and try again.');
    } finally {
      setLinkingToColorBar(false);
    }
  }, [result, pairingCodeInput, clientId]);

  // ─── Edit Formula Result ─────────────────────────────────────────────────
  const [editingResult, setEditingResult] = useState(false);

  const handleEditResult = useCallback(() => {
    setEditingResult(true);
  }, []);

  const handleSaveEditedResult = useCallback((updatedResult: FormulationResult) => {
    setResult(updatedResult);
    setEditingResult(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingResult(false);
  }, []);

  // ─── Render Steps ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    switch (step) {
      // ─── STEP 1: Photo ─────────────────────────────────────────────────────
      case 1:
        return (
          <View style={stepStyles.container}>
            <Text style={stepStyles.stepTitle}>Start with a Photo</Text>
            <Text style={stepStyles.stepDesc}>
              Capture or upload hair photos for AI-assisted analysis. You'll need
              shots of the roots, mid-lengths, and ends.
            </Text>

            <TouchableOpacity
              style={stepStyles.photoCard}
              onPress={() => navigation.navigate('Camera')}
            >
              <View style={stepStyles.photoIconBg}>
                <Camera size={32} color={COLORS.purple} />
              </View>
              <View style={stepStyles.photoTextBlock}>
                <Text style={stepStyles.photoCardTitle}>Take Photos</Text>
                <Text style={stepStyles.photoCardDesc}>
                  Capture roots, mid-lengths, and ends for analysis
                </Text>
              </View>
              <ChevronRight size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={stepStyles.photoCard}
              onPress={() => setStep(2)}
            >
              <View style={stepStyles.photoIconBg}>
                <Palette size={32} color={COLORS.pink} />
              </View>
              <View style={stepStyles.photoTextBlock}>
                <Text style={stepStyles.photoCardTitle}>Skip Photo</Text>
                <Text style={stepStyles.photoCardDesc}>
                  Enter hair details manually without a photo
                </Text>
              </View>
              <ChevronRight size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Phone Upload Code Section */}
            <View style={stepStyles.divider} />

            <View style={stepStyles.phoneUploadSection}>
              <View style={stepStyles.phoneUploadHeader}>
                <Smartphone size={20} color={COLORS.purple} />
                <Text style={stepStyles.phoneUploadTitle}>Phone Upload</Text>
              </View>
              <Text style={stepStyles.phoneUploadDesc}>
                Let your client or assistant upload photos from their phone.
              </Text>

              {!sessionCode ? (
                <TouchableOpacity
                  style={stepStyles.getCodeBtn}
                  onPress={handleGetSessionCode}
                  disabled={sessionCodeLoading}
                  activeOpacity={0.8}
                >
                  {sessionCodeLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Smartphone size={16} color="#FFF" />
                      <Text style={stepStyles.getCodeBtnText}>Get Phone Upload Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={stepStyles.codeDisplay}>
                  <Text style={stepStyles.codeLabel}>Session Code</Text>
                  <Text style={stepStyles.codeValue}>{sessionCode}</Text>
                  <Text style={stepStyles.codeUrl}>→ getcoloriq.co/c</Text>
                  <Text style={stepStyles.codeInstructions}>
                    Share this code with your phone. They'll enter it at the URL above.
                  </Text>
                  {uploadedPhotos.length > 0 && (
                    <View style={stepStyles.photosReceived}>
                      <CheckCircle2 size={14} color={COLORS.success} />
                      <Text style={stepStyles.photosReceivedText}>
                        {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} received
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );

      // ─── STEP 2: Hair Assessment ───────────────────────────────────────────
      case 2:
        return (
          <View style={stepStyles.container}>
            <Text style={stepStyles.stepTitle}>Hair Assessment</Text>

            <ChipSelector
              label="Texture"
              options={TEXTURES}
              selected={formData.texture}
              onSelect={(v) => updateField('texture', v)}
            />

            <ChipSelector
              label="Density"
              options={DENSITIES}
              selected={formData.density}
              onSelect={(v) => updateField('density', v)}
            />

            <ChipSelector
              label="Pattern"
              options={HAIR_PATTERNS}
              selected={formData.hairPattern}
              onSelect={(v) => updateField('hairPattern', v)}
            />

            <LevelSlider
              label="Current Level"
              value={formData.currentLevel}
              onChange={(v) => updateField('currentLevel', v)}
            />

            <ToneSelector
              label="Current Tone"
              value={formData.currentTone}
              onChange={(v) => updateField('currentTone', v)}
            />
          </View>
        );

      // ─── STEP 3: Chemical History ──────────────────────────────────────────
      case 3:
        return (
          <View style={stepStyles.container}>
            <Text style={stepStyles.stepTitle}>Chemical History</Text>

            <ChipSelector
              label="What was your last color service?"
              options={SERVICE_TYPES}
              selected={formData.lastServiceType}
              onSelect={(v) => updateField('lastServiceType', v)}
            />

            <MultiChipSelector
              label="Chemical History"
              options={CHEMICAL_HISTORY_ITEMS}
              selected={formData.chemicalHistory}
              onToggle={(v) => toggleArray('chemicalHistory', v)}
            />

            <MultiChipSelector
              label="Sensitivities"
              options={SENSITIVITIES}
              selected={formData.sensitivities}
              onToggle={(v) => toggleArray('sensitivities', v)}
            />

            <ChipSelector
              label="Last Chemical Service"
              options={LAST_SERVICE_OPTIONS}
              selected={formData.lastChemicalService as LastServiceType}
              onSelect={(v) => updateField('lastChemicalService', v)}
            />
          </View>
        );

      // ─── STEP 4: Target ────────────────────────────────────────────────────
      case 4:
        return (
          <View style={stepStyles.container}>
            <Text style={stepStyles.stepTitle}>Target Look</Text>

            <ChipSelector
              label="What service are we doing today?"
              options={SERVICE_TYPES}
              selected={formData.serviceType}
              onSelect={(v) => updateField('serviceType', v)}
            />

            <LevelSlider
              label="Target Level"
              value={formData.targetLevel}
              onChange={(v) => updateField('targetLevel', v)}
            />

            <ToneSelector
              label="Target Tone"
              value={formData.targetTone}
              onChange={(v) => updateField('targetTone', v)}
            />
          </View>
        );

      // ─── STEP 5: Condition ─────────────────────────────────────────────────
      case 5:
        return (
          <View style={stepStyles.container}>
            <Text style={stepStyles.stepTitle}>Hair Condition</Text>

            <ChipSelector
              label="Condition Type"
              options={CONDITION_TYPES}
              selected={formData.conditionType}
              onSelect={(v) => updateField('conditionType', v)}
            />

            <ChipSelector
              label="Porosity"
              options={POROSITY}
              selected={formData.porosity}
              onSelect={(v) => updateField('porosity', v)}
            />

            <GraySlider
              value={formData.grayPercent}
              onChange={(v) => updateField('grayPercent', v)}
            />

            <MultiChipSelector
              label="Problem Indicators"
              options={PROBLEM_INDICATORS.map((p) => ({
                value: p.key,
                label: p.label,
                desc: p.desc,
              }))}
              selected={formData.problemIndicators}
              onToggle={(v) => toggleArray('problemIndicators', v)}
            />
          </View>
        );

      // ─── STEP 6: Review & Generate ─────────────────────────────────────────
      case 6:
        return (
          <View style={stepStyles.container}>
            <Text style={stepStyles.stepTitle}>Review & Generate</Text>

            <SummarySection formData={formData} />

            {/* Brand Preferences */}
            <View style={{ marginTop: 16 }}>
              <Text style={chipStyles.label}>Brand Preference</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {BRANDS.map((brand) => (
                    <TouchableOpacity
                      key={brand}
                      style={[
                        chipStyles.chip,
                        formData.brandPreference === brand && chipStyles.chipActive,
                      ]}
                      onPress={() =>
                        updateField(
                          'brandPreference',
                          formData.brandPreference === brand ? '' : brand
                        )
                      }
                    >
                      <Text
                        style={[
                          chipStyles.chipText,
                          formData.brandPreference === brand && chipStyles.chipTextActive,
                        ]}
                      >
                        {brand}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Developer Preference */}
            <View style={{ marginTop: 12 }}>
              <Text style={chipStyles.label}>Developer Preference</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['10vol', '20vol', '30vol', '40vol'].map((dev) => (
                  <TouchableOpacity
                    key={dev}
                    style={[
                      chipStyles.chip,
                      formData.developerPreference === dev && chipStyles.chipActive,
                    ]}
                    onPress={() =>
                      updateField(
                        'developerPreference',
                        formData.developerPreference === dev ? '' : dev
                      )
                    }
                  >
                    <Text
                      style={[
                        chipStyles.chipText,
                        formData.developerPreference === dev && chipStyles.chipTextActive,
                      ]}
                    >
                      {dev}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={stepStyles.errorBox}>
                <AlertTriangle size={16} color={COLORS.danger} />
                <Text style={stepStyles.errorText}>{error}</Text>
              </View>
            )}

            {/* Result shown after generation */}
            {result && !editingResult && <ResultCard result={result} onSendToDevice={handleSendToDevice} onEditFormula={handleEditResult} />}

            {/* Pairing Code Modal */}
            {showPairingModal && (
              <View style={stepStyles.devicePickerOverlay}>
                <View style={stepStyles.devicePicker}>
                  <Text style={stepStyles.devicePickerTitle}>Link to Color Bar</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 12 }}>
                    Enter the code shown on the Color Bar iPad screen.
                  </Text>
                  <TextInput
                    value={pairingCodeInput}
                    onChangeText={(t) => setPairingCodeInput(t.toUpperCase())}
                    placeholder="e.g. K7WQ2P"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.cardBorder,
                      borderRadius: 10,
                      padding: 14,
                      fontSize: 20,
                      letterSpacing: 4,
                      textAlign: 'center',
                      color: COLORS.textPrimary,
                      marginBottom: 16,
                    }}
                  />
                  <TouchableOpacity
                    style={[stepStyles.deviceOption, { justifyContent: 'center' }]}
                    onPress={handleConfirmPairing}
                    disabled={linkingToColorBar}
                  >
                    {linkingToColorBar ? (
                      <ActivityIndicator color={COLORS.purple} />
                    ) : (
                      <>
                        <Bluetooth size={18} color={COLORS.purple} />
                        <Text style={stepStyles.deviceOptionName}>Link &amp; Send</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={stepStyles.devicePickerCancel}
                    onPress={() => { setShowPairingModal(false); setPairingCodeInput(''); }}
                  >
                    <Text style={stepStyles.devicePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {sendSuccess && (
              <View style={stepStyles.successBanner}>
                <CheckCircle2 size={16} color={COLORS.success} />
                <Text style={stepStyles.successBannerText}>Formula sent to Color Bar iPad!</Text>
              </View>
            )}

            {/* Reset */}
            <TouchableOpacity style={stepStyles.resetBtn} onPress={handleReset}>
              <RotateCcw size={16} color={COLORS.textSecondary} />
              <Text style={stepStyles.resetText}>Start Over</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Formulate</Text>
            <Text style={styles.headerSubtitle}>
              Step {step} of {STEPS.length}
            </Text>
          </View>
          {step > 1 && (
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetLink}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Indicator */}
        {!editingResult && <StepIndicator currentStep={step} />}

        {/* Content */}
        {showManualEntry ? (
          <ManualFormulaForm
            onDone={(result) => {
              setResult(result);
              setShowManualEntry(false);
              setStep(6);
            }}
            onCancel={() => setShowManualEntry(false)}
          />
        ) : editingResult && result ? (
          <EditFormulaForm
            result={result}
            brands={BRANDS}
            onSave={handleSaveEditedResult}
            onCancel={handleCancelEdit}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepContent()}
            <View style={{ height: 24 }} />
          </ScrollView>
        )}

        {/* Bottom Navigation */}
        <NavButtons
          step={step}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={step === 6 ? handleGenerate : handleNext}
          nextLabel={step === 6 ? (loading ? 'Generating...' : 'Generate') : 'Next'}
          disabled={loading || showManualEntry || editingResult}
          showAddFormula={step === 5 && !showManualEntry}
          onAddFormula={() => setShowManualEntry(true)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  container: { padding: 16 },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 12,
  },
  photoIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(147,51,234,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTextBlock: { flex: 1 },
  photoCardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  photoCardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500', flex: 1 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 12,
  },
  resetText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  // Phone upload code styles
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 20,
  },
  phoneUploadSection: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  phoneUploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phoneUploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  phoneUploadDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  getCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  getCodeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  codeDisplay: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.purple,
    fontFamily: 'monospace',
    letterSpacing: 4,
    marginBottom: 8,
  },
  codeUrl: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  codeInstructions: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  photosReceived: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photosReceivedText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
  },
  // Device picker styles
  devicePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
  },
  devicePicker: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  devicePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },
  deviceOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deviceOptionMac: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  devicePickerCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  devicePickerCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  successBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  resetLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

// ─── Manual Formula Form ─────────────────────────────────────────────────────

interface ManualProduct {
  id: string;
  brand: string;
  shadeCode: string;
  name: string;
  grams: string;
  developerVolume: string;
  processingTime: string;
  notes: string;
}

interface ManualFormulaFormProps {
  onDone: (result: FormulationResult) => void;
  onCancel: () => void;
}

function ManualFormulaForm({ onDone, onCancel }: ManualFormulaFormProps) {
  const [products, setProducts] = useState<ManualProduct[]>([
    {
      id: '1',
      brand: BRANDS[0] ?? '',
      shadeCode: '',
      name: '',
      grams: '',
      developerVolume: '20vol',
      processingTime: '',
      notes: '',
    },
  ]);

  const updateProduct = (id: string, field: keyof ManualProduct, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        brand: BRANDS[0] ?? '',
        shadeCode: '',
        name: '',
        grams: '',
        developerVolume: '20vol',
        processingTime: '',
        notes: '',
      },
    ]);
  };

  const handleDone = () => {
    const steps = products.map((p) => ({
      role: 'color',
      grams: p.grams ? parseInt(p.grams, 10) || 0 : 0,
      product: {
        brand: p.brand,
        shadeCode: p.shadeCode,
        name: p.name,
        ratio: '1:1',
      },
      developer: {
        volume: p.developerVolume ? parseInt(p.developerVolume, 10) || 0 : 0,
      },
      notes: p.notes,
    }));

    const result: FormulationResult = {
      success: true,
      steps,
      brand: products[0]?.brand ?? '',
      developerVolume: products[0]?.developerVolume ? parseInt(products[0].developerVolume, 10) || 0 : 0,
      processingTime: products[0]?.processingTime ?? '',
      warnings: [],
      notes: products.map((p) => p.notes).filter(Boolean).join('\n'),
      strandTestRecommended: false,
    };

    onDone(result);
  };

  return (
    <ScrollView
      contentContainerStyle={manualFormStyles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={manualFormStyles.title}>Manual Formula Entry</Text>
      <Text style={manualFormStyles.subtitle}>Enter formula details manually</Text>

      {products.map((product, index) => (
        <View key={product.id} style={manualFormStyles.productCard}>
          <Text style={manualFormStyles.productTitle}>Product {index + 1}</Text>

          {/* Brand Selector */}
          <Text style={manualFormStyles.label}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {BRANDS.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[
                    chipStyles.chip,
                    product.brand === brand && chipStyles.chipActive,
                  ]}
                  onPress={() => updateProduct(product.id, 'brand', brand)}
                >
                  <Text
                    style={[
                      chipStyles.chipText,
                      product.brand === brand && chipStyles.chipTextActive,
                    ]}
                  >
                    {brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Product/Shade Code */}
          <Text style={manualFormStyles.label}>Product/Shade Code</Text>
          <TextInput
            style={manualFormStyles.input}
            value={product.shadeCode}
            onChangeText={(text) => updateProduct(product.id, 'shadeCode', text)}
            placeholder="e.g. 8.3"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Product Name */}
          <Text style={manualFormStyles.label}>Product Name</Text>
          <TextInput
            style={manualFormStyles.input}
            value={product.name}
            onChangeText={(text) => updateProduct(product.id, 'name', text)}
            placeholder="e.g. Golden Light Blonde"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Grams */}
          <Text style={manualFormStyles.label}>Grams</Text>
          <TextInput
            style={manualFormStyles.input}
            value={product.grams}
            onChangeText={(text) => updateProduct(product.id, 'grams', text)}
            placeholder="30"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Developer Volume */}
          <Text style={manualFormStyles.label}>Developer Volume</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {['10vol', '20vol', '30vol', '40vol'].map((dev) => (
              <TouchableOpacity
                key={dev}
                style={[
                  chipStyles.chip,
                  product.developerVolume === dev && chipStyles.chipActive,
                ]}
                onPress={() => updateProduct(product.id, 'developerVolume', dev)}
              >
                <Text
                  style={[
                    chipStyles.chipText,
                    product.developerVolume === dev && chipStyles.chipTextActive,
                  ]}
                >
                  {dev}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Processing Time */}
          <Text style={manualFormStyles.label}>Processing Time</Text>
          <TextInput
            style={manualFormStyles.input}
            value={product.processingTime}
            onChangeText={(text) => updateProduct(product.id, 'processingTime', text)}
            placeholder="e.g. 30 minutes"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Notes */}
          <Text style={manualFormStyles.label}>Notes</Text>
          <TextInput
            style={[manualFormStyles.input, manualFormStyles.multilineInput]}
            value={product.notes}
            onChangeText={(text) => updateProduct(product.id, 'notes', text)}
            placeholder="Additional notes..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
      ))}

      {/* Add Another Product */}
      <TouchableOpacity style={manualFormStyles.addProductBtn} onPress={addProduct}>
        <FlaskConical size={18} color={COLORS.purple} />
        <Text style={manualFormStyles.addProductText}>Add Another Product</Text>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={manualFormStyles.actionRow}>
        <TouchableOpacity style={manualFormStyles.cancelBtn} onPress={onCancel}>
          <Text style={manualFormStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={manualFormStyles.doneBtn} onPress={handleDone}>
          <CheckCircle2 size={18} color="#FFF" />
          <Text style={manualFormStyles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const manualFormStyles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  productCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.purple,
    marginBottom: 12,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.purple,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  doneBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
