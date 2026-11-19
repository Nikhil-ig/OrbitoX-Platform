import * as React from 'react';
import { cn } from '../utils/cn';

export interface ShellContentFrameProps {
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  maxWidth?: 'full' | '7xl' | '6xl' | '4xl' | '2xl';
}

const MAX_WIDTH_MAP = {
  full: 'max-w-full',
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '4xl': 'max-w-4xl',
  '2xl': 'max-w-2xl',
};

export function ShellContentFrame({
  banner,
  children,
  className,
  innerClassName,
  maxWidth = '7xl',
}: ShellContentFrameProps) {
  return (
    <div className={cn('flex flex-1 flex-col overflow-y-auto', className)}>
      {banner && <div className="w-full shrink-0">{banner}</div>}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className={cn('mx-auto', MAX_WIDTH_MAP[maxWidth] || 'max-w-7xl', innerClassName)}>
          {children}
        </div>
      </main>
    </div>
  );
}
