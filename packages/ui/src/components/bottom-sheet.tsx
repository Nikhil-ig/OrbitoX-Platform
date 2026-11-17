'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export const BottomSheet = DialogPrimitive.Root;
export const BottomSheetTrigger = DialogPrimitive.Trigger;
export const BottomSheetClose = DialogPrimitive.Close;
export const BottomSheetPortal = DialogPrimitive.Portal;

export const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
BottomSheetOverlay.displayName = 'BottomSheetOverlay';

export interface BottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
}

export const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  BottomSheetContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const currentDeltaY = React.useRef<number>(0);
  const snapTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isDismissingRef = React.useRef<boolean>(false);
  const activePointerId = React.useRef<number | null>(null);

  const clearPendingCleanup = React.useCallback(() => {
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      clearPendingCleanup();
    };
  }, [clearPendingCleanup]);

  const resetGesture = React.useCallback((snapping = true) => {
    clearPendingCleanup();
    if (contentRef.current && !isDismissingRef.current) {
      if (snapping) {
        contentRef.current.setAttribute('data-drag-state', 'snapping');
        contentRef.current.removeAttribute('data-drag-offset');
        contentRef.current.removeAttribute('data-drag-level');
        snapTimeoutRef.current = setTimeout(() => {
          if (
            contentRef.current &&
            !isDismissingRef.current &&
            contentRef.current.getAttribute('data-drag-state') === 'snapping'
          ) {
            contentRef.current.setAttribute('data-drag-state', 'idle');
          }
        }, 200);
      } else {
        contentRef.current.setAttribute('data-drag-state', 'idle');
        contentRef.current.removeAttribute('data-drag-offset');
        contentRef.current.removeAttribute('data-drag-level');
      }
    }
    touchStartY.current = null;
    currentDeltaY.current = 0;
    activePointerId.current = null;
  }, [clearPendingCleanup]);

  const handleDragStart = (clientY: number) => {
    if (isDismissingRef.current) return;
    clearPendingCleanup();
    touchStartY.current = clientY;
    currentDeltaY.current = 0;
  };

  const handleDragMove = (clientY: number) => {
    if (touchStartY.current === null || !contentRef.current || isDismissingRef.current) return;
    const delta = clientY - touchStartY.current;
    if (delta > 0) {
      currentDeltaY.current = delta;
      contentRef.current.setAttribute('data-drag-state', 'dragging');
      // 2px fine-grained resolution between 2px and 80px
      const quantized = Math.min(80, Math.max(2, Math.round(delta / 2) * 2));
      contentRef.current.setAttribute('data-drag-offset', String(quantized));
    } else {
      // Upward movement must not translate upward or trigger dismissal
      currentDeltaY.current = 0;
      contentRef.current.removeAttribute('data-drag-offset');
      contentRef.current.setAttribute('data-drag-state', 'idle');
    }
  };

  const handleDragEnd = () => {
    if (!contentRef.current || isDismissingRef.current) return;
    if (currentDeltaY.current > 75) {
      isDismissingRef.current = true;
      contentRef.current.setAttribute('data-drag-state', 'dismissing');
      contentRef.current.removeAttribute('data-drag-offset');
      contentRef.current.removeAttribute('data-drag-level');
      if (closeRef.current) {
        closeRef.current.click();
      }
    } else {
      resetGesture(true);
    }
    touchStartY.current = null;
    currentDeltaY.current = 0;
    activePointerId.current = null;
  };

  const handleDragCancel = () => {
    if (!isDismissingRef.current) {
      resetGesture(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
      handleDragStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
      handleDragMove(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const handleTouchCancel = () => {
    handleDragCancel();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    activePointerId.current = e.pointerId ?? 1;
    handleDragStart(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === null) return;
    handleDragMove(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === null) return;
    handleDragEnd();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === null) return;
    handleDragCancel();
  };

  return (
    <BottomSheetPortal>
      <BottomSheetOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          contentRef.current = node;
          if (node && !node.hasAttribute('data-drag-state')) {
            node.setAttribute('data-drag-state', 'idle');
          }
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        data-drag-state="idle"
        className={cn(
          'fixed bottom-0 inset-x-0 z-50 mx-auto max-w-lg w-full',
          'rounded-t-[28px] border-t border-x border-[var(--color-border)]',
          'bg-[var(--color-surface)] p-6 shadow-2xl',
          'focus:outline-none max-h-[90vh] overflow-y-auto',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-250',
          'data-[drag-state=idle]:translate-y-0',
          'data-[drag-state=dragging]:transition-none',
          'data-[drag-state=snapping]:transition-transform data-[drag-state=snapping]:duration-200 data-[drag-state=snapping]:ease-out data-[drag-state=snapping]:translate-y-0',
          'data-[drag-state=dismissing]:transition-transform data-[drag-state=dismissing]:duration-200 data-[drag-state=dismissing]:ease-out data-[drag-state=dismissing]:translate-y-full',
          className
        )}
        {...props}
      >
        <div
          role="region"
          aria-label={t('sheet.handle', 'Drag handle')}
          className="mx-auto -mt-2 mb-4 h-6 w-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="h-1.5 w-12 rounded-full bg-[var(--color-border)] shrink-0" aria-hidden="true" />
        </div>
        {children}
        <DialogPrimitive.Close
          ref={closeRef}
          className={cn(
            'absolute right-4 top-4 rounded-full p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer',
            !showCloseButton && 'sr-only'
          )}
          aria-label={t('common.close', 'Close')}
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </BottomSheetPortal>
  );
});
BottomSheetContent.displayName = 'BottomSheetContent';

export const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-left mb-4', className)} {...props} />
);
BottomSheetHeader.displayName = 'BottomSheetHeader';

export const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight text-[var(--color-text)]', className)}
    {...props}
  />
));
BottomSheetTitle.displayName = 'BottomSheetTitle';

export const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-[var(--color-text-muted)]', className)}
    {...props}
  />
));
BottomSheetDescription.displayName = 'BottomSheetDescription';

export const BottomSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 gap-2', className)}
    {...props}
  />
);
BottomSheetFooter.displayName = 'BottomSheetFooter';

