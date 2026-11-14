'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export interface RingTimerProps extends React.HTMLAttributes<HTMLDivElement> {
  totalSeconds: number;
  elapsedSeconds: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function RingTimer({
  totalSeconds,
  elapsedSeconds,
  size = 'md',
  showText = true,
  className,
  ...props
}: RingTimerProps) {
  const percent = Math.min(100, Math.max(0, (elapsedSeconds / Math.max(1, totalSeconds)) * 100));
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  const dimension = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;
  const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  const radius = (dimension - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Status color based on progress
  let statusStrokeClass = 'text-[var(--color-success)]';
  if (percent >= 85) {
    statusStrokeClass = 'text-[var(--color-danger)]';
  } else if (percent >= 60) {
    statusStrokeClass = 'text-[var(--color-warning)]';
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const displayTime = minutes > 0 ? `${minutes}m` : `${seconds}s`;

  return (
    <div
      role="timer"
      aria-label={`${t('common.timer', 'Timer')}: ${displayTime}`}
      className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}
      {...props}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          className="text-[var(--color-border)] opacity-30"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn('transition-all duration-300 ease-out', statusStrokeClass)}
        />
      </svg>
      {showText && (
        <span
          className={cn(
            'absolute font-semibold tracking-tight text-[var(--color-text)]',
            size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
          )}
        >
          {displayTime}
        </span>
      )}
    </div>
  );
}
