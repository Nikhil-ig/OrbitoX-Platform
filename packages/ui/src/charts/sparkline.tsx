import * as React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '../utils/cn';

export interface SparklineProps {
  data: number[];
  color?: string; // CSS color string or defaults to primary token
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = 'var(--color-primary)',
  height = 32,
  className,
}: SparklineProps) {
  const chartData = React.useMemo(() => {
    return data.map((val, idx) => ({ idx, val }));
  }, [data]);

  return (
    <div className={cn('w-full h-8', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
