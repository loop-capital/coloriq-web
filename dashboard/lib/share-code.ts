/**
 * Share Code Generator for ColorIq Formulas
 * Generates deterministic short codes like "CG-E14A" from formula IDs
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
const PREFIX = 'CG-';
const CODE_LENGTH = 4;

/**
 * Simple hash function that produces a deterministic numeric value from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert a number to a short alphanumeric code
 */
function numberToCode(num: number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = CHARS[num % CHARS.length] + code;
    num = Math.floor(num / CHARS.length);
  }
  return code;
}

/**
 * Generate a share code for a formula ID
 * Deterministic: same formula ID always produces the same code
 */
export function generateShareCode(formulaId: string): string {
  const hash = hashString(formulaId);
  return PREFIX + numberToCode(hash);
}

/**
 * Generate a full share URL
 */
export function getShareUrl(shareCode: string): string {
  return `https://getCOLORiq.co/f/${shareCode}`;
}

/**
 * In-memory lookup table: share_code → formula_id
 * In production, this would be a database table
 */
const codeToFormula = new Map<string, string>();

/**
 * Register a formula's share code for lookup
 */
export function registerShareCode(formulaId: string): string {
  const code = generateShareCode(formulaId);
  codeToFormula.set(code, formulaId);
  return code;
}

/**
 * Look up a formula ID by share code
 */
export function lookupShareCode(code: string): string | null {
  // Normalize: uppercase, strip prefix if present
  const normalized = code.toUpperCase().replace(/^CG-/, '');
  const fullCode = PREFIX + normalized;
  return codeToFormula.get(fullCode) || null;
}

/**
 * Get all registered codes (for debugging)
 */
export function getAllCodes(): Map<string, string> {
  return new Map(codeToFormula);
}
