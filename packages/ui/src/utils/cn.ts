import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines conditional class names (clsx) and deduplicates Tailwind classes (twMerge).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

