import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormAlert, SubmitButton } from '../components/form';
import { Input } from '../components/input';
import { Button } from '../components/button';

const meta: Meta = {
  title: 'Components/Forms/Form Validation',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const ServerErrorMapping: StoryObj = {
  render: () => {
    const form = useForm({
      defaultValues: {
        email: 'admin@invalid-domain',
        taxId: '29ABCDE1234F1Z5',
      },
    });

    const [serverErrors, setServerErrors] = React.useState<any>({
      error: 'GSTIN tax identifier validation failed on National Portal',
      code: 'TAX_PORTAL_TIMEOUT',
      fieldErrors: {
        taxId: 'GSTIN check digit mismatch. Verify against registration certificate.',
      },
    });

    return (
      <div className="max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-[var(--color-text)]">Form with Server-Error Mapping</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Demonstrates automatic field error reflection and top-level error banner directly from API responses.
        </p>

        <Form
          form={form}
          serverErrors={serverErrors}
          clearServerErrors={() => setServerErrors(null)}
          onSubmit={(data) => alert(JSON.stringify(data))}
        >
          <FormAlert />

          <FormField name="email" label="Contact Email" required>
            <Input placeholder="user@orbitox.io" />
          </FormField>

          <FormField name="taxId" label="GSTIN Identifier" required>
            <Input placeholder="29AAAAA0000A1Z5" />
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <SubmitButton>Submit Profile</SubmitButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setServerErrors({
                  error: 'Manual simulated error triggered',
                  code: 'SIMULATED_ERR',
                  fieldErrors: { email: 'Email rejected by MX record probe' },
                })
              }
            >
              Simulate Error
            </Button>
          </div>
        </Form>
      </div>
    );
  },
};

