import * as React from 'react';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  status?: 'done' | 'failed' | 'in_progress' | 'waiting' | 'complete' | 'current' | 'upcoming' | 'error';
  state?: 'done' | 'failed' | 'in_progress' | 'waiting' | 'complete' | 'current' | 'upcoming' | 'error';
  time?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps?: StepItem[];
  items?: StepItem[];
  activeStep?: number; // 0-based
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (stepIndex: number) => void;
}

export function Stepper({
  steps: stepsProp,
  items: itemsProp,
  activeStep = 0,
  orientation = 'horizontal',
  onStepClick,
  className,
  ...props
}: StepperProps) {
  const steps = stepsProp || itemsProp || [];
  if (orientation === 'vertical') {
    return (
      <nav aria-label={t('stepper.progress')} className={cn('w-full', className)} {...props}>
        <ol className="relative flex flex-col space-y-6">
          {steps.map((step, index) => {
            const rawStatus = step.status || step.state;
            const normalizedStatus =
              rawStatus === 'complete' ? 'done' :
              rawStatus === 'current' ? 'in_progress' :
              rawStatus === 'upcoming' ? 'waiting' :
              rawStatus === 'error' ? 'failed' :
              rawStatus;
            const stepStatus = normalizedStatus || (
              index < activeStep ? 'done' : index === activeStep ? 'in_progress' : 'waiting'
            );
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="relative flex items-start gap-4">
                {/* Vertical Connector Line */}
                {!isLast && (
                  <span
                    className={cn(
                      'absolute left-4 top-8 -bottom-6 w-0.5',
                      stepStatus === 'done' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                    )}
                    aria-hidden="true"
                  />
                )}

                {/* Circle Status Icon */}
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                    stepStatus === 'done' && 'bg-[var(--color-success)] text-[var(--color-success-fg)]',
                    stepStatus === 'failed' && 'bg-[var(--color-danger)] text-[var(--color-danger-fg)] shadow-[0_0_14px_var(--color-danger)]',
                    stepStatus === 'in_progress' && 'border-2 border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/20',
                    stepStatus === 'waiting' && 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                  )}
                  aria-current={stepStatus === 'in_progress' ? 'step' : undefined}
                >
                  {stepStatus === 'done' && <Check className="h-4 w-4 stroke-[3]" />}
                  {stepStatus === 'failed' && <X className="h-4 w-4 stroke-[3]" />}
                  {stepStatus === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />}
                  {stepStatus === 'waiting' && <Clock className="h-4 w-4" />}
                </div>

                {/* Step Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold block leading-tight',
                        stepStatus === 'done' && 'text-[var(--color-text)]',
                        stepStatus === 'failed' && 'text-[var(--color-danger)]',
                        stepStatus === 'in_progress' && 'text-[var(--color-primary)]',
                        stepStatus === 'waiting' && 'text-[var(--color-text-muted)]'
                      )}
                    >
                      {step.title}
                    </span>
                    {step.time && (
                      <span className="text-xs font-mono text-[var(--color-text-subtle)] shrink-0">
                        {step.time}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-normal">
                      {step.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label={t('stepper.progress')} className={cn('w-full', className)} {...props}>
      <ol className="flex items-center justify-between gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const isUpcoming = index > activeStep;

          return (
            <li key={step.id} className="relative flex-1">
              <div
                className={cn(
                  'group flex flex-col items-center text-center',
                  onStepClick && isCompleted ? 'cursor-pointer' : ''
                )}
                onClick={() => {
                  if (onStepClick && isCompleted) onStepClick(index);
                }}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]',
                    isCurrent && 'border-2 border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/20',
                    isUpcoming && 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
                </div>

                {/* Step Titles */}
                <div className="mt-2 hidden sm:block">
                  <span
                    className={cn(
                      'text-xs font-semibold block leading-tight',
                      isCurrent && 'text-[var(--color-primary)]',
                      isCompleted && 'text-[var(--color-text)]',
                      isUpcoming && 'text-[var(--color-text-muted)]'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting line between steps */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-4 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-0.5 -translate-y-1/2',
                    index < activeStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

