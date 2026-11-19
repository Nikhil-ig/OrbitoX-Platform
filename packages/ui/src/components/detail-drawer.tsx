import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { t } from '../i18n';

export interface DetailDrawerTab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

export interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  tabs?: DetailDrawerTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  badge,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
  className,
}: DetailDrawerProps) {
  const [internalTab, setInternalTab] = React.useState<string>(
    activeTab || (tabs && tabs[0]?.id) || ''
  );

  React.useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  const currentTab = tabs ? activeTab || internalTab : null;

  const handleTabClick = (tabId: string) => {
    setInternalTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Slide-over panel */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl transition-transform duration-300 ease-in-out outline-hidden',
            'w-full sm:max-w-lg lg:max-w-xl xl:max-w-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            className
          )}
          data-testid="detail-drawer"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-[var(--color-border)] shrink-0 gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogPrimitive.Title className="text-lg font-bold text-[var(--color-text)] truncate tracking-tight">
                  {title}
                </DialogPrimitive.Title>
                {badge}
              </div>
              {description && (
                <DialogPrimitive.Description className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            {/* Accessible 44x44px touch target close button */}
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-11 p-0 rounded-[var(--radius-button)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] shrink-0"
                aria-label={t('drawer.close')}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Optional Tab Navigation Bar */}
          {tabs && tabs.length > 0 && (
            <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] overflow-x-auto shrink-0 scrollbar-none">
              {tabs.map((tab) => {
                const isActive = tab.id === currentTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px]',
                      isActive
                        ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    )}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {tabs && tabs.length > 0 ? (
              tabs.find((t) => t.id === currentTab)?.content || null
            ) : (
              children
            )}
          </div>

          {/* Action Footer */}
          {actions && (
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] shrink-0">
              {actions}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
