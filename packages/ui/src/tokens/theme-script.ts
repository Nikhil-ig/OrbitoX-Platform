/**
 * Theme & No-Flash Script Utilities (CSP-Compliant)
 * Reads theme from HTTP cookie on the server to prevent theme flash without unsafe inline scripts.
 */

export type Theme = 'light' | 'dark';

export const THEME_COOKIE_NAME = 'orbitox-theme';

/**
 * Extracts the user's theme preference from the HTTP Cookie header (Server-Side).
 */
export function getThemeFromCookie(cookieHeader?: string | null): Theme {
  if (!cookieHeader) return 'dark'; // Dark theme default for OrbitoX Platform

  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]+)`));
  if (match && (match[1] === 'light' || match[1] === 'dark')) {
    return match[1];
  }

  return 'dark';
}

/**
 * Client-side helper to persist theme to cookie and update <html> attribute.
 */
export function setTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.setAttribute('data-theme', theme);
  // Persist for 1 year with SameSite=Lax and path=/
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Client-side helper to toggle theme.
 */
export function toggleTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next: Theme = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

