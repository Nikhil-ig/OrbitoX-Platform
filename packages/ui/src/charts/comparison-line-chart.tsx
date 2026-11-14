'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Table as TableIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/button';
import { t } from '../i18n';

export interface ComparisonLineChartProps {
  title: string;
  description?: string;
  data: Array<{ label: string; current: number; previous: number; [key: string]: any }>;
  currentLabel?: string;
  previousLabel?: string;
  height?: number;
  className?: string;
  formatValue?: (val: number) => string;
}

export function ComparisonLineChart({
  title,
  description,
  data,
  currentLabel = 'Current Period',
  previousLabel = 'Previous Period',
  height = 260,
  className,
  formatValue = (v) => String(v),
}: ComparisonLineChartProps) {
  const [showTable, setShowTable] = React.useState(false);
  const gradientId = React.useId();

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xs space-y-4 select-none',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">{title}</h3>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Legend indicators */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
              <span className="text-[var(--color-text-muted)]">{currentLabel}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t-2 border-dashed border-[var(--color-text-muted)]" />
              <span className="text-[var(--color-text-muted)]">{previousLabel}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((prev) => !prev)}
            aria-expanded={showTable}
            aria-label={t('charts.toggleTable', 'Toggle accessible table view')}
            className="rounded-full"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th scope="col" className="py-2 pr-4 font-medium">{t('charts.axis', 'Period')}</th>
                <th scope="col" className="py-2 px-4 font-medium">{currentLabel}</th>
                <th scope="col" className="py-2 pl-4 font-medium">{previousLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-raised)]/30">
                  <td className="py-2 pr-4 font-medium text-[var(--color-text)]">{row.label}</td>
                  <td className="py-2 px-4 text-[var(--color-primary)] font-semibold">{formatValue(row.current)}</td>
                  <td className="py-2 pl-4 text-[var(--color-text-muted)]">{formatValue(row.previous)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey="label"
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  return (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5 text-xs shadow-lg space-y-1">
                      <div className="font-semibold text-[var(--color-text)]">{item.label}</div>
                      <div className="flex items-center justify-between gap-4 text-[var(--color-primary)]">
                        <span>{currentLabel}:</span>
                        <span className="font-bold">{formatValue(item.current)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[var(--color-text-muted)]">
                        <span>{previousLabel}:</span>
                        <span>{formatValue(item.previous)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Gradient Area under primary series */}
              <Area
                type="monotone"
                dataKey="current"
                stroke="none"
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
              {/* Dashed comparison line */}
              <Line
                type="monotone"
                dataKey="previous"
                stroke="var(--color-text-muted)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              {/* Primary current line */}
              <Line
                type="monotone"
                dataKey="current"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

