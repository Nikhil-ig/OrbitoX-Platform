import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)]',
        secondary:
          'border-transparent bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]',
        destructive:
          'border border-[var(--color-danger)]/30 bg-[var(--color-danger-subtle)] text-[var(--color-danger)]',
        outline:
          'text-[var(--color-text)] border-[var(--color-border)] bg-transparent',
        success:
          'border border-[var(--color-success)]/30 bg-[var(--color-success-subtle)] text-[var(--color-success)]',
        warning:
          'border border-[var(--color-warning)]/30 bg-[var(--color-warning-subtle)] text-[var(--color-warning)]',
        info:
          'border border-[var(--color-info)]/30 bg-[var(--color-info-subtle)] text-[var(--color-info)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

