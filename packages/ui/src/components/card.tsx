import * as React from 'react';
import { cn } from '../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  hero?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, subtitle, action, hero = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          hero ? 'rounded-[var(--radius-hero)]' : 'rounded-[var(--radius-card)]',
          'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs transition-shadow duration-150',
          className
        )}
        {...props}
      >
        {(title || subtitle || action) && (
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <div>
              {title && <h3 className="text-base font-semibold text-[var(--color-text)] leading-none">{title}</h3>}
              {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-normal">{subtitle}</p>}
            </div>
            {action && <div className="flex items-center gap-2">{action}</div>}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight text-[var(--color-text)]', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs text-[var(--color-text-muted)] leading-relaxed', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0 border-t border-[var(--color-border)] mt-4', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

