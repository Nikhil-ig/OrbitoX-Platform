import * as React from 'react';
import { cn } from '../utils/cn';

export interface FieldHintProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldHint = React.forwardRef<HTMLParagraphElement, FieldHintProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;
    return (
      <p
        ref={ref}
        className={cn('text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
FieldHint.displayName = 'FieldHint';

