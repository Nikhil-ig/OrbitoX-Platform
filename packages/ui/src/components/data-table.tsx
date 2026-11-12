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
import { ChevronDown, ArrowUpDown, Download, Columns } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu';
import { Pagination } from './pagination';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { t } from '../i18n';

export interface DataTableProps<TData, TValue> {
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
  onRetry?: () => void;
  enableRowSelection?: boolean;
  onSelectedRowsChange?: (rows: TData[]) => void;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  exportCsvFilename?: string;
  onExportCsv?: () => Promise<string> | string; // Returns raw CSV string
  renderMobileCard?: (row: TData) => React.ReactNode;
  className?: string;
}

export function DataTable<TData, TValue>({
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
  onRetry,
  enableRowSelection = false,
  onSelectedRowsChange,
  bulkActions,
  exportCsvFilename = 'export.csv',
  onExportCsv,
  renderMobileCard,
  className,
}: DataTableProps<TData, TValue>) {
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
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
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
      sorting,
      columnVisibility,
      rowSelection,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalRows / pageSize),
    onSortingChange: onSortingChange as any,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection,
  });

  // Notify parent of selected rows change
  React.useEffect(() => {
    if (onSelectedRowsChange) {
      const selectedData = table.getSelectedRowModel().flatRows.map((r) => r.original);
      onSelectedRowsChange(selectedData);
    }
  }, [rowSelection, onSelectedRowsChange, table]);

  const selectedRowCount = Object.keys(rowSelection).length;
  const selectedRows = table.getSelectedRowModel().flatRows.map((r) => r.original);

  const handleCsvExport = async () => {
    if (!onExportCsv) return;
    try {
      setIsExporting(true);
      const csvContent = await onExportCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', exportCsvFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Top Toolbar: Bulk actions & Column visibility toggle & CSV export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {selectedRowCount > 0 ? (
          <div className="flex items-center gap-3 bg-[var(--color-surface)] px-3 py-1.5 rounded-md border border-[var(--color-border)] text-xs">
            <span className="font-medium text-[var(--color-primary)]">
              {t('table.selectedCount', { count: selectedRowCount, total: data.length })}
            </span>
            {bulkActions && <div className="flex items-center gap-2">{bulkActions(selectedRows)}</div>}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 ml-auto">
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCsvExport}
              loading={isExporting}
              icon={<Download className="h-3.5 w-3.5" />}
              className="h-8 text-xs"
            >
              Export CSV
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Columns className="h-3.5 w-3.5" />
                Columns
                <ChevronDown className="h-3 w-3 opacity-50" />
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
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-10 px-4 py-2 font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
              {loading ? (
                Array.from({ length: pageSize }).map((_, rIdx) => (
                  <tr key={rIdx} className="h-12">
                    {tableColumns.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-2">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="h-12 transition-colors hover:bg-[var(--color-surface)] data-[state=selected]:bg-[var(--color-surface)]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableColumns.length} className="h-48 text-center">
                    <EmptyState />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Card View Fallback */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : data.length > 0 ? (
          data.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs"
            >
              {renderMobileCard ? (
                renderMobileCard(item)
              ) : (
                <div className="space-y-2 text-xs">
                  {columns
                    .filter((c: any) => c.accessorKey)
                    .map((col: any) => (
                      <div key={col.accessorKey} className="flex justify-between border-b border-[var(--color-border)]/50 pb-1">
                        <span className="text-[var(--color-text-muted)] font-medium capitalize">{col.accessorKey}</span>
                        <span className="font-semibold">{String((item as any)[col.accessorKey] ?? '-')}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Pagination Footer */}
      {onPageChange && (
        <Pagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalRows={totalRows}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

/**
 * Convenience Column Header with Sort Button
 */
export function DataTableColumnHeader({
  column,
  title,
  className,
}: {
  column: any;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <div className={cn('text-xs font-semibold', className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8 text-xs font-semibold hover:bg-[var(--color-surface-raised)]', className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      <span>{title}</span>
      <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
    </Button>
  );
}
