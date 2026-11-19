import * as React from 'react';
import { cn } from '../utils/cn';

export interface SegmentedControlOption<T extends string = string> {
  value?: T;
  id?: T;
  label: string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: T;
  onChange: (value: T) => void;
  options?: readonly SegmentedControlOption<T>[] | SegmentedControlOption<T>[];
  segments?: readonly SegmentedControlOption<T>[] | SegmentedControlOption<T>[];
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options: optionsProp,
  segments: segmentsProp,
  size = 'md',
  ariaLabel,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const options = optionsProp || segmentsProp || [];
  const sizeClasses = {
    sm: 'h-8 p-0.5 text-xs',
    md: 'h-10 p-1 text-xs',
    lg: 'h-11 p-1 text-sm',
  };

  const itemSizeClasses = {
    sm: 'px-2.5 py-1',
    md: 'px-3.5 py-1.5',
    lg: 'px-5 py-2',
  };

  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    if (nextIndex !== currentIndex && !options[nextIndex]?.disabled) {
      const targetOpt = options[nextIndex]!;
      const targetVal = (targetOpt.value ?? targetOpt.id) as T;
      onChange(targetVal);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] select-none',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {options.map((opt, idx) => {
        const optVal = (opt.value ?? opt.id) as T;
        const isActive = optVal === value;
        return (
          <button
            key={String(optVal)}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={opt.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !opt.disabled && onChange(optVal)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
              itemSizeClasses[size],
              isActive
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold shadow-[var(--shadow-accent-glow)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]',
              opt.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span>{opt.label}</span>
            {opt.badge && <span className="ml-1.5 shrink-0">{opt.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

