import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeToMinutes(timeValue: string, meridiem: 'AM' | 'PM'): number {
  if (!timeValue || !timeValue.trim()) return 0;
  const [hoursStr, minutesStr] = timeValue.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr ?? '0', 10);
  if (Number.isNaN(hours)) hours = 0;
  if (Number.isNaN(minutes)) return 0;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): { timeStr: string; meridiem: 'AM' | 'PM' } {
  const clamped = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const hours24 = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const isPM = hours24 >= 12;
  const hour12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const timeStr = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { timeStr, meridiem: isPM ? 'PM' : 'AM' };
}
