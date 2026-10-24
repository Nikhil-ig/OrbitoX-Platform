import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSafeExpression,
  validateSafeExpression,
} from './safe-expression.ts';
import {
  isPrivateOrBlockedIP,
  assertSafeDestination,
  safeFetch,
} from './safe-fetch.ts';

// ─── SAFE EXPRESSION EVALUATOR TESTS ─────────────────────────────

test('safe expression: arithmetic, precedence, and logic', () => {
  assert.equal(evaluateSafeExpression('2 + 3 * 4'), 14);
  assert.equal(evaluateSafeExpression('(2 + 3) * 4'), 20);
  assert.equal(evaluateSafeExpression('100 / 4 - 5'), 20);
  assert.equal(evaluateSafeExpression('10 % 3'), 1);
  assert.equal(evaluateSafeExpression('!false'), true);
  assert.equal(evaluateSafeExpression('true && false'), false);
  assert.equal(evaluateSafeExpression('true || false'), true);
});

test('safe expression: comparisons and equality', () => {
  const ctx = { subtotal: 150, currency: 'USD', tier: 'gold' };
  assert.equal(evaluateSafeExpression('subtotal > 100', ctx), true);
  assert.equal(evaluateSafeExpression('subtotal <= 100', ctx), false);
  assert.equal(evaluateSafeExpression('currency === "USD"', ctx), true);
  assert.equal(evaluateSafeExpression('tier !== "silver"', ctx), true);
});

test('safe expression: ternary and member access', () => {
  const ctx = {
    customer: { isVip: true, spent: 450 },
    items: ['hoodie', 'tee'],
  };
  assert.equal(
    evaluateSafeExpression('customer.isVip ? "VIP" : "Regular"', ctx),
    'VIP'
  );
  assert.equal(evaluateSafeExpression('customer.spent >= 400', ctx), true);
  assert.equal(evaluateSafeExpression('items[0]', ctx), 'hoodie');
});

test('safe expression: allowed Math and String utility methods', () => {
  const ctx = { utm: 'summer_sale_2026', price: 99.4 };
  assert.equal(evaluateSafeExpression('Math.min(10, 5, 20)'), 5);
  assert.equal(evaluateSafeExpression('Math.max(10, 5, 20)'), 20);
  assert.equal(evaluateSafeExpression('Math.round(price)', ctx), 99);
  assert.equal(evaluateSafeExpression('utm.toUpperCase()', ctx), 'SUMMER_SALE_2026');
  assert.equal(evaluateSafeExpression('utm.startsWith("summer")', ctx), true);
  assert.equal(evaluateSafeExpression('utm.includes("sale")', ctx), true);
});

test('safe expression: security blocklist rejects forbidden identifiers', () => {
  const maliciousList = [
    'process.exit(1)',
    'require("fs")',
    'global.something',
    'globalThis.secret',
    'window.location',
    'eval("1+1")',
    'Function("return 1")()',
    'import("something")',
    'constructor',
    '__proto__',
  ];

  for (const malicious of maliciousList) {
    const val = validateSafeExpression(malicious);
    assert.equal(
      val.isValid,
      false,
      `Should invalidate malicious expression: ${malicious}`
    );
    assert.throws(
      () => evaluateSafeExpression(malicious),
      /blocked|forbidden|syntax error|cannot read|is not defined/i,
      `Should throw during evaluation of: ${malicious}`
    );
  }
});

test('safe expression: prototype pollution and constructor access blocked', () => {
  const payload = 'Object.constructor("return process")()';
  assert.throws(() => evaluateSafeExpression(payload));

  const payload2 = '__proto__.isAdmin = true';
  assert.throws(() => evaluateSafeExpression(payload2));

  const payload3 = 'customer.__proto__';
  assert.throws(() => evaluateSafeExpression(payload3, { customer: {} }));
});

test('safe expression: validation catches syntax errors', () => {
  const res1 = validateSafeExpression('1 +');
  assert.equal(res1.isValid, false);
  assert.ok(res1.error);

  const res2 = validateSafeExpression('(5 + 3');
  assert.equal(res2.isValid, false);

  const res3 = validateSafeExpression('');
  assert.equal(res3.isValid, false);

  const validRes = validateSafeExpression('cartSubtotal > 50 && isLoggedIn');
  assert.equal(validRes.isValid, true);
});

test('safe expression: commerce evaluation scope emulation', () => {
  // Simulates the scope prepared in section-logic.engine and flow.engine
  const scope = {
    cartSubtotal: 120,
    cartItemCount: 3,
    customerSegment: 'vip',
    isLoggedIn: true,
    customerTotalSpent: 550,
    deviceType: 'desktop',
    currency: 'USD',
    countryCode: 'US',
    utmCampaign: 'black_friday',
    now: new Date('2026-11-27T00:00:00Z'),
    customParams: { referral: 'partner_abc' },
  };

  const expr1 = 'cartSubtotal > 100 && isLoggedIn && customerSegment === "vip"';
  assert.equal(Boolean(evaluateSafeExpression(expr1, scope)), true);

  const expr2 = 'cartSubtotal < 50 || countryCode === "CA"';
  assert.equal(Boolean(evaluateSafeExpression(expr2, scope)), false);

  const expr3 = 'customParams.referral === "partner_abc"';
  assert.equal(Boolean(evaluateSafeExpression(expr3, scope)), true);
});

// ─── SSRF PROTECTION & SAFE FETCH TESTS ──────────────────────────

test('ssrf protection: isPrivateOrBlockedIP identifies private ranges', () => {
  // IPv4 Loopback
  assert.equal(isPrivateOrBlockedIP('127.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('127.255.255.254'), true);

  // IPv4 Class A private
  assert.equal(isPrivateOrBlockedIP('10.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('10.254.1.1'), true);

  // IPv4 Class B private
  assert.equal(isPrivateOrBlockedIP('172.16.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('172.31.255.254'), true);
  assert.equal(isPrivateOrBlockedIP('172.15.0.1'), false); // public
  assert.equal(isPrivateOrBlockedIP('172.32.0.1'), false); // public

  // IPv4 Class C private
  assert.equal(isPrivateOrBlockedIP('192.168.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('192.168.254.254'), true);

  // IPv4 Link-local (Cloud metadata / AWS / GCP)
  assert.equal(isPrivateOrBlockedIP('169.254.169.254'), true);
  assert.equal(isPrivateOrBlockedIP('169.254.1.1'), true);

  // IPv4 0.0.0.0, multicast, reserved
  assert.equal(isPrivateOrBlockedIP('0.0.0.0'), true);
  assert.equal(isPrivateOrBlockedIP('224.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('240.0.0.1'), true);

  // IPv4 Public addresses
  assert.equal(isPrivateOrBlockedIP('8.8.8.8'), false);
  assert.equal(isPrivateOrBlockedIP('1.1.1.1'), false);
  assert.equal(isPrivateOrBlockedIP('93.184.216.34'), false);

  // IPv6 Loopback and Unspecified
  assert.equal(isPrivateOrBlockedIP('::1'), true);
  assert.equal(isPrivateOrBlockedIP('::'), true);

  // IPv6 Unique Local Address (fc00::/7)
  assert.equal(isPrivateOrBlockedIP('fc00::1'), true);
  assert.equal(isPrivateOrBlockedIP('fd12:3456:789a::1'), true);

  // IPv6 Link-Local (fe80::/10)
  assert.equal(isPrivateOrBlockedIP('fe80::1'), true);

  // IPv6 Multicast (ff00::/8)
  assert.equal(isPrivateOrBlockedIP('ff02::1'), true);

  // IPv4-mapped IPv6
  assert.equal(isPrivateOrBlockedIP('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('::ffff:10.0.0.1'), true);
  assert.equal(isPrivateOrBlockedIP('::ffff:169.254.169.254'), true);
  assert.equal(isPrivateOrBlockedIP('::ffff:8.8.8.8'), false);
});

test('ssrf protection: assertSafeDestination blocks private hostnames & direct IPs', async () => {
  await assert.rejects(
    () => assertSafeDestination('127.0.0.1'),
    /SSRF blocked: direct IP destination "127.0.0.1" is private or loopback/
  );

  await assert.rejects(
    () => assertSafeDestination('169.254.169.254'),
    /SSRF blocked: direct IP destination "169.254.169.254" is private or loopback/
  );

  await assert.rejects(
    () => assertSafeDestination('localhost'),
    /SSRF blocked/
  );
});

test('ssrf protection: safeFetch rejects invalid protocols and loopback URLs', async () => {
  // Protocol rejection
  await assert.rejects(
    () => safeFetch('ftp://example.com/file.txt'),
    /SSRF blocked: protocol "ftp:" is not allowed/
  );

  await assert.rejects(
    () => safeFetch('file:///etc/passwd'),
    /SSRF blocked: protocol "file:" is not allowed/
  );

  // Destination rejection
  await assert.rejects(
    () => safeFetch('http://127.0.0.1:8080/admin'),
    /SSRF blocked: direct IP destination/
  );

  await assert.rejects(
    () => safeFetch('http://169.254.169.254/latest/meta-data/'),
    /SSRF blocked: direct IP destination/
  );

  await assert.rejects(
    () => safeFetch('http://localhost:3000/api'),
    /SSRF blocked/
  );
});
