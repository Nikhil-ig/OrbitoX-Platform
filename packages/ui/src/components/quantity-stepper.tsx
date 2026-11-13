import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export interface QuantityStepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  decreaseAriaLabel?: string;
  increaseAriaLabel?: string;
}

export function QuantityStepper({
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  decreaseAriaLabel,
  increaseAriaLabel,
  className,
  ...props
}: QuantityStepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  const handleDecrease = () => {
    if (canDecrease) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <div
      role="group"
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs select-none',
        className
      )}
      {...props}
    >
      <button
        type="button"
        disabled={!canDecrease}
        onClick={handleDecrease}
        aria-label={decreaseAriaLabel || t('quantity.decrease')}
        className={cn(
          'h-8 w-8 flex items-center justify-center rounded-l-full text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] cursor-pointer',
          !canDecrease && 'opacity-30 cursor-not-allowed'
        )}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <span
        aria-live="polite"
        className="w-8 text-center text-xs font-semibold text-[var(--color-text)] font-mono"
      >
        {value}
      </span>

      <button
        type="button"
        disabled={!canIncrease}
        onClick={handleIncrease}
        aria-label={increaseAriaLabel || t('quantity.increase')}
        className={cn(
          'h-8 w-8 flex items-center justify-center rounded-r-full text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] cursor-pointer',
          !canIncrease && 'opacity-30 cursor-not-allowed'
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

