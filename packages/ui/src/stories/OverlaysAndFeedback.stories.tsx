import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Banner } from '../components/banner';
import { InlineAlert } from '../components/inline-alert';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { Button } from '../components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/dialog';
import { Inbox, Plus } from 'lucide-react';

const meta: Meta = {
  title: 'Components/Overlays & Feedback',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const BannersAndAlerts: StoryObj = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <Banner variant="staging">STAGING ENVIRONMENT — TEST DATA ONLY</Banner>
      <Banner variant="info">Scheduled maintenance Sunday 02:00 IST</Banner>
      <InlineAlert variant="warning" title="Quota Approaching">
        Branch API quota is at 88% utilization for the current billing cycle.
      </InlineAlert>
      <InlineAlert variant="danger" title="Webhook Delivery Failed">
        Endpoint returned HTTP 503 three consecutive times.
      </InlineAlert>
      <InlineAlert variant="success" title="Certificate Renewed">
        mTLS leaf certificate valid through Nov 2027.
      </InlineAlert>
    </div>
  ),
};

export const EmptyAndErrorStates: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title="No active orders"
        description="Orders placed from QR tables or POS terminals will appear here in real time."
        action={
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            Create Manual Order
          </Button>
        }
      />

      <ErrorState
        title="Unable to fetch branch telemetry"
        description="The telemetry upstream service did not respond within 5000ms."
        requestId="req_upstream_timeout_842"
        onRetry={() => alert('Retrying...')}
      />
    </div>
  ),
};

export const DialogOverlay: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Modal Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Tenant Domain</DialogTitle>
          <DialogDescription>
            Configure a custom wildcard subdomain or apex CNAME for RestaurantOS storefront traffic.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 text-xs text-[var(--color-text-muted)]">
          DNS TXT verification is performed automatically after saving.
        </div>
        <DialogFooter>
          <Button variant="primary">Save Domain</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
