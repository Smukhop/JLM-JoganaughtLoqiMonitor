import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string | null) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function relativeTime(date: Date | string) {
  const then = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.round((Date.now() - then.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity]
  ];
  let value = secs;
  for (const [unit, span] of units) {
    if (Math.abs(value) < span) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round(value), unit);
    }
    value /= span;
  }
  return then.toLocaleDateString();
}
