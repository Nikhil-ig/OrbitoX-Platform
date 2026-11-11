import 'server-only';
import { NextResponse } from 'next/server';

/**
 * Platform Edge & Middleware Security Headers (Phase 6F)
 *
 * Enforces mandatory defense-in-depth headers on all HTTP responses:
 * - Strict-Transport-Security (HSTS): Enforces TLS 1.2+ across domain and all subdomains with preload.
 * - X-Content-Type-Options: Prevents MIME-type sniffing attacks.
 * - X-Frame-Options: Prevents clickjacking (DENY for control-plane and APIs).
 * - Referrer-Policy: Prevents referrer leakage to third-party domains.
 * - Permissions-Policy: Disables unneeded high-privilege device APIs (camera, microphone, geolocation).
 * - Content-Security-Policy (CSP): Restricts scripts, styles, frames, and connections to self and approved payment gateways.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
});

/**
 * Injects standard security headers into any NextResponse.
 * Preserves any pre-existing custom headers already set on the response.
 */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!res.headers.has(key)) {
      res.headers.set(key, value);
    }
  }
  return res;
}

