import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Table as TableIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/button';

export interface LineChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface LineChartProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
  xAxisKey: string;
  series: LineChartSeries[];
  height?: number;
  className?: string;
}

export function LineChart({
  title,
  description,
  data,
  xAxisKey,
  series,
  height = 300,
  className,
}: LineChartProps) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xs space-y-4',
        className
      )}
    >
      {/* Accessible Header & Table Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTable((prev) => !prev)}
          className="h-7 text-xs gap-1.5"
          aria-expanded={showTable}
        >
          <TableIcon className="h-3.5 w-3.5" />
          <span>{showTable ? 'Show Chart' : 'Data Table'}</span>
        </Button>
      </div>

      {showTable ? (
        /* Accessible Table Fallback */
        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">{title} data table fallback</caption>
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] font-semibold">
              <tr>
                <th className="p-2 capitalize">{xAxisKey}</th>
                {series.map((s) => (
                  <th key={s.key} className="p-2">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="p-2 font-medium">{String(row[xAxisKey])}</td>
                  {series.map((s) => (
                    <td key={s.key} className="p-2">{String(row[s.key] ?? '-')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Chart */
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey={xAxisKey}
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              {series.map((s, idx) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color || (idx === 0 ? 'var(--color-primary)' : 'var(--color-accent)')}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
