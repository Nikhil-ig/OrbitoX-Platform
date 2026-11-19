import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LiveStatusBar } from '../components/live-status-bar';
import { MenuItemCard } from '../components/menu-item-card';
import { RingTimer } from '../components/ring-timer';
import { VegMark } from '../components/veg-mark';
import { FloorPlan } from '../components/floor-plan';
import { Utensils } from 'lucide-react';

const meta: Meta = {
  title: 'Commerce/RestaurantOS & Diner',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const LiveStatusBarDemo: StoryObj = {
  render: () => (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">Live Status Pill Bar</h3>
      <LiveStatusBar
        icon={<Utensils className="h-4 w-4" />}
        title="Ready in 5 min"
        subtitle="Order #42 · 2 items · Table 7"
        actionLabel="View order"
        onAction={() => alert('View order')}
      />
    </div>
  ),
};

export const MenuItemCardDemo: StoryObj = {
  render: () => (
    <div className="p-6 max-w-sm mx-auto space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">Menu Item Card (Tenant Token Themed)</h3>
      <MenuItemCard
        title="Truffle Wild Mushroom Risotto"
        description="Carnaroli rice, porcini dust, black truffle oil, shaved parmigiano reggiano."
        pricePaise={85000}
        tags={['Chef Special', 'Vegetarian']}
        onAdd={() => alert('Added to cart')}
      />
    </div>
  ),
};

export const RingTimerAndVegMarkDemo: StoryObj = {
  name: 'RingTimer & VegMark (FSSAI Standard)',
  render: () => (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Kitchen Ring Timers</h3>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <RingTimer totalSeconds={900} elapsedSeconds={180} size="sm" />
            <span className="text-[10px] text-[var(--color-text-muted)]">On Track</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <RingTimer totalSeconds={900} elapsedSeconds={550} size="md" />
            <span className="text-[10px] text-[var(--color-text-muted)]">Warning</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <RingTimer totalSeconds={900} elapsedSeconds={820} size="lg" />
            <span className="text-[10px] text-[var(--color-text-muted)]">Critical</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Dietary Indicators (FSSAI)</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <VegMark type="veg" size="md" />
            <span className="text-xs text-[var(--color-text)]">Vegetarian</span>
          </div>
          <div className="flex items-center gap-2">
            <VegMark type="non-veg" size="md" />
            <span className="text-xs text-[var(--color-text)]">Non-Vegetarian</span>
          </div>
          <div className="flex items-center gap-2">
            <VegMark type="egg" size="md" />
            <span className="text-xs text-[var(--color-text)]">Contains Egg</span>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const FloorPlanDemo: StoryObj = {
  name: 'FloorPlan (Interactive Read-Only Canvas)',
  render: () => (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">Restaurant Main Dining Room</h3>
      <FloorPlan
        width={600}
        height={360}
        tables={[
          { id: 't1', name: 'T1', shape: 'square', x: 80, y: 70, seats: 2, status: 'available' },
          { id: 't2', name: 'T2', shape: 'square', x: 180, y: 70, seats: 2, status: 'seated', activeOrderPaise: 185000 },
          { id: 't3', name: 'T3', shape: 'rect', x: 320, y: 80, seats: 6, status: 'seated', activeOrderPaise: 420000 },
          { id: 't4', name: 'T4', shape: 'round', x: 480, y: 80, seats: 4, status: 'reserved' },
          { id: 't5', name: 'T5', shape: 'square', x: 80, y: 200, seats: 4, status: 'billed', activeOrderPaise: 295000 },
          { id: 't6', name: 'T6', shape: 'round', x: 220, y: 220, seats: 4, status: 'available' },
          { id: 't7', name: 'T7', shape: 'rect', x: 420, y: 230, seats: 8, status: 'available' },
        ]}
        selectedTableId="t2"
      />
    </div>
  ),
};

