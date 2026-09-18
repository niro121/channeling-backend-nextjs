/**
 * Channel Schedule with Charges — PDF/Excel helpers matching Print layout.
 */

import type { ChannelScheduleWithChargesReportExportRow } from '@/types/reports/channel-schedule-with-charges';

export type ChannelScheduleExportColumn = {
  key: keyof ChannelScheduleWithChargesReportExportRow;
  header: string;
};

export type ChannelScheduleExportGroup = {
  title: string;
  columns: ChannelScheduleExportColumn[];
};

export const CHANNEL_SCHEDULE_EXPORT_GROUPS: ChannelScheduleExportGroup[] = [
  {
    title: 'Doctor',
    columns: [{ key: 'doctorName', header: 'Doctor Name' }],
  },
  {
    title: 'Session',
    columns: [
      { key: 'sessionName', header: 'Session Name' },
      { key: 'roomName', header: 'Room' },
      { key: 'locationName', header: 'Location' },
    ],
  },
  {
    title: 'Time',
    columns: [
      { key: 'startTime', header: 'Start Time' },
      { key: 'endTime', header: 'End Time' },
    ],
  },
  {
    title: 'Schedule',
    columns: [
      { key: 'dateType', header: 'Date Type' },
      { key: 'applyOnlyTo', header: 'Apply Only To' },
    ],
  },
  {
    title: 'Fees (Local)',
    columns: [
      { key: 'doctorFeeLocal', header: 'Doctor Fee' },
      { key: 'hospitalFeeLocal', header: 'Hospital Fee' },
      { key: 'agencyFeeLocal', header: 'Agency Fee' },
      { key: 'scanFeeLocal', header: 'Scan Fee' },
      { key: 'onCallFeeLocal', header: 'On-Call Fee' },
      { key: 'creditCardCommissionLocal', header: 'CC Commission' },
      { key: 'apiFeeLocal', header: 'API Fee' },
      { key: 'sessionValueLocal', header: 'Session Value' },
    ],
  },
  {
    title: 'Fees (Foreign)',
    columns: [
      { key: 'doctorFeeForeign', header: 'Doctor Fee' },
      { key: 'hospitalFeeForeign', header: 'Hospital Fee' },
      { key: 'agencyFeeForeign', header: 'Agency Fee' },
      { key: 'scanFeeForeign', header: 'Scan Fee' },
      { key: 'onCallFeeForeign', header: 'On-Call Fee' },
      { key: 'creditCardCommissionForeign', header: 'CC Commission' },
      { key: 'apiFeeForeign', header: 'API Fee' },
      { key: 'sessionValueForeign', header: 'Session Value' },
    ],
  },
  {
    title: 'Capacity / Flags',
    columns: [
      { key: 'startingPatientNo', header: 'Starting Patient No' },
      { key: 'maximumPatientNo', header: 'Maximum Patient No' },
      { key: 'previousSession', header: 'Previous Session' },
      { key: 'refundable', header: 'Refundable' },
      { key: 'advanceBookingEnabled', header: 'Advance Booking' },
      { key: 'status', header: 'Status' },
    ],
  },
];

export const CHANNEL_SCHEDULE_EXPORT_COLUMNS = CHANNEL_SCHEDULE_EXPORT_GROUPS.flatMap((g) =>
  g.columns.map((c) => c.header)
);

export const CHANNEL_SCHEDULE_EXPORT_KEYS = CHANNEL_SCHEDULE_EXPORT_GROUPS.flatMap((g) =>
  g.columns.map((c) => c.key)
);

/** Print/PDF column %: Session, Time, Schedule, Local, Foreign, Meta */
export const CHANNEL_SCHEDULE_PDF_COL_PERCENTS = [16, 15, 12, 18, 18, 21];

export const CHANNEL_SCHEDULE_PDF_HEADERS = [
  'Session',
  'Time',
  'Schedule',
  'Fees (Local)',
  'Fees (Foreign)',
  'Capacity / Flags',
] as const;

function s(row: ChannelScheduleWithChargesReportExportRow, key: keyof ChannelScheduleWithChargesReportExportRow): string {
  const v = row[key];
  if (v === undefined || v === null || v === '') return '-';
  return String(v);
}

function feeLine(label: string, value: string): string {
  return `${label}: ${value || '-'}`;
}

/** Compact 6-column PDF cell text matching Print. */
export function channelSchedulePdfCompactRow(
  row: ChannelScheduleWithChargesReportExportRow
): string[] {
  const localFees = [
    feeLine('Doc', s(row, 'doctorFeeLocal')),
    feeLine('Hos', s(row, 'hospitalFeeLocal')),
    feeLine('Agy', s(row, 'agencyFeeLocal')),
    feeLine('Scan', s(row, 'scanFeeLocal')),
    feeLine('OnCall', s(row, 'onCallFeeLocal')),
    feeLine('CC', s(row, 'creditCardCommissionLocal')),
    feeLine('API', s(row, 'apiFeeLocal')),
    feeLine('Val', s(row, 'sessionValueLocal')),
  ].join('\n');

  const foreignFees = [
    feeLine('Doc', s(row, 'doctorFeeForeign')),
    feeLine('Hos', s(row, 'hospitalFeeForeign')),
    feeLine('Agy', s(row, 'agencyFeeForeign')),
    feeLine('Scan', s(row, 'scanFeeForeign')),
    feeLine('OnCall', s(row, 'onCallFeeForeign')),
    feeLine('CC', s(row, 'creditCardCommissionForeign')),
    feeLine('API', s(row, 'apiFeeForeign')),
    feeLine('Val', s(row, 'sessionValueForeign')),
  ].join('\n');

  return [
    `${s(row, 'sessionName')}\n${s(row, 'roomName')} · ${s(row, 'locationName')}`,
    `S: ${s(row, 'startTime')}\nE: ${s(row, 'endTime')}`,
    `${s(row, 'dateType')}\nApply: ${s(row, 'applyOnlyTo')}`,
    localFees,
    foreignFees,
    `Start #${s(row, 'startingPatientNo')} · Max #${s(row, 'maximumPatientNo')}\nPrev: ${s(row, 'previousSession')}\nRefund: ${s(row, 'refundable')} · Adv: ${s(row, 'advanceBookingEnabled')} · ${s(row, 'status')}`,
  ];
}

export function channelScheduleDoctorGroupTitle(
  row: ChannelScheduleWithChargesReportExportRow
): string {
  return s(row, 'doctorName');
}

export function channelScheduleExportCellValue(
  row: ChannelScheduleWithChargesReportExportRow,
  key: keyof ChannelScheduleWithChargesReportExportRow
): string | number | null {
  const v = row[key];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  return String(v);
}
