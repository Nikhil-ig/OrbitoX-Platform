import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LineChart } from '../charts/line-chart';
import { DonutChart } from '../charts/donut-chart';
import { Sparkline } from '../charts/sparkline';

const meta: Meta = {
  title: 'Visualizations/Charts',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const mockVelocity = [
  { day: 'Mon', revenue: 12000 },
  { day: 'Tue', revenue: 19000 },
  { day: 'Wed', revenue: 15000 },
  { day: 'Thu', revenue: 24000 },
  { day: 'Fri', revenue: 32000 },
  { day: 'Sat', revenue: 48000 },
  { day: 'Sun', revenue: 52000 },
];

const mockCategories = [
  { name: 'Dine-In', value: 60 },
  { name: 'Takeaway', value: 25 },
  { name: 'Delivery', value: 15 },
];

export const AllCharts: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-5xl">
      <LineChart
        title="Revenue Trajectory"
        description="Daily sales volume in INR across terminal cluster"
        data={mockVelocity}
        xAxisKey="day"
        series={[{ key: 'revenue', label: 'Gross Sales (₹)' }]}
      />

      <DonutChart
        title="Channel Breakdown"
        description="Order distribution by fulfillment type"
        data={mockCategories}
        centerLabel="Total Orders"
        centerValue="100%"
      />

      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <h4 className="text-sm font-semibold mb-2">Micro Trend Sparkline</h4>
        <Sparkline data={[10, 15, 8, 22, 19, 35, 42]} className="h-10 w-32" />
      </div>
    </div>
  ),
};

