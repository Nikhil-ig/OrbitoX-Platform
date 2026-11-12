import * as React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { t } from '../i18n';

export interface FilterPill {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  activePills?: FilterPill[];
  onClearAll?: () => void;
  actions?: React.ReactNode;
}

export function FilterBar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder,
  activePills = [],
  onClearAll,
  actions,
  className,
  ...props
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-2.5 mb-4', className)} {...props}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-subtle)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || t('common.search')}
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Action buttons slot (e.g. Columns, Export, Add) */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" />
            <span>{t('common.filter')}:</span>
          </span>

          {activePills.map((pill) => (
            <span
              key={pill.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs text-[var(--color-text)]"
            >
              <span className="text-[var(--color-text-muted)]">{pill.label}:</span>
              <span className="font-medium">{pill.value}</span>
              <button
                type="button"
                onClick={pill.onRemove}
                className="ml-1 rounded-full p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] cursor-pointer"
                aria-label={`Remove filter ${pill.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-6 px-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

