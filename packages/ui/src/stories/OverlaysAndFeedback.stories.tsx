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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../components/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../components/context-menu';
import { ToastProvider, useToast } from '../components/toast';
import { Inbox, MoreHorizontal, Plus } from 'lucide-react';

const meta: Meta = {
  title: 'Components/Overlays & Feedback',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

function ToastTriggerPanel() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({
            variant: 'success',
            title: 'TLS Provisioned',
            description: 'Certificate active on edge POP.',
          })
        }
      >
        Trigger Success Toast
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({
            variant: 'warning',
            title: 'Quota 85%',
            description: 'Approaching monthly API request limit.',
          })
        }
      >
        Trigger Warning Toast
      </Button>
    </div>
  );
}

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
        onRetry={() => undefined}
      />
    </div>
  ),
};

export const DialogAndAlertDialog: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-3">
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

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Revoke Signing Key</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Ed25519 Signing Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Plugins signed with key id_k94 will fail signature verification until rotated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Revoke Key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
};

export const SheetAndDrawer: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open Side Sheet</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Tenant Audit Context</SheetTitle>
            <SheetDescription>Inspect live session metadata and scoped branch grants.</SheetDescription>
          </SheetHeader>
          <div className="py-4 text-xs text-[var(--color-text-muted)]">
            Tenant ID: tenant_demo_01 · Scope: ap-south-1
          </div>
          <SheetFooter>
            <Button size="sm">Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Open Bottom Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Quick Branch Filter</DrawerTitle>
            <DrawerDescription>Mobile-first action drawer for POS terminal switching.</DrawerDescription>
          </DrawerHeader>
          <div className="p-2 text-xs text-[var(--color-text-muted)]">
            3 active terminals online in Bengaluru South.
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  ),
};

export const MenusPopoversAndToast: StoryObj = {
  render: () => {
    const [showArchived, setShowArchived] = React.useState(false);

    return (
      <ToastProvider>
        <div className="space-y-6 max-w-xl">
          <div className="flex flex-wrap gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Inspect Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Tenant Routing Header</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Requests resolved via AsyncLocalStorage tenant context.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" icon={<MoreHorizontal className="h-4 w-4" />}>
                  Dropdown Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Branch Actions</DropdownMenuLabel>
                <DropdownMenuItem>Rotate API Key</DropdownMenuItem>
                <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
                  Include Archived Branches
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>Suspend Branch</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ContextMenu>
            <ContextMenuTrigger className="flex h-20 w-full items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
              Right-click here to inspect ContextMenu items
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>Copy Tenant UUID</ContextMenuItem>
              <ContextMenuItem>View Security Events</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem destructive>Terminate Session</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <ToastTriggerPanel />
        </div>
      </ToastProvider>
    );
  },
};
