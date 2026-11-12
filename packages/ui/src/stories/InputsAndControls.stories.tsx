import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/input';
import { Textarea } from '../components/textarea';
import { Checkbox } from '../components/checkbox';
import { Switch } from '../components/switch';
import { Label } from '../components/label';
import { FieldHint } from '../components/field-hint';
import { FieldError } from '../components/field-error';
import { Badge } from '../components/badge';
import { StatusPill } from '../components/status-pill';

const meta: Meta = {
  title: 'Components/Base/Inputs & Controls',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const TextAndSelectionControls: StoryObj = {
  render: () => (
    <div className="space-y-6 max-w-md p-4">
      <div className="space-y-1.5">
        <Label htmlFor="story-branch-name">Branch Name</Label>
        <Input id="story-branch-name" placeholder="Indiranagar Prime" />
        <FieldHint>Displayed on customer receipts and POS bills.</FieldHint>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="story-branch-error">GSTIN Identifier (Error State)</Label>
        <Input id="story-branch-error" defaultValue="INVALID-GST" error />
        <FieldError error="GSTIN must be 15 alphanumeric characters" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="story-notes">Operational Notes</Label>
        <Textarea id="story-notes" placeholder="Enter shift handoff notes..." />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="story-terms" defaultChecked />
        <Label htmlFor="story-terms">Enable automated daily ledger close</Label>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="story-kds">Enable KDS Real-time Audio Chime</Label>
        <Switch id="story-kds" defaultChecked />
      </div>
    </div>
  ),
};

export const BadgesAndStatusPills: StoryObj = {
  render: () => (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="success">Verified</Badge>
        <Badge variant="warning">Pending KYC</Badge>
        <Badge variant="destructive">Suspended</Badge>
        <Badge variant="outline">v1.4.0</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusPill status="ACTIVE" />
        <StatusPill status="PENDING" />
        <StatusPill status="GRACE" />
        <StatusPill status="SUSPENDED" />
        <StatusPill status="COMPLETED" />
      </div>
    </div>
  ),
};

