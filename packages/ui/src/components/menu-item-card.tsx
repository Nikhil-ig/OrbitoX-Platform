import * as React from 'react';
import { Plus, Utensils } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import { formatINR } from '../format';
import { Button } from './button';

export interface MenuItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  price?: string;
  pricePaise?: number;
  priceNote?: string;
  badge?: string;
  tags?: string[];
  imagePlaceholderIcon?: React.ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function MenuItemCard({
  title,
  description,
  price,
  pricePaise,
  priceNote,
  badge,
  tags = [],
  imagePlaceholderIcon,
  imageUrl,
  imageAlt,
  onAdd,
  addLabel,
  className,
  ...props
}: MenuItemCardProps) {
  const displayPrice = price || (pricePaise !== undefined ? formatINR(pricePaise) : '');
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm flex flex-col',
        className
      )}
      {...props}
    >
      {/* Top Image or Gradient Placeholder */}
      <div className="relative h-44 w-full bg-[var(--color-primary-subtle)]/40 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-[var(--color-primary)] opacity-80">
            {imagePlaceholderIcon || <Utensils className="h-10 w-10" />}
          </div>
        )}

        {badge && (
          <span className="absolute top-3 right-3 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-xs px-3 py-1 text-xs font-semibold text-[var(--color-text)] shadow-xs select-none">
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base font-semibold text-[var(--color-text)] leading-tight">
              {title}
            </h4>
          </div>

          {description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
              {description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Price + Action */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]/50">
          <div>
            <div className="text-lg font-bold text-[var(--color-text)] leading-none font-mono">
              {displayPrice}
            </div>
            <div className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
              {priceNote || t('menuItem.inclGst')}
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onAdd}
            icon={<Plus className="h-3.5 w-3.5" />}
            className="rounded-full px-4 text-xs font-semibold shadow-xs"
          >
            {addLabel || t('menuItem.addToOrder')}
          </Button>
        </div>
      </div>
    </div>
  );
}

