'use client';

import moment from 'moment';
import type { RoomOccupancyReportRow } from '@/types/reports/room-occupancy';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

type Props = {
  rows: RoomOccupancyReportRow[];
};

/**
 * Print-only clear A4 landscape hour grid for Room Occupancy.
 * PDF/Excel use matching modules — keep this layout as the visual source of truth.
 */
export function RoomOccupancyPrintLayout({ rows }: Props) {
  const groups = new Map<string, RoomOccupancyReportRow[]>();
  for (const row of rows) {
    const key = row.roomId || row.roomNumber || '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  return (
    <div className="ro-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 7mm 11mm;
          }
          .room-occupancy-report-root .rpt-print-header {
            margin-bottom: 1mm !important;
          }
          .room-occupancy-report-root .rpt-print-brand-row {
            height: 9mm !important;
            gap: 4mm !important;
          }
          .room-occupancy-report-root .rpt-print-logo {
            height: 9mm !important;
            max-width: 36mm !important;
          }
          .room-occupancy-report-root .rpt-print-titles {
            height: 9mm !important;
            padding: 1.2mm 0 0.2mm !important;
          }
          .room-occupancy-report-root .rpt-print-org {
            height: 3.4mm !important;
            font-size: 11pt !important;
          }
          .room-occupancy-report-root .rpt-print-title-gap {
            height: 0.5mm !important;
          }
          .room-occupancy-report-root .rpt-print-report-name {
            height: 3.4mm !important;
            font-size: 9pt !important;
          }
          .room-occupancy-report-root .rpt-print-rule {
            margin-top: 1mm !important;
          }
          .room-occupancy-report-root .rpt-print-summary {
            margin-top: 1mm !important;
          }
          .room-occupancy-report-root .rpt-print-summary-bar {
            padding: 0.5mm 1.5mm !important;
            font-size: 6.5pt !important;
            letter-spacing: 0.08em !important;
          }
          .room-occupancy-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 0.6mm 2mm !important;
            padding: 0.8mm 1.5mm !important;
          }
          .room-occupancy-report-root .rpt-print-label {
            margin: 0 0 0.15mm !important;
            font-size: 5.5pt !important;
            letter-spacing: 0.04em !important;
          }
          .room-occupancy-report-root .rpt-print-value {
            font-size: 6.5pt !important;
            line-height: 1.08 !important;
            font-weight: 600 !important;
          }
          .room-occupancy-report-root .rpt-print-body {
            margin-top: 1mm !important;
          }

          .ro-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 6.5pt;
            line-height: 1.1;
          }
          .ro-print-legend {
            display: flex;
            align-items: center;
            gap: 3.5mm;
            margin: 0 0 1.2mm;
            font-size: 6pt;
            font-weight: 600;
          }
          .ro-print-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 1mm;
          }
          .ro-print-group {
            margin: 0 0 1.4mm;
            break-inside: auto;
          }
          .ro-print-group-title {
            font-size: 7.5pt;
            font-weight: 700;
            margin: 0;
            padding: 0.55mm 1mm;
            background: #ececec;
            border: 0.5pt solid #000;
            border-bottom: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-after: avoid;
            page-break-after: avoid;
          }
          .ro-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .ro-print-table thead {
            display: table-header-group;
          }
          .ro-print-table th {
            font-size: 5.5pt;
            font-weight: 700;
            text-align: center;
            padding: 0.4mm 0.2mm;
            border: 0.4pt solid #000;
            background: #f3f3f3;
            color: #000 !important;
            line-height: 1.05;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ro-print-table th.ro-th-date,
          .ro-print-table th.ro-th-booked {
            text-align: left;
            padding: 0.4mm 0.7mm;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .ro-print-table th.ro-th-booked {
            text-align: right;
          }
          .ro-print-table td {
            vertical-align: middle;
            padding: 0.35mm 0.2mm;
            border-left: 0.35pt solid #ccc;
            border-right: 0.35pt solid #ccc;
            border-bottom: 0.35pt solid #999;
            border-top: 0;
            color: #000 !important;
          }
          .ro-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .ro-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .ro-print-table col.ro-col-date { width: 9%; }
          .ro-print-table col.ro-col-hour { width: 3.4%; }
          .ro-print-table col.ro-col-booked { width: 9.4%; }
          .ro-print-table th.ro-hour-block,
          .ro-print-table td.ro-hour-block {
            border-left: 0.7pt solid #000;
          }
          .ro-print-date {
            display: block;
            padding: 0 0.6mm;
            font-size: 6.5pt;
            font-weight: 700;
            text-align: left;
          }
          .ro-print-booked {
            display: block;
            padding: 0 0.7mm;
            font-size: 6.75pt;
            font-weight: 700;
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          .ro-print-slot {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 3.2mm;
          }
          .ro-print-dot {
            display: inline-block;
            width: 2.4mm;
            height: 2.4mm;
            border: 0.45pt solid #333;
            border-radius: 0.3mm;
            background: transparent;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ro-print-dot.is-booked {
            background: #f6d060 !important;
            border-color: #000;
          }
        }
        @media screen {
          .ro-print-root { display: none; }
        }
      `}</style>

      <div className="ro-print-legend">
        <span className="ro-print-legend-item">
          <span className="ro-print-dot is-booked" /> Booked
        </span>
        <span className="ro-print-legend-item">
          <span className="ro-print-dot" /> Free
        </span>
        <span>Hours 00–23 · blocks every 6 hours</span>
      </div>

      {Array.from(groups.entries()).map(([groupKey, groupRows]) => {
        const roomLabel = groupRows[0]?.roomNumber?.trim() || groupKey;
        return (
          <section key={groupKey} className="ro-print-group">
            <div className="ro-print-group-title">Room {roomLabel}</div>
            <table className="ro-print-table">
              <colgroup>
                <col className="ro-col-date" />
                {HOURS.map((h) => (
                  <col key={h} className="ro-col-hour" />
                ))}
                <col className="ro-col-booked" />
              </colgroup>
              <thead>
                <tr>
                  <th className="ro-th-date">Date</th>
                  {HOURS.map((h) => (
                    <th
                      key={h}
                      className={h > 0 && h % 6 === 0 ? 'ro-hour-block' : undefined}
                    >
                      {String(h).padStart(2, '0')}
                    </th>
                  ))}
                  <th className="ro-th-booked">Booked Hrs</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="ro-print-date">
                        {moment(row.date).format('DD/MM/YY')}
                      </span>
                    </td>
                    {HOURS.map((h) => {
                      const booked = Boolean(row.slots?.[h]);
                      return (
                        <td
                          key={h}
                          className={h > 0 && h % 6 === 0 ? 'ro-hour-block' : undefined}
                        >
                          <span className="ro-print-slot">
                            <span
                              className={`ro-print-dot${booked ? ' is-booked' : ''}`}
                              aria-label={booked ? 'Booked' : 'Free'}
                            />
                          </span>
                        </td>
                      );
                    })}
                    <td>
                      <span className="ro-print-booked">
                        {Number(row.bookedHours ?? 0).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
