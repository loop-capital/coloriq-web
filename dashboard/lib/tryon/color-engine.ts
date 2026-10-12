/**
 * ColorIq AR Try-On Color Engine
 * 
 * Handles realistic color blending, hair texture preservation,
 * and natural-looking color application on hair regions.
 */

import type { ShadeDefinition } from './shade-library'

export interface ColorBlendOptions {
  shade: ShadeDefinition
  blendMode: 'natural' | 'vibrant' | 'subtle' | 'fashion'
  preserveHighlights: boolean
  rootShadow: boolean
  intensity: number // 0-1 override
}

/**
 * Blend two RGB colors using soft-light blending
 * Preserves underlying hair texture and highlights
 */
export function blendSoftLight(
  base: [number, number, number],
  blend: [number, number, number],
  opacity: number
): [number, number, number] {
  const result: [number, number, number] = [0, 0, 0]
  
  for (let i = 0; i < 3; i++) {
    const b = base[i] / 255
    const c = blend[i] / 255
    
    // Soft-light blend formula
    let blended: number
    if (c < 0.5) {
      blended = b - (1 - 2 * c) * b * (1 - b)
    } else {
      const d = b < 0.25
        ? ((16 * b - 12) * b + 4) * b
        : Math.sqrt(b)
      blended = b + (2 * c - 1) * (d - b)
    }
    
    result[i] = Math.round(Math.max(0, Math.min(255, blended * 255 * opacity + base[i] * (1 - opacity))))
  }
  
  return result
}

/**
 * Blend using overlay mode — good for vibrant fashion colors
 */
export function blendOverlay(
  base: [number, number, number],
  blend: [number, number, number],
  opacity: number
): [number, number, number] {
  const result: [number, number, number] = [0, 0, 0]
  
  for (let i = 0; i < 3; i++) {
    const b = base[i] / 255
    const c = blend[i] / 255
    
    let blended: number
    if (b < 0.5) {
      blended = 2 * b * c
    } else {
      blended = 1 - 2 * (1 - b) * (1 - c)
    }
    
    result[i] = Math.round(Math.max(0, Math.min(255, blended * 255 * opacity + base[i] * (1 - opacity))))
  }
  
  return result
}

/**
 * Blend using color-dodge for shimmer/metallic effects
 */
export function blendColorDodge(
  base: [number, number, number],
  blend: [number, number, number],
  opacity: number
): [number, number, number] {
  const result: [number, number, number] = [0, 0, 0]
  
  for (let i = 0; i < 3; i++) {
    const b = base[i] / 255
    const c = blend[i] / 255
    
    let blended: number
    if (c === 1) {
      blended = 1
    } else {
      blended = Math.min(1, b / (1 - c))
    }
    
    result[i] = Math.round(Math.max(0, Math.min(255, blended * 255 * opacity * 0.3 + base[i] * (1 - opacity * 0.3))))
  }
  
  return result
}

/**
 * Apply color to a pixel based on shade definition and options
 */
export function applyColorToPixel(
  pixel: Uint8ClampedArray,
  offset: number,
  shade: ShadeDefinition,
  options?: Partial<ColorBlendOptions>
): void {
  const intensity = options?.intensity ?? shade.intensity
  const baseColor: [number, number, number] = [pixel[offset], pixel[offset + 1], pixel[offset + 2]]
  const shadeColor = shade.rgb

  let result: [number, number, number]
  
  switch (options?.blendMode) {
    case 'vibrant':
      result = blendOverlay(baseColor, shadeColor, shade.opacity * intensity)
      break
    case 'subtle':
      result = blendSoftLight(baseColor, shadeColor, shade.opacity * intensity * 0.5)
      break
    case 'fashion':
      result = blendOverlay(baseColor, shadeColor, shade.opacity * intensity)
      // Add shimmer effect
      if (shade.shimmer) {
        result = blendColorDodge(result, shadeColor, 0.2)
      }
      break
    case 'natural':
    default:
      result = blendSoftLight(baseColor, shadeColor, shade.opacity * intensity)
      break
  }

  pixel[offset] = result[0]
  pixel[offset + 1] = result[1]
  pixel[offset + 2] = result[2]
  // Alpha channel unchanged
}

/**
 * Process an entire ImageData with color application
 * Uses a hair mask to only affect hair regions
 */
export function processImageData(
  imageData: ImageData,
  hairMask: Uint8Array, // 0-255 per pixel, 0=not hair, 255=hair
  shade: ShadeDefinition,
  options?: Partial<ColorBlendOptions>
): ImageData {
  const pixels = imageData.data
  const len = pixels.length

  for (let i = 0; i < len; i += 4) {
    const pixelIndex = i / 4
    const maskValue = hairMask[pixelIndex] / 255

    if (maskValue > 0.05) {
      // Calculate per-pixel intensity based on hair mask confidence
      const pixelOptions = {
        ...options,
        intensity: (options?.intensity ?? shade.intensity) * maskValue,
      }
      applyColorToPixel(pixels, i, shade, pixelOptions)
    }
  }

  return imageData
}

/**
 * Apply root shadow effect — darker at roots, lighter at ends
 */
export function applyRootShadow(
  shade: ShadeDefinition,
  rootFactor: number = 0.15
): ShadeDefinition {
  const darkerRgb: [number, number, number] = [
    Math.max(0, shade.rgb[0] - Math.round(shade.rgb[0] * rootFactor)),
    Math.max(0, shade.rgb[1] - Math.round(shade.rgb[1] * rootFactor)),
    Math.max(0, shade.rgb[2] - Math.round(shade.rgb[2] * rootFactor)),
  ]

  return {
    ...shade,
    rgb: darkerRgb,
    opacity: Math.min(1, shade.opacity + 0.05),
  }
}

/**
 * Create a gradient shade map for realistic application
 * Maps vertical position (0=top/roots, 1=bottom/ends) to shade intensity
 */
export function createVerticalGradient(
  height: number,
  rootDarken: number = 0.1,
  endLighten: number = 0.05
): Float32Array {
  const gradient = new Float32Array(height)
  
  for (let y = 0; y < height; y++) {
    const t = y / height // 0 at top, 1 at bottom
    
    if (t < 0.3) {
      // Roots — slightly darker
      gradient[y] = 1.0 - rootDarken * (1 - t / 0.3)
    } else if (t > 0.7) {
      // Ends — slightly lighter/more porous
      gradient[y] = 1.0 + endLighten * ((t - 0.7) / 0.3)
    } else {
      // Mid-lengths — standard
      gradient[y] = 1.0
    }
  }
  
  return gradient
}

/**
 * HSV helpers for color manipulation
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0, s = max === 0 ? 0 : d / max, v = max
  
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, v * 100]
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h /= 360; s /= 100; v /= 100
  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}
