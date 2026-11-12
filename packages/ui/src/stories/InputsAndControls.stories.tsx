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
import { IconButton } from '../components/icon-button';
import { Spinner } from '../components/spinner';
import { RadioGroup, RadioGroupItem } from '../components/radio';
import { Slider } from '../components/slider';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import { Combobox } from '../components/combobox';
import { DatePicker } from '../components/date-picker';
import { Avatar, AvatarFallback } from '../components/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/tooltip';
import { Skeleton } from '../components/skeleton';
import { Separator } from '../components/separator';
import { Kbd } from '../components/kbd';
import { Link } from '../components/link';
import { Bell, Copy, RefreshCw, Settings } from 'lucide-react';

const meta: Meta = {
  title: 'Components/Base/Inputs & Controls',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const REGION_OPTIONS = [
  { value: 'ap-south-1', label: 'ap-south-1 (Mumbai)' },
  { value: 'ap-south-2', label: 'ap-south-2 (Hyderabad)' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' },
  { value: 'eu-central-1', label: 'eu-central-1 (Frankfurt, restricted)', disabled: true },
];

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
        <Label htmlFor="story-branch-disabled">Disabled Input Control</Label>
        <Input id="story-branch-disabled" defaultValue="Locked Enterprise Tenant ID" disabled />
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

export const SelectionAndPickers: StoryObj = {
  render: () => {
    const [region, setRegion] = React.useState('ap-south-1');
    const [tier, setTier] = React.useState('dedicated');
    const [rateLimit, setRateLimit] = React.useState([250]);
    const [effectiveDate, setEffectiveDate] = React.useState<Date>(new Date('2026-11-12T12:00:00Z'));

    return (
      <div className="space-y-6 max-w-md p-4">
        <div className="space-y-2">
          <Label id="story-isolation-label">Tenant Isolation Tier</Label>
          <RadioGroup value={tier} onValueChange={setTier} aria-labelledby="story-isolation-label">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shared" id="tier-shared" />
              <Label htmlFor="tier-shared">Shared Cluster (RLS)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dedicated" id="tier-dedicated" />
              <Label htmlFor="tier-dedicated">Dedicated Schema Pool</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="airgapped" id="tier-airgapped" disabled />
              <Label htmlFor="tier-airgapped">Isolated Hardware VPC (Disabled)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="story-rate-slider">API Burst Threshold ({rateLimit[0]} req/s)</Label>
          <Slider
            id="story-rate-slider"
            value={rateLimit}
            onValueChange={setRateLimit}
            min={50}
            max={1000}
            step={50}
            aria-label="API Burst Threshold"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="story-tax-select">GST Filing Frequency</Label>
          <Select defaultValue="monthly">
            <SelectTrigger id="story-tax-select" aria-label="GST Filing Frequency">
              <SelectValue placeholder="Choose cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Compliance Cycles</SelectLabel>
                <SelectItem value="monthly">Monthly GSTR-1 / GSTR-3B</SelectItem>
                <SelectItem value="quarterly">Quarterly QRMP Scheme</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="story-region-combobox">Deployment Region (Combobox)</Label>
          <Combobox
            id="story-region-combobox"
            aria-label="Deployment Region"
            options={REGION_OPTIONS}
            value={region}
            onChange={setRegion}
            placeholder="Select cloud region"
            searchPlaceholder="Filter regions..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Contract Effective Date (DatePicker)</Label>
          <DatePicker value={effectiveDate} onChange={setEffectiveDate} />
        </div>

        <div className="space-y-1.5">
          <Label>Disabled DatePicker</Label>
          <DatePicker value={effectiveDate} disabled />
        </div>
      </div>
    );
  },
};

export const PrimitivesAndTypography: StoryObj = {
  render: () => (
    <TooltipProvider>
      <div className="space-y-6 max-w-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton aria-label="Notifications" variant="outline" size="sm">
            <Bell className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Refresh cluster telemetry" variant="secondary" size="md">
            <RefreshCw className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Open settings" variant="primary" size="lg">
            <Settings className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Copy token (disabled)" variant="outline" disabled>
            <Copy className="h-4 w-4" />
          </IconButton>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-xs px-2.5 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
              >
                Hover Info
              </button>
            </TooltipTrigger>
            <TooltipContent>Ed25519 signature verified across 3 nodes</TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <div className="h-6">
            <Separator orientation="vertical" />
          </div>
          <Avatar>
            <AvatarFallback>PS</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>OP</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <span>Palette</span>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="#audit" variant="default">
              Default Policy Link
            </Link>
            <Link href="#docs" variant="muted">
              Muted Docs Link
            </Link>
            <Link href="#sla" variant="underline">
              SLA Agreement
            </Link>
          </div>
          <div className="max-w-xs">
            <Link href="#long" variant="default" className="max-w-full">
              <span className="truncate">
                Long Tenant Identifier Link: orbitox-enterprise-bengaluru-south-production-cluster-01
              </span>
            </Link>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </TooltipProvider>
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
