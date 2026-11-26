'use client';

import moment from 'moment';
import { BOOKING_METHODS } from '@/types/channel-booking';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import type { ChannelBookingsReportRow } from '@/types/reports/channel-bookings';

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Paid',
  2: 'Cancel',
  3: 'Refund',
};

const REFUND_LABELS: Record<number, string> = {
  0: 'No Refund',
  1: 'Professional Only',
  2: 'Hospital Only',
  3: 'Full Refund',
};

type BookingRow = ChannelBookingsReportRow & Record<string, unknown>;

function formatApplyTime(session: { startTime?: Date; endTime?: Date } | null | undefined): string {
  if (!session?.startTime || !session?.endTime) return '-';
  const start = moment(session.startTime).format('h:mm A');
  const end = moment(session.endTime).format('h:mm A');
  return `${start}–${end}`;
}

function formatPatientName(title?: string, name?: string): string {
  const parts = [title, name].filter(Boolean);
  return parts.join(' ').trim() || '-';
}

function formatMoney(value: unknown): string {
  const n = typeof value === 'number' ? value : 0;
  return n.toFixed(2);
}

function formatUser(user: { name?: string | null; staff?: { code?: string | null } | null } | null | undefined): string {
  if (!user) return '—';
  const name = user.name ?? '—';
  const staffCode = user.staff?.code;
  return staffCode ? `${name} (${staffCode})` : name;
}

function formatAuditStamp(value: unknown): string {
  if (!value) return '—';
  return moment(value as Date | string).format('DD/MM HH:mm');
}

function formatShortDate(value: unknown): string {
  if (!value) return '-';
  return moment(value as Date | string).format('DD/MM/YY');
}

function formatRefundAt(value: unknown): string {
  if (!value) return '-';
  return moment(value as Date | string).format('DD/MM HH:mm');
}

type CompactBooking = {
  appointmentLine1: string;
  appointmentLine2: string;
  billNumber: string;
  bookingMeta: string;
  patientName: string;
  patientMeta: string;
  refundStatus: string;
  refundMeta: string;
  creatorLine: string;
  updaterLine: string;
  feesLine: string;
  totalLine: string;
  paymentMode: string;
  agentName: string;
};

function mapCompactBooking(row: BookingRow): CompactBooking {
  const session = row.session as { date?: Date; startTime?: Date; endTime?: Date } | null | undefined;
  const methodId = row.method as number | undefined;
  const methodName = BOOKING_METHODS.find((x) => x.id === methodId)?.name;
  const status = row.status as number | undefined;
  const refund = (row.refund as number | undefined) ?? 0;
  const pm = row.receiptPaymentMethod as number | null | undefined;
  const agency = row.agency as { name?: string } | null | undefined;
  const applyNumber = row.appointmentNo != null ? String(row.appointmentNo) : '-';

  const refundStatus = REFUND_LABELS[refund] ?? (refund != null ? String(refund) : '-');
  const refundedBy =
    refund === 0
      ? '-'
      : formatUser(row.refundCreatedUser as { name?: string | null; staff?: { code?: string | null } | null } | null);
  const refundedAt = refund === 0 ? '-' : formatRefundAt(row.refundReceiptCreatedAt);

  return {
    appointmentLine1: `${formatShortDate(session?.date)} | #${applyNumber}`,
    appointmentLine2: formatApplyTime(session),
    billNumber: String(row.receiptNoString ?? row.bookingid_string ?? '') || '-',
    bookingMeta: `${methodName ?? (methodId != null ? String(methodId) : '-')} | ${STATUS_LABELS[status as number] ?? (status != null ? String(status) : '-')}`,
    patientName: formatPatientName(row.title as string | undefined, row.name as string | undefined),
    patientMeta: `${(row.phone as string | undefined) ?? '-'} | ${(row.area as string | undefined) ?? '-'}`,
    refundStatus,
    refundMeta: `By: ${refundedBy} | At: ${refundedAt}`,
    creatorLine: `C: ${formatUser(row.createdUser as { name?: string | null; staff?: { code?: string | null } | null } | null)} · ${formatAuditStamp(row.createdAt)}`,
    updaterLine: `U: ${formatUser(row.updatedUser as { name?: string | null; staff?: { code?: string | null } | null } | null)} · ${formatAuditStamp(row.updatedAt)}`,
    feesLine: `H: ${formatMoney(row.hospitalFee)} | D: ${formatMoney(row.professionalFee)}`,
    totalLine: `Disc: ${formatMoney(row.discount)} | Total: ${formatMoney(row.amount)}`,
    paymentMode: pm != null ? (PAYMENT_METHOD_NAMES[pm] ?? String(pm)) : '-',
    agentName: agency?.name ?? '-',
  };
}

function doctorGroupTitle(row: BookingRow): string {
  const doctor = row.doctor as { code?: string; name?: string; speciality?: { name?: string } } | undefined;
  const code = doctor?.code ?? '-';
  const name = doctor?.name ?? '-';
  const speciality = doctor?.speciality?.name?.trim();
  const base = `${code} – ${name}`;
  return speciality ? `${base} | ${speciality}` : base;
}

type Props = {
  rows: ChannelBookingsReportRow[];
};

/**
 * Print-only compact landscape table for Channel Booking Details.
 * PDF/Excel use separate modules — do not change those when editing this file.
 */
export function ChannelBookingsPrintLayout({ rows }: Props) {
  const groups = new Map<string, ChannelBookingsReportRow[]>();
  for (const row of rows) {
    const doctor = (row as BookingRow).doctor as { id?: string } | undefined;
    const key = doctor?.id ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let hospitalFeeTotal = 0;
  let doctorFeeTotal = 0;
  let discountTotal = 0;
  let totalFeeTotal = 0;
  for (const row of rows) {
    const o = row as BookingRow;
    hospitalFeeTotal += typeof o.hospitalFee === 'number' ? o.hospitalFee : 0;
    doctorFeeTotal += typeof o.professionalFee === 'number' ? o.professionalFee : 0;
    discountTotal += typeof o.discount === 'number' ? o.discount : 0;
    totalFeeTotal += typeof o.amount === 'number' ? o.amount : 0;
  }

  return (
    <div className="cb-print-root">
      <style>{`
        @media print {
          /* Channel Booking Details Print only — denser landscape page */
          @page {
            size: A4 landscape;
            margin: 6mm 5mm 18mm;
          }
          /* Use the full printable width — container max-width leaves side gaps */
          .channel-bookings-report-root,
          .channel-bookings-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .channel-bookings-report-root .rpt-print-root,
          .channel-bookings-report-root .rpt-print-body,
          .channel-bookings-report-root .rpt-print-header,
          .channel-bookings-report-root .rpt-print-summary,
          .channel-bookings-report-root .cb-print-root,
          .channel-bookings-report-root .cb-print-table {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          /* Channel Booking Details only — tighter page chrome for landscape density */
          .channel-bookings-report-root .rpt-print-header {
            margin-bottom: 1mm !important;
          }
          .channel-bookings-report-root .rpt-print-brand-row {
            height: 9mm !important;
            gap: 4mm !important;
          }
          .channel-bookings-report-root .rpt-print-logo {
            height: 9mm !important;
            max-width: 36mm !important;
          }
          .channel-bookings-report-root .rpt-print-titles {
            height: 9mm !important;
            padding: 1.2mm 0 0.2mm !important;
          }
          .channel-bookings-report-root .rpt-print-org {
            height: 3.4mm !important;
            font-size: 11pt !important;
          }
          .channel-bookings-report-root .rpt-print-title-gap {
            height: 0.5mm !important;
          }
          .channel-bookings-report-root .rpt-print-report-name {
            height: 3.4mm !important;
            font-size: 9pt !important;
          }
          .channel-bookings-report-root .rpt-print-rule {
            margin-top: 1mm !important;
          }
          .channel-bookings-report-root .rpt-print-summary {
            margin-top: 1mm !important;
          }
          .channel-bookings-report-root .rpt-print-summary-bar {
            padding: 0.5mm 1.5mm !important;
            font-size: 6.5pt !important;
            letter-spacing: 0.08em !important;
          }
          .channel-bookings-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
            gap: 0.6mm 2mm !important;
            padding: 0.8mm 1.5mm !important;
          }
          .channel-bookings-report-root .rpt-print-label {
            margin: 0 0 0.15mm !important;
            font-size: 5.5pt !important;
            letter-spacing: 0.04em !important;
          }
          .channel-bookings-report-root .rpt-print-value {
            font-size: 6.5pt !important;
            line-height: 1.08 !important;
            font-weight: 600 !important;
          }
          .channel-bookings-report-root .rpt-print-body {
            margin-top: 1mm !important;
          }

          .cb-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 7pt;
            line-height: 1.12;
          }
          .cb-print-group {
            margin: 0 0 1.4mm;
            break-inside: auto;
          }
          .cb-print-group-title {
            font-size: 7.5pt;
            font-weight: 700;
            margin: 0;
            padding: 0.6mm 1mm;
            background: #ececec;
            border: 0.5pt solid #000;
            border-bottom: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-after: avoid;
            page-break-after: avoid;
          }
          .cb-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .cb-print-table thead {
            display: table-header-group;
          }
          .cb-print-table th {
            font-size: 6pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: left;
            padding: 0.5mm 0.8mm;
            border: 0.45pt solid #000;
            background: #f3f3f3;
            color: #000 !important;
            line-height: 1.1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cb-print-table td {
            vertical-align: top;
            padding: 0.55mm 0.8mm;
            border-left: 0.45pt solid #bbb;
            border-right: 0.45pt solid #bbb;
            border-bottom: 0.4pt solid #999;
            border-top: 0;
            font-size: 6.75pt;
            line-height: 1.12;
            color: #000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .cb-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .cb-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .cb-print-table col.cb-col-appt { width: 11%; }
          .cb-print-table col.cb-col-book { width: 13%; }
          .cb-print-table col.cb-col-patient { width: 15%; }
          .cb-print-table col.cb-col-refund { width: 12%; }
          .cb-print-table col.cb-col-audit { width: 18%; }
          .cb-print-table col.cb-col-fees { width: 11%; }
          .cb-print-table col.cb-col-total { width: 11%; }
          .cb-print-table col.cb-col-pay { width: 9%; }
          .cb-print-line {
            display: block;
          }
          .cb-print-line + .cb-print-line {
            margin-top: 0.15mm;
          }
          .cb-print-strong {
            font-weight: 700;
          }
          .cb-print-muted {
            color: #333 !important;
          }
          .cb-print-nums {
            font-variant-numeric: tabular-nums;
          }
          .cb-print-totals {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 0.7pt solid #000;
            margin-top: 1.2mm;
            padding: 0.8mm 1.2mm;
          }
          .cb-print-totals-title {
            font-size: 7pt;
            font-weight: 700;
            margin: 0 0 0.5mm;
          }
          .cb-print-totals-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.5mm 2mm;
          }
          .cb-print-total-item {
            min-width: 0;
          }
          .cb-print-total-label {
            display: block;
            font-size: 5.5pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #444 !important;
            line-height: 1.05;
          }
          .cb-print-total-value {
            display: block;
            font-size: 7.5pt;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            line-height: 1.1;
          }
        }
        @media screen {
          .cb-print-root { display: none; }
        }
      `}</style>

      {Array.from(groups.entries()).map(([groupKey, groupRows]) => {
        const first = groupRows[0] as BookingRow;
        const groupTitle = doctorGroupTitle(first);
        return (
          <section key={groupKey || 'ungrouped'} className="cb-print-group">
            <div className="cb-print-group-title">{groupTitle}</div>
            <table className="cb-print-table">
              <colgroup>
                <col className="cb-col-appt" />
                <col className="cb-col-book" />
                <col className="cb-col-patient" />
                <col className="cb-col-refund" />
                <col className="cb-col-audit" />
                <col className="cb-col-fees" />
                <col className="cb-col-total" />
                <col className="cb-col-pay" />
              </colgroup>
              <thead>
                <tr>
                  <th>Appointment</th>
                  <th>Booking</th>
                  <th>Patient</th>
                  <th>Refund</th>
                  <th>Audit</th>
                  <th>Fees</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => {
                  const b = mapCompactBooking(row as BookingRow);
                  return (
                    <tr key={String(row.id)}>
                      <td>
                        <span className="cb-print-line cb-print-strong">{b.appointmentLine1}</span>
                        <span className="cb-print-line cb-print-muted">{b.appointmentLine2}</span>
                      </td>
                      <td>
                        <span className="cb-print-line cb-print-strong">{b.billNumber}</span>
                        <span className="cb-print-line">{b.bookingMeta}</span>
                      </td>
                      <td>
                        <span className="cb-print-line cb-print-strong">{b.patientName}</span>
                        <span className="cb-print-line">{b.patientMeta}</span>
                      </td>
                      <td>
                        <span className="cb-print-line cb-print-strong">{b.refundStatus}</span>
                        <span className="cb-print-line cb-print-muted">{b.refundMeta}</span>
                      </td>
                      <td>
                        <span className="cb-print-line">{b.creatorLine}</span>
                        <span className="cb-print-line">{b.updaterLine}</span>
                      </td>
                      <td>
                        <span className="cb-print-line cb-print-nums">{b.feesLine}</span>
                      </td>
                      <td>
                        <span className="cb-print-line cb-print-nums">{b.totalLine}</span>
                      </td>
                      <td>
                        <span className="cb-print-line cb-print-strong">{b.paymentMode}</span>
                        <span className="cb-print-line">{b.agentName}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}

      {rows.length > 0 ? (
        <div className="cb-print-totals">
          <div className="cb-print-totals-title">Total</div>
          <div className="cb-print-totals-grid">
            <div className="cb-print-total-item">
              <span className="cb-print-total-label">Hospital Fee</span>
              <span className="cb-print-total-value">{hospitalFeeTotal.toFixed(2)}</span>
            </div>
            <div className="cb-print-total-item">
              <span className="cb-print-total-label">Doctor Fee</span>
              <span className="cb-print-total-value">{doctorFeeTotal.toFixed(2)}</span>
            </div>
            <div className="cb-print-total-item">
              <span className="cb-print-total-label">Discount</span>
              <span className="cb-print-total-value">{discountTotal.toFixed(2)}</span>
            </div>
            <div className="cb-print-total-item">
              <span className="cb-print-total-label">Total Fee</span>
              <span className="cb-print-total-value">{totalFeeTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
