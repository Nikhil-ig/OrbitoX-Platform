import * as React from 'react';
import { cn } from '../utils/cn';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-2 pb-6 border-b border-[var(--color-border)] mb-6', className)}
      {...props}
    >
      {breadcrumbs && <div className="text-xs text-[var(--color-text-muted)] mb-1">{breadcrumbs}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] leading-tight">{title}</h1>
          {description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

