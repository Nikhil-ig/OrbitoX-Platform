let memoryCsrfToken = '';

export function setCustomerCsrfToken(token: string): void {
  if (typeof token === 'string' && token.trim()) {
    memoryCsrfToken = token.trim();
  }
}

export function getCustomerCsrfToken(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)orbitox_customer_csrf=([^;]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      if (decoded) {
        memoryCsrfToken = decoded;
        return decoded;
      }
    }
  }
  return memoryCsrfToken;
}
