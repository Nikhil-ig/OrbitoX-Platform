import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { SECURITY_HEADERS, applySecurityHeaders } from '@/lib/security-headers';

describe('Phase 6F Edge Security Headers', () => {
  it('applies all mandatory security headers via applySecurityHeaders', () => {
    const { NextResponse } = require('next/server');
    const base = NextResponse.json({ ok: true });
    const secured = applySecurityHeaders(base);

    assert.equal(
      secured.headers.get('Strict-Transport-Security'),
      'max-age=63072000; includeSubDomains; preload',
    );
    assert.equal(secured.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(secured.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(secured.headers.get('X-XSS-Protection'), '0');
    assert.equal(secured.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.ok(secured.headers.get('Permissions-Policy')?.includes('camera=()'));
    assert.ok(secured.headers.get('Content-Security-Policy')?.includes("default-src 'self'"));
    assert.ok(secured.headers.get('Content-Security-Policy')?.includes('https://checkout.razorpay.com'));
  });

  it('middleware attaches security headers on explicit public diagnostic routes (/api/health and /health)', async () => {
    for (const path of ['/health', '/api/health', '/api/v1/openapi.json']) {
      const req = new NextRequest(`https://staging.orbitox.io${path}`);
      const res = await middleware(req);
      assert.ok(res, `Response should exist for ${path}`);
      assert.equal(
        res.headers.get('Strict-Transport-Security'),
        'max-age=63072000; includeSubDomains; preload',
        `HSTS missing on ${path}`,
      );
      assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff', `nosniff missing on ${path}`);
      assert.equal(res.headers.get('X-Frame-Options'), 'DENY', `X-Frame-Options missing on ${path}`);
      assert.equal(res.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
      assert.ok(res.headers.get('Content-Security-Policy')?.includes("default-src 'self'"));
    }
  });

  it('middleware attaches security headers on denied unauthenticated control-plane routes', async () => {
    const req = new NextRequest('https://staging.orbitox.io/api/v1/admin/overview');
    const res = await middleware(req);
    assert.equal(res.status, 401);
    assert.equal(
      res.headers.get('Strict-Transport-Security'),
      'max-age=63072000; includeSubDomains; preload',
    );
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
    assert.ok(res.headers.get('Content-Security-Policy'));
  });

  it('middleware attaches security headers on self-guarded customer API routes', async () => {
    const req = new NextRequest('https://staging.orbitox.io/api/restaurant/orders');
    const res = await middleware(req);
    assert.ok(res);
    assert.equal(
      res.headers.get('Strict-Transport-Security'),
      'max-age=63072000; includeSubDomains; preload',
    );
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
    assert.ok(res.headers.get('Content-Security-Policy'));
  });
});

