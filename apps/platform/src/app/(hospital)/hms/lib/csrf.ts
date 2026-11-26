export function getHmsCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    /(?:orbitox_operator_csrf|orbitox_customer_csrf|orbitox_csrf)=([^;]+)/,
  );
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export function hmsAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const csrf = getHmsCsrfToken();
  return {
    'Content-Type': 'application/json',
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
    ...extra,
  };
}
