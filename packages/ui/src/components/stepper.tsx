import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';

export interface StepItem {
  id: string;
  title: string;
  description?: string;
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepItem[];
  activeStep: number; // 0-based
  onStepClick?: (stepIndex: number) => void;
}

export function Stepper({
  steps,
  activeStep,
  onStepClick,
  className,
  ...props
}: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)} {...props}>
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

