// ============================================================
// COLORiq Mobile — TypeScript Types
// Matching the COLORiq web API
// ============================================================

// --- Hair Levels & Tones ---
export const HAIR_LEVEL_NAMES: Record<number, string> = {
  1: 'Black',
  2: 'Very Dark Brown',
  3: 'Dark Brown',
  4: 'Medium Brown',
  5: 'Light Brown',
  6: 'Dark Blonde',
  7: 'Medium Blonde',
  8: 'Light Blonde',
  9: 'Very Light Blonde',
  10: 'Platinum',
};

// Tones matching the web dashboard (single-letter codes)
export const TONES = [
  { value: 'N', label: 'Natural', color: '#9C8B7A' },
  { value: 'A', label: 'Ash', color: '#8A7D6E' },
  { value: 'G', label: 'Gold', color: '#C4A35A' },
  { value: 'K', label: 'Copper', color: '#B87333' },
  { value: 'R', label: 'Red', color: '#A03030' },
  { value: 'V', label: 'Violet', color: '#7B68A6' },
  { value: 'P', label: 'Pearl', color: '#B8B0C4' },
  { value: 'B', label: 'Beige', color: '#C4B5A0' },
  { value: 'M', label: 'Mahogany', color: '#6B3A3A' },
  { value: 'Ch', label: 'Chocolate', color: '#4A2C2A' },
  { value: 'W', label: 'Warm', color: '#D4A574' },
  { value: 'C', label: 'Cool', color: '#7D8B9A' },
] as const;

export type ToneValue = typeof TONES[number]['value'];

// Map web tone values to mobile tone names
export const TONE_VALUE_MAP: Record<string, string> = {
  N: 'neutral', A: 'ash', G: 'golden', K: 'copper',
  R: 'red', V: 'violet', P: 'pearl', B: 'beige',
  M: 'mahogany', Ch: 'chocolate', W: 'warm', C: 'cool',
};

export const REV_TONE_VALUE_MAP: Record<string, ToneValue> = {
  neutral: 'N', ash: 'A', golden: 'G', copper: 'K',
  red: 'R', violet: 'V', pearl: 'P', beige: 'B',
  mahogany: 'M', chocolate: 'Ch', warm: 'W', cool: 'C',
};

// Legacy tone names (for backwards compat)
export const LEGACY_TONES = [
  'neutral', 'warm', 'cool', 'ash', 'golden', 'copper',
  'red', 'violet', 'pearl', 'beige', 'mahogany', 'chocolate',
] as const;

export type Tone = typeof LEGACY_TONES[number];

// --- Hair Characteristics ---
export const HAIR_CONDITION_TYPES = [
  'virgin', 'previously_colored', 'damaged', 'highly_damaged',
] as const;

export type HairConditionType = typeof HAIR_CONDITION_TYPES[number];

export const POROSITY_LEVELS = ['low', 'normal', 'high'] as const;
export type Porosity = typeof POROSITY_LEVELS[number];

export type TextureType = 'fine' | 'medium' | 'coarse';
export type HairPatternType = 'straight' | 'wavy' | 'curly' | 'coily';
export type DensityType = 'thin' | 'medium' | 'thick';

export type ServiceType =
  | 'full_head'
  | 'retouch'
  | 'balayage'
  | 'foils'
  | 'corrective'
  | 'gloss_toner';

export type LastServiceType =
  | 'never'
  | '6+_months'
  | '3-6_months'
  | '1-3_months'
  | '3-4_weeks'
  | '1-2_weeks'
  | 'this_week';

export type ConditionType =
  | 'virgin'
  | 'previously_colored'
  | 'damaged'
  | 'highly_damaged'
  | 'bleached'
  | 'gray_coverage'
  | 'oily_scalp'
  | 'dry_brittle';

// --- Condition Object ---
export interface ConditionState {
  type: ConditionType;
  porosity: Porosity;
  grayPercent: number;
  highlights: boolean;
  highlightedPercent: number;
  banding: boolean;
  hotRoots: boolean;
  previousLightener: boolean;
  multipleColors: boolean;
  greenCast: boolean;
  muddyToner: boolean;
  overAshy: boolean;
  colorGrab: boolean;
  hollowEnds: boolean;
}

// --- Chemical History ---
export interface ChemicalHistoryState {
  boxDye: boolean;
  metallicSalts: boolean;
  henna: boolean;
  keratinTreatment: boolean;
  relaxer: boolean;
  hardWater: boolean;
  medicationBuildup: boolean;
  lastService: LastServiceType;
}

// --- Sensitivity Flags ---
export interface SensitivityState {
  ppdAllergy: boolean;
  pregnancy: boolean;
  breastfeeding: boolean;
  activeChemo: boolean;
}

// --- Form State ---
export interface FormState {
  currentLevel: number;
  currentTone: ToneValue;
  targetLevel: number;
  targetTone: ToneValue;
  texture: TextureType;
  hairPattern: HairPatternType;
  density: DensityType;
  serviceType: ServiceType;
  condition: ConditionState;
  brandPreference: string;
  linePreference: string;
  sensitivity: SensitivityState;
  chemicalHistory: ChemicalHistoryState;
}

// --- Formulation Input ---
export interface FormulationInput {
  currentLevel: number;
  currentTone: string;
  targetLevel: number;
  targetTone: string;
  hairType?: 'virgin' | 'previously_colored' | 'damaged' | 'highly_damaged' | 'unknown';
  texture?: TextureType;
  hairPattern?: HairPatternType;
  density?: DensityType;
  serviceType?: ServiceType;
  chemicalHistory?: string[];
  sensitivities?: string[];
  lastChemicalService?: string;
  condition?: {
    type?: ConditionType;
    porosity?: Porosity;
    grayPercent?: number;
    highlights?: boolean;
    highlightedPercent?: number;
    banding?: boolean;
    hotRoots?: boolean;
    previousLightener?: boolean;
    multipleColors?: boolean;
    greenCast?: boolean;
    muddyToner?: boolean;
    overAshy?: boolean;
    colorGrab?: boolean;
    hollowEnds?: boolean;
  };
  brandPreference?: string;
  linePreference?: string;
}

// --- Formulation Result ---
export interface Product {
  name: string;
  brand?: string;
  shade?: string;
  ratio?: string;
  shadeCode?: string;
  shadeName?: string;
  level?: number;
  line?: string;
}

export interface FormulationStep {
  product: Product;
  grams: number;
  role: string;
  notes?: string;
  developer?: { volume: number };
}

export interface HardStop {
  type: string;
  message: string;
}

export interface FormulationResult {
  success: boolean;
  steps: FormulationStep[];
  developerVolume?: number;
  processingTime?: number | string;
  application?: string;
  coverage?: string;
  notes?: string;
  warnings?: string[];
  brand?: string;
  line?: string;
  confidence?: number;
  error?: string;
  hardStops?: HardStop[];
  alternatives?: string[];
  assessment?: string;
  strandTestRecommended?: boolean;
  underlyingPigment?: { description: string };
  quantity?: { description: string };
  multiSessionPlan?: string[];
}

// --- Client ---
export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  total_visits: number;
  last_visit_at?: string;
}

// --- Formula ---
export interface Formula {
  id: string;
  name?: string;
  developer_vol?: string;
  mixing_ratio?: string;
  processing_time?: string;
  notes?: string;
  product_brand?: string;
  product_line?: string;
  product_shade?: string;
  created_at?: string;
  client_id?: string;
}

// --- Community Formula ---
export interface CommunityFormula {
  id: string;
  name?: string;
  author?: string;
  brand?: string;
  level?: number;
  tone?: string;
  rating?: number;
  votes?: number;
  steps?: FormulationStep[];
  notes?: string;
  created_at?: string;
}

// --- User Profile ---
export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  defaultBrand?: string;
  defaultLine?: string;
  notificationsEnabled?: boolean;
  created_at?: string;
}

// --- API Response Wrappers ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Step definitions (matching web) ---
export const STEPS = [
  { id: 1, title: 'Photo', desc: 'Capture or upload hair photo' },
  { id: 2, title: 'Hair Assessment', desc: 'Texture, pattern, density, level \u0026 tone' },
  { id: 3, title: 'Chemical History', desc: 'Past treatments \u0026 sensitivities' },
  { id: 4, title: 'Target Look', desc: 'Desired color result' },
  { id: 5, title: 'Condition', desc: 'Hair health \u0026 problem indicators' },
  { id: 6, title: 'Results', desc: 'Your custom formula' },
] as const;

// --- Web-matching constants ---
export const TEXTURES = [
  { value: 'fine' as TextureType, label: 'Fine', desc: 'Thin strands, processes faster' },
  { value: 'medium' as TextureType, label: 'Medium', desc: 'Average strand diameter' },
  { value: 'coarse' as TextureType, label: 'Coarse', desc: 'Thick strands, takes longer' },
];

export const HAIR_PATTERNS = [
  { value: 'straight' as HairPatternType, label: 'Straight', type: 'Type 1' },
  { value: 'wavy' as HairPatternType, label: 'Wavy', type: 'Type 2' },
  { value: 'curly' as HairPatternType, label: 'Curly', type: 'Type 3' },
  { value: 'coily' as HairPatternType, label: 'Coily', type: 'Type 4' },
];

export const DENSITIES = [
  { value: 'thin' as DensityType, label: 'Thin', desc: 'Low density' },
  { value: 'medium' as DensityType, label: 'Medium', desc: 'Average density' },
  { value: 'thick' as DensityType, label: 'Thick', desc: 'High density' },
];

export const SERVICE_TYPES = [
  { value: 'full_head' as ServiceType, label: 'Full Head', desc: 'All-over application' },
  { value: 'retouch' as ServiceType, label: 'Retouch', desc: 'Root regrowth only' },
  { value: 'balayage' as ServiceType, label: 'Balayage', desc: 'Hand-painted highlights' },
  { value: 'foils' as ServiceType, label: 'Foils', desc: 'Foil highlights/lowlights' },
  { value: 'corrective' as ServiceType, label: 'Corrective', desc: 'Color correction' },
  { value: 'gloss_toner' as ServiceType, label: 'Gloss/Toner', desc: 'Tone refresh or gloss' },
];

export const CHEMICAL_HISTORY_ITEMS = [
  { value: 'boxDye', label: 'Box Dye', desc: 'Drugstore/home color kit — MAJOR HAZARD', danger: true },
  { value: 'metallicSalts', label: 'Metallic Salts', desc: 'Metallic dye or mineral buildup — HARD STOP for lightening', danger: true },
  { value: 'henna', label: 'Henna', desc: 'Henna color — lightener = green disaster', danger: true },
  { value: 'keratinTreatment', label: 'Keratin Treatment', desc: 'Keratin smoothing in last 6 months', danger: false },
  { value: 'relaxer', label: 'Relaxer / Straightening', desc: 'Chemical relaxer or Japanese straightening', danger: false },
  { value: 'hardWater', label: 'Hard Water', desc: 'Hard water or well water at home', danger: false },
  { value: 'medicationBuildup', label: 'Medication/Mineral Buildup', desc: 'Thyroid meds, iron, copper, etc.', danger: false },
];

export const SENSITIVITIES = [
  { value: 'ppdAllergy', label: 'PPD Allergy', desc: 'Allergic to PPD — use PPD-free alternatives', icon: '⚠️' },
  { value: 'pregnancy', label: 'Pregnancy', desc: 'Client is pregnant', icon: '🤰' },
  { value: 'breastfeeding', label: 'Breastfeeding', desc: 'Client is breastfeeding', icon: '🤱' },
  { value: 'activeChemo', label: 'Active Chemotherapy', desc: 'Currently receiving chemo', icon: '⚕️' },
];

export const LAST_SERVICE_OPTIONS = [
  { value: 'never' as LastServiceType, label: 'Never' },
  { value: '6+_months' as LastServiceType, label: '6+ months ago' },
  { value: '3-6_months' as LastServiceType, label: '3–6 months ago' },
  { value: '1-3_months' as LastServiceType, label: '1–3 months ago' },
  { value: '3-4_weeks' as LastServiceType, label: '3–4 weeks ago' },
  { value: '1-2_weeks' as LastServiceType, label: '1–2 weeks ago' },
  { value: 'this_week' as LastServiceType, label: 'This week' },
];

export const CONDITION_TYPES = [
  { value: 'virgin' as ConditionType, label: 'Virgin Hair', desc: 'Never chemically treated' },
  { value: 'bleached' as ConditionType, label: 'Bleached/Lightened', desc: 'Lifted from natural' },
  { value: 'gray_coverage' as ConditionType, label: 'Gray Coverage Needed', desc: 'Requires gray blending or coverage' },
  { value: 'oily_scalp' as ConditionType, label: 'Oily Scalp', desc: 'Excess sebum production on scalp' },
  { value: 'previously_colored' as ConditionType, label: 'Previously Colored', desc: 'Has existing color deposit' },
  { value: 'damaged' as ConditionType, label: 'Damaged', desc: 'Over-processed or compromised' },
  { value: 'dry_brittle' as ConditionType, label: 'Dry/Brittle', desc: 'Lacks moisture, prone to breakage' },
  { value: 'highly_damaged' as ConditionType, label: 'Highly Damaged', desc: 'Severely compromised, needs repair' },
];

export const POROSITY = [
  { value: 'low' as Porosity, label: 'Low', color: '#9333EA' },
  { value: 'normal' as Porosity, label: 'Normal', color: '#F59E0B' },
  { value: 'high' as Porosity, label: 'High', color: '#EF4444' },
];

export const PROBLEM_INDICATORS = [
  { key: 'banding', label: 'Banding', desc: 'Visible color bands from overlapping' },
  { key: 'hotRoots', label: 'Hot Roots', desc: 'Warmer/lighter roots than mids' },
  { key: 'previousLightener', label: 'Previous Lightener', desc: 'Has bleach/lightener in hair' },
  { key: 'multipleColors', label: 'Multiple Colors', desc: 'Different colors on different sections' },
  { key: 'greenCast', label: 'Green Cast', desc: 'Unwanted green tone present' },
  { key: 'muddyToner', label: 'Muddy Toner', desc: 'Toner has gone muddy/ashy' },
  { key: 'overAshy', label: 'Over-Ashy', desc: 'Too cool/gray result' },
  { key: 'colorGrab', label: 'Color Grab', desc: 'Ends absorbing color unevenly' },
  { key: 'hollowEnds', label: 'Hollow Ends', desc: 'Ends appear hollow or see-through' },
];

export const BRANDS = [
  'Wella', 'Redken', 'Schwarzkopf', 'Igora', 'Pravana',
  'Matrix', "L'Oréal", 'Goldwell', 'Davines', 'Kenra',
  'Pulp Riot', 'Joico', 'Olaplex', 'Moroccanoil',
];
