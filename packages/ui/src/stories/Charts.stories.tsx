import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LineChart } from '../charts/line-chart';
import { BarChart } from '../charts/bar-chart';
import { AreaChart } from '../charts/area-chart';
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
  { day: 'Mon', revenue: 12000, orders: 42 },
  { day: 'Tue', revenue: 19000, orders: 64 },
  { day: 'Wed', revenue: 15000, orders: 51 },
  { day: 'Thu', revenue: 24000, orders: 79 },
  { day: 'Fri', revenue: 32000, orders: 108 },
  { day: 'Sat', revenue: 48000, orders: 156 },
  { day: 'Sun', revenue: 52000, orders: 171 },
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
        title="Revenue Trajectory (LineChart)"
        description="Daily sales volume in INR across terminal cluster"
        data={mockVelocity}
        xAxisKey="day"
        series={[{ key: 'revenue', label: 'Gross Sales (₹)' }]}
      />

      <BarChart
        title="Orders by Day (BarChart)"
        description="Fulfilled POS and storefront orders per day"
        data={mockVelocity}
        xAxisKey="day"
        series={[{ key: 'orders', label: 'Orders' }]}
      />

      <AreaChart
        title="Cumulative Settlement Volume (AreaChart)"
        description="Rolling settlement growth curve across merchant branches"
        data={mockVelocity}
        xAxisKey="day"
        series={[{ key: 'revenue', label: 'Settled (₹)' }]}
      />

      <DonutChart
        title="Channel Breakdown (DonutChart)"
        description="Order distribution by fulfillment type"
        data={mockCategories}
        centerLabel="Total Orders"
        centerValue="100%"
      />

      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] md:col-span-2">
        <h4 className="text-sm font-semibold mb-2 text-[var(--color-text)]">Micro Trend Sparkline</h4>
        <Sparkline data={[10, 15, 8, 22, 19, 35, 42]} className="h-10 w-32" />
      </div>
    </div>
  ),
};

export const EmptyChartFallback: StoryObj = {
  render: () => (
    <div className="max-w-xl p-6">
      <BarChart
        title="Empty Telemetry Window"
        description="Renders cleanly with zero data points and accessible table toggle."
        data={[]}
        xAxisKey="day"
        series={[{ key: 'orders', label: 'Orders' }]}
      />
    </div>
  ),
};
