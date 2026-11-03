export function formatNightHours(value: number): string {
  return value.toFixed(2);
}

export function formatNightMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
