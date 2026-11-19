import * as React from 'react';
import { cn } from '../utils/cn';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 font-mono text-[10px] font-medium text-[var(--color-text-muted)] shadow-xs',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
