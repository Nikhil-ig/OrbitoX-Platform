import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { t } from '../i18n';

export interface PaginationProps {
  pageIndex: number; // 0-based
  pageSize: number;
  totalRows: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  pageIndex,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = pageIndex + 1;

  const canPrevious = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs text-[var(--color-text-muted)] select-none',
        className
      )}
    >
      {/* Total rows & Page size selector */}
      <div className="flex items-center gap-4">
        <span>{totalRows} total records</span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>{t('table.rowsPerPage')}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-18 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Page indicator & navigation buttons */}
      <div className="flex items-center gap-2">
        <span className="mr-2">
          {t('table.pageOf', { current: currentPage, total: pageCount })}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={!canPrevious}
          className="h-8 w-8 p-0"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={!canPrevious}
          className="h-8 w-8 p-0"
          aria-label={t('common.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={!canNext}
          className="h-8 w-8 p-0"
          aria-label={t('common.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageCount - 1)}
          disabled={!canNext}
          className="h-8 w-8 p-0"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

