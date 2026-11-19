'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface VegMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: 'veg' | 'non-veg' | 'egg';
  size?: 'sm' | 'md' | 'lg';
}

export function VegMark({
  type,
  size = 'md',
  className,
  ...props
}: VegMarkProps) {
  const dimensionClass =
    size === 'sm' ? 'h-3.5 w-3.5 p-0.5' : size === 'lg' ? 'h-5 w-5 p-1' : 'h-4 w-4 p-0.5';

  const label =
    type === 'veg'
      ? 'Vegetarian'
      : type === 'non-veg'
      ? 'Non-Vegetarian'
      : 'Contains Egg';

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-xs border shrink-0',
        dimensionClass,
        type === 'veg' && 'border-emerald-600 bg-emerald-50/20',
        type === 'non-veg' && 'border-rose-700 bg-rose-50/20',
        type === 'egg' && 'border-amber-500 bg-amber-50/20',
        className
      )}
      {...props}
    >
      {type === 'veg' && (
        <span className="h-full w-full rounded-full bg-emerald-600" />
      )}
      {type === 'non-veg' && (
        <span className="h-0 w-0 border-x-4 border-x-transparent border-b-[8px] border-b-rose-700" />
      )}
      {type === 'egg' && (
        <span className="h-full w-full rounded-full bg-amber-500" />
      )}
    </span>
  );
}

