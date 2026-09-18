'use client';

import moment from 'moment';
import { DAY_TYPES } from '@/types/doctor.session';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import type { Doctor } from '@/types/doctor';
import type { ChannelScheduleWithChargesReportRow } from '@/types/reports/channel-schedule-with-charges';

function getFeeById(fees: unknown, feeId: number): { localFee?: number; foreignFee?: number } | null {
  if (!Array.isArray(fees)) return null;
  return (fees.find((f: { id?: string | number }) => String(f?.id) === String(feeId)) as
    | { localFee?: number; foreignFee?: number }
    | undefined) ?? null;
}

function formatMoney(value: unknown): string {
  if (value == null || value === '') return '-';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '-';
  return n.toFixed(2);
}

function formatTimeLine(value?: Date | null): string {
  if (!value) return '-';
  return `${moment(value).format('h:mm A')} · ${moment(value).format('DD/MM/YY')}`;
}

function getDayTypeLabel(dayType: number): string {
  const match = DAY_TYPES.find((d) => Number(d.id) === dayType);
  return match?.name ?? '-';
}

function doctorGroupTitle(row: ChannelScheduleWithChargesReportRow): string {
  const doctor = row.doctor as Doctor | null | undefined;
  const code = doctor?.code?.trim();
  const name = formatDoctorName(doctor) || doctor?.name || '-';
  return code ? `${code} – ${name}` : name;
}

type CompactSession = {
  sessionLine1: string;
  sessionLine2: string;
  timeLine1: string;
  timeLine2: string;
  scheduleLine1: string;
  scheduleLine2: string;
  localFees: string[];
  foreignFees: string[];
  capacityLine1: string;
  capacityLine2: string;
  flagsLine: string;
};

function mapCompactSession(row: ChannelScheduleWithChargesReportRow): CompactSession {
  const room = row.room?.number ?? row.room?.description ?? '-';
  const location = row.location?.name ?? '-';
  const fee = (id: number) => getFeeById(row.fees, id);

  return {
    sessionLine1: row.name?.trim() || '-',
    sessionLine2: `${room} · ${location}`,
    timeLine1: `S: ${formatTimeLine(row.startTime)}`,
    timeLine2: `E: ${formatTimeLine(row.endTime)}`,
    scheduleLine1: getDayTypeLabel(row.dayType),
    scheduleLine2: row.applyTo
      ? `Apply: ${moment(row.applyTo).format('DD/MM/YY')}`
      : 'Apply: -',
    localFees: [
      `Doc: ${formatMoney(fee(0)?.localFee)}`,
      `Hos: ${formatMoney(fee(1)?.localFee)}`,
      `Agy: ${formatMoney(fee(2)?.localFee)}`,
      `Scan: ${formatMoney(fee(3)?.localFee)}`,
      `OnCall: ${formatMoney(fee(4)?.localFee)}`,
      `CC: ${formatMoney(fee(5)?.localFee)}`,
      `API: ${formatMoney(fee(6)?.localFee)}`,
      `Val: ${formatMoney(row.amountLocal)}`,
    ],
    foreignFees: [
      `Doc: ${formatMoney(fee(0)?.foreignFee)}`,
      `Hos: ${formatMoney(fee(1)?.foreignFee)}`,
      `Agy: ${formatMoney(fee(2)?.foreignFee)}`,
      `Scan: ${formatMoney(fee(3)?.foreignFee)}`,
      `OnCall: ${formatMoney(fee(4)?.foreignFee)}`,
      `CC: ${formatMoney(fee(5)?.foreignFee)}`,
      `API: ${formatMoney(fee(6)?.foreignFee)}`,
      `Val: ${formatMoney(row.amountForeign)}`,
    ],
    capacityLine1: `Start #${row.startingPatientNumber ?? '-'} · Max #${row.maxPatientNumber ?? '-'}`,
    capacityLine2: `Prev: ${row.previousSession?.name ?? '-'}`,
    flagsLine: [
      `Refund: ${row.refundable === 1 ? 'Yes' : 'No'}`,
      `Adv: ${row.advancedBookingEnabled ? 'Yes' : 'No'}`,
      row.status === 1 ? 'Publish' : 'Unpublish',
    ].join(' · '),
  };
}

type Props = {
  rows: ChannelScheduleWithChargesReportRow[];
};

/**
 * Print-only compact A4 portrait table for Channel Schedule with Charges.
 * PDF/Excel remain on the default branded export path.
 */
export function ChannelScheduleWithChargesPrintLayout({ rows }: Props) {
  const groups = new Map<string, ChannelScheduleWithChargesReportRow[]>();
  for (const row of rows) {
    const key = row.doctor?.id ?? row.doctor?.code ?? doctorGroupTitle(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  return (
    <div className="csc-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 7mm 11mm;
          }
          .channel-schedule-charges-report-root .rpt-print-header {
            margin-bottom: 1mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-brand-row {
            height: 9mm !important;
            gap: 4mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-logo {
            height: 9mm !important;
            max-width: 36mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-titles {
            height: 9mm !important;
            padding: 1.2mm 0 0.2mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-org {
            height: 3.4mm !important;
            font-size: 11pt !important;
          }
          .channel-schedule-charges-report-root .rpt-print-title-gap {
            height: 0.5mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-report-name {
            height: 3.4mm !important;
            font-size: 9pt !important;
          }
          .channel-schedule-charges-report-root .rpt-print-rule {
            margin-top: 1mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-summary {
            margin-top: 1mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-summary-bar {
            padding: 0.5mm 1.5mm !important;
            font-size: 6.5pt !important;
            letter-spacing: 0.08em !important;
          }
          .channel-schedule-charges-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.6mm 2mm !important;
            padding: 0.8mm 1.5mm !important;
          }
          .channel-schedule-charges-report-root .rpt-print-label {
            margin: 0 0 0.15mm !important;
            font-size: 5.5pt !important;
            letter-spacing: 0.04em !important;
          }
          .channel-schedule-charges-report-root .rpt-print-value {
            font-size: 6.5pt !important;
            line-height: 1.08 !important;
            font-weight: 600 !important;
          }
          .channel-schedule-charges-report-root .rpt-print-body {
            margin-top: 1mm !important;
          }

          .csc-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 6.75pt;
            line-height: 1.12;
          }
          .csc-print-group {
            margin: 0 0 1.4mm;
            break-inside: auto;
          }
          .csc-print-group-title {
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
          .csc-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .csc-print-table thead {
            display: table-header-group;
          }
          .csc-print-table th {
            font-size: 5.75pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: left;
            padding: 0.5mm 0.7mm;
            border: 0.45pt solid #000;
            background: #f3f3f3;
            color: #000 !important;
            line-height: 1.1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .csc-print-table td {
            vertical-align: top;
            padding: 0.55mm 0.7mm;
            border-left: 0.45pt solid #bbb;
            border-right: 0.45pt solid #bbb;
            border-bottom: 0.4pt solid #999;
            border-top: 0;
            font-size: 6.5pt;
            line-height: 1.12;
            color: #000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .csc-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .csc-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .csc-print-table col.csc-col-session { width: 16%; }
          .csc-print-table col.csc-col-time { width: 15%; }
          .csc-print-table col.csc-col-schedule { width: 12%; }
          .csc-print-table col.csc-col-local { width: 18%; }
          .csc-print-table col.csc-col-foreign { width: 18%; }
          .csc-print-table col.csc-col-meta { width: 21%; }
          .csc-print-line {
            display: block;
          }
          .csc-print-line + .csc-print-line {
            margin-top: 0.15mm;
          }
          .csc-print-strong {
            font-weight: 700;
          }
          .csc-print-muted {
            color: #333 !important;
          }
          .csc-print-nums {
            font-variant-numeric: tabular-nums;
          }
          .csc-print-fee-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.15mm 1mm;
          }
        }
        @media screen {
          .csc-print-root { display: none; }
        }
      `}</style>

      {Array.from(groups.entries()).map(([groupKey, groupRows]) => {
        const first = groupRows[0]!;
        const groupTitle = doctorGroupTitle(first);
        return (
          <section key={groupKey || 'ungrouped'} className="csc-print-group">
            <div className="csc-print-group-title">{groupTitle}</div>
            <table className="csc-print-table">
              <colgroup>
                <col className="csc-col-session" />
                <col className="csc-col-time" />
                <col className="csc-col-schedule" />
                <col className="csc-col-local" />
                <col className="csc-col-foreign" />
                <col className="csc-col-meta" />
              </colgroup>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Time</th>
                  <th>Schedule</th>
                  <th>Fees (Local)</th>
                  <th>Fees (Foreign)</th>
                  <th>Capacity / Flags</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => {
                  const s = mapCompactSession(row);
                  return (
                    <tr key={String(row.id)}>
                      <td>
                        <span className="csc-print-line csc-print-strong">{s.sessionLine1}</span>
                        <span className="csc-print-line csc-print-muted">{s.sessionLine2}</span>
                      </td>
                      <td>
                        <span className="csc-print-line">{s.timeLine1}</span>
                        <span className="csc-print-line">{s.timeLine2}</span>
                      </td>
                      <td>
                        <span className="csc-print-line csc-print-strong">{s.scheduleLine1}</span>
                        <span className="csc-print-line csc-print-muted">{s.scheduleLine2}</span>
                      </td>
                      <td>
                        <div className="csc-print-fee-grid csc-print-nums">
                          {s.localFees.map((line, i) => (
                            <span key={`l-${i}`} className="csc-print-line">
                              {line}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="csc-print-fee-grid csc-print-nums">
                          {s.foreignFees.map((line, i) => (
                            <span key={`f-${i}`} className="csc-print-line">
                              {line}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="csc-print-line">{s.capacityLine1}</span>
                        <span className="csc-print-line csc-print-muted">{s.capacityLine2}</span>
                        <span className="csc-print-line">{s.flagsLine}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
