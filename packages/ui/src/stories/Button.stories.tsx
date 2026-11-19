import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/button';
import { ArrowRight, Trash2, Check, Download } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Components/Base/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

export const AllVariants: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <Button variant="primary">Primary Action</Button>
      <Button variant="secondary">Secondary Action</Button>
      <Button variant="outline">Outline Action</Button>
      <Button variant="ghost">Ghost Action</Button>
      <Button variant="destructive" icon={<Trash2 className="h-4 w-4" />}>
        Destructive
      </Button>
    </div>
  ),
};

export const InteractiveStates: StoryObj<typeof Button> = {
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
      <div>
        <span className="text-xs text-[var(--color-text-muted)] block mb-1">Default</span>
        <Button variant="primary">Default</Button>
      </div>
      <div>
        <span className="text-xs text-[var(--color-text-muted)] block mb-1">Loading</span>
        <Button variant="primary" loading>Saving...</Button>
      </div>
      <div>
        <span className="text-xs text-[var(--color-text-muted)] block mb-1">Disabled</span>
        <Button variant="primary" disabled>Disabled</Button>
      </div>
      <div>
        <span className="text-xs text-[var(--color-text-muted)] block mb-1">With Icon</span>
        <Button variant="primary" icon={<ArrowRight className="h-4 w-4" />}>Proceed</Button>
      </div>
    </div>
  ),
};

export const AllSizes: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex items-center gap-4 p-4">
      <Button size="sm">Small (sm)</Button>
      <Button size="md">Medium (md)</Button>
      <Button size="lg">Large (lg)</Button>
    </div>
  ),
};

