import * as React from 'react';
import { Circle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  description?: string;
  status?: 'completed' | 'in_progress' | 'pending' | 'failed';
  icon?: React.ReactNode;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TimelineEvent[];
}

export function Timeline({ events, className, ...props }: TimelineProps) {
  return (
    <div className={cn('relative pl-6 space-y-6', className)} {...props}>
      {/* Continuous line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--color-border)]" aria-hidden="true" />

      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;

        let dotColor = 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]';
        if (event.status === 'completed') {
          dotColor = 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-success-fg)]';
        } else if (event.status === 'in_progress') {
          dotColor = 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-fg)] ring-4 ring-[var(--color-primary)]/20';
        } else if (event.status === 'failed') {
          dotColor = 'bg-[var(--color-danger)] border-[var(--color-danger)] text-[var(--color-danger-fg)]';
        }

        return (
          <div key={event.id} className="relative flex items-start gap-4">
            {/* Event indicator */}
            <div
              className={cn(
                'absolute -left-6 mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                dotColor
              )}
            >
              {event.icon || <Circle className="h-2 w-2 fill-current" />}
            </div>

            {/* Event content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--color-text)] leading-tight">{event.title}</h4>
                <time className="text-xs text-[var(--color-text-muted)] shrink-0">{event.timestamp}</time>
              </div>
              {event.description && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

