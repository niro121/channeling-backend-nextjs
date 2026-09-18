/**
 * Channel Transfer — shared compact body helpers for Print / PDF / Excel.
 */

import moment from 'moment';
import type {
  ChannelTransferReportExportRow,
  ChannelTransferReportRow,
} from '@/types/reports/channel-transfer';

export type ChannelTransferMetaField = { label: string; value: string };

export type ChannelTransferCompactCard = {
  when: string;
  by: string;
  bookingId: string;
  remarks: string;
  fromLine: string;
  toLine: string;
  meta: ChannelTransferMetaField[];
};

function dash(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatStamp(value: Date | string | null | undefined): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const parsed = moment(value);
    if (parsed.isValid()) return parsed.format('DD/MM/YY HH:mm');
    return value;
  }
  return moment(value).format('DD/MM/YY HH:mm');
}

/** Compress verbose transfer activity sentences for print/PDF/Excel density. */
export function shortenTransferActivity(
  raw: string | null | undefined,
  kind: 'from' | 'to'
): string {
  const text = (raw ?? '').trim();
  if (!text || text === '-') return '-';

  const appt = text.match(/Appointment\s*No\.?\s*0*(\d+)/i)?.[1];
  const patient = text.match(/\(([^)]+)\)/)?.[1]?.trim();
  const doctor =
    text.match(/(?:from|in)\s+(.+?)'s\s+session/i)?.[1]?.trim() ??
    text.match(/(?:from|in)\s+(.+?)\s+session/i)?.[1]?.trim();
  const when = text.match(
    /on\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)/i
  )?.[1];

  const parts = [
    appt ? `Appt #${appt}` : null,
    patient || null,
    doctor || null,
    when || null,
  ].filter(Boolean);

  if (parts.length >= 2) return parts.join(' · ');
  const stripped = text
    .replace(/^Transfer of\s+/i, '')
    .replace(/^Changed to\s+/i, kind === 'to' ? '' : '')
    .trim();
  return stripped || text;
}

export function channelTransferMetaFields(input: {
  fromSessionId?: string | null;
  toSessionId?: string | null;
  toDoctorId?: string | null;
  newAppointmentNo?: string | number | null;
  metadata?: Record<string, unknown> | null;
}): ChannelTransferMetaField[] {
  const meta = input.metadata ?? {};
  const newAppt =
    input.newAppointmentNo ?? meta.newAppointmentNo ?? meta.newAppointmentNumber;

  return [
    {
      label: 'New Appt',
      value:
        newAppt != null && String(newAppt).trim() !== '' && String(newAppt) !== '-'
          ? `#${String(newAppt).replace(/^#/, '')}`
          : '-',
    },
    {
      label: 'From Sess',
      value: dash(meta.fromSessionId ?? input.fromSessionId),
    },
    {
      label: 'To Sess',
      value: dash(meta.toSessionId ?? input.toSessionId),
    },
    {
      label: 'To Doctor',
      value: dash(meta.toDoctorId ?? input.toDoctorId),
    },
  ];
}

export function mapChannelTransferCompactFromReportRow(
  row: ChannelTransferReportRow
): ChannelTransferCompactCard {
  return {
    when: formatStamp(row.transferredAt),
    by: dash(row.transferredByUserName),
    bookingId: dash(row.bookingDisplayId || row.bookingId),
    remarks: dash(row.remarks),
    fromLine: shortenTransferActivity(row.beforeActivity, 'from'),
    toLine: shortenTransferActivity(row.afterActivity, 'to'),
    meta: channelTransferMetaFields({
      fromSessionId: row.fromSessionId,
      toSessionId: row.toSessionId,
      toDoctorId: row.toDoctorId,
      metadata: row.metadata,
    }),
  };
}

export function mapChannelTransferCompactFromExportRow(
  row: ChannelTransferReportExportRow
): ChannelTransferCompactCard {
  return {
    when: formatStamp(row.transferredAt),
    by: dash(row.transferredBy),
    bookingId: dash(row.bookingId),
    remarks: dash(row.remarks),
    fromLine: shortenTransferActivity(row.beforeActivity, 'from'),
    toLine: shortenTransferActivity(row.afterActivity, 'to'),
    meta: channelTransferMetaFields({
      fromSessionId: row.fromSessionId,
      toSessionId: row.toSessionId,
      toDoctorId: row.toDoctorId,
      newAppointmentNo: row.newAppointmentNo,
    }),
  };
}

export const CHANNEL_TRANSFER_EXPORT_COLUMNS = [
  'Transferred At',
  'Transferred By',
  'Booking ID',
  'Remarks',
  'From (Before)',
  'To (After)',
  'New Appointment No',
  'From Session Id',
  'To Session Id',
  'To Doctor Id',
  'Action',
] as const;

export const CHANNEL_TRANSFER_EXPORT_KEYS = [
  'transferredAt',
  'transferredBy',
  'bookingId',
  'remarks',
  'beforeActivity',
  'afterActivity',
  'newAppointmentNo',
  'fromSessionId',
  'toSessionId',
  'toDoctorId',
  'action',
] as const satisfies readonly (keyof ChannelTransferReportExportRow)[];
