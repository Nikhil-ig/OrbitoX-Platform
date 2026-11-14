import * as React from 'react';
import { Button, type ButtonProps } from './button';
import { cn } from '../utils/cn';

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  'aria-label': string; // Strictly required for WCAG 2.2 AA accessibility
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', children, 'aria-label': ariaLabel, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8 rounded-full p-0',
      md: 'h-11 w-11 rounded-full p-0',
      lg: 'h-12 w-12 rounded-full p-0',
    };

    return (
      <Button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(sizeClasses[size], className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

