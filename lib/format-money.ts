/**
 * Format money for display: 2 decimal places and thousands separator (e.g. 10,000.00).
 * Use formatCents when the value is in smallest unit (cents); use formatLKR when already in rupees.
 */

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLKR(lkr: number): string {
  return lkr.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
