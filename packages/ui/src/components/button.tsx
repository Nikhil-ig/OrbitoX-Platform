import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] focus-visible:ring-[var(--color-focus-ring)] shadow-sm',
        secondary:
          'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] focus-visible:ring-[var(--color-focus-ring)]',
        destructive:
          'bg-[var(--color-danger)] text-[var(--color-danger-fg)] hover:opacity-90 focus-visible:ring-[var(--color-danger)] shadow-sm',
        danger:
          'bg-[var(--color-danger)] text-[var(--color-danger-fg)] hover:opacity-90 focus-visible:ring-[var(--color-danger)] shadow-sm',
        outline:
          'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--color-focus-ring)]',
        ghost:
          'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus-visible:ring-[var(--color-focus-ring)]',
        link:
          'text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-focus-ring)] p-0 h-auto',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-xs gap-1.5',
        md: 'h-10 px-4 py-2 text-sm gap-2',
        lg: 'h-11 rounded-md px-8 text-base gap-2.5',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, icon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            {children}
          </>
        ) : (
          <>
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

