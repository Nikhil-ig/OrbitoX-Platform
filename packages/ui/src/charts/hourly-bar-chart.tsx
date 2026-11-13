'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Table as TableIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/button';
import { t } from '../i18n';

export interface HourlyDataPoint {
  hour: string; // e.g. "12:00" or "12 PM"
  count: number;
  revenuePaise?: number;
}

export interface HourlyBarChartProps {
  title: string;
  description?: string;
  data: HourlyDataPoint[];
  height?: number;
  className?: string;
  selectedHour?: string;
  onSelectHour?: (hour: string) => void;
  formatValue?: (val: number) => string;
}

export function HourlyBarChart({
  title,
  description,
  data,
  height = 200,
  className,
  selectedHour,
  onSelectHour,
  formatValue = (v) => String(v),
}: HourlyBarChartProps) {
  const [showTable, setShowTable] = React.useState(false);

  // Determine peak count
  const maxCount = Math.max(...data.map((d) => d.count), 1);

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

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th scope="col" className="py-2 pr-4 font-medium">{t('charts.hour', 'Hour')}</th>
                <th scope="col" className="py-2 px-4 font-medium">{t('charts.orders', 'Orders')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-raised)]/30">
                  <td className="py-2 pr-4 font-medium text-[var(--color-text)]">{row.hour}</td>
                  <td className="py-2 px-4 font-semibold text-[var(--color-primary)]">{formatValue(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 4, left: -24, bottom: 0 }}
              onClick={(state) => {
                const activeLabel = state?.activePayload?.[0]?.payload?.hour;
                if (activeLabel && onSelectHour) onSelectHour(activeLabel);
              }}
            >
              <XAxis
                dataKey="hour"
                stroke="var(--color-text-muted)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--color-text-muted)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as HourlyDataPoint;
                  return (
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 text-xs shadow-lg space-y-0.5">
                      <div className="font-semibold text-[var(--color-text)]">{item.hour}</div>
                      <div className="text-[var(--color-primary)] font-bold">
                        {formatValue(item.count)} {t('charts.orders', 'orders')}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((entry, index) => {
                  const isSelected = selectedHour === entry.hour;
                  const isPeak = entry.count === maxCount;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        isSelected
                          ? 'var(--color-primary)'
                          : isPeak
                          ? 'var(--color-primary)'
                          : 'var(--color-surface-raised)'
                      }
                      className={cn(
                        'cursor-pointer transition-opacity',
                        !isSelected && !isPeak && 'opacity-60 hover:opacity-100'
                      )}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
