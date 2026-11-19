import * as React from 'react';
import { cn } from '../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]',
          'placeholder:text-[var(--color-text-subtle)]',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          error
            ? 'border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]'
            : 'border-[var(--color-border)] focus-visible:ring-[var(--color-focus-ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

