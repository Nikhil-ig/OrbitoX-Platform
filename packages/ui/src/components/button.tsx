import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:opacity-95 focus-visible:ring-[var(--color-focus-ring)] shadow-xs',
        secondary:
          'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] focus-visible:ring-[var(--color-focus-ring)]',
        destructive:
          'bg-[var(--color-danger-solid)] text-white hover:opacity-90 focus-visible:ring-[var(--color-danger)] shadow-sm',
        danger:
          'bg-[var(--color-danger-solid)] text-white hover:opacity-90 focus-visible:ring-[var(--color-danger)] shadow-sm',
        outline:
          'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--color-focus-ring)]',
        ghost:
          'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus-visible:ring-[var(--color-focus-ring)]',
        link:
          'text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-focus-ring)] p-0 h-auto rounded-none',
      },
      size: {
        sm: 'h-8 rounded-full px-3.5 text-xs gap-1.5',
        md: 'h-10 rounded-full px-5 py-2 text-sm gap-2',
        lg: 'h-11 rounded-full px-7 text-base gap-2.5',
        icon: 'h-11 w-11 rounded-full p-0',
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

