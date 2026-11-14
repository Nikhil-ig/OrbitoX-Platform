import * as React from 'react';
import { Search } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../utils/cn';
import { Kbd } from './kbd';
import { t } from '../i18n';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  roles?: string[]; // Allowed roles: e.g. ['operator', 'admin']
  onSelect: () => void;
}

export interface CommandGroup {
  group: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  groups: CommandGroup[];
  currentRole?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({
  groups,
  currentRole,
  open: controlledOpen,
  onOpenChange,
}: CommandPaletteProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const setIsOpen = isControlled ? onOpenChange! : setUncontrolledOpen;

  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Filter groups and items by role and query
  const filteredGroups = React.useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          // Role check
          if (item.roles && item.roles.length > 0 && currentRole) {
            if (!item.roles.includes(currentRole)) return false;
          }
          // Search query check
          if (!query.trim()) return true;
          const q = query.toLowerCase();
          return (
            item.label.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, currentRole, query]);

  // Flattened items for keyboard arrow navigation
  const flatItems = React.useMemo(() => {
    return filteredGroups.flatMap((g) => g.items);
  }, [filteredGroups]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: CommandItem) => {
    item.onSelect();
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatItems[selectedIndex]);
    }
  };

  let globalIndexCounter = 0;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[20%] z-50 w-full max-w-xl translate-x-[-50%] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-2xl animate-in fade-in-0 zoom-in-95"
          onKeyDown={handleKeyDown}
        >
          {/* Header search bar */}
          <div className="flex items-center border-b border-[var(--color-border)] px-4 py-3">
            <Search className="mr-3 h-5 w-5 text-[var(--color-text-muted)] shrink-0" />
            <input
              className="flex h-6 w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <Kbd>Esc</Kbd>
          </div>

          {/* List items */}
          <div className="max-h-80 overflow-y-auto p-2">
            {flatItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">{t('common.empty')}</p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.group} className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                    {group.group}
                  </div>
                  {group.items.map((item) => {
                    const isSelected = globalIndexCounter === selectedIndex;
                    const thisIndex = globalIndexCounter++;

                    return (
                      <div
                        key={item.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(thisIndex)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                          isSelected
                            ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon && <span className="shrink-0">{item.icon}</span>}
                          <div>
                            <span className="font-medium leading-none">{item.label}</span>
                            {item.description && (
                              <p
                                className={cn(
                                  'text-xs mt-0.5',
                                  isSelected ? 'text-[var(--color-primary-fg)]/80' : 'text-[var(--color-text-muted)]'
                                )}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.shortcut && (
                          <div className="flex items-center gap-1 shrink-0">
                            {item.shortcut.map((key) => (
                              <Kbd key={key} className={isSelected ? 'bg-white/20 border-white/30 text-white' : ''}>
                                {key}
                              </Kbd>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

