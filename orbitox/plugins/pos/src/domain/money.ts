/**
 * 💰 OrbitoX RestaurantOS - Money & Minor Currency Unit Primitives
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: Never use floating-point numbers for financial values.
 * All amounts are stored as 64-bit integer minor currency units (e.g., paise, cents).
 * ₹100.00 = 10000 minor units
 * $45.50  = 4550 minor units
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

export interface Money {
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
}

export class MoneyUtil {
  /**
   * Create a Money value object from integer minor units.
   */
  static fromMinor(amountMinor: number | bigint | string, currency: CurrencyCode = 'INR'): Money {
    const minor = typeof amountMinor === 'bigint' ? amountMinor : BigInt(Math.trunc(Number(amountMinor)));
    return { amountMinor: minor, currency };
  }

  /**
   * Create a Money value object from a major decimal string or number (e.g. 450.50 -> 45050).
   * Parses string with exact decimal shift to avoid floating-point representation error.
   */
  static fromMajor(majorAmount: number | string, currency: CurrencyCode = 'INR'): Money {
    const str = String(majorAmount).trim();
    const parts = str.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '00';
    if (fractionalPart.length === 1) fractionalPart += '0';
    else if (fractionalPart.length > 2) fractionalPart = fractionalPart.slice(0, 2);

    const sign = integerPart.startsWith('-') ? -1n : 1n;
    const cleanInteger = integerPart.replace('-', '');
    const minor = sign * (BigInt(cleanInteger) * 100n + BigInt(fractionalPart));
    return { amountMinor: minor, currency };
  }

  /**
   * Add two Money values of the same currency.
   */
  static add(a: Money, b: Money): Money {
    this.assertMatchingCurrency(a, b);
    return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
  }

  /**
   * Subtract b from a (a - b).
   */
  static subtract(a: Money, b: Money): Money {
    this.assertMatchingCurrency(a, b);
    return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
  }

  /**
   * Multiply Money by an integer factor.
   */
  static multiply(a: Money, factor: number | bigint): Money {
    const f = typeof factor === 'bigint' ? factor : BigInt(Math.trunc(factor));
    return { amountMinor: a.amountMinor * f, currency: a.currency };
  }

  /**
   * Calculate percentage (e.g. 5% tax or 10% service charge) using integer basis points.
   * Basis points: 1% = 100 bps, 5% = 500 bps, 18% = 1800 bps.
   * Uses half-up rounding on minor units.
   */
  static applyBasisPoints(a: Money, basisPoints: number | bigint): Money {
    const bps = typeof basisPoints === 'bigint' ? basisPoints : BigInt(Math.trunc(basisPoints));
    // (amountMinor * bps + 5000) / 10000 gives standard half-up rounding
    const product = a.amountMinor * bps;
    const rounded = (product + 5000n) / 10000n;
    return { amountMinor: rounded, currency: a.currency };
  }

  /**
   * Format Money for display with currency symbol.
   */
  static format(money: Money, locale: string = 'en-IN'): string {
    const major = Number(money.amountMinor) / 100;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
    } catch {
      return `${money.currency} ${major.toFixed(2)}`;
    }
  }

  /**
   * Zero constant for a given currency.
   */
  static zero(currency: CurrencyCode = 'INR'): Money {
    return { amountMinor: 0n, currency };
  }

  private static assertMatchingCurrency(a: Money, b: Money): void {
    if (a.currency !== b.currency) {
      throw new Error(`Currency mismatch: Cannot operate between ${a.currency} and ${b.currency}`);
    }
  }
}
