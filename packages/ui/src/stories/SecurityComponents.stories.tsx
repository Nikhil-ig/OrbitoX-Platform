import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DangerousAction } from '../components/dangerous-action';
import { MaskedField } from '../components/masked-field';
import { CopyOnceSecret } from '../components/copy-once-secret';
import { FileUpload, type UploadedFileItem } from '../components/file-upload';
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
        onConfirm={() => undefined}
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

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1">
            Patient Aadhaar Number (Copy Disabled Default):
          </label>
          <MaskedField
            maskedPreview="•••• •••• 1284"
            onReveal={async () => {
              await new Promise((r) => setTimeout(r, 300));
              return 'orb_test_aadhaar_9876_5432_1284';
            }}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1">
            API Client Reference (Explicit allowCopy=true):
          </label>
          <MaskedField
            maskedPreview="orb_test_••••_9900"
            allowCopy
            onReveal={async () => 'orb_test_client_secret_9900'}
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
        onAcknowledged={() => undefined}
      />
    </div>
  ),
};

export const FileUploadStates: StoryObj = {
  render: () => {
    const mockFileA = new File(['signed plugin tar content'], 'orb_test_plugin_bundle.tar.gz', {
      type: 'application/gzip',
    });
    const mockFileB = new File(['bad'], 'orb_test_oversize_dump.sql', {
      type: 'application/sql',
    });

    const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFileItem[]>([
      { id: 'f1', file: mockFileA, progress: 68 },
      { id: 'f2', file: mockFileB, error: 'Checksum verification failed' },
    ]);

    return (
      <div className="max-w-md p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[var(--color-text)]">FileUpload (Progress & Error States)</h3>
          <FileUpload
            accept=".gz,.zip,.pem"
            maxSizeMb={10}
            files={uploadedFiles}
            onFilesSelected={(incoming) =>
              setUploadedFiles((prev) => [
                ...prev,
                ...incoming.map((file, idx) => ({ id: `${Date.now()}-${idx}`, file, progress: 100 })),
              ])
            }
            onRemoveFile={(id) => setUploadedFiles((prev) => prev.filter((item) => item.id !== id))}
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[var(--color-text-muted)]">Disabled Upload Dropzone</h4>
          <FileUpload accept=".pem" disabled files={[]} onFilesSelected={() => undefined} />
        </div>
      </div>
    );
  },
};
