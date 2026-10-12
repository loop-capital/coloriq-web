'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Check, BluetoothConnected, RotateCcw } from 'lucide-react';
import { useScale } from '@/lib/scale/use-scale';
import { deductFormulaFromInventory } from '../components/custom/inventory-dashboard';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BowlIngredient {
  id: string;
  name: string;
  brand: string;
  shadeCode: string;
  targetGrams: number;
  color: string;
  order: number;
}

interface BowlState {
  ingredients: BowlIngredient[];
  currentIndex: number;
  weights: Record<string, number>;
}

interface ScaleBowlProps {
  ingredients: BowlIngredient[];
  salonId?: string;
  /** For formula memory (see lib/formula-memory.ts) — without it, target-vs-actual can't be tied to a returning client. */
  clientId?: string | null;
  onComplete?: (weights: Record<string, number>) => void;
  onReweigh?: () => void;
  showUnitToggle?: boolean;
  className?: string;
}

// ─── ROUND Bowl Geometry ───────────────────────────────────────────────────
// Round salon mixing bowl viewed from slightly above (true circular cross-section)
// ViewBox: 260 x 240

const BOWL_VIEW_W = 260;
const BOWL_VIEW_H = 240;
const CX = BOWL_VIEW_W / 2;  // 130 center X
const CY = 125;               // center Y
const BOWL_R = 105;           // outer radius (true circle → ~210px wide)

// Rim — circular ellipse viewed from above (slight perspective squish)
const RIM_RX = BOWL_R;          // 105 (horizontal radius)
const RIM_RY = 65;             // 65 (vertical radius — ~1.6:1 for above-view)
const RIM_CY = 75;             // rim center Y (below top of ellipse)

// Bowl body/depth
const BOWL_DEPTH = 108;
const BOWL_BOTTOM_Y = RIM_CY + BOWL_DEPTH; // 183

// Inner rim (slightly inset)
const INNER_RIM_RX = RIM_RX - 6;   // 99
const INNER_RIM_RY = RIM_RY - 4;   // 61
const INNER_RIM_CY = RIM_CY + 3;   // 78

// ─── Bowl Paths ───────────────────────────────────────────────────────────────

// Outer bowl silhouette: circular rim opening → hemispherical bottom
const BOWL_OUTER = `
  M ${CX - RIM_RX} ${RIM_CY}
  C ${CX - RIM_RX} ${RIM_CY - RIM_RY * 1.5}, ${CX + RIM_RX} ${RIM_CY - RIM_RY * 1.5}, ${CX + RIM_RX} ${RIM_CY}
  C ${CX + RIM_RX} ${RIM_CY + BOWL_DEPTH * 0.5}, ${CX + BOWL_R * 0.85} ${BOWL_BOTTOM_Y - 10}, ${CX + BOWL_R * 0.7} ${BOWL_BOTTOM_Y}
  C ${CX + BOWL_R * 0.3} ${BOWL_BOTTOM_Y + 14}, ${CX - BOWL_R * 0.3} ${BOWL_BOTTOM_Y + 14}, ${CX - BOWL_R * 0.7} ${BOWL_BOTTOM_Y}
  C ${CX - BOWL_R * 0.85} ${BOWL_BOTTOM_Y - 10}, ${CX - RIM_RX} ${RIM_CY + BOWL_DEPTH * 0.5}, ${CX - RIM_RX} ${RIM_CY}
  Z
`;

// Inner liquid container: same shape, slightly inset
const BOWL_INTERIOR = `
  M ${CX - INNER_RIM_RX} ${INNER_RIM_CY}
  C ${CX - INNER_RIM_RX} ${INNER_RIM_CY - INNER_RIM_RY * 1.5}, ${CX + INNER_RIM_RX} ${INNER_RIM_CY - INNER_RIM_RY * 1.5}, ${CX + INNER_RIM_RX} ${INNER_RIM_CY}
  C ${CX + INNER_RIM_RX} ${INNER_RIM_CY + BOWL_DEPTH * 0.5}, ${CX + (INNER_RIM_RX) * 0.85} ${BOWL_BOTTOM_Y - 10}, ${CX + (INNER_RIM_RX) * 0.7} ${BOWL_BOTTOM_Y}
  C ${CX + (INNER_RIM_RX) * 0.3} ${BOWL_BOTTOM_Y + 14}, ${CX - (INNER_RIM_RX) * 0.3} ${BOWL_BOTTOM_Y + 14}, ${CX - (INNER_RIM_RX) * 0.7} ${BOWL_BOTTOM_Y}
  C ${CX - (INNER_RIM_RX) * 0.85} ${BOWL_BOTTOM_Y - 10}, ${CX - INNER_RIM_RX} ${INNER_RIM_CY + BOWL_DEPTH * 0.5}, ${CX - INNER_RIM_RX} ${INNER_RIM_CY}
  Z
`;

// Rim ellipse (top ring outline)
const BOWL_RIM = `
  M ${CX - RIM_RX} ${RIM_CY}
  C ${CX - RIM_RX} ${RIM_CY - RIM_RY}, ${CX + RIM_RX} ${RIM_CY - RIM_RY}, ${CX + RIM_RX} ${RIM_CY}
  C ${CX + RIM_RX} ${RIM_CY + RIM_RY}, ${CX - RIM_RX} ${RIM_CY + RIM_RY}, ${CX - RIM_RX} ${RIM_CY}
`;

// Inner rim (liquid surface edge line)
const BOWL_INNER_RIM = `
  M ${CX - INNER_RIM_RX} ${INNER_RIM_CY}
  C ${CX - INNER_RIM_RX} ${INNER_RIM_CY - INNER_RIM_RY}, ${CX + INNER_RIM_RX} ${INNER_RIM_CY - INNER_RIM_RY}, ${CX + INNER_RIM_RX} ${INNER_RIM_CY}
  C ${CX + INNER_RIM_RX} ${INNER_RIM_CY + INNER_RIM_RY}, ${CX - INNER_RIM_RX} ${INNER_RIM_CY + INNER_RIM_RY}, ${CX - INNER_RIM_RX} ${INNER_RIM_CY}
`;

// Shadow under bowl
const BOWL_SHADOW = `
  M ${CX - 72} ${BOWL_BOTTOM_Y + 12}
  C ${CX - 72} ${BOWL_BOTTOM_Y + 24}, ${CX + 72} ${BOWL_BOTTOM_Y + 24}, ${CX + 72} ${BOWL_BOTTOM_Y + 12}
  C ${CX + 72} ${BOWL_BOTTOM_Y + 4}, ${CX - 72} ${BOWL_BOTTOM_Y + 4}, ${CX - 72} ${BOWL_BOTTOM_Y + 12}
  Z
`;

// Liquid fill bottom Y
const LIQUID_BOTTOM_Y = BOWL_BOTTOM_Y - 4;

// ─── Component ───────────────────────────────────────────────────────────────

// ─── Live Weigh Guidance ─────────────────────────────────────────────────────
// Shows "Add {shade} until {target}" with a live progress bar driven by the
// scale's real-time weight. Turns green when within ±1g tolerance so the
// stylist knows exactly when to stop pouring and hit capture.
function LiveWeighGuidance({
  ingredient,
  liveGrams,
  convertWeight,
  unitLabel,
}: {
  ingredient: BowlIngredient;
  liveGrams: number;
  convertWeight: (g: number) => string;
  unitLabel: string;
}) {
  const target = ingredient.targetGrams || 0;
  const TOLERANCE = 1; // grams
  const diff = liveGrams - target;
  const inTolerance = Math.abs(diff) <= TOLERANCE;
  const progress = target > 0 ? Math.min(1, Math.max(0, liveGrams / target)) : 0;
  const remaining = Math.max(0, target - liveGrams);

  return (
    <div
      className="w-full mb-3 p-3 rounded-2xl"
      style={{
        background: inTolerance ? 'rgba(16,185,129,0.08)' : 'rgba(147,51,234,0.06)',
        border: inTolerance ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(147,51,234,0.2)',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold" style={{ color: inTolerance ? '#10B981' : '#A855F7' }}>
          {inTolerance ? (
            <>✓ On target — capture now</>
          ) : (
            <>Add {ingredient.shadeCode} until {convertWeight(target)}{unitLabel}</>
          )}
        </p>
        <p className="text-xs font-mono font-bold" style={{ color: inTolerance ? '#10B981' : 'var(--cg-text-primary)' }}>
          {convertWeight(Math.round(liveGrams * 10) / 10)}{unitLabel}
          <span className="font-normal" style={{ color: '#71717A' }}>
            {' / '}{convertWeight(target)}{unitLabel}
          </span>
        </p>
      </div>
      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: inTolerance
              ? 'linear-gradient(90deg, #10B981, #34D399)'
              : diff > 0
                ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                : 'linear-gradient(90deg, #9333EA, #EC4899)',
            transition: 'width 0.15s ease-out, background 0.2s',
          }}
        />
      </div>
      {!inTolerance && (
        <p className="text-[11px] mt-1.5" style={{ color: diff > 0 ? '#F59E0B' : '#71717A' }}>
          {diff > 0
            ? `${convertWeight(Math.round(diff * 10) / 10)}${unitLabel} over — remove a little`
            : `${convertWeight(Math.round(remaining * 10) / 10)}${unitLabel} to go`}
        </p>
      )}
    </div>
  );
}

export function ScaleBowl({
  ingredients,
  salonId,
  clientId,
  onComplete,
  onReweigh,
  showUnitToggle = true,
  className = '',
}: ScaleBowlProps) {
  const { connected, weight, device, connect, disconnect, tare, connecting, isSupported, error } =
    useScale();

  const [bowl, setBowl] = useState<BowlState>({
    ingredients: ingredients.sort((a, b) => a.order - b.order),
    currentIndex: 0,
    weights: {},
  });
  const [unit, setUnit] = useState<'g' | 'oz'>('g');
  const [showMenu, setShowMenu] = useState(false);
  const [pouringIngredient, setPouringIngredient] = useState<string | null>(null);

  const currentIngredient = bowl.ingredients[bowl.currentIndex];
  const totalTarget = ingredients.reduce((sum, i) => sum + i.targetGrams, 0);
  const totalCurrent = Object.values(bowl.weights).reduce((sum, w) => sum + w, 0);
  const fillPercent = totalTarget > 0 ? Math.min(totalCurrent / totalTarget, 1) : 0;
  const isComplete = bowl.currentIndex >= bowl.ingredients.length && bowl.ingredients.length > 0;

  const convertWeight = (g: number) =>
    unit === 'oz' ? (g / 28.3495).toFixed(2) : g.toFixed(1);
  const unitLabel = unit === 'oz' ? 'oz' : 'g';

  // ─── Pour Animation ──────────────────────────────────────────────────────
  const triggerPourAnimation = useCallback((ingredientId: string) => {
    setPouringIngredient(ingredientId);
    setTimeout(() => setPouringIngredient(null), 1800);
  }, []);

  // ─── Inventory Deduction ───────────────────────────────────────────────────
  const handleInventoryDeduction = useCallback(
    async (weights: Record<string, number>) => {
      if (!salonId) return;
      const steps = bowl.ingredients
        .filter((ing) => weights[ing.id] && weights[ing.id] > 0)
        .map((ing) => ({
          product: { shadeCode: ing.shadeCode, brand: ing.brand },
          grams: weights[ing.id],
        }));
      if (steps.length > 0) {
        try {
          await deductFormulaFromInventory(steps, salonId);
        } catch (e) {
          console.error('Inventory deduction failed:', e);
        }
      }
      // Formula memory (Vish's reweigh-and-learn behavior) — log real
      // target-vs-actual per ingredient so a future visit can suggest a
      // smaller mix instead of the same fixed target every time. Replaces
      // an earlier, never-working call to a "bowl remainder" endpoint that
      // modeled leftover mixed color as reusable stock, which doesn't
      // match how color chemistry actually works (it oxidizes once mixed)
      // or what Vish itself does with a reweigh.
      if (clientId) {
        const outcomes = bowl.ingredients
          .filter((ing) => ing.targetGrams > 0 && weights[ing.id] > 0)
          .map((ing) => ({
            brand: ing.brand,
            shadeCode: ing.shadeCode,
            targetGrams: ing.targetGrams,
            actualGrams: weights[ing.id],
          }));
        if (outcomes.length > 0) {
          try {
            await fetch('/api/v1/formula-outcomes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId, ingredients: outcomes }),
            });
          } catch (e) {
            console.error('Formula outcome logging failed:', e);
          }
        }
      }
    },
    [salonId, clientId, bowl.ingredients]
  );

  // ─── Capture Weight ──────────────────────────────────────────────────────
  const captureWeight = useCallback(() => {
    if (!currentIngredient || !weight) return;
    const grams = Math.round(weight.value * 10) / 10;
    triggerPourAnimation(currentIngredient.id);
    setBowl((prev) => {
      const newWeights = { ...prev.weights, [currentIngredient.id]: grams };
      const nextIndex = prev.currentIndex + 1;
      const done = nextIndex >= prev.ingredients.length;
      if (done && onComplete) {
        setTimeout(() => {
          onComplete(newWeights);
          handleInventoryDeduction(newWeights);
        }, 600);
      }
      return { ...prev, weights: newWeights, currentIndex: done ? prev.currentIndex : nextIndex };
    });
    tare();
  }, [currentIngredient, weight, tare, onComplete, triggerPourAnimation, handleInventoryDeduction]);

  // ─── Reweigh ───────────────────────────────────────────────────────────────
  const reweigh = useCallback(() => {
    if (!currentIngredient) return;
    setBowl((prev) => {
      const newWeights = { ...prev.weights };
      delete newWeights[currentIngredient.id];
      return {
        ...prev,
        weights: newWeights,
        currentIndex: bowl.ingredients.findIndex((i) => i.id === currentIngredient.id),
      };
    });
    tare();
  }, [currentIngredient, bowl.ingredients, tare]);

  const currentTarget = currentIngredient?.targetGrams || 0;
  const currentWeighed = currentIngredient ? bowl.weights[currentIngredient.id] || 0 : 0;
  const currentRemaining = Math.max(0, currentTarget - currentWeighed);

  // ─── Round Bowl Layer Geometry ───────────────────────────────────────────
  // Round bowl interior: fills from INNER_RIM_CY (86) down to LIQUID_BOTTOM_Y (180)
  const BOWL_TOP = INNER_RIM_CY;           // 78  (inner rim — liquid surface level)
  const BOWL_BOTTOM = LIQUID_BOTTOM_Y;   // 179
  const BOWL_FILL_H = BOWL_BOTTOM - BOWL_TOP; // 101
  const BOWL_CENTER_X = CX;             // 130

  // Build layer stack from bottom of liquid area
  const getLayers = () => {
    const layers: Array<{
      ing: BowlIngredient;
      y: number;
      height: number;
      actual: number;
    }> = [];

    let cursorY = BOWL_BOTTOM;
    for (const ing of bowl.ingredients) {
      const actual = bowl.weights[ing.id] || 0;
      if (actual <= 0) continue;
      const layerH = (actual / totalTarget) * BOWL_FILL_H;
      const layerY = cursorY - layerH;
      layers.push({ ing, y: layerY, height: layerH, actual });
      cursorY = layerY;
    }
    return layers;
  };

  const layers = getLayers();

  // Meniscus (curved liquid surface) at fill top
  const getSurfacePath = (topY: number, fillPct: number) => {
    const halfW = INNER_RIM_RX * 0.92; // slightly narrower than rim
    const leftX = BOWL_CENTER_X - halfW;
    const rightX = BOWL_CENTER_X + halfW;
    const curve = -5 * Math.sin(fillPercent * Math.PI); // meniscus dips in center
    return `M ${leftX} ${topY} Q ${BOWL_CENTER_X} ${topY + curve} ${rightX} ${topY}`;
  };

  const fillTopY = layers.length > 0 ? layers[layers.length - 1].y : BOWL_BOTTOM;

  // Width at a given Y — bowl narrows toward bottom in true circular cross-section
  // Top (BOWL_TOP=78): ~198px  Bottom (BOWL_BOTTOM=179): ~143px
  const widthAtY = (y: number) => {
    const t = Math.max(0, Math.min(1, (y - BOWL_TOP) / (BOWL_BOTTOM - BOWL_TOP)));
    return INNER_RIM_RX * 2 * (1 - 0.28 * t);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Title */}
      {!isComplete && (
        <p className="text-[11px] font-semibold tracking-wider mb-1" style={{ color: '#71717A' }}>
          New Formula
        </p>
      )}

      {/* Weight header — Vish style: black rounded rect */}
      <div
        className="rounded-xl px-5 py-2 mb-3 text-center"
        style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="text-3xl font-bold font-mono tracking-tight"
          style={{ color: '#F5F5F7' }}
        >
          {convertWeight(totalCurrent)}
        </span>
        <span className="text-lg ml-1" style={{ color: '#71717A' }}>
          / {convertWeight(totalTarget)}
          {unitLabel}
        </span>
      </div>

      {/* Unit toggle */}
      {showUnitToggle && (
        <button
          type="button"
          onClick={() => setUnit((u) => (u === 'g' ? 'oz' : 'g'))}
          className="text-[10px] mb-3 px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#71717A' }}
        >
          {unit === 'g' ? 'Switch to oz' : 'Switch to g'}
        </button>
      )}

      {/* ─── U-Shaped Bowl SVG ─────────────────────────────────────────────── */}
      <div className="relative mb-3" style={{ width: BOWL_VIEW_W, height: BOWL_VIEW_H + 10 }}>
        <svg
          width={BOWL_VIEW_W}
          height={BOWL_VIEW_H + 10}
          viewBox={`0 0 ${BOWL_VIEW_W} ${BOWL_VIEW_H + 10}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <clipPath id="bowlInteriorClip">
              <path d={BOWL_INTERIOR} />
            </clipPath>

            {/* Liquid layer gradient — darker at bottom, lighter at top */}
            <linearGradient id="layerBase" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="inherit" stopOpacity="0.8" />
              <stop offset="100%" stopColor="inherit" stopOpacity="0.5" />
            </linearGradient>

            {/* Bowl shadow */}
            <filter id="bowlShadow" x="-20%" y="-10%" width="140%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>


          {/* Bowl body shadow */}
          <path d={BOWL_OUTER} fill="rgba(0,0,0,0.3)" filter="url(#bowlShadow)" />

          {/* Bowl body (glass) */}
          <path
            d={BOWL_OUTER}
            fill="rgba(24,24,27,0.95)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />

          {/* Bowl interior fill area */}
          <path
            d={BOWL_INTERIOR}
            fill="rgba(0,0,0,0.6)"
            stroke="none"
          />

          {/* ─── Layer fills (clipped to interior) ───────────────────────── */}
          <g clipPath="url(#bowlInteriorClip)">
            {layers.map((layer, idx) => {
              const isCurrent = layer.ing.id === currentIngredient?.id;
              return (
                <g key={layer.ing.id}>
                  {/* Layer fill rect */}
                  <motion.rect
                    x={14}
                    y={layer.y}
                    width={BOWL_VIEW_W - 28}
                    height={layer.height + 2}
                    fill={layer.ing.color}
                    opacity={isCurrent ? 0.9 : 0.65}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isCurrent ? 0.9 : 0.65 }}
                    transition={{ duration: 0.4 }}
                  />

                  {/* Layer separator line */}
                  <line
                    x1={16}
                    y1={layer.y}
                    x2={BOWL_VIEW_W - 16}
                    y2={layer.y}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.8"
                  />

                  {/* Layer label: shadeCode actual/targetg */}
                  {layer.height > 18 && (
                    <text
                      x={BOWL_CENTER_X}
                      y={layer.y + layer.height / 2 + 4}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="system-ui, sans-serif"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                    >
                      {layer.ing.shadeCode}{' '}
                      {convertWeight(layer.actual)}/{convertWeight(layer.ing.targetGrams)}
                      {unitLabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Surface wave (when filling) */}
            {fillPercent > 0.03 && (
              <motion.path
                d={getSurfacePath(fillTopY, fillPercent)}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.2"
                strokeLinecap="round"
                animate={{ d: getSurfacePath(fillTopY, fillPercent) }}
                transition={{ duration: 0.3 }}
              />
            )}
          </g>

          {/* Rim line (top flat edge) */}
          <path
            d={BOWL_RIM}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Rim highlight arc */}
          <path
            d={`M 14 36 Q ${BOWL_CENTER_X} 34 ${BOWL_VIEW_W - 14} 36`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        </svg>

        {/* ─── Pour Animation ────────────────────────────────────────────── */}
        <AnimatePresence>
          {pouringIngredient && currentIngredient && (
            <motion.div
              className="absolute pointer-events-none"
              style={{ left: BOWL_CENTER_X - 3, top: -10, width: 6 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Stream */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  width: 5,
                  background: `linear-gradient(to bottom, ${currentIngredient.color}cc, ${currentIngredient.color}44)`,
                }}
                initial={{ height: 0 }}
                animate={{ height: 55 }}
                transition={{ duration: 0.5, ease: 'easeIn' }}
              />
              {/* Droplets */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: '50%',
                    width: 4 + i * 2,
                    height: 4 + i * 2,
                    marginLeft: -(2 + i),
                    background: currentIngredient.color,
                  }}
                  initial={{ top: 0, opacity: 1 }}
                  animate={{
                    top: 40 + i * 18,
                    opacity: [1, 1, 0],
                    scale: [1, 1.1, 0.5],
                  }}
                  transition={{ duration: 0.45, delay: 0.35 + i * 0.1 }}
                />
              ))}
              {/* Splash */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  left: '50%',
                  bottom: -8,
                  width: 18,
                  height: 8,
                  marginLeft: -9,
                  background: `radial-gradient(ellipse, ${currentIngredient.color}55, transparent)`,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.4, 0], opacity: [1, 0.5, 0] }}
                transition={{ duration: 0.45, delay: 0.7 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Live weigh guidance: "add until target" ──────────────────────── */}
      {!isComplete && currentIngredient && connected && weight && weight.value > 0 && (
        <LiveWeighGuidance
          ingredient={currentIngredient}
          liveGrams={weight.value}
          convertWeight={convertWeight}
          unitLabel={unitLabel}
        />
      )}

      {/* ─── Ingredient cards (matching Vish below-bowl style) ─────────────── */}
      {!isComplete && (
        <div className="w-full mb-3">
          {bowl.ingredients.map((ing) => {
            const weighed = bowl.weights[ing.id] || 0;
            const isActive = ing.id === currentIngredient?.id;
            const done = weighed > 0;

            return (
              <div
                key={ing.id}
                className="flex items-center gap-2 py-2 px-3 rounded-xl mb-1.5 transition-all"
                style={{
                  background: isActive
                    ? 'rgba(147,51,234,0.08)'
                    : done
                      ? 'rgba(255,255,255,0.02)'
                      : 'transparent',
                  border: isActive
                    ? '1px solid rgba(147,51,234,0.2)'
                    : done
                      ? '1px solid rgba(255,255,255,0.04)'
                      : '1px solid transparent',
                }}
              >
                {/* Color dot */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    background: ing.color,
                    opacity: done ? 1 : 0.4,
                    boxShadow: isActive ? `0 0 8px ${ing.color}66` : 'none',
                  }}
                />

                {/* Shade + brand */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: done ? '#F5F5F7' : '#71717A' }}
                  >
                    {ing.shadeCode}
                  </span>
                  <span className="text-[10px] ml-1" style={{ color: '#52525B' }}>
                    {ing.brand}
                  </span>
                </div>

                {/* Weight */}
                <span
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: isActive ? '#A855F7' : done ? '#F5F5F7' : '#52525B' }}
                >
                  {done ? convertWeight(weighed) : '—'} / {convertWeight(ing.targetGrams)}
                  {unitLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full rounded-2xl p-4 mb-3 text-center"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}
        >
          <Check className="w-7 h-7 mx-auto mb-1.5 text-[#10B981]" />
          <p className="text-sm font-semibold text-[#10B981]">Formula complete</p>
          <p className="text-xs mt-0.5" style={{ color: '#71717A' }}>
            {convertWeight(totalCurrent)}
            {unitLabel} / {convertWeight(totalTarget)}
            {unitLabel}
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div
          className="w-full mb-3 p-3 rounded-xl text-xs"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#EF4444',
          }}
        >
          {error}
        </div>
      )}

      {/* Action bar */}
      <div className="w-full flex gap-2">
        {!connected ? (
          <button
            type="button"
            onClick={connect}
            disabled={connecting || !isSupported}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #9333EA, #EC4899)',
              color: '#FFF',
            }}
          >
            <Scale className="w-4 h-4" />
            {connecting ? 'Scanning...' : 'Connect Scale'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={tare}
              className="py-3 px-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tare
            </button>

            {!isComplete && (
              <button
                type="button"
                onClick={captureWeight}
                disabled={!weight || weight.value <= 0}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background:
                    !weight || weight.value <= 0
                      ? 'rgba(255,255,255,0.04)'
                      : 'linear-gradient(135deg, #9333EA, #EC4899)',
                  color: !weight || weight.value <= 0 ? '#52525B' : '#FFF',
                }}
              >
                <Check className="w-4 h-4" />
                {weight?.value
                  ? `Capture ${convertWeight(weight.value)}${unitLabel}`
                  : 'Waiting for weight...'}
              </button>
            )}

            {isComplete && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onComplete?.(bowl.weights);
                    handleInventoryDeduction(bowl.weights);
                  }}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #DB2777)',
                    color: '#FFF',
                  }}
                >
                  <Check className="w-4 h-4" />
                  Done
                </button>
                {onReweigh && (
                  <button
                    type="button"
                    onClick={onReweigh}
                    className="py-3 px-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
                  >
                    <Scale className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Scale indicator */}
      {connected && (
        <div className="flex items-center gap-1.5 mt-3">
          <BluetoothConnected className="w-3 h-3 text-[#10B981]" />
          <span className="text-[10px]" style={{ color: '#10B981' }}>
            {device?.model || 'Scale'} connected
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Mini indicator (round bowl, for formula cards) ────────────────────────────

interface DropIndicatorProps {
  ingredients: { name: string; shadeCode: string; color: string; targetGrams: number }[];
  totalCurrent: number;
  totalTarget: number;
  size?: 'sm' | 'md';
}

export function DropIndicator({
  ingredients,
  totalCurrent,
  totalTarget,
  size = 'sm',
}: DropIndicatorProps) {
  const dims = size === 'sm' ? { w: 40, h: 56 } : { w: 54, h: 76 };

  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: dims.w, height: dims.h }}>
        <svg
          width={dims.w}
          height={dims.h}
          viewBox="0 0 220 250"
          className="absolute inset-0"
        >
          {/* Mini U-bowl */}
          <path
            d="M 10 30 L 210 30 C 215 30 220 35 220 45 L 218 200 C 218 215 205 225 170 225 L 50 225 C 15 225 2 215 2 200 L 0 45 C 0 35 5 30 10 30 Z"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          {/* Layers */}
          {ingredients.map((ing, i) => {
            if (ing.targetGrams <= 0) return null;
            const layerH = (ing.targetGrams / Math.max(totalTarget, 1)) * 184;
            const prevH = ingredients
              .slice(0, i)
              .reduce((s, p) => s + (p.targetGrams / Math.max(totalTarget, 1)) * 184, 0);
            return (
              <rect
                key={ing.name}
                x={14}
                y={220 - prevH - layerH}
                width={192}
                height={layerH}
                fill={ing.color}
                opacity={0.6}
              />
            );
          })}
          {/* Rim */}
          <line x1={10} y1={30} x2={210} y2={30} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        </svg>
      </div>
      <div>
        <span className="text-xs font-mono font-bold" style={{ color: '#F5F5F7' }}>
          {totalCurrent.toFixed(1)}g
        </span>
        <span className="text-xs ml-0.5" style={{ color: '#71717A' }}>
          / {totalTarget.toFixed(1)}g
        </span>
        <div className="flex gap-1 mt-1">
          {ingredients.map((ing) => (
            <div
              key={ing.name}
              className="rounded-full"
              style={{
                width: size === 'sm' ? 5 : 7,
                height: size === 'sm' ? 5 : 7,
                background: ing.color,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scale Weight Badge ─────────────────────────────────────────────────────

interface ScaleWeightBadgeProps {
  weight: number;
  target?: number;
  color?: string;
}

export function ScaleWeightBadge({ weight, target, color }: ScaleWeightBadgeProps) {
  const isClose = target !== undefined && Math.abs(weight - target) <= target * 0.05;
  const isOver = target !== undefined && weight > target;

  return (
    <div className="flex items-center gap-2">
      <div
        className="px-3 py-1.5 rounded-xl font-mono text-sm font-bold"
        style={{
          background: isOver
            ? 'rgba(239,68,68,0.1)'
            : isClose
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(255,255,255,0.05)',
          color: isOver ? '#EF4444' : isClose ? '#10B981' : '#F5F5F7',
          border: `1px solid ${isOver ? 'rgba(239,68,68,0.2)' : isClose ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        {weight.toFixed(1)}g
      </div>
      {target !== undefined && (
        <span className="text-xs" style={{ color: '#71717A' }}>
          / {target.toFixed(1)}g
        </span>
      )}
    </div>
  );
}