import * as React from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Table as TableIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/button';

export interface DonutSegment {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  title: string;
  description?: string;
  data: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  className?: string;
}

const DEFAULT_DONUT_COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-info)',
];

export function DonutChart({
  title,
  description,
  data,
  centerLabel,
  centerValue,
  height = 300,
  className,
}: DonutChartProps) {
  const [showTable, setShowTable] = React.useState(false);

  const total = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xs space-y-4',
        className
      )}
    >
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
        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">{title} data table fallback</caption>
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] font-semibold">
              <tr>
                <th className="p-2">Segment</th>
                <th className="p-2">Count</th>
                <th className="p-2">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.map((seg, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="p-2 font-medium">{seg.name}</td>
                  <td className="p-2">{seg.value}</td>
                  <td className="p-2">{total > 0 ? `${((seg.value / total) * 100).toFixed(1)}%` : '0%'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || DEFAULT_DONUT_COLORS[index % DEFAULT_DONUT_COLORS.length]}
                    aria-label={`${entry.name}: ${entry.value}`}
                  />
                ))}
              </Pie>
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
            </RechartsPieChart>
          </ResponsiveContainer>

          {/* Center Metric Label */}
          {(centerValue !== undefined || centerLabel) && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {centerValue !== undefined && (
                <span className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                  {centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                  {centerLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
