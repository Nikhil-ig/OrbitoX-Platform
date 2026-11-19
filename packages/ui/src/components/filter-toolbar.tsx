import * as React from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Input } from './input';
import { t } from '../i18n';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterToolbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: FilterOption[];
  extraFilters?: React.ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  className?: string;
}

export function FilterToolbar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder,
  statusFilter = 'ALL',
  onStatusChange,
  statusOptions = [],
  extraFilters,
  activeFilterCount = 0,
  onResetFilters,
  className,
}: FilterToolbarProps) {
  const [localQuery, setLocalQuery] = React.useState(searchQuery);

  React.useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchChange?.(localQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, onSearchChange]);

  const handleClearSearch = () => {
    setLocalQuery('');
    onSearchChange?.('');
  };

  const hasActiveFilters =
    Boolean(localQuery) ||
    (statusFilter && statusFilter !== 'ALL') ||
    activeFilterCount > 0;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]',
        className
      )}
      data-testid="filter-toolbar"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
        <Input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder={searchPlaceholder || t('common.search')}
          className="pl-9 pr-9 h-10 text-xs bg-[var(--color-surface-raised)] border-[var(--color-border)]"
        />
        {localQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-2.5 p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label={t('filter.clearSearch')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Filter Buttons / Pills */}
        {statusOptions.length > 0 && (
          <div className="flex items-center gap-1 p-0.5 rounded-[var(--radius-button)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            {statusOptions.map((opt) => {
              const isSelected = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onStatusChange?.(opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[calc(var(--radius-button)-2px)] font-medium transition-colors min-h-[32px]',
                    isSelected
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs font-semibold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  )}
                >
                  <span>{opt.label}</span>
                  {typeof opt.count === 'number' && (
                    <span className="text-[10px] px-1 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {extraFilters}

        {/* Reset All Filters Button */}
        {hasActiveFilters && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 px-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            title={t('filter.resetTitle')}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span>{t('filter.reset')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
