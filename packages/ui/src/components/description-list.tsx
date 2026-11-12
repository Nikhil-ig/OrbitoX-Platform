import * as React from 'react';
import { cn } from '../utils/cn';

export interface DescriptionItem {
  term: React.ReactNode;
  detail: React.ReactNode;
}

export interface DescriptionListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
}

export function DescriptionList({
  items,
  columns = 2,
  className,
  ...props
}: DescriptionListProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-xs',
        colClasses[columns],
        className
      )}
      {...props}
    >
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <dt className="font-medium text-[var(--color-text-muted)] tracking-wide">{item.term}</dt>
          <dd className="font-semibold text-[var(--color-text)]">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

