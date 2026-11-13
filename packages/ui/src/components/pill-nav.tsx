import * as React from 'react';
import { cn } from '../utils/cn';

export interface PillNavItem {
  id: string;
  label: string;
  href?: string;
  badge?: React.ReactNode;
}

export interface PillNavProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  items: PillNavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
}

export function PillNav({
  items,
  activeId,
  onSelect,
  ariaLabel,
  className,
  ...props
}: PillNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xs select-none',
        className
      )}
      {...props}
    >
      <ul className="flex items-center gap-1 list-none m-0 p-0">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id} className="m-0 p-0">
              <a
                href={item.href || '#'}
                onClick={(e) => {
                  if (onSelect) {
                    e.preventDefault();
                    onSelect(item.id);
                  }
                }}
                className={cn(
                  'inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
                  isActive
                    ? 'bg-[var(--color-text)] text-[var(--color-surface)] font-semibold shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{item.label}</span>
                {item.badge && <span className="ml-1.5 shrink-0">{item.badge}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

