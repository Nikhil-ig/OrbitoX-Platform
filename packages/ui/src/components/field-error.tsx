import * as React from 'react';
import { cn } from '../utils/cn';

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string | null;
}

export const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, error, children, ...props }, ref) => {
    const message = error || children;
    if (!message) return null;

    return (
      <p
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn('text-xs font-medium text-[var(--color-danger)] mt-1.5 flex items-center gap-1', className)}
        {...props}
      >
        {message}
      </p>
    );
  }
);
FieldError.displayName = 'FieldError';

