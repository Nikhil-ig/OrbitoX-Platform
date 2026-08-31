export interface CurrencyRate {
  code: string; // e.g. "USD", "EUR", "INR", "GBP", "JPY", "CAD"
  symbol: string; // e.g. "$", "€", "₹", "£", "¥", "C$"
  name: string;
  rateToUsd: number; // 1 USD = X target currency
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyRate[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToUsd: 1.0, decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToUsd: 0.92, decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToUsd: 0.79, decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUsd: 83.5, decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUsd: 155.0, decimals: 0 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUsd: 1.36, decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToUsd: 3.67, decimals: 2 },
];

export class CurrencyEngine {
  private currencies: Map<string, CurrencyRate> = new Map();

  constructor() {
    for (const c of SUPPORTED_CURRENCIES) {
      this.currencies.set(c.code, c);
    }
  }

  getSupportedCurrencies(): CurrencyRate[] {
    return Array.from(this.currencies.values());
  }

  getCurrency(code: string): CurrencyRate {
    return this.currencies.get(code.toUpperCase()) || this.currencies.get('USD')!;
  }

  convert(amount: number, targetCurrencyCode: string, fromCurrencyCode: string = 'USD'): number {
    const from = this.getCurrency(fromCurrencyCode);
    const to = this.getCurrency(targetCurrencyCode);

    if (from.code === to.code) {
      return amount;
    }

    const amountInUsd = from.code === 'USD' ? amount : amount / from.rateToUsd;
    const converted = to.code === 'USD' ? amountInUsd : amountInUsd * to.rateToUsd;

    if (to.decimals === 0) {
      return Math.round(converted);
    }
    return Number(converted.toFixed(to.decimals));
  }

  format(amountInTargetCurrency: number, currencyCode: string): string {
    const curr = this.getCurrency(currencyCode);
    const formattedNum = curr.decimals === 0
      ? Math.round(amountInTargetCurrency).toLocaleString()
      : amountInTargetCurrency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `${curr.symbol}${formattedNum}`;
  }
}
