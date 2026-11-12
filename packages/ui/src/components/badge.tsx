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
          'border-transparent bg-[var(--color-danger)] text-[var(--color-danger-fg)]',
        outline:
          'text-[var(--color-text)] border-[var(--color-border)] bg-transparent',
        success:
          'border-transparent bg-[var(--color-success)] text-[var(--color-success-fg)]',
        warning:
          'border-transparent bg-[var(--color-warning)] text-[var(--color-warning-fg)]',
        info:
          'border-transparent bg-[var(--color-info)] text-[var(--color-info-fg)]',
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

