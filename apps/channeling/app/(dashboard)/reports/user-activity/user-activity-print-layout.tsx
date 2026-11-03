'use client';

import moment from 'moment';
import type { UserActivityRow } from './columns';

type Props = {
  rows: UserActivityRow[];
};

/**
 * Print-only A4 portrait for User Activity Report (7 screen columns → compact).
 * Columns: No. | Date | User | Activity (Action / Entity Type / Entity ID) | Meta (IP / Importance)
 * Branded header via existing ReportPrintLayout.
 */
export function UserActivityPrintLayout({ rows }: Props) {
  return (
    <div className="ua-print-root">
      <style>{`
        @media print {
          .user-activity-report-root .ua-screen-table {
            display: none !important;
          }
          .user-activity-report-root .ua-print-only {
            display: block !important;
          }

          .user-activity-report-root,
          .user-activity-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .user-activity-report-root .print\:bg-white,
          .user-activity-report-root .print\:bg-white > div,
          .user-activity-report-root .rpt-print-root,
          .user-activity-report-root .rpt-print-header,
          .user-activity-report-root .rpt-print-summary,
          .user-activity-report-root .rpt-print-body,
          .user-activity-report-root .ua-print-root,
          .user-activity-report-root .ua-print-only {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
          }

          .user-activity-report-root .rpt-print-root table.ua-print-table {
            width: 100% !important;
            max-width: none !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table thead {
            display: table-header-group !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table th,
          .user-activity-report-root .rpt-print-root table.ua-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 0.55mm 0.7mm !important;
            font-size: 6pt !important;
            line-height: 1.15 !important;
            font-weight: 400 !important;
            vertical-align: top !important;
            text-align: left !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5.75pt !important;
            text-align: left !important;
            vertical-align: middle !important;
            padding: 0.7mm 0.7mm !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table th *,
          .user-activity-report-root .rpt-print-root table.ua-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .user-activity-report-root .ua-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .user-activity-report-root .ua-strong {
            font-weight: 700 !important;
          }
          .user-activity-report-root .ua-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
            display: inline !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table td .ua-k {
            font-weight: 700 !important;
          }
          .user-activity-report-root .ua-muted {
            color: #333 !important;
          }
          .user-activity-report-root .ua-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            max-height: 2.4em !important;
          }
          .user-activity-report-root .ua-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }

          .user-activity-report-root .rpt-print-root table.ua-print-table th:first-child,
          .user-activity-report-root .rpt-print-root table.ua-print-table td:first-child {
            border-left: 0.35mm solid #000 !important;
          }
          .user-activity-report-root .rpt-print-root table.ua-print-table th:last-child,
          .user-activity-report-root .rpt-print-root table.ua-print-table td:last-child {
            border-right: 0.35mm solid #000 !important;
            box-shadow: inset -0.35mm 0 0 #000 !important;
          }

          .user-activity-report-root .ua-c0 { width: 5% !important; }
          .user-activity-report-root .ua-c1 { width: 14% !important; }
          .user-activity-report-root .ua-c2 { width: 16% !important; }
          .user-activity-report-root .ua-c3 { width: 42% !important; }
          .user-activity-report-root .ua-c4 { width: 23% !important; }
        }

        @media screen {
          .user-activity-report-root .ua-print-only {
            display: none !important;
          }
        }
      `}</style>

      <table className="ua-print-table">
        <colgroup>
          <col className="ua-c0" />
          <col className="ua-c1" />
          <col className="ua-c2" />
          <col className="ua-c3" />
          <col className="ua-c4" />
        </colgroup>
        <thead>
          <tr>
            <th className="ua-c0">No.</th>
            <th className="ua-c1">Date</th>
            <th className="ua-c2">User</th>
            <th className="ua-c3">Activity</th>
            <th className="ua-c4">Meta</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="ua-center">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const date = r.createdAt
                ? moment(r.createdAt).format('YYYY-MM-DD')
                : '—';
              const time = r.createdAt ? moment(r.createdAt).format('HH:mm:ss') : '';
              return (
                <tr key={r.id || i}>
                  <td className="ua-c0 ua-center">{i + 1}</td>
                  <td className="ua-c1">
                    <span className="ua-line ua-strong">{date}</span>
                    {time ? <span className="ua-line ua-muted">{time}</span> : null}
                  </td>
                  <td className="ua-c2">
                    <span className="ua-line ua-clamp2">{r.userName || '—'}</span>
                  </td>
                  <td className="ua-c3">
                    <span className="ua-line ua-clamp2">
                      <span className="ua-k">Action</span>
                      {r.action || '—'}
                    </span>
                    <span className="ua-line ua-clamp2">
                      <span className="ua-k">Type</span>
                      {r.entityType || '—'}
                    </span>
                    <span className="ua-line ua-muted ua-clamp2">
                      <span className="ua-k">ID</span>
                      {r.entityId || '—'}
                    </span>
                  </td>
                  <td className="ua-c4">
                    <span className="ua-line ua-clamp2">
                      <span className="ua-k">IP</span>
                      {r.ipAddress || '—'}
                    </span>
                    <span className="ua-line ua-clamp2">
                      <span className="ua-k">Imp</span>
                      {r.importance || '—'}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
