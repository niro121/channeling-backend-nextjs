const DEFAULT_REPORT_MAX = 10000;

/**
 * Row cap from REPORT_MAX. Used by report queries and exports.
 * Falls back to 10000.
 */
export function getReportMax(): number {
  const parsed = Number(process.env.REPORT_MAX);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_REPORT_MAX;
}

export function formatReportMax(value = getReportMax()): string {
  return value.toLocaleString('en-US');
}
