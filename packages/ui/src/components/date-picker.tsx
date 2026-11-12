import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../utils/cn';
import { Button } from './button';
import { formatDate } from '../format';
import { t } from '../i18n';

export interface DatePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  timeZone?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  timeZone = 'Asia/Kolkata',
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? (value instanceof Date ? value : new Date(value)) : null;

  // View state for calendar browsing (Year / Month)
  const [viewDate, setViewDate] = React.useState<Date>(selectedDate || new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0 - 11

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(year, month, day, 12, 0, 0); // Midday in local timezone
    onChange?.(newDate);
    setOpen(false);
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-[var(--color-text-subtle)]', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? formatDate(selectedDate, { timeZone }) : placeholder}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 w-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-md outline-none"
          align="start"
          sideOffset={4}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)]">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth} aria-label={t('datePicker.previousMonth')} className="h-7 w-7 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="sm" onClick={handleNextMonth} aria-label={t('datePicker.nextMonth')} className="h-7 w-7 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-text-muted)] mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="h-6 w-6 flex items-center justify-center">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {paddingDays.map((p) => (
              <div key={`pad-${p}`} className="h-7 w-7" />
            ))}
            {days.map((d) => {
              const selected = isSelected(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={cn(
                    'h-7 w-7 rounded-sm flex items-center justify-center text-xs transition-colors hover:bg-[var(--color-surface)]',
                    selected
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold hover:bg-[var(--color-primary)]'
                      : 'text-[var(--color-text)]'
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

