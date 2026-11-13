import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LineChart } from '../charts/line-chart';
import { BarChart } from '../charts/bar-chart';
import { AreaChart } from '../charts/area-chart';
import { DonutChart } from '../charts/donut-chart';
import { Sparkline } from '../charts/sparkline';
import { LollipopChart } from '../charts/lollipop-chart';
import { ComparisonLineChart } from '../charts/comparison-line-chart';
import { HourlyBarChart } from '../charts/hourly-bar-chart';

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

export const DailyLollipopVelocity: StoryObj = {
  render: () => (
    <div className="max-w-2xl p-6">
      <LollipopChart
        title="Daily Dine-In Volume (Lollipop)"
        description="Daily sales with stem dots and selected day highlight"
        data={[
          { label: 'Mon', value: 34000 },
          { label: 'Tue', value: 48000 },
          { label: 'Wed', value: 41000 },
          { label: 'Thu', value: 59000 },
          { label: 'Fri', value: 89000 },
          { label: 'Sat', value: 124000, isSelected: true },
          { label: 'Sun', value: 110000 },
        ]}
        valueFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
      />
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

export const GradientComparisonLine: StoryObj = {
  name: 'Gradient Line with Dashed Comparison',
  render: () => (
    <div className="max-w-2xl p-6">
      <ComparisonLineChart
        title="Weekly Revenue Velocity (Comparison)"
        description="Current week compared to 7-day prior trailing average"
        data={[
          { label: 'Mon', current: 14200, previous: 11000 },
          { label: 'Tue', current: 18500, previous: 14000 },
          { label: 'Wed', current: 16800, previous: 15500 },
          { label: 'Thu', current: 24300, previous: 19800 },
          { label: 'Fri', current: 36500, previous: 28400 },
          { label: 'Sat', current: 49200, previous: 41000 },
          { label: 'Sun', current: 54100, previous: 44200 },
        ]}
        currentLabel="This Week"
        previousLabel="Last Week"
        formatValue={(val) => `₹${(val / 1000).toFixed(0)}k`}
      />
    </div>
  ),
};

export const HourlyDistributionBars: StoryObj = {
  name: 'Hourly Bars (Orders Distribution)',
  render: () => (
    <div className="max-w-2xl p-6">
      <HourlyBarChart
        title="Orders by Service Hour"
        description="Kitchen order density distribution across service hours"
        data={[
          { hour: '11 AM', count: 12 },
          { hour: '12 PM', count: 48 },
          { hour: '1 PM', count: 86 },
          { hour: '2 PM', count: 64 },
          { hour: '3 PM', count: 22 },
          { hour: '4 PM', count: 14 },
          { hour: '5 PM', count: 18 },
          { hour: '6 PM', count: 35 },
          { hour: '7 PM', count: 72 },
          { hour: '8 PM', count: 118 },
          { hour: '9 PM', count: 95 },
          { hour: '10 PM', count: 42 },
        ]}
        selectedHour="8 PM"
      />
    </div>
  ),
};
