import * as React from 'react';
import { cn } from '../utils/cn';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]/50', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

