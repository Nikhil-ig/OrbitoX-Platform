'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import { formatINR } from '../format';

export interface FloorTable {
  id: string;
  name: string;
  shape: 'round' | 'square' | 'rect';
  x: number;
  y: number;
  seats: number;
  status: 'available' | 'seated' | 'reserved' | 'billed';
  activeOrderPaise?: number;
}

export interface FloorPlanProps extends React.HTMLAttributes<HTMLDivElement> {
  tables: FloorTable[];
  selectedTableId?: string;
  onSelectTable?: (id: string) => void;
  width?: number;
  height?: number;
}

export function FloorPlan({
  tables,
  selectedTableId,
  onSelectTable,
  width = 600,
  height = 400,
  className,
  ...props
}: FloorPlanProps) {
  const getStatusColorClass = (status: FloorTable['status'], isSelected: boolean) => {
    if (isSelected) {
      return 'stroke-[var(--color-primary)] fill-[var(--color-primary)]/20 stroke-2';
    }
    switch (status) {
      case 'available':
        return 'stroke-[var(--color-success)] fill-[var(--color-success-subtle)] stroke-1';
      case 'seated':
        return 'stroke-[var(--color-primary)] fill-[var(--color-primary)]/10 stroke-1';
      case 'billed':
        return 'stroke-[var(--color-warning)] fill-[var(--color-warning-subtle)] stroke-1';
      case 'reserved':
        return 'stroke-[var(--color-border)] fill-[var(--color-surface-raised)] stroke-1';
      default:
        return 'stroke-[var(--color-border)] fill-[var(--color-surface)] stroke-1';
    }
  };

  return (
    <div
      role="region"
      aria-label={t('common.floorPlan', 'Restaurant Floor Plan')}
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 select-none',
        className
      )}
      {...props}
    >
      {/* SVG Canvas Map */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full aspect-[3/2] max-h-[460px] bg-[var(--color-surface-raised)]/30 rounded-xl border border-[var(--color-border)]/50"
        aria-label={t('common.interactiveFloorMap', 'Interactive Floor Map')}
        role="group"
      >
        {tables.map((table) => {
          const isSelected = selectedTableId === table.id;
          const statusClass = getStatusColorClass(table.status, isSelected);

          const w = table.shape === 'rect' ? 84 : 54;
          const h = 54;
          const r = 27;

          return (
            <g
              key={table.id}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${table.name}, ${table.seats} seats, ${table.status}${table.activeOrderPaise ? `, ${formatINR(table.activeOrderPaise)}` : ''}`}
              onClick={() => onSelectTable?.(table.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTable?.(table.id);
                }
              }}
              className="cursor-pointer transition-transform duration-150 hover:scale-105 focus:outline-none"
            >
              {table.shape === 'round' ? (
                <circle
                  cx={table.x}
                  cy={table.y}
                  r={r}
                  className={cn('transition-colors', statusClass)}
                />
              ) : (
                <rect
                  x={table.x - w / 2}
                  y={table.y - h / 2}
                  width={w}
                  height={h}
                  rx={12}
                  className={cn('transition-colors', statusClass)}
                />
              )}
              <text
                x={table.x}
                y={table.y - 4}
                textAnchor="middle"
                className="fill-[var(--color-text)] font-bold text-xs pointer-events-none select-none"
              >
                {table.name}
              </text>
              <text
                x={table.x}
                y={table.y + 12}
                textAnchor="middle"
                className="fill-[var(--color-text-muted)] text-[10px] pointer-events-none select-none"
              >
                {`${table.seats}p`}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Screen-reader Accessible Table Fallback */}
      <div className="sr-only">
        <table>
          <caption>{t('common.floorPlanTables', 'Floor Plan Table Roster')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('common.table', 'Table')}</th>
              <th scope="col">{t('common.seats', 'Seats')}</th>
              <th scope="col">{t('common.status', 'Status')}</th>
              <th scope="col">{t('common.bill', 'Bill')}</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.id}>
                <td>{table.name}</td>
                <td>{table.seats}</td>
                <td>{table.status}</td>
                <td>{table.activeOrderPaise ? formatINR(table.activeOrderPaise) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
