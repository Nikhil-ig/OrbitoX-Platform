import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  formatDate,
  formatDateTime,
  formatRelative,
  formatPhone,
  formatGSTIN,
} from '../src/format/index.ts';

describe('Indian Locale Formatters (en-IN)', () => {
  describe('formatINR', () => {
    it('formats integer paise into INR currency with Indian numbering', () => {
      // 100 paise = ₹1.00
      assert.match(formatINR(100), /₹\s?1\.00/);

      // 123456700 paise = 12,34,567.00 rupees
      const formatted = formatINR(123456700);
      assert.match(formatted, /12,34,567\.00/);

      // 50 paise = ₹0.50
      assert.match(formatINR(50), /₹\s?0\.50/);

      // Negative amounts
      const negative = formatINR(-250000);
      assert.match(negative, /-₹\s?2,500\.00/);
    });

    it('formats short lakh / crore representation when short: true', () => {
      // 1 Crore = 1,00,00,000 rupees = 1,00,00,00,000 paise
      const oneCr = formatINR(1000000000, { short: true });
      assert.equal(oneCr, '₹1 Cr');

      // 1.5 Crore = 1,50,00,000 rupees
      const onePointFiveCr = formatINR(1500000000, { short: true });
      assert.equal(onePointFiveCr, '₹1.5 Cr');

      // 12.34 Lakh = 12,34,000 rupees = 12,34,00,000 paise
      const lakh = formatINR(123400000, { short: true });
      assert.equal(lakh, '₹12.34 L');

      // 25.5 Thousand = 25,500 rupees
      const thousand = formatINR(2550000, { short: true });
      assert.equal(thousand, '₹25.5 k');
    });

    it('handles zero and finite edge cases cleanly', () => {
      assert.match(formatINR(0), /₹\s?0\.00/);
      assert.match(formatINR(NaN), /₹\s?0\.00/);
      assert.match(formatINR(Infinity), /₹\s?0\.00/);
    });
  });

  describe('formatDate & formatDateTime', () => {
    it('formats date in Asia/Kolkata timezone by default', () => {
      // 2026-08-15T00:00:00Z is 05:30 IST on August 15, 2026
      const date = new Date('2026-08-15T00:00:00Z');
      const formatted = formatDate(date);
      assert.match(formatted, /15\sAug\s2026/);
    });

    it('formats date and time in 12-hour format with Asia/Kolkata default', () => {
      // 2026-08-15T09:00:00Z is 14:30 (2:30 pm) IST
      const date = new Date('2026-08-15T09:00:00Z');
      const formatted = formatDateTime(date);
      assert.match(formatted, /15\sAug\s2026/);
      assert.match(formatted, /2:30\s(pm|PM)/i);
    });

    it('handles invalid dates without throwing', () => {
      assert.equal(formatDate('invalid-date'), 'Invalid Date');
      assert.equal(formatDateTime('invalid-date'), 'Invalid Date');
    });
  });

  describe('formatRelative', () => {
    it('formats relative elapsed time accurately', () => {
      const now = 1750000000000;
      assert.equal(formatRelative(now - 10000, now), 'just now');
      assert.equal(formatRelative(now - 120000, now), '2 minutes ago');
      assert.equal(formatRelative(now - 7200000, now), '2 hours ago');
      assert.equal(formatRelative(now - 86400000, now), 'yesterday');
      assert.equal(formatRelative(now + 3600000, now), 'in 1 hour');
    });
  });

  describe('formatPhone', () => {
    it('formats 10-digit Indian numbers into +91 XXXXX XXXXX', () => {
      assert.equal(formatPhone('9876543210'), '+91 98765 43210');
      assert.equal(formatPhone('+919876543210'), '+91 98765 43210');
      assert.equal(formatPhone('09876543210'), '+91 98765 43210');
      assert.equal(formatPhone('98765-43210'), '+91 98765 43210');
    });

    it('handles empty or non-standard phone numbers gracefully', () => {
      assert.equal(formatPhone(''), '');
      assert.equal(formatPhone('123'), '123');
    });
  });

  describe('formatGSTIN', () => {
    it('formats 15-character GSTIN into grouped format', () => {
      const gstin = '22AAAAA0000A1Z5';
      assert.equal(formatGSTIN(gstin), '22 AAAAA 0000A 1 Z 5');
    });

    it('normalizes lowercase inputs and handles malformed strings', () => {
      assert.equal(formatGSTIN('22aaaaa0000a1z5'), '22 AAAAA 0000A 1 Z 5');
      assert.equal(formatGSTIN('invalid'), 'INVALID');
      assert.equal(formatGSTIN(''), '');
    });
  });
});
