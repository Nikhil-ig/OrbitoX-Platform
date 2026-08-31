'use client';

import { useState, useCallback } from 'react';
import { commerceEngine } from '../domain/commerce.engine';
import { CurrencyRate } from '../domain/engines/currency/currency.engine';

export function useCommerceCurrency(baseCurrency: string = 'USD', storeSlug?: string) {
  const storageKey = storeSlug ? `orbitox_currency_${storeSlug}` : 'orbitox_currency';

  const [currentCurrency, setCurrentCurrencyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    }
    return baseCurrency;
  });

  const setCurrentCurrency = useCallback((code: string) => {
    setCurrentCurrencyState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, code);
      window.dispatchEvent(new CustomEvent('orbitox:currency_changed', { detail: { currency: code, storeSlug } }));
    }
  }, [storageKey, storeSlug]);

  const supported = commerceEngine.currency.getSupportedCurrencies();

  const convertPrice = useCallback(
    (amountInBaseCurrency: number, customBase?: string) => {
      const base = customBase || baseCurrency;
      return commerceEngine.currency.convert(amountInBaseCurrency, currentCurrency, base);
    },
    [currentCurrency, baseCurrency]
  );

  const formatPrice = useCallback(
    (amountInBaseCurrency: number, customBase?: string) => {
      const base = customBase || baseCurrency;
      const converted = commerceEngine.currency.convert(amountInBaseCurrency, currentCurrency, base);
      return commerceEngine.currency.format(converted, currentCurrency);
    },
    [currentCurrency, baseCurrency]
  );

  return {
    currentCurrency,
    setCurrentCurrency,
    supportedCurrencies: supported,
    convertPrice,
    formatPrice,
  };
}
