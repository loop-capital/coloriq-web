// COLORiq cookie/localStorage key migration — launch-blocking fix (2026-10-13).
// Dual-read with write-new (Option A):
//   Read:  check the new coloriq_* key first, fall back to legacy colorgenius_* key.
//   Write: new key only. When a new cookie is written, the legacy cookie is cleared.
//   Sunset: legacy keys can be dropped ~30 days after this ships (≈ 2026-11-13);
//            grep for TOKEN_COOKIE_LEGACY / REMEMBER_EMAIL_LEGACY to find them all.
// Zero user impact, no forced logouts.
export const TOKEN_COOKIE_NEW = 'coloriq_token';
export const TOKEN_COOKIE_LEGACY = 'colorgenius_token';
export const REMEMBER_EMAIL_NEW = 'coloriq_remember_email';
export const REMEMBER_EMAIL_LEGACY = 'colorgenius_remember_email';

type CookieGetter = (name: string) => string | undefined;

/** Server-side dual-read: new key first, legacy fallback. */
export function getAuthTokenCookie(get: CookieGetter): string | undefined {
  return get(TOKEN_COOKIE_NEW) ?? get(TOKEN_COOKIE_LEGACY);
}

/** Client-side dual-read from localStorage. */
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_COOKIE_NEW) ?? localStorage.getItem(TOKEN_COOKIE_LEGACY);
}

/** Client-side write-new. */
export function setStoredAuthToken(token: string): void {
  localStorage.setItem(TOKEN_COOKIE_NEW, token);
}

export function getStoredRememberEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REMEMBER_EMAIL_NEW) ?? localStorage.getItem(REMEMBER_EMAIL_LEGACY);
}

export function setStoredRememberEmail(email: string): void {
  localStorage.setItem(REMEMBER_EMAIL_NEW, email);
}

export function clearStoredRememberEmail(): void {
  localStorage.removeItem(REMEMBER_EMAIL_NEW);
  localStorage.removeItem(REMEMBER_EMAIL_LEGACY);
}
