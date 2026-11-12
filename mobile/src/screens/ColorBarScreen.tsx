// ============================================================
// ColorBarScreen — iPad Terminal for Color Bar Mixing Station
// Large-text, production-focused interface for weighing formulas
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  User,
  CheckCircle2,
  Circle,
  Scale,
  Bluetooth,
  BluetoothOff,
  AlertTriangle,
  ChevronRight,
  Plus,
  Minus,
  DollarSign,
  Save,
  Send,
  RefreshCw,
  Beaker,
  X,
  Smartphone,
  ArrowLeft,
} from 'lucide-react-native';
import { useAcaiaScale, useAcaiaCapture } from '../hooks/useAcaiaScale';
import { API_BASE as API_ROOT, getAuthToken, notifyUnauthorized } from '../api/client';

// ─── Constants ─────────────────────────────────────────────────────────────

const API_BASE = `${API_ROOT}/v1/color-bar`;

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
  purpleLight: 'rgba(147,51,234,0.15)',
  pink: '#EC4899',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.15)',
  red: '#EF4444',
  redLight: 'rgba(239,68,68,0.15)',
  yellow: '#F59E0B',
  yellowLight: 'rgba(245,158,11,0.15)',
  blue: '#3B82F6',
  blueLight: 'rgba(59,130,246,0.15)',
  border: 'rgba(255,255,255,0.08)',
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  phone?: string;
  lastVisit?: string;
  preferredFormula?: string;
}

interface FormulaStep {
  product: string;
  shadeCode: string;
  brand: string;
  targetGrams: number;
  actualGrams: number;
  completed: boolean;
  role: string; // 'color' | 'developer' | 'additive'
}

interface Formula {
  id: string;
  clientName: string;
  createdAt: string;
  steps: FormulaStep[];
  developerVolume: number;
  processingTime: number;
  totalGrams: number;
  totalCost: number;
  notes?: string;
}

interface ColorBarSession {
  id: string;
  client?: Client;
  formula?: Formula;
  status: 'idle' | 'active' | 'completed';
  startedAt?: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────

// These four all THROW on failure rather than silently substituting mock
// data or a fake ID — a stylist weighing real product against a session that
// silently never got saved is real client work lost with no indication
// anything went wrong. Callers are responsible for surfacing the error.

// None of these go through api/client.ts's shared apiRequest (they predate
// it and build their own headers), so a 401 here was previously invisible
// to the rest of the app — the token could go dead (e.g. a server-side
// JWT_SECRET rotation) and this screen would just show a generic "Failed
// to fetch clients (401)" error forever, with no path back to login.
async function checkAuthResponse(res: Response, errorPrefix: string): Promise<void> {
  if (res.status === 401) await notifyUnauthorized();
  if (!res.ok) throw new Error(`${errorPrefix} (${res.status})`);
}

async function fetchClients(token: string): Promise<Client[]> {
  const res = await fetch(`${API_BASE}/clients`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkAuthResponse(res, 'Failed to fetch clients');
  const data = await res.json();
  return data.clients || [];
}

async function fetchClientFormulas(clientId: string, token: string): Promise<Formula[]> {
  const res = await fetch(`${API_BASE}/formulas/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkAuthResponse(res, 'Failed to fetch formulas');
  const data = await res.json();
  return data.formulas || [];
}

async function createSession(clientId: string, formulaId: string | undefined, token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clientId, formulaId })
  });
  await checkAuthResponse(res, 'Failed to create session');
  const data = await res.json();
  return data.sessionId;
}

interface CompleteSessionResult {
  totalCost: number;
  wholesaleCost: number;
  pricingWarnings: string[];
  [key: string]: unknown;
}

// totalCost is no longer sent — the server computes and stores the real
// charge from the salon's own pricing rules (grams weighed × per-product
// cost × markup), never from a client-supplied number. See
// dashboard/lib/pricing.ts.
async function completeSession(sessionId: string, steps: FormulaStep[], token: string): Promise<CompleteSessionResult> {
  const res = await fetch(`${API_BASE}/session/${sessionId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ steps })
  });
  await checkAuthResponse(res, 'Failed to complete session');
  return await res.json();
}

interface PosOrderResult {
  orderId: string;
  provider: 'square' | 'clover';
  totalCost: number;
  pricingWarnings: string[];
  message: string;
}

// Provider-agnostic — pushes to whichever POS the salon has connected
// (Square or Clover today), so the app doesn't need to know or care which.
async function pushOrderToPos(sessionId: string, token: string): Promise<PosOrderResult> {
  const res = await fetch(`${API_BASE}/pos-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });
  const data = await res.json();
  if (res.status === 401) await notifyUnauthorized();
  if (!res.ok) {
    throw new Error(data?.error || `Failed to push order (${res.status})`);
  }
  return data;
}

// ─── Phone Pairing ───────────────────────────────────────────────────────────
// The iPad generates a short code; a stylist's own phone enters it, runs its
// photo → AI formula flow there, and links the result back onto this code —
// which shows up here as a real session ready to weigh.

interface PairingStatus {
  status: 'waiting' | 'claimed' | 'linked' | 'expired';
  sessionId?: string;
}

interface RemoteSession {
  id: string;
  client: { id: string; name: string; phone?: string } | null;
  formulaId: string | null;
  steps: FormulaStep[];
}

async function startPairing(token: string): Promise<{ code: string; expiresAt: string }> {
  const res = await fetch(`${API_BASE}/pairing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await checkAuthResponse(res, 'Failed to generate a code');
  return res.json();
}

async function getPairingStatus(code: string, token: string): Promise<PairingStatus> {
  const res = await fetch(`${API_BASE}/pairing/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await checkAuthResponse(res, 'Failed to check pairing status');
  return res.json();
}

async function fetchRemoteSession(sessionId: string, token: string): Promise<RemoteSession> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await checkAuthResponse(res, 'Failed to load session');
  return res.json();
}

// ─── Starting formula for a client with none on file ────────────────────────
// Used only when the API call succeeds but genuinely returns zero formulas
// for this client (a real, legitimate case — not an error). API failures are
// no longer silently mapped to fake data; see fetchClients/fetchClientFormulas.

const BLANK_FORMULA_TEMPLATE: Formula = {
  id: 'f1',
  clientName: '',
  createdAt: '2025-05-28',
  steps: [
    { product: 'Demi-Permanent Color', shadeCode: '6N', brand: 'Davines', targetGrams: 45, actualGrams: 0, completed: false, role: 'color' },
    { product: 'Demi-Permanent Color', shadeCode: '6RV', brand: 'Davines', targetGrams: 15, actualGrams: 0, completed: false, role: 'color' },
    { product: 'Developer', shadeCode: '20vol', brand: 'Davines', targetGrams: 60, actualGrams: 0, completed: false, role: 'developer' },
    { product: 'Bond Builder', shadeCode: 'B1', brand: 'Olaplex', targetGrams: 7.5, actualGrams: 0, completed: false, role: 'additive' },
  ],
  developerVolume: 20,
  processingTime: 35,
  totalGrams: 127.5,
  totalCost: 12.50,
  notes: 'No formula on file yet — starting template. Adjust before mixing.',
};

// ─── Helper Functions ──────────────────────────────────────────────────────

function getStepColor(step: FormulaStep): string {
  if (step.completed) return COLORS.green;
  if (step.role === 'color') return COLORS.purple;
  if (step.role === 'developer') return COLORS.blue;
  return COLORS.yellow;
}

function getStepBgColor(step: FormulaStep): string {
  if (step.completed) return COLORS.greenLight;
  if (step.role === 'color') return COLORS.purpleLight;
  if (step.role === 'developer') return COLORS.blueLight;
  return COLORS.yellowLight;
}

function formatWeight(grams: number): string {
  return grams.toFixed(1);
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

// ─── Components ────────────────────────────────────────────────────────────

function ScaleStatusBadge({ status, weight }: { status: string; weight: number }) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return COLORS.green;
      case 'scanning': return COLORS.yellow;
      case 'error': return COLORS.red;
      default: return COLORS.textMuted;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <Bluetooth size={16} color={getStatusColor()} />;
      case 'scanning': return <RefreshCw size={16} color={getStatusColor()} />;
      case 'error': return <AlertTriangle size={16} color={getStatusColor()} />;
      default: return <BluetoothOff size={16} color={getStatusColor()} />;
    }
  };

  return (
    <View style={[styles.scaleBadge, { borderColor: getStatusColor() + '40' }]}>
      {getStatusIcon()}
      <Text style={[styles.scaleBadgeText, { color: getStatusColor() }]}>
        {status === 'connected' ? `${formatWeight(weight)}g` : status.toUpperCase()}
      </Text>
    </View>
  );
}

function ClientCard({ client, onSelect }: { client: Client; onSelect: (client: Client) => void }) {
  return (
    <TouchableOpacity style={styles.clientCard} onPress={() => onSelect(client)} activeOpacity={0.7}>
      <View style={styles.clientAvatar}>
        <User size={24} color={COLORS.purple} />
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{client.name}</Text>
        <Text style={styles.clientMeta}>
          {client.lastVisit ? `Last visit: ${client.lastVisit}` : 'New client'}
          {client.preferredFormula ? ` • ${client.preferredFormula}` : ''}
        </Text>
      </View>
      <ChevronRight size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function StepCard({
  step,
  index,
  isActive,
  scaleWeight,
  weightStable,
  scaleConnected,
  isCapturing,
  onStartCapture,
  onCancelCapture,
  onComplete,
  onAdjust,
}: {
  step: FormulaStep;
  index: number;
  isActive: boolean;
  scaleWeight: number;
  weightStable: boolean;
  scaleConnected: boolean;
  isCapturing: boolean;
  onStartCapture: (index: number) => void;
  onCancelCapture: (index: number) => void;
  onComplete: (index: number, actualGrams: number) => void;
  onAdjust: (index: number, delta: number) => void;
}) {
  const [manualWeight, setManualWeight] = useState('');
  const showScaleWeight = isActive && scaleWeight > 0 && !step.completed;
  const effectiveWeight = scaleWeight > 0 ? scaleWeight : parseFloat(manualWeight) || 0;
  const canComplete = effectiveWeight > 0;

  return (
    <View
      style={[
        styles.stepCard,
        {
          borderColor: isActive ? getStepColor(step) : COLORS.cardBorder,
          backgroundColor: step.completed ? getStepBgColor(step) : COLORS.card,
        },
      ]}
    >
      {/* Step Header */}
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: getStepColor(step) }]}>
          {step.completed ? (
            <CheckCircle2 size={20} color="#fff" />
          ) : (
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepBrand}>{step.brand}</Text>
          <Text style={styles.stepProduct}>{step.product}</Text>
        </View>
        <View style={[styles.shadeBadge, { backgroundColor: getStepBgColor(step) }]}>
          <Text style={[styles.shadeCode, { color: getStepColor(step) }]}>{step.shadeCode}</Text>
        </View>
      </View>

      {/* Weight Display */}
      <View style={styles.weightRow}>
        <View style={styles.weightTarget}>
          <Text style={styles.weightLabel}>TARGET</Text>
          <Text style={[styles.weightValue, { color: COLORS.textPrimary }]}>
            {formatWeight(step.targetGrams)}g
          </Text>
        </View>

        {showScaleWeight ? (
          <View style={styles.weightActual}>
            <Text style={styles.weightLabel}>ON SCALE</Text>
            <Text
              style={[
                styles.weightValue,
                {
                  color:
                    Math.abs(scaleWeight - step.targetGrams) < 2
                      ? COLORS.green
                      : scaleWeight > step.targetGrams
                      ? COLORS.red
                      : COLORS.yellow,
                },
              ]}
            >
              {formatWeight(scaleWeight)}g
            </Text>
          </View>
        ) : step.completed ? (
          <View style={styles.weightActual}>
            <Text style={styles.weightLabel}>ACTUAL</Text>
            <Text style={[styles.weightValue, { color: COLORS.green }]}>
              {formatWeight(step.actualGrams)}g
            </Text>
          </View>
        ) : null}
      </View>

      {/* Progress Bar */}
      {isActive && !step.completed && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min((scaleWeight / step.targetGrams) * 100, 100)}%`,
                backgroundColor:
                  Math.abs(scaleWeight - step.targetGrams) < 2
                    ? COLORS.green
                    : scaleWeight > step.targetGrams
                    ? COLORS.red
                    : COLORS.purple,
              },
            ]}
          />
        </View>
      )}

      {/* Action Buttons */}
      {isActive && !step.completed && (
        <View style={styles.stepActions}>
          {isCapturing ? (
            // ── Capture mode ──
            <View style={styles.captureRow}>
              {scaleWeight <= 0 ? (
                <Text style={styles.captureHint}>Pour onto scale...</Text>
              ) : weightStable ? (
                <Text style={[styles.captureHint, { color: COLORS.green }]}>Capturing...</Text>
              ) : (
                <Text style={[styles.captureHint, { color: COLORS.yellow }]}>Hold steady...</Text>
              )}
              <TouchableOpacity
                style={styles.cancelCaptureBtn}
                onPress={() => onCancelCapture(index)}
              >
                <X size={16} color={COLORS.textSecondary} />
                <Text style={styles.cancelCaptureBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Normal / manual mode ──
            <>
              {scaleConnected ? (
                <TouchableOpacity
                  style={styles.startWeighBtn}
                  onPress={() => onStartCapture(index)}
                >
                  <Scale size={22} color="#fff" />
                  <Text style={styles.startWeighBtnText}>Start Weighing</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.manualWeightRow}>
                  <Text style={styles.weightLabel}>MANUAL ENTRY (g)</Text>
                  <TextInput
                    style={styles.manualWeightInput}
                    value={manualWeight}
                    onChangeText={setManualWeight}
                    keyboardType="decimal-pad"
                    placeholder={`Target: ${step.targetGrams}g`}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              )}
              <View style={styles.adjustRow}>
                <TouchableOpacity style={styles.adjustBtn} onPress={() => onAdjust(index, -5)}>
                  <Text style={styles.adjustBtnText}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustBtn} onPress={() => onAdjust(index, -1)}>
                  <Text style={styles.adjustBtnText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.completeBtn, { opacity: canComplete ? 1 : 0.5 }]}
                  onPress={() => canComplete && onComplete(index, effectiveWeight)}
                  disabled={!canComplete}
                >
                  <CheckCircle2 size={20} color="#fff" />
                  <Text style={styles.completeBtnText}>
                    {scaleWeight > 0 && Math.abs(scaleWeight - step.targetGrams) < 2
                      ? 'Perfect!'
                      : 'Accept'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustBtn} onPress={() => onAdjust(index, 1)}>
                  <Text style={styles.adjustBtnText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustBtn} onPress={() => onAdjust(index, 5)}>
                  <Text style={styles.adjustBtnText}>+5</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Completed Summary */}
      {step.completed && (
        <View style={styles.completedRow}>
          <CheckCircle2 size={16} color={COLORS.green} />
          <Text style={styles.completedText}>
            Completed — {formatWeight(step.actualGrams)}g measured
            {step.actualGrams !== step.targetGrams && (
              <Text style={{ color: COLORS.yellow }}>
                {' '}({step.actualGrams > step.targetGrams ? '+' : ''}
                {formatWeight(step.actualGrams - step.targetGrams)}g)
              </Text>
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

export default function ColorBarScreen({ navigation, route }: any) {
  // Auth token — nothing ever navigates here with a route param, so read the
  // real stored session token the same way every other screen does.
  const [token, setToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);
  useEffect(() => {
    getAuthToken().then((t) => {
      setToken(t || '');
      setTokenLoaded(true);
    });
  }, []);

  // State
  const [session, setSession] = useState<ColorBarSession>({ id: '', status: 'idle' });
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  
  // Load clients from API on mount
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [steps, setSteps] = useState<FormulaStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFormula, setIsLoadingFormula] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);
  const [showSearch, setShowSearch] = useState(true);

  // Phone pairing — "Link a Phone" shows a code, polls until a phone links
  // a real formula onto it, then jumps straight into weighing.
  const [showPairing, setShowPairing] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState<PairingStatus['status'] | 'idle'>('idle');
  const [pairingLoading, setPairingLoading] = useState(false);
  const pairingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scale integration — live weight + connection management
  const {
    weight: scaleWeight,
    weightStable,
    status: scaleStatus,
    connect: connectScale,
    error: scaleError,
  } = useAcaiaScale();

  // Load clients from API on mount
  useEffect(() => {
    if (!tokenLoaded) return;
    if (!token) {
      Alert.alert('Not signed in', 'Log in to load your client list.');
      return;
    }
    setIsLoadingClients(true);
    fetchClients(token)
      .then(data => {
        setClients(data);
        setIsLoadingClients(false);
      })
      .catch((err) => {
        setIsLoadingClients(false);
        Alert.alert(
          'Couldn’t load clients',
          err instanceof Error ? err.message : 'Check your connection and try again.'
        );
      });
  }, [token, tokenLoaded]);

  // Filter clients
  const filteredClients = searchQuery.length > 0
    ? clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : clients;

  // Calculate cost
  useEffect(() => {
    if (formula && steps.length > 0 && formula.totalGrams > 0) {
      const costPerGram = formula.totalCost / formula.totalGrams;
      const totalActual = steps.reduce((sum, s) => sum + s.actualGrams, 0);
      setSessionCost(costPerGram * totalActual);
    }
  }, [steps, formula]);

  // Handle client selection
  const handleSelectClient = useCallback(async (client: Client) => {
    setSelectedClient(client);
    setIsLoadingFormula(true);
    setShowSearch(false);

    try {
      // Fetch formulas from API
      const formulas = await fetchClientFormulas(client.id, token);
      
      // Use first formula or fallback to mock
      // No formula on file yet is a legitimate case (new client) — start
      // from a blank template. A failed *request* is different and is
      // handled in the catch below, not folded into this fallback.
      //
      // realFormulaId is the actual formulas.id (a real UUID) when one
      // exists — this is what gets sent to the backend, which stores it in
      // a @db.Uuid column. clientFormula.id below is a synthetic display/
      // React-key id and must NEVER be sent as formulaId: every session
      // creation for a client with a real formula, or none at all, was
      // silently 500ing before this fix because the synthetic string
      // isn't valid UUID input.
      const realFormulaId = formulas.length > 0 ? formulas[0].id : undefined;
      const clientFormula = formulas.length > 0 ? {
        ...formulas[0],
        clientName: client.name,
        id: `f-${client.id}-${Date.now()}`,
      } : {
        ...BLANK_FORMULA_TEMPLATE,
        clientName: client.name,
        id: `f-${client.id}-${Date.now()}`,
      };

      setFormula(clientFormula);
      setSteps(clientFormula.steps.map(s => ({ ...s })));
      setCurrentStep(0);

      // Create session in backend — if this fails, there is no real session
      // to weigh product against, so don't fabricate one.
      const sessionId = await createSession(client.id, realFormulaId, token);
      setSession({
        id: sessionId,
        client,
        formula: clientFormula,
        status: 'active',
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error loading formula:', err);
      setSelectedClient(null);
      setFormula(null);
      setSteps([]);
      Alert.alert(
        'Couldn’t start session',
        err instanceof Error ? err.message : 'Check your connection and try again.'
      );
    } finally {
      setIsLoadingFormula(false);
    }
  }, [token]);

  // Handle step completion
  const handleCompleteStep = useCallback(
    (index: number, actualGrams: number) => {
      const next = steps.map((s, i) =>
        i === index ? { ...s, actualGrams, completed: true } : s
      );
      setSteps(next);

      if (index < steps.length - 1) {
        setCurrentStep(index + 1);
      } else {
        setSession(prev => ({ ...prev, status: 'completed' }));
        const finalCost =
          formula && formula.totalGrams > 0
            ? (formula.totalCost / formula.totalGrams) *
              next.reduce((sum, s) => sum + s.actualGrams, 0)
            : sessionCost;
        Alert.alert(
          'Formula Complete!',
          `Total cost: ${formatCost(finalCost)}\nReady to push to your POS?`,
          [
            { text: 'Review', style: 'cancel' },
            { text: 'Push to POS', onPress: handlePushToPos },
          ]
        );
      }
    },
    [steps, sessionCost, formula]
  );

  // Capture integration — auto-captures stable weight for current step
  const handleCapture = useCallback(
    (grams: number) => {
      handleCompleteStep(currentStep, grams);
    },
    [currentStep, handleCompleteStep]
  );

  const { capturing, startCapture, cancelCapture } = useAcaiaCapture(handleCapture);

  const handleStartCapture = useCallback(
    (index: number) => {
      if (index !== currentStep) return;
      startCapture();
    },
    [currentStep, startCapture]
  );

  const handleCancelCapture = useCallback(
    (_index: number) => {
      cancelCapture();
    },
    [cancelCapture]
  );

  // Handle weight adjustment (manual override)
  const handleAdjustWeight = useCallback((index: number, delta: number) => {
    setSteps(prev => {
      const next = [...prev];
      const current = next[index];
      const newGrams = Math.max(0, current.actualGrams + delta);
      next[index] = { ...current, actualGrams: newGrams };
      return next;
    });
  }, []);

  // Handle push to POS — completes the session (server computes the real
  // charge from actual pricing rules) then pushes that exact amount onto
  // the salon's own connected POS (Square or Clover) as a real order.
  // Previously this only called completeSession and showed a fake "Order
  // created" alert — no POS order was ever actually created.
  const handlePushToPos = useCallback(async () => {
    if (!session.id || !formula) return;

    try {
      const completed = await completeSession(session.id, steps, token);
      setSessionCost(completed.totalCost);

      const order = await pushOrderToPos(session.id, token);

      const warnings = [...(completed.pricingWarnings || []), ...(order.pricingWarnings || [])];
      const posName = order.provider === 'clover' ? 'Clover' : 'Square Register';
      Alert.alert(
        `Pushed to ${posName}`,
        `${formatCost(order.totalCost)} added to ${posName}.${warnings.length ? '\n\n' + warnings.join('\n') : ''} Complete payment there.`
      );
    } catch (err) {
      console.error('Push to POS error:', err);
      const message = err instanceof Error ? err.message : 'Failed to push order. Try again.';
      if (message.includes('NOT_CONNECTED') || message.toLowerCase().includes("hasn")) {
        Alert.alert('No POS connected', 'Connect Square, Clover, or another supported system for this salon in Settings first.');
      } else {
        Alert.alert('Error', message);
      }
    }
  }, [session.id, formula, steps, token]);

  // Handle save to history
  const handleSaveToHistory = useCallback(async () => {
    if (!session.id || !formula) return;

    try {
      const completed = await completeSession(session.id, steps, token);
      setSessionCost(completed.totalCost);
      const warning = completed.pricingWarnings?.length ? '\n\n' + completed.pricingWarnings.join('\n') : '';
      Alert.alert('Saved', `Formula saved to client history.${warning}`);
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save formula.');
    }
  }, [session.id, formula, steps, token]);

  // Handle new session
  const handleNewSession = useCallback(() => {
    setSession({ id: '', status: 'idle' });
    setSelectedClient(null);
    setFormula(null);
    setSteps([]);
    setCurrentStep(0);
    setSessionCost(0);
    setShowSearch(true);
    setSearchQuery('');
  }, []);

  // Connect scale — failures surface via the scaleError effect below
  // (the hook sets scaleError before throwing on every failure path).
  const handleConnectScale = useCallback(() => {
    if (scaleStatus === 'connected') return;
    connectScale().catch(() => {});
  }, [scaleStatus, connectScale]);

  // Surface scale errors (failed connect, lost Bluetooth, denied
  // permissions, etc.) — the status badge alone only shows "ERROR" with
  // no explanation of what went wrong or what to do about it.
  const lastScaleErrorRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (scaleError && scaleError !== lastScaleErrorRef.current) {
      lastScaleErrorRef.current = scaleError;
      Alert.alert('Scale error', scaleError);
    }
    if (!scaleError) lastScaleErrorRef.current = undefined;
  }, [scaleError]);

  // ─── Phone Pairing ────────────────────────────────────────────────────────

  const stopPairingPoll = useCallback(() => {
    if (pairingPollRef.current) {
      clearInterval(pairingPollRef.current);
      pairingPollRef.current = null;
    }
  }, []);

  const handleLinkedSession = useCallback(async (sessionId: string) => {
    try {
      const remote = await fetchRemoteSession(sessionId, token);
      const remoteClient: Client = remote.client
        ? { id: remote.client.id, name: remote.client.name, phone: remote.client.phone }
        : { id: '', name: 'Client' };

      const remoteFormula: Formula = {
        ...BLANK_FORMULA_TEMPLATE,
        id: remote.formulaId || `remote-${sessionId}`,
        clientName: remoteClient.name,
        steps: remote.steps.length > 0 ? remote.steps : BLANK_FORMULA_TEMPLATE.steps,
      };

      setSelectedClient(remoteClient);
      setFormula(remoteFormula);
      setSteps(remoteFormula.steps.map((s) => ({ ...s })));
      setCurrentStep(0);
      setSession({
        id: sessionId,
        client: remoteClient,
        formula: remoteFormula,
        status: 'active',
        startedAt: new Date().toISOString(),
      });
      setShowSearch(false);
      setShowPairing(false);
      setPairingStatus('idle');
    } catch (err) {
      Alert.alert('Couldn’t load formula', err instanceof Error ? err.message : 'Check your connection and try again.');
    }
  }, [token]);

  const handleOpenPairing = useCallback(async () => {
    setShowPairing(true);
    setPairingLoading(true);
    setPairingStatus('idle');
    stopPairingPoll();
    try {
      const { code } = await startPairing(token);
      setPairingCode(code);
      setPairingStatus('waiting');

      pairingPollRef.current = setInterval(async () => {
        try {
          const result = await getPairingStatus(code, token);
          setPairingStatus(result.status);
          if (result.status === 'linked' && result.sessionId) {
            stopPairingPoll();
            await handleLinkedSession(result.sessionId);
          } else if (result.status === 'expired') {
            stopPairingPoll();
          }
        } catch {
          // Transient network errors during polling — keep trying until expiry.
        }
      }, 2500);
    } catch (err) {
      Alert.alert('Couldn’t generate code', err instanceof Error ? err.message : 'Try again.');
      setShowPairing(false);
    } finally {
      setPairingLoading(false);
    }
  }, [token, stopPairingPoll, handleLinkedSession]);

  const handleClosePairing = useCallback(() => {
    stopPairingPoll();
    setShowPairing(false);
    setPairingCode('');
    setPairingStatus('idle');
  }, [stopPairingPoll]);

  useEffect(() => stopPairingPoll, [stopPairingPoll]);

  // ─── Render: Search Mode ────────────────────────────────────────────────

  if (showSearch) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard'))}
              style={styles.backBtn}
            >
              <ArrowLeft size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Beaker size={28} color={COLORS.purple} />
            <Text style={styles.headerTitle}>Color Bar</Text>
          </View>
          <ScaleStatusBadge status={scaleStatus} weight={scaleWeight} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Client List */}
        <FlatList
          data={filteredClients}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ClientCard client={item} onSelect={handleSelectClient} />}
          contentContainerStyle={styles.clientList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <User size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No clients found</Text>
            </View>
          }
        />

        {/* Bottom action buttons */}
        <View style={styles.searchBottomActions}>
          {scaleStatus !== 'connected' && (
            <TouchableOpacity style={styles.connectBtnInline} onPress={handleConnectScale}>
              <Bluetooth size={20} color={COLORS.purple} />
              <Text style={styles.connectBtnText}>Connect Acaia Scale</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.connectBtnInline} onPress={handleOpenPairing}>
            <Smartphone size={20} color={COLORS.purple} />
            <Text style={styles.connectBtnText}>Link a Phone</Text>
          </TouchableOpacity>
        </View>

        {/* Pairing Modal */}
        {showPairing && (
          <View style={styles.pairingOverlay}>
            <View style={styles.pairingCard}>
              <Text style={styles.pairingTitle}>Link a Phone</Text>
              {pairingLoading ? (
                <ActivityIndicator color={COLORS.purple} style={{ marginVertical: 24 }} />
              ) : pairingStatus === 'expired' ? (
                <>
                  <Text style={styles.pairingSubtitle}>That code expired.</Text>
                  <TouchableOpacity style={styles.pairingRetryBtn} onPress={handleOpenPairing}>
                    <Text style={styles.pairingRetryText}>Generate New Code</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.pairingCode}>{pairingCode}</Text>
                  <Text style={styles.pairingSubtitle}>
                    {pairingStatus === 'claimed'
                      ? 'Phone linked — generating formula...'
                      : 'Enter this code on your phone in the COLORiq app'}
                  </Text>
                  <ActivityIndicator color={COLORS.purple} style={{ marginTop: 16 }} />
                </>
              )}
              <TouchableOpacity style={styles.pairingCancelBtn} onPress={handleClosePairing}>
                <Text style={styles.pairingCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ─── Render: Loading ─────────────────────────────────────────────────────

  if (isLoadingFormula) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Loading formula for {selectedClient?.name}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render: Active Session ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleNewSession} style={styles.backBtn}>
            <X size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{selectedClient?.name}</Text>
            <Text style={styles.headerSubtitle}>
              Formula from {formula?.createdAt} • {formula?.processingTime}min processing
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <ScaleStatusBadge status={scaleStatus} weight={scaleWeight} />
        </View>
      </View>

      {/* Notes Banner */}
      {formula?.notes && (
        <View style={styles.notesBanner}>
          <AlertTriangle size={16} color={COLORS.yellow} />
          <Text style={styles.notesText}>{formula.notes}</Text>
        </View>
      )}

      {/* Steps */}
      <ScrollView style={styles.stepsContainer} contentContainerStyle={styles.stepsContent}>
        {steps.map((step, index) => (
          <StepCard
            key={`${step.shadeCode}-${index}`}
            step={step}
            index={index}
            isActive={index === currentStep && !step.completed}
            scaleWeight={index === currentStep ? scaleWeight : 0}
            weightStable={index === currentStep ? weightStable : false}
            scaleConnected={scaleStatus === 'connected'}
            isCapturing={index === currentStep && capturing}
            onStartCapture={handleStartCapture}
            onCancelCapture={handleCancelCapture}
            onComplete={handleCompleteStep}
            onAdjust={handleAdjustWeight}
          />
        ))}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.costDisplay}>
          <DollarSign size={20} color={COLORS.green} />
          <Text style={styles.costValue}>{formatCost(sessionCost)}</Text>
          <Text style={styles.costLabel}>estimated cost</Text>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveToHistory}>
            <Save size={18} color={COLORS.textPrimary} />
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pushBtn, { opacity: session.status === 'completed' ? 1 : 0.5 }]}
            onPress={handlePushToPos}
            disabled={session.status !== 'completed'}
          >
            <Send size={18} color="#fff" />
            <Text style={styles.pushBtnText}>Push to POS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    padding: 8,
  },

  // Scale Badge
  scaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: COLORS.card,
  },
  scaleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.textPrimary,
  },

  // Client List
  clientList: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 14,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clientMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },

  // Bottom action buttons (scale connect + phone link)
  searchBottomActions: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    gap: 10,
  },
  connectBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: COLORS.purpleLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple,
  },

  // Phone Pairing Modal
  pairingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pairingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 28,
    alignItems: 'center',
  },
  pairingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  pairingCode: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 8,
    color: COLORS.purple,
    marginBottom: 12,
  },
  pairingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pairingRetryBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.purpleLight,
    borderRadius: 10,
  },
  pairingRetryText: {
    color: COLORS.purple,
    fontWeight: '600',
  },
  pairingCancelBtn: {
    marginTop: 20,
  },
  pairingCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Notes Banner
  notesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.yellowLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.yellow + '30',
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.yellow,
    lineHeight: 20,
  },

  // Steps
  stepsContainer: {
    flex: 1,
  },
  stepsContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  stepCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  stepInfo: {
    flex: 1,
  },
  stepBrand: {
    fontSize: 13,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepProduct: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  shadeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shadeCode: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Weight Display
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weightTarget: {
    alignItems: 'center',
  },
  weightActual: {
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Progress Bar
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Actions
  stepActions: {
    marginTop: 8,
  },
  manualWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  manualWeightInput: {
    flex: 1,
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.green,
    borderRadius: 24,
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Completed
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  completedText: {
    fontSize: 14,
    color: COLORS.green,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  costDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  costValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.green,
  },
  costLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.border,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.purple,
    borderRadius: 10,
  },
  pushBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Capture workflow
  startWeighBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: COLORS.purple,
    borderRadius: 14,
    marginBottom: 12,
  },
  startWeighBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  captureHint: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cancelCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  cancelCaptureBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
