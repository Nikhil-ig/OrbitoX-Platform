export function getCustomerCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)orbitox_customer_csrf=([^;]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}
