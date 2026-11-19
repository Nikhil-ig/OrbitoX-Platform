/**
 * Formatting Utilities for Indian Locale (en-IN).
 * All financial formatting takes minor units (paise) as integers.
 * All date/time operations default to the 'Asia/Kolkata' timezone.
 */

export interface FormatINROptions {
  short?: boolean;       // Formats 15000000 paise as ₹1.50 L, 100000000 paise as ₹1.00 Cr
  showSymbol?: boolean;  // Default: true
  decimals?: number;     // Minor decimals, default: 2 (0 for short)
}

/**
 * Formats minor units (paise) into INR currency string with Indian numbering (Lakh / Crore).
 * Guaranteed to operate on integer minor units to prevent float precision drift.
 */
export function formatINR(paise: number, options: FormatINROptions = {}): string {
  const { short = false, showSymbol = true, decimals = 2 } = options;

  if (!Number.isFinite(paise)) {
    return '₹0.00';
  }

  // Ensure integer paise
  const integerPaise = Math.round(paise);
  const rupees = integerPaise / 100;
  const isNegative = rupees < 0;
  const absRupees = Math.abs(rupees);
  const symbol = showSymbol ? '₹' : '';

  if (short) {
    if (absRupees >= 10000000) { // 1 Crore (1,00,00,000)
      const cr = absRupees / 10000000;
      const formatted = parseFloat(cr.toFixed(2)).toString();
      return `${isNegative ? '-' : ''}${symbol}${formatted} Cr`;
    }
    if (absRupees >= 100000) { // 1 Lakh (1,00,000)
      const lakh = absRupees / 100000;
      const formatted = parseFloat(lakh.toFixed(2)).toString();
      return `${isNegative ? '-' : ''}${symbol}${formatted} L`;
    }
    if (absRupees >= 1000) { // 1 Thousand (1,000)
      const k = absRupees / 1000;
      const formatted = parseFloat(k.toFixed(1)).toString();
      return `${isNegative ? '-' : ''}${symbol}${formatted} k`;
    }
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(rupees);
}

export interface DateFormatOptions {
  timeZone?: string;
  format?: 'short' | 'medium' | 'long' | 'full';
}

/**
 * Formats a Date using Intl.DateTimeFormat in en-IN locale with Asia/Kolkata timezone default.
 */
export function formatDate(date: Date | string | number, options: DateFormatOptions = {}): string {
  const { timeZone = 'Asia/Kolkata', format = 'medium' } = options;
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const styleMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: 'numeric', month: 'short', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' },
  };

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    ...styleMap[format],
  });

  return formatter.format(d);
}

export interface DateTimeFormatOptions {
  timeZone?: string;
  includeSeconds?: boolean;
}

/**
 * Formats Date and Time in en-IN locale with Asia/Kolkata timezone default.
 */
export function formatDateTime(date: Date | string | number, options: DateTimeFormatOptions = {}): string {
  const { timeZone = 'Asia/Kolkata', includeSeconds = false } = options;
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: includeSeconds ? 'numeric' : undefined,
    hour12: true,
  });

  return formatter.format(d);
}

/**
 * Formats a relative timestamp (e.g., "5 minutes ago", "in 2 hours", "yesterday") in en-IN.
 */
export function formatRelative(date: Date | string | number, referenceTime: Date | number = Date.now()): string {
  const target = (date instanceof Date ? date : new Date(date)).getTime();
  const now = referenceTime instanceof Date ? referenceTime.getTime() : referenceTime;

  if (isNaN(target)) {
    return 'Invalid Date';
  }

  const diffSec = Math.round((target - now) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 45) {
    return 'just now';
  }

  const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });

  if (absSec < 3600) {
    return rtf.format(Math.round(diffSec / 60), 'minute');
  }
  if (absSec < 86400) {
    return rtf.format(Math.round(diffSec / 3600), 'hour');
  }
  if (absSec < 2592000) {
    return rtf.format(Math.round(diffSec / 86400), 'day');
  }
  if (absSec < 31536000) {
    return rtf.format(Math.round(diffSec / 2592000), 'month');
  }
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}

/**
 * Normalizes and formats an Indian mobile phone number into +91 XXXXX XXXXX standard.
 */
export function formatPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';

  // Extract digits
  const digits = phone.replace(/\D/g, '');

  let nationalNumber = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    nationalNumber = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    nationalNumber = digits.substring(1);
  }

  if (nationalNumber.length === 10) {
    const part1 = nationalNumber.substring(0, 5);
    const part2 = nationalNumber.substring(5);
    return `+91 ${part1} ${part2}`;
  }

  // Fallback if not standard 10-digit
  return phone.trim();
}

/**
 * Validates and displays an Indian GSTIN (Goods and Services Tax Identification Number).
 * Format: 22AAAAA0000A1Z5 (15 characters).
 */
export function formatGSTIN(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.length === 15) {
    // 2-state + 5-pan-letters + 5-pan-digits/char + 1-entity + 1-Z + 1-checksum
    return `${clean.substring(0, 2)} ${clean.substring(2, 7)} ${clean.substring(7, 12)} ${clean.substring(12, 13)} ${clean.substring(13, 14)} ${clean.substring(14)}`;
  }

  return clean;
}
