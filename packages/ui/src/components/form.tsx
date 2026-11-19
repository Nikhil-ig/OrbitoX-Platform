'use client';

import * as React from 'react';
import {
  useForm,
  useFormContext,
  FormProvider,
  UseFormReturn,
  type UseFormProps,
  FieldValues,
  Path,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../utils/cn';
import { Label } from './label';
import { FieldHint } from './field-hint';
import { FieldError } from './field-error';
import { InlineAlert } from './inline-alert';
import { Button, type ButtonProps } from './button';
import { t } from '../i18n';

export { useForm, zodResolver, z };

/**
 * Typed convenience hook combining React Hook Form with Zod schema validation.
 */
export function useSchemaForm<TSchema extends z.ZodType<any, any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>
) {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    ...options,
  });
}

/**
 * Standard OrbitoX Server Error Payload Shape.
 * Returned by control-plane and vertical backend APIs.
 */
export interface ServerErrorPayload {
  error?: string;
  code?: string;
  fieldErrors?: Record<string, string | string[]>;
}

export interface FormContextExtraValue {
  serverErrors?: ServerErrorPayload | null;
  clearServerErrors?: () => void;
}

const FormExtraContext = React.createContext<FormContextExtraValue>({});

export interface FormProps<TFieldValues extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues>;
  serverErrors?: ServerErrorPayload | null;
  clearServerErrors?: () => void;
  onSubmit: (data: TFieldValues) => void | Promise<void>;
}

export function Form<TFieldValues extends FieldValues>({
  form,
  serverErrors,
  clearServerErrors,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <FormExtraContext.Provider value={{ serverErrors, clearServerErrors }}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('space-y-4', className)}
          noValidate
          {...props}
        >
          {children}
        </form>
      </FormExtraContext.Provider>
    </FormProvider>
  );
}

/**
 * Top-level Alert displaying API / server error message if present.
 */
export function FormAlert({ className }: { className?: string }) {
  const { serverErrors, clearServerErrors } = React.useContext(FormExtraContext);

  if (!serverErrors || !serverErrors.error) return null;

  return (
    <InlineAlert
      variant="danger"
      title={serverErrors.code ? `Error: ${serverErrors.code}` : undefined}
      onClose={clearServerErrors}
      className={className}
    >
      {serverErrors.error}
    </InlineAlert>
  );
}

export interface FormFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: Path<TFieldValues>;
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement<any>;
}

export function FormField<TFieldValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  className,
  children,
}: FormFieldProps<TFieldValues>) {
  const { formState, register } = useFormContext<TFieldValues>();
  const { serverErrors } = React.useContext(FormExtraContext);

  // Client-side Zod/hook-form error
  const clientError = formState.errors[name]?.message as string | undefined;

  // Server-side mapped field error
  let serverError: string | undefined;
  if (serverErrors?.fieldErrors && serverErrors.fieldErrors[name]) {
    const raw = serverErrors.fieldErrors[name];
    serverError = Array.isArray(raw) ? raw[0] : raw;
  }

  const effectiveError = clientError || serverError;

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <Label htmlFor={name} className="flex items-center gap-1">
          {label}
          {required && <span className="text-[var(--color-danger)] font-bold">*</span>}
        </Label>
      )}

      {React.cloneElement(children, {
        id: name,
        ...register(name),
        error: Boolean(effectiveError),
      })}

      {hint && !effectiveError && <FieldHint>{hint}</FieldHint>}
      {effectiveError && <FieldError error={effectiveError} />}
    </div>
  );
}

export interface SubmitButtonProps extends ButtonProps {
  preventDoubleSubmission?: boolean;
}

/**
 * Submit button that automatically locks during submission and renders loading spinner.
 */
export function SubmitButton({
  preventDoubleSubmission = true,
  children,
  ...props
}: SubmitButtonProps) {
  const { formState } = useFormContext();
  const isSubmitting = formState.isSubmitting;

  return (
    <Button
      type="submit"
      loading={preventDoubleSubmission && isSubmitting}
      disabled={preventDoubleSubmission && isSubmitting}
      {...props}
    >
      {children || t('form.submit')}
    </Button>
  );
}

/**
 * Hook to guard against losing unsaved form changes on tab close or navigation.
 */
export function useUnsavedChanges(isDirty: boolean, warningMessage?: string) {
  React.useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msg = warningMessage || t('form.unsavedChanges');
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, warningMessage]);
}
