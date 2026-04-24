type ReportLimitKey =
  | 'doctor_appointment_count'
  | 'all_cashier_summary_detail'
  | 'cashier_summary'
  | 'card_summary_bank_wise'
  | 'agent_collection_receipt'
  | 'agency_statement'
  | 'channel_bookings'
  | 'channel_transfer'
  | 'consultant_payments'
  | 'doctor_leave'
  | 'doctor_arrivals'
  | 'api_log'
  | 'sms_log'
  | 'agent_detail'
  | 'user_activity'
  | 'channel_patient_count_accounting_wise'
  | 'channel_income_accounting_wise'
  | 'agent_wise_appointments'
  | 'channel_discount_report'
  | 'withholding_tax'
  | 'cash_book'
  | 'bank_deposits'
  | 'channel_report_receipt_wise'
  | 'room_occupancy'
  | 'no_show_patient';

function envPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function toEnvPrefix(key: ReportLimitKey): string {
  return key.toUpperCase();
}

/**
 * Resolve max range days for a report.
 * Priority:
 * 1) REPORT_<REPORT_KEY>_MAX_RANGE_DAYS
 * 2) REPORT_MAX_RANGE_DAYS
 * 3) fallback
 */
export function getReportMaxRangeDays(key: ReportLimitKey, fallback: number): number {
  const reportSpecific = process.env[`REPORT_${toEnvPrefix(key)}_MAX_RANGE_DAYS`];
  const globalDefault = process.env.REPORT_MAX_RANGE_DAYS;
  return envPositiveInt(reportSpecific ?? globalDefault, fallback);
}

/**
 * Resolve max records for a report.
 * Priority:
 * 1) REPORT_<REPORT_KEY>_MAX_RECORDS
 * 2) REPORT_MAX_RECORDS
 * 3) fallback
 */
export function getReportMaxRecords(key: ReportLimitKey, fallback: number): number {
  const reportSpecific = process.env[`REPORT_${toEnvPrefix(key)}_MAX_RECORDS`];
  const globalDefault = process.env.REPORT_MAX_RECORDS;
  return envPositiveInt(reportSpecific ?? globalDefault, fallback);
}

export function getInclusiveDaySpan(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}
