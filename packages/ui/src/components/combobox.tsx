import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../utils/cn';
import { Button } from './button';
import { t } from '../i18n';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = query === ''
    ? options
    : options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()));

  const displayPlaceholder = placeholder || t('common.select');
  const displaySearch = searchPlaceholder || t('common.search');
  const displayEmpty = emptyMessage || t('common.empty');

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal text-left', className)}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-[var(--color-text-subtle)]">{displayPlaceholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[12rem] rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 text-[var(--color-text)] shadow-md outline-none"
          align="start"
          sideOffset={4}
        >
          <div className="flex items-center border-b border-[var(--color-border)] px-2.5 pb-1.5 pt-1">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-8 w-full rounded-md bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
              placeholder={displaySearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">{displayEmpty}</p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange?.(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-[var(--color-surface)]',
                    option.disabled && 'pointer-events-none opacity-50',
                    option.value === value && 'font-medium text-[var(--color-primary)]'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {option.value === value && <Check className="h-4 w-4" />}
                  </span>
                  {option.label}
                </div>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

