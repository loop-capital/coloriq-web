/**
 * ColorIq Hair Segmentation Engine
 * 
 * Multiple segmentation strategies for hair detection and masking.
 * Generates hair region masks for accurate color application.
 */

export interface SegmentationResult {
  mask: Uint8Array // 0-255 per pixel
  width: number
  height: number
  regions: HairRegion[]
  confidence: number
}

export interface HairRegion {
  id: string
  label: string
  bounds: { x: number; y: number; w: number; h: number }
  avgConfidence: number
}

export type SegmentationMode = 
  | 'auto'        // Best available (ML-based)
  | 'headband'    // Forehead-to-crown region
  | 'full'        // Full hair silhouette
  | 'roots'       // Root zone only
  | 'midlengths'  // Mid-length zone
  | 'ends'        // Ends zone
  | 'highlights'  // High-contrast bright regions
  | 'custom'      // User-drawn mask

/**
 * Segment hair using skin/hair color analysis (no ML dependency)
 * Uses color-space based heuristic segmentation
 */
export function segmentByColor(
  imageData: ImageData,
  mode: SegmentationMode = 'auto'
): SegmentationResult {
  const { width, height, data } = imageData
  const mask = new Uint8Array(width * height)
  const regions: HairRegion[] = []
  
  // Analyze pixel colors to determine hair vs skin vs background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      
      const maskIdx = y * width + x
      const hairScore = calculateHairScore(r, g, b, y, height, x, width, mode)
      mask[maskIdx] = Math.round(Math.max(0, Math.min(255, hairScore * 255)))
    }
  }

  // Create region descriptors
  regions.push(...detectRegions(mask, width, height))

  return {
    mask,
    width,
    height,
    regions,
    confidence: calculateOverallConfidence(mask),
  }
}

/**
 * Score a pixel for hair likelihood based on color and position heuristics
 */
function calculateHairScore(
  r: number, g: number, b: number,
  y: number, height: number,
  x: number, width: number,
  mode: SegmentationMode
): number {
  // Position weighting — hair is typically in upper portion of frame
  const yNorm = y / height
  const xNorm = x / width
  
  // Skin detection (crude but effective for initial filtering)
  const isSkin = isSkinTone(r, g, b)
  if (isSkin) return 0
  
  // Background detection
  const isBackground = isBackgroundColor(r, g, b)
  if (isBackground) return 0
  
  // Hair color detection
  const isHairColor = isHairLikeColor(r, g, b)
  
  // Position-based weighting
  let positionWeight = 0
  switch (mode) {
    case 'headband':
      positionWeight = yNorm < 0.15 || yNorm > 0.55 ? 0 : 
        yNorm < 0.3 ? 1.0 : 0.6
      break
    case 'roots':
      positionWeight = yNorm < 0.25 ? 1.0 : yNorm < 0.4 ? 0.5 : 0.2
      break
    case 'midlengths':
      positionWeight = (yNorm > 0.25 && yNorm < 0.6) ? 1.0 : 0.3
      break
    case 'ends':
      positionWeight = yNorm > 0.55 ? 1.0 : yNorm > 0.4 ? 0.5 : 0.2
      break
    case 'highlights':
      // Only select bright/reflective regions
      const brightness = (r + g + b) / 3
      return brightness > 160 && isHairColor ? 0.8 : 0
    case 'full':
    case 'auto':
    default:
      // Bell curve centered at upper-middle
      positionWeight = yNorm < 0.1 ? 0.3 :
        yNorm < 0.5 ? 0.7 + 0.3 * Math.sin(Math.PI * (yNorm - 0.1) / 0.4) :
        yNorm < 0.8 ? 0.5 * (1 - (yNorm - 0.5) / 0.3) : 0.1
      break
  }

  // Edge detection — hair has moderate edge variation
  const saturation = getSaturation(r, g, b)
  const luminance = getLuminance(r, g, b)
  
  // Hair tends to have low-medium saturation, varied luminance
  const hairLikelihood = isHairColor ? 
    (0.5 + 0.3 * positionWeight + 0.2 * (1 - saturation / 100)) :
    (0.1 * positionWeight)

  return Math.max(0, Math.min(1, hairLikelihood))
}

/**
 * Check if color is in skin tone range
 */
function isSkinTone(r: number, g: number, b: number): boolean {
  // Simple skin detection using RGB ratios
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  
  if (max < 40 || min > 240) return false
  
  // Skin typically has R > G > B with specific ratios
  const isRedDominant = r > g && r > b
  const rgDiff = r - g
  const rbDiff = r - b
  
  // Multiple skin tone ranges (covers diverse skin tones)
  if (r > 95 && g > 40 && b > 20 &&
      rgDiff > 15 && rbDiff > 15 &&
      max - min > 15 &&
      Math.abs(r - g) > 15) {
    return true
  }
  
  return false
}

/**
 * Check if color is likely background
 */
function isBackgroundColor(r: number, g: number, b: number): boolean {
  // Very dark (shadows)
  if (r < 25 && g < 25 && b < 25) return true
  
  // Very bright (overexposed/wall)
  if (r > 240 && g > 240 && b > 240) return true
  
  // Uniform gray (walls, screens)
  const diff = Math.max(r, g, b) - Math.min(r, g, b)
  if (diff < 10 && r > 100 && r < 200) return true
  
  return false
}

/**
 * Check if color looks like hair
 */
function isHairLikeColor(r: number, g: number, b: number): boolean {
  const luminance = getLuminance(r, g, b)
  const saturation = getSaturation(r, g, b)
  
  // Dark hair (common)
  if (luminance < 120 && saturation < 60) return true
  
  // Brown hair
  if (r > g && g > b && luminance < 160) return true
  
  // Blonde hair
  if (luminance > 120 && luminance < 220 && saturation < 50) return true
  
  // Red/copper hair
  if (r > 120 && g < r * 0.7 && b < g && saturation > 30) return true
  
  // Gray/silver hair
  if (luminance > 150 && saturation < 20) return true
  
  // Colored hair (fashion colors)
  if (saturation > 40 && luminance > 60 && luminance < 200) return true
  
  return false
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return ((max - min) / max) * 100
}

/**
 * Detect contiguous regions in mask
 */
function detectRegions(mask: Uint8Array, width: number, height: number): HairRegion[] {
  const regions: HairRegion[] = []
  const visited = new Uint8Array(mask.length)
  
  // Simple region detection using flood-fill on high-confidence areas
  const threshold = 128
  
  for (let y = 0; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const idx = y * width + x
      if (mask[idx] >= threshold && !visited[idx]) {
        // Found unvisited hair region
        const region = floodFill(mask, visited, x, y, width, height, threshold)
        if (region.count > 100) {
          regions.push({
            id: `region-${regions.length}`,
            label: getRegionLabel(region.minY / height),
            bounds: {
              x: region.minX,
              y: region.minY,
              w: region.maxX - region.minX,
              h: region.maxY - region.minY,
            },
            avgConfidence: region.totalConfidence / region.count / 255,
          })
        }
      }
    }
  }

  return regions
}

function floodFill(
  mask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number,
  threshold: number
) {
  let minX = startX, maxX = startX, minY = startY, maxY = startY
  let count = 0, totalConfidence = 0
  const stack: [number, number][] = [[startX, startY]]
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    
    const idx = y * width + x
    if (visited[idx] || mask[idx] < threshold) continue
    
    visited[idx] = 1
    count++
    totalConfidence += mask[idx]
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  
  return { minX, maxX, minY, maxY, count, totalConfidence }
}

function getRegionLabel(yNorm: number): string {
  if (yNorm < 0.2) return 'Roots'
  if (yNorm < 0.45) return 'Crown'
  if (yNorm < 0.7) return 'Mid-lengths'
  return 'Ends'
}

function calculateOverallConfidence(mask: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < mask.length; i++) {
    sum += mask[i]
  }
  return sum / (mask.length * 255)
}

/**
 * Create a canvas-based hair mask from image
 * For browser-side use
 */
export function createMaskCanvas(
  mask: Uint8Array,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)
  
  for (let i = 0; i < mask.length; i++) {
    const pixelIdx = i * 4
    imageData.data[pixelIdx] = 20       // R (teal-ish overlay)
    imageData.data[pixelIdx + 1] = 184  // G
    imageData.data[pixelIdx + 2] = 166  // B
    imageData.data[pixelIdx + 3] = mask[i] * 0.35 // A (semi-transparent)
  }
  
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Smooth mask edges using Gaussian blur
 */
export function smoothMask(mask: Uint8Array, width: number, height: number, radius: number = 3): Uint8Array {
  const result = new Uint8Array(mask.length)
  const kernel = createGaussianKernel(radius)
  const kernelSize = radius * 2 + 1
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, weightSum = 0
      
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = x + kx, py = y + ky
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const weight = kernel[(ky + radius) * kernelSize + (kx + radius)]
            sum += mask[py * width + px] * weight
            weightSum += weight
          }
        }
      }
      
      result[y * width + x] = Math.round(sum / weightSum)
    }
  }
  
  return result
}

function createGaussianKernel(radius: number): Float32Array {
  const size = radius * 2 + 1
  const kernel = new Float32Array(size * size)
  const sigma = radius / 3
  let sum = 0
  
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const val = Math.exp(-(x * x + y * y) / (2 * sigma * sigma))
      kernel[(y + radius) * size + (x + radius)] = val
      sum += val
    }
  }
  
  // Normalize
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum
  }
  
  return kernel
}
