import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DangerousAction } from '../components/dangerous-action';
import { MaskedField } from '../components/masked-field';
import { CopyOnceSecret } from '../components/copy-once-secret';
import { Button } from '../components/button';
import { AlertOctagon } from 'lucide-react';

const meta: Meta = {
  title: 'Components/Security/Audited Controls',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const DangerousActionDemo: StoryObj = {
  render: () => (
    <div className="max-w-md p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-text)]">Dangerous Administrative Action</h3>
      <p className="text-xs text-[var(--color-text-muted)]">
        Requires typed confirmation, audited rationale, and optional step-up re-authentication.
      </p>

      <DangerousAction
        trigger={
          <Button variant="destructive" size="sm" icon={<AlertOctagon className="h-4 w-4" />}>
            Delete Production Tenant
          </Button>
        }
        title="Delete Production Tenant & Data"
        description="This will permanently delete diner-oasis-99, its branches, sales ledgers, and staff accounts. This action is irreversible."
        expectedConfirmationText="DELETE diner-oasis-99"
        requireReason
        onStepUpAuth={async () => {
          await new Promise((r) => setTimeout(r, 400));
          return true;
        }}
        onConfirm={({ reason }) => {
          alert(`Tenant deleted with audited reason: ${reason}`);
        }}
      />
    </div>
  ),
};

export const MaskedFieldPHI: StoryObj = {
  render: () => (
    <div className="max-w-md p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-text)]">MaskedField (PHI / Sensitive PII)</h3>
      <p className="text-xs text-[var(--color-text-muted)]">
        Never appears in client DOM until an audited reason is provided. Automatically conceals after 60 seconds or on window blur.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1">
            Patient Aadhaar Number (UIDAI):
          </label>
          <MaskedField
            maskedPreview="•••• •••• 1284"
            onReveal={async (reason) => {
              await new Promise((r) => setTimeout(r, 300));
              return '9876-5432-1284';
            }}
          />
        </div>
      </div>
    </div>
  ),
};

export const CopyOnceSecretDemo: StoryObj = {
  render: () => (
    <div className="max-w-md p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-text)]">Single-Use Ephemeral Secret</h3>
      <p className="text-xs text-[var(--color-text-muted)]">
        Displayed only once upon credential provisioning; client state wipes the secret immediately upon confirmation.
      </p>

      <CopyOnceSecret
        secret="orb_test_webhook_signing_preview_01"
        title="Production Webhook Signing Key"
        description="Store this key immediately in your secret manager. You will never be able to view it again once acknowledged."
        onAcknowledged={() => {
          console.log('Secret cleared from memory');
        }}
      />
    </div>
  ),
};

