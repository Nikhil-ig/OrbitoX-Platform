import * as React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/button';
import { t } from '../i18n';

const HEIGHT_CLASSES: Record<number, string> = {
  0: 'h-0',
  10: 'h-[10%]',
  15: 'h-[15%]',
  20: 'h-[20%]',
  25: 'h-[25%]',
  30: 'h-[30%]',
  35: 'h-[35%]',
  40: 'h-[40%]',
  45: 'h-[45%]',
  50: 'h-[50%]',
  55: 'h-[55%]',
  60: 'h-[60%]',
  65: 'h-[65%]',
  70: 'h-[70%]',
  75: 'h-[75%]',
  80: 'h-[80%]',
  85: 'h-[85%]',
  90: 'h-[90%]',
  95: 'h-[95%]',
  100: 'h-full',
};

function getDiscreteHeightClass(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const nearest5 = Math.round(clamped / 5) * 5;
  return HEIGHT_CLASSES[nearest5] || 'h-0';
}

export interface LollipopDataPoint {
  label: string;
  value: number;
  highlighted?: boolean;
}

export interface LollipopChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  title?: string;
  description?: string;
  data: LollipopDataPoint[];
  maxValue?: number;
  selectedLabel?: string;
  onSelect?: (label: string) => void;
  height?: number;
}

export function LollipopChart({
  title,
  description,
  data,
  maxValue,
  selectedLabel,
  onSelect,
  className,
  ...props
}: LollipopChartProps) {
  const [showTable, setShowTable] = React.useState(false);
  const calculatedMax = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      role="region"
      aria-label={title || t('charts.dataTable')}
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 shadow-sm select-none',
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>}
            {description && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable((prev) => !prev)}
            className="h-7 text-xs gap-1.5 rounded-full"
            aria-expanded={showTable}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>{showTable ? t('charts.showChart') : t('charts.dataTable')}</span>
          </Button>
        </div>
      )}

      {showTable ? (
        <div className="overflow-x-auto max-h-[220px]">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">{t('charts.tableFallback', { title: title || 'Lollipop' })}</caption>
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] font-semibold">
              <tr>
                <th className="p-2.5">{t('charts.segment')}</th>
                <th className="p-2.5 text-right">{t('charts.count')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.map((d) => (
                <tr key={d.label} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="p-2.5 font-medium">{d.label}</td>
                  <td className="p-2.5 text-right font-mono">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2 h-48 pt-8 pb-2 px-2">
          {data.map((item) => {
            const isSelected = item.highlighted || item.label === selectedLabel;
            const percent = (item.value / calculatedMax) * 100;
            const heightClass = getDiscreteHeightClass(percent);

            return (
              <div
                key={item.label}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(item.label)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(item.label);
                  }
                }}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group focus-visible:outline-none"
              >
                {/* Stem & Top Dot */}
                <div className={cn('relative w-full flex flex-col items-center justify-end', heightClass)}>
                  {/* Selected Value Pill Badge on Top */}
                  {isSelected && (
                    <div className="absolute -top-7 rounded-full bg-[var(--color-text)] text-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold font-mono shadow-xs animate-in fade-in zoom-in-95">
                      {item.value}
                    </div>
                  )}

                  {/* Top Dot */}
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125',
                      isSelected
                        ? 'bg-[var(--color-text)] ring-2 ring-[var(--color-text)]/20'
                        : 'bg-[var(--color-primary)]'
                    )}
                  />

                  {/* Vertical Thin Stem */}
                  <div
                    className={cn(
                      'w-0.5 flex-1 transition-colors',
                      isSelected ? 'bg-[var(--color-text)]' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-primary)]/50'
                    )}
                  />
                </div>

                {/* Day / Label Below */}
                <div className="mt-3">
                  <span
                    className={cn(
                      'h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-[var(--color-text)] text-[var(--color-surface)] font-semibold'
                        : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]'
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

