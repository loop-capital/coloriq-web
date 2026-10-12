/**
 * ColorIq AR Try-On Shade Library
 * 
 * Comprehensive shade database for virtual hair color rendering.
 * Each shade includes RGB, HSL, and rendering metadata for
 * accurate AR color application.
 */

export interface ShadeDefinition {
  id: string
  brand: string
  line: string
  code: string
  name: string
  level: number // 1-10 (1=black, 10=lightest blonde)
  tone: ToneFamily
  rgb: [number, number, number]
  hsl: [number, number, number]
  opacity: number // 0-1, how opaque the color overlay is
  intensity: number // 0-1, color saturation when rendered
  shimmer: boolean // whether shade has shimmer/reflective quality
  category: 'permanent' | 'demi' | 'semi' | 'toner' | 'lightener'
}

export type ToneFamily =
  | 'neutral' | 'ash' | 'golden' | 'copper' | 'red'
  | 'violet' | 'pearl' | 'beige' | 'mahogany' | 'chocolate'
  | 'warm' | 'cool' | 'blue' | 'green' | 'pink'
  | 'silver' | 'platinum'

/**
 * Davines View Color Line — Full shade map
 */
export const DAVINES_VIEW_SHADES: ShadeDefinition[] = [
  // Natural Series (N)
  { id: 'dv-v-n1', brand: 'Davines', line: 'View', code: '1N', name: 'Black', level: 1, tone: 'neutral', rgb: [30, 25, 20], hsl: [24, 20, 10], opacity: 0.95, intensity: 1.0, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n2', brand: 'Davines', line: 'View', code: '2N', name: 'Very Dark Brown', level: 2, tone: 'neutral', rgb: [55, 40, 30], hsl: [24, 29, 17], opacity: 0.92, intensity: 0.95, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n3', brand: 'Davines', line: 'View', code: '3N', name: 'Dark Brown', level: 3, tone: 'neutral', rgb: [75, 55, 40], hsl: [26, 30, 23], opacity: 0.90, intensity: 0.90, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n4', brand: 'Davines', line: 'View', code: '4N', name: 'Medium Brown', level: 4, tone: 'neutral', rgb: [100, 70, 50], hsl: [24, 33, 29], opacity: 0.88, intensity: 0.85, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n5', brand: 'Davines', line: 'View', code: '5N', name: 'Light Brown', level: 5, tone: 'neutral', rgb: [130, 95, 65], hsl: [28, 33, 38], opacity: 0.85, intensity: 0.80, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n6', brand: 'Davines', line: 'View', code: '6N', name: 'Dark Blonde', level: 6, tone: 'neutral', rgb: [160, 120, 80], hsl: [30, 33, 47], opacity: 0.82, intensity: 0.75, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n7', brand: 'Davines', line: 'View', code: '7N', name: 'Medium Blonde', level: 7, tone: 'neutral', rgb: [185, 150, 105], hsl: [34, 36, 57], opacity: 0.78, intensity: 0.70, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n8', brand: 'Davines', line: 'View', code: '8N', name: 'Light Blonde', level: 8, tone: 'neutral', rgb: [210, 175, 130], hsl: [34, 47, 67], opacity: 0.75, intensity: 0.65, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n9', brand: 'Davines', line: 'View', code: '9N', name: 'Very Light Blonde', level: 9, tone: 'neutral', rgb: [225, 200, 165], hsl: [35, 50, 76], opacity: 0.70, intensity: 0.60, shimmer: false, category: 'permanent' },
  { id: 'dv-v-n10', brand: 'Davines', line: 'View', code: '10N', name: 'Lightest Blonde', level: 10, tone: 'neutral', rgb: [240, 220, 190], hsl: [36, 62, 84], opacity: 0.65, intensity: 0.55, shimmer: false, category: 'permanent' },

  // Ash Series (A)
  { id: 'dv-v-a5', brand: 'Davines', line: 'View', code: '5A', name: 'Light Ash Brown', level: 5, tone: 'ash', rgb: [115, 100, 85], hsl: [30, 15, 39], opacity: 0.85, intensity: 0.75, shimmer: false, category: 'permanent' },
  { id: 'dv-v-a6', brand: 'Davines', line: 'View', code: '6A', name: 'Dark Ash Blonde', level: 6, tone: 'ash', rgb: [140, 125, 105], hsl: [34, 14, 48], opacity: 0.82, intensity: 0.70, shimmer: false, category: 'permanent' },
  { id: 'dv-v-a7', brand: 'Davines', line: 'View', code: '7A', name: 'Medium Ash Blonde', level: 7, tone: 'ash', rgb: [165, 150, 130], hsl: [34, 16, 58], opacity: 0.78, intensity: 0.65, shimmer: false, category: 'permanent' },
  { id: 'dv-v-a8', brand: 'Davines', line: 'View', code: '8A', name: 'Light Ash Blonde', level: 8, tone: 'ash', rgb: [190, 178, 160], hsl: [36, 19, 69], opacity: 0.75, intensity: 0.60, shimmer: false, category: 'permanent' },

  // Golden Series (G)
  { id: 'dv-v-g5', brand: 'Davines', line: 'View', code: '5G', name: 'Light Golden Brown', level: 5, tone: 'golden', rgb: [145, 105, 55], hsl: [33, 45, 39], opacity: 0.85, intensity: 0.85, shimmer: true, category: 'permanent' },
  { id: 'dv-v-g6', brand: 'Davines', line: 'View', code: '6G', name: 'Dark Golden Blonde', level: 6, tone: 'golden', rgb: [170, 130, 65], hsl: [37, 45, 46], opacity: 0.82, intensity: 0.80, shimmer: true, category: 'permanent' },
  { id: 'dv-v-g7', brand: 'Davines', line: 'View', code: '7G', name: 'Medium Golden Blonde', level: 7, tone: 'golden', rgb: [195, 155, 80], hsl: [39, 49, 54], opacity: 0.78, intensity: 0.75, shimmer: true, category: 'permanent' },
  { id: 'dv-v-g8', brand: 'Davines', line: 'View', code: '8G', name: 'Light Golden Blonde', level: 8, tone: 'golden', rgb: [215, 180, 110], hsl: [40, 57, 64], opacity: 0.75, intensity: 0.70, shimmer: true, category: 'permanent' },

  // Copper Series (C)
  { id: 'dv-v-c5', brand: 'Davines', line: 'View', code: '5C', name: 'Light Copper Brown', level: 5, tone: 'copper', rgb: [150, 90, 45], hsl: [26, 54, 38], opacity: 0.88, intensity: 0.90, shimmer: true, category: 'permanent' },
  { id: 'dv-v-c6', brand: 'Davines', line: 'View', code: '6C', name: 'Dark Copper Blonde', level: 6, tone: 'copper', rgb: [175, 110, 55], hsl: [28, 52, 45], opacity: 0.85, intensity: 0.85, shimmer: true, category: 'permanent' },
  { id: 'dv-v-c7', brand: 'Davines', line: 'View', code: '7C', name: 'Medium Copper Blonde', level: 7, tone: 'copper', rgb: [195, 130, 70], hsl: [29, 51, 52], opacity: 0.82, intensity: 0.80, shimmer: true, category: 'permanent' },

  // Red Series (R)
  { id: 'dv-v-r4', brand: 'Davines', line: 'View', code: '4R', name: 'Medium Red Brown', level: 4, tone: 'red', rgb: [130, 50, 40], hsl: [7, 53, 33], opacity: 0.90, intensity: 0.92, shimmer: false, category: 'permanent' },
  { id: 'dv-v-r5', brand: 'Davines', line: 'View', code: '5R', name: 'Light Red Brown', level: 5, tone: 'red', rgb: [155, 65, 50], hsl: [9, 51, 40], opacity: 0.88, intensity: 0.88, shimmer: false, category: 'permanent' },
  { id: 'dv-v-r6', brand: 'Davines', line: 'View', code: '6R', name: 'Dark Red Blonde', level: 6, tone: 'red', rgb: [175, 80, 60], hsl: [10, 49, 46], opacity: 0.85, intensity: 0.85, shimmer: false, category: 'permanent' },

  // Violet Series (V)
  { id: 'dv-v-v6', brand: 'Davines', line: 'View', code: '6V', name: 'Dark Violet Blonde', level: 6, tone: 'violet', rgb: [135, 100, 135], hsl: [300, 15, 46], opacity: 0.82, intensity: 0.70, shimmer: false, category: 'permanent' },
  { id: 'dv-v-v7', brand: 'Davines', line: 'View', code: '7V', name: 'Medium Violet Blonde', level: 7, tone: 'violet', rgb: [160, 125, 160], hsl: [300, 15, 56], opacity: 0.78, intensity: 0.65, shimmer: false, category: 'permanent' },

  // Pearl Series (P)
  { id: 'dv-v-p7', brand: 'Davines', line: 'View', code: '7P', name: 'Pearl Blonde', level: 7, tone: 'pearl', rgb: [180, 170, 180], hsl: [300, 6, 69], opacity: 0.75, intensity: 0.55, shimmer: true, category: 'permanent' },
  { id: 'dv-v-p8', brand: 'Davines', line: 'View', code: '8P', name: 'Light Pearl Blonde', level: 8, tone: 'pearl', rgb: [200, 192, 200], hsl: [300, 7, 77], opacity: 0.72, intensity: 0.50, shimmer: true, category: 'permanent' },
  { id: 'dv-v-p9', brand: 'Davines', line: 'View', code: '9P', name: 'Very Light Pearl', level: 9, tone: 'pearl', rgb: [218, 212, 220], hsl: [285, 10, 85], opacity: 0.68, intensity: 0.45, shimmer: true, category: 'permanent' },

  // Beige Series (D/B)
  { id: 'dv-v-d7', brand: 'Davines', line: 'View', code: '7D', name: 'Beige Blonde', level: 7, tone: 'beige', rgb: [185, 165, 135], hsl: [36, 26, 63], opacity: 0.78, intensity: 0.65, shimmer: false, category: 'permanent' },
  { id: 'dv-v-d8', brand: 'Davines', line: 'View', code: '8D', name: 'Light Beige Blonde', level: 8, tone: 'beige', rgb: [205, 188, 158], hsl: [38, 32, 71], opacity: 0.75, intensity: 0.60, shimmer: false, category: 'permanent' },

  // Mahogany Series (M)
  { id: 'dv-v-m4', brand: 'Davines', line: 'View', code: '4M', name: 'Mahogany Brown', level: 4, tone: 'mahogany', rgb: [100, 55, 55], hsl: [0, 29, 30], opacity: 0.90, intensity: 0.85, shimmer: false, category: 'permanent' },
  { id: 'dv-v-m5', brand: 'Davines', line: 'View', code: '5M', name: 'Light Mahogany Brown', level: 5, tone: 'mahogany', rgb: [125, 70, 65], hsl: [5, 31, 37], opacity: 0.88, intensity: 0.80, shimmer: false, category: 'permanent' },

  // Chocolate Series (CH)
  { id: 'dv-v-ch4', brand: 'Davines', line: 'View', code: '4CH', name: 'Chocolate Brown', level: 4, tone: 'chocolate', rgb: [90, 55, 40], hsl: [18, 38, 25], opacity: 0.90, intensity: 0.88, shimmer: false, category: 'permanent' },
  { id: 'dv-v-ch5', brand: 'Davines', line: 'View', code: '5CH', name: 'Light Chocolate Brown', level: 5, tone: 'chocolate', rgb: [115, 75, 55], hsl: [20, 35, 33], opacity: 0.88, intensity: 0.82, shimmer: false, category: 'permanent' },
]

/**
 * Davines A New Colour — Premium permanent line
 */
export const DAVINES_ANC_SHADES: ShadeDefinition[] = [
  { id: 'dv-anc-4n', brand: 'Davines', line: 'A New Colour', code: '4.0', name: 'Natural Medium Brown', level: 4, tone: 'neutral', rgb: [95, 68, 48], hsl: [25, 33, 28], opacity: 0.90, intensity: 0.88, shimmer: false, category: 'permanent' },
  { id: 'dv-anc-5n', brand: 'Davines', line: 'A New Colour', code: '5.0', name: 'Natural Light Brown', level: 5, tone: 'neutral', rgb: [125, 92, 62], hsl: [28, 34, 37], opacity: 0.87, intensity: 0.82, shimmer: false, category: 'permanent' },
  { id: 'dv-anc-6n', brand: 'Davines', line: 'A New Colour', code: '6.0', name: 'Natural Dark Blonde', level: 6, tone: 'neutral', rgb: [155, 118, 78], hsl: [31, 33, 46], opacity: 0.84, intensity: 0.78, shimmer: false, category: 'permanent' },
  { id: 'dv-anc-7n', brand: 'Davines', line: 'A New Colour', code: '7.0', name: 'Natural Medium Blonde', level: 7, tone: 'neutral', rgb: [180, 148, 102], hsl: [35, 34, 55], opacity: 0.80, intensity: 0.72, shimmer: false, category: 'permanent' },
  { id: 'dv-anc-7g', brand: 'Davines', line: 'A New Colour', code: '7.3', name: 'Golden Blonde', level: 7, tone: 'golden', rgb: [190, 152, 78], hsl: [40, 46, 53], opacity: 0.80, intensity: 0.80, shimmer: true, category: 'permanent' },
  { id: 'dv-anc-8n', brand: 'Davines', line: 'A New Colour', code: '8.0', name: 'Natural Light Blonde', level: 8, tone: 'neutral', rgb: [205, 172, 125], hsl: [35, 44, 65], opacity: 0.76, intensity: 0.68, shimmer: false, category: 'permanent' },
]

/**
 * Davines Mask with Vibrachrom — Fashion colors
 */
export const DAVINES_MV_SHADES: ShadeDefinition[] = [
  { id: 'dv-mv-pink', brand: 'Davines', line: 'Mask Vibrachrom', code: 'PK', name: 'Rose Quartz', level: 8, tone: 'pink', rgb: [220, 150, 165], hsl: [347, 50, 73], opacity: 0.70, intensity: 0.65, shimmer: true, category: 'semi' },
  { id: 'dv-mv-coral', brand: 'Davines', line: 'Mask Vibrachrom', code: 'CO', name: 'Living Coral', level: 7, tone: 'copper', rgb: [230, 130, 100], hsl: [14, 72, 65], opacity: 0.75, intensity: 0.70, shimmer: true, category: 'semi' },
  { id: 'dv-mv-violet', brand: 'Davines', line: 'Mask Vibrachrom', code: 'VL', name: 'Lavender Haze', level: 9, tone: 'violet', rgb: [185, 165, 210], hsl: [267, 33, 74], opacity: 0.65, intensity: 0.60, shimmer: true, category: 'semi' },
]

/**
 * Universal shade collection for try-on (beyond Davines)
 */
export const UNIVERSAL_SHADES: ShadeDefinition[] = [
  // Platinum/Lightener
  { id: 'uni-plat', brand: 'Universal', line: 'Lightener', code: 'PLT', name: 'Platinum', level: 10, tone: 'platinum', rgb: [245, 240, 235], hsl: [30, 33, 94], opacity: 0.55, intensity: 0.40, shimmer: true, category: 'lightener' },
  { id: 'uni-silver', brand: 'Universal', line: 'Fashion', code: 'SV', name: 'Silver', level: 10, tone: 'silver', rgb: [192, 192, 192], hsl: [0, 0, 75], opacity: 0.65, intensity: 0.55, shimmer: true, category: 'semi' },
  
  // Fashion Colors
  { id: 'uni-rose', brand: 'Universal', line: 'Fashion', code: 'RS', name: 'Rose Gold', level: 7, tone: 'copper', rgb: [220, 160, 140], hsl: [15, 53, 71], opacity: 0.75, intensity: 0.70, shimmer: true, category: 'semi' },
  { id: 'uni-blonde', brand: 'Universal', line: 'Fashion', code: 'HB', name: 'Honey Blonde', level: 7, tone: 'golden', rgb: [195, 155, 85], hsl: [38, 48, 55], opacity: 0.80, intensity: 0.78, shimmer: true, category: 'permanent' },
  { id: 'uni-caramel', brand: 'Universal', line: 'Fashion', code: 'CR', name: 'Caramel', level: 6, tone: 'warm', rgb: [170, 120, 70], hsl: [30, 42, 47], opacity: 0.85, intensity: 0.80, shimmer: false, category: 'permanent' },
  { id: 'uni-espresso', brand: 'Universal', line: 'Fashion', code: 'ES', name: 'Espresso', level: 2, tone: 'chocolate', rgb: [45, 30, 22], hsl: [21, 34, 13], opacity: 0.95, intensity: 0.95, shimmer: false, category: 'permanent' },
  { id: 'uni-auburn', brand: 'Universal', line: 'Fashion', code: 'AU', name: 'Auburn', level: 4, tone: 'red', rgb: [135, 55, 35], hsl: [12, 59, 33], opacity: 0.90, intensity: 0.90, shimmer: false, category: 'permanent' },
  { id: 'uni-burgundy', brand: 'Universal', line: 'Fashion', code: 'BG', name: 'Burgundy', level: 3, tone: 'red', rgb: [95, 30, 45], hsl: [346, 52, 25], opacity: 0.92, intensity: 0.92, shimmer: false, category: 'semi' },
  { id: 'uni-ice', brand: 'Universal', line: 'Fashion', code: 'IC', name: 'Ice Blonde', level: 10, tone: 'cool', rgb: [230, 225, 220], hsl: [30, 17, 88], opacity: 0.55, intensity: 0.40, shimmer: true, category: 'toner' },
]

/**
 * Complete shade library — all shades combined
 */
export const ALL_SHADES: ShadeDefinition[] = [
  ...DAVINES_VIEW_SHADES,
  ...DAVINES_ANC_SHADES,
  ...DAVINES_MV_SHADES,
  ...UNIVERSAL_SHADES,
]

/**
 * Get shades grouped by brand
 */
export function getShadesByBrand(): Record<string, ShadeDefinition[]> {
  const grouped: Record<string, ShadeDefinition[]> = {}
  for (const shade of ALL_SHADES) {
    if (!grouped[shade.brand]) grouped[shade.brand] = []
    grouped[shade.brand].push(shade)
  }
  return grouped
}

/**
 * Get shades grouped by tone
 */
export function getShadesByTone(): Record<string, ShadeDefinition[]> {
  const grouped: Record<string, ShadeDefinition[]> = {}
  for (const shade of ALL_SHADES) {
    if (!grouped[shade.tone]) grouped[shade.tone] = []
    grouped[shade.tone].push(shade)
  }
  return grouped
}

/**
 * Find closest shade to a given RGB color
 */
export function findClosestShade(targetRgb: [number, number, number]): ShadeDefinition {
  let closest = ALL_SHADES[0]
  let minDist = Infinity

  for (const shade of ALL_SHADES) {
    const dr = shade.rgb[0] - targetRgb[0]
    const dg = shade.rgb[1] - targetRgb[1]
    const db = shade.rgb[2] - targetRgb[2]
    // Weighted Euclidean distance (perceptual)
    const dist = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db)
    if (dist < minDist) {
      minDist = dist
      closest = shade
    }
  }
  return closest
}

/**
 * Get shade by ID
 */
export function getShadeById(id: string): ShadeDefinition | undefined {
  return ALL_SHADES.find(s => s.id === id)
}

/**
 * Convert HSL to CSS string
 */
export function hslToCss(hsl: [number, number, number]): string {
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`
}

/**
 * Convert RGB to CSS string
 */
export function rgbToCss(rgb: [number, number, number], alpha?: number): string {
  if (alpha !== undefined) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
  }
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}
