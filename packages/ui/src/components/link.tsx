import * as React from 'react';
import { cn } from '../utils/cn';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'muted' | 'underline';
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'text-[var(--color-link,var(--color-primary))] hover:underline focus-visible:ring-[var(--color-focus-ring)]',
      muted: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline focus-visible:ring-[var(--color-focus-ring)]',
      underline: 'text-[var(--color-text)] underline underline-offset-4 hover:text-[var(--color-link,var(--color-primary))] focus-visible:ring-[var(--color-focus-ring)]',
    };

    return (
      <a
        ref={ref}
        className={cn(
          'inline-flex items-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded-sm cursor-pointer',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);
Link.displayName = 'Link';

