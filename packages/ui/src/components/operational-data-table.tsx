import * as React from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';

export type { ColumnDef };
import {
  ChevronDown,
  ArrowUpDown,
  Download,
  Columns,
  ShieldAlert,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Checkbox } from './checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Pagination } from './pagination';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { t } from '../i18n';

export interface OperationalDataTableProps<TData, TValue = any> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalRows?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  loading?: boolean;
  error?: string | null;
  isForbidden?: boolean;
  onRetry?: () => void;
  enableRowSelection?: boolean;
  onSelectedRowsChange?: (rows: TData[]) => void;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  exportCsvFilename?: string;
  onExportCsv?: () => Promise<string> | string;
  renderMobileCard?: (row: TData) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: TData) => void;
  className?: string;
}

export function OperationalDataTable<TData, TValue>({
  columns,
  data,
  totalRows = data.length,
  pageIndex = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  loading = false,
  error = null,
  isForbidden = false,
  onRetry,
  enableRowSelection = false,
  onSelectedRowsChange,
  bulkActions,
  exportCsvFilename = 'operational-export.csv',
  onExportCsv,
  renderMobileCard,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the active filter criteria.',
  onRowClick,
  className,
}: OperationalDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [isExporting, setIsExporting] = React.useState(false);

  // Prepend select checkbox column if enabled
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectCol: ColumnDef<TData, any> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('table.selectAllRows')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('table.selectRowAria')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectCol, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting: sorting || [],
      rowSelection,
      columnVisibility,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    pageCount: Math.ceil(totalRows / pageSize),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection,
    onRowSelectionChange: (updater) => {
      const nextSelection =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(nextSelection);

      if (onSelectedRowsChange) {
        const selectedIndices = Object.keys(nextSelection).filter((k) => nextSelection[k]);
        const selectedData = selectedIndices
          .map((idx) => data[parseInt(idx, 10)])
          .filter((item): item is TData => item !== undefined);
        onSelectedRowsChange(selectedData);
      }
    },
    onSortingChange: (updater) => {
      if (onSortingChange) {
        const nextSorting =
          typeof updater === 'function' ? updater(sorting || []) : updater;
        onSortingChange(nextSorting);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedRowsList = React.useMemo(() => {
    const selectedIndices = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    return selectedIndices
      .map((idx) => data[parseInt(idx, 10)])
      .filter((item): item is TData => item !== undefined);
  }, [rowSelection, data]);

  const handleExportCsv = async () => {
    if (!onExportCsv) return;
    try {
      setIsExporting(true);
      const csv = await onExportCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportCsvFilename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // State 4: Forbidden / Access Denied
  if (isForbidden) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-danger)]/30 bg-[var(--color-surface)] p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)] flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text)]">{t('table.accessRestricted')}</h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
          {t('table.accessRestrictedDesc')}
        </p>
      </div>
    );
  }

  // State 3: Error State with Retry
  if (error && !loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <ErrorState
          title={t('table.failedToLoad')}
          description={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)} data-testid="operational-data-table">
      {/* Table Action Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {enableRowSelection && selectedRowsList.length > 0 && bulkActions ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                {selectedRowsList.length} {t('table.selectedWord')}
              </span>
              {bulkActions(selectedRowsList)}
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              {t('table.showingWord')} {data.length > 0 ? pageIndex * pageSize + 1 : 0}–
              {Math.min((pageIndex + 1) * pageSize, totalRows)} {t('table.ofWord')} {totalRows} {t('table.recordsWord')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Columns className="h-3.5 w-3.5" />
                <span>{t('table.columnsWord')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Optional CSV Export */}
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
        {/* Responsive Mobile Cards for Phone Viewport (< 640px) */}
        {renderMobileCard && (
          <div className="block sm:hidden divide-y divide-[var(--color-border)]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : data.length === 0 ? (
              <div className="p-6 text-center">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </div>
            ) : (
              data.map((row, i) => (
                <div
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'p-3.5 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-[var(--color-surface-raised)]'
                  )}
                >
                  {renderMobileCard(row)}
                </div>
              ))
            )}
          </div>
        )}

        {/* Standard Desktop / Tablet Table View (hidden on mobile if card renderer provided) */}
        <div
          className={cn(
            'overflow-x-auto scrollbar-none',
            renderMobileCard && 'hidden sm:block'
          )}
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className="py-3 px-3.5 font-semibold text-[var(--color-text)] select-none whitespace-nowrap"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1.5 hover:text-[var(--color-primary)] transition-colors group text-left font-semibold"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="h-3 w-3 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] shrink-0" />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                // State 1: Loading Skeleton Rows
                Array.from({ length: pageSize > 10 ? 8 : pageSize }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    {tableColumns.map((_, cIdx) => (
                      <td key={cIdx} className="py-3.5 px-3.5">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // State 2: Empty State
                <tr>
                  <td colSpan={tableColumns.length} className="py-12 px-4 text-center">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                // Data Rows
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'transition-colors',
                      row.getIsSelected() && 'bg-[var(--color-primary)]/5',
                      onRowClick
                        ? 'cursor-pointer hover:bg-[var(--color-surface-raised)]'
                        : 'hover:bg-[var(--color-surface-raised)]/50'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="py-3 px-3.5 text-[var(--color-text)] whitespace-nowrap"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {totalRows > pageSize && (
        <div className="pt-1">
          <Pagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalRows={totalRows}
            onPageChange={onPageChange || (() => {})}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
