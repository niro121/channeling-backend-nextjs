/**
 * Channel Agent Receipt — shared print/PDF column layout.
 */

export const CHANNEL_AGENT_RECEIPT_HEADERS = [
  'Agent Reference',
  'Receipt No',
  'Agency',
  'Patient',
  'Status',
  'Creator',
  'Created Date',
  'Bill Value',
] as const;

/** Percent widths matching branded PDF autoTable proportions on A4 portrait. */
export const CHANNEL_AGENT_RECEIPT_COL_PERCENTS = [8, 16, 12, 13, 7, 17, 15, 12] as const;
