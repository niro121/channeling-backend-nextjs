export function formatOvernightHours(value: number): string {
  return value.toFixed(2);
}

export function formatOvernightMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function splitHoursAtMidnight(
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): { day1: number; day2: number; total: number } | null {
  const start = combineDateAndTime(startDate, startTime);
  const end = combineDateAndTime(endDate, endTime);
  if (!start || !end || end <= start) return null;

  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  const msPerHour = 3_600_000;

  if (end <= midnight) {
    const total = (end.getTime() - start.getTime()) / msPerHour;
    return { day1: total, day2: 0, total };
  }

  const day1 = (midnight.getTime() - start.getTime()) / msPerHour;
  const day2 = (end.getTime() - midnight.getTime()) / msPerHour;
  return { day1, day2, total: day1 + day2 };
}

export function combineDateAndTime(
  date: Date | null,
  time: string
): Date | null {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}
