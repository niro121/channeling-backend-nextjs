'use client';

import { formatCents } from '@/lib/format-money';
import type { UnreconciledHandoversReportRow } from '@/types/reports/unreconciled-handovers';

type Props = {
  rows: UnreconciledHandoversReportRow[];
};

function money(cents: number | null): string {
  if (cents == null) return '—';
  return formatCents(cents);
}

export function UnreconciledHandoversPrintLayout({ rows }: Props) {
  const balance = rows.filter((row) => row.rowKind === 'balance');
  const groups = new Map<string, UnreconciledHandoversReportRow[]>();
  for (const row of rows) {
    if (row.rowKind === 'balance') continue;
    if (!groups.has(row.groupKey)) groups.set(row.groupKey, []);
    groups.get(row.groupKey)!.push(row);
  }
  const itemTotal = rows
    .filter((row) => row.rowKind === 'item')
    .reduce((sum, row) => sum + (row.amountCents ?? 0), 0);

  return (
    <div className="space-y-4 text-xs">
      {balance[0]?.groupLabel ? <div className="font-semibold">{balance[0].groupLabel}</div> : null}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border px-1 py-1 text-left">Method</th>
            <th className="border px-1 py-1 text-right">Till balance</th>
            <th className="border px-1 py-1 text-right">Not deducted</th>
            <th className="border px-1 py-1 text-right">Difference</th>
            <th className="border px-1 py-1 text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {balance.map((row) => (
            <tr key={row.id}>
              <td className="border px-1 py-1">{row.methodLabel}</td>
              <td className="border px-1 py-1 text-right tabular-nums">{money(row.tillCents)}</td>
              <td className="border px-1 py-1 text-right tabular-nums">{money(row.undeductedCents)}</td>
              <td className="border px-1 py-1 text-right tabular-nums">{money(row.differenceCents)}</td>
              <td className="border px-1 py-1">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {Array.from(groups.entries()).map(([key, groupRows]) => {
        const header = groupRows[0];
        return (
          <div key={key}>
            <div className="mb-1 font-semibold">{header?.groupLabel}</div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-1 py-1 text-left">Receipt</th>
                  <th className="border px-1 py-1 text-left">Method</th>
                  <th className="border px-1 py-1 text-left">Bank</th>
                  <th className="border px-1 py-1 text-left">Reference</th>
                  <th className="border px-1 py-1 text-right">Amount</th>
                  <th className="border px-1 py-1 text-left">Why</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => (
                  <tr key={row.id} className={row.rowKind === 'subtotal' ? 'font-semibold' : undefined}>
                    <td className="border px-1 py-1">
                      {row.rowKind === 'subtotal' ? 'Handover total' : row.receiptNo || '—'}
                      {row.sourceHandoverNo ? ` (included ${row.sourceHandoverNo})` : ''}
                    </td>
                    <td className="border px-1 py-1">{row.rowKind === 'item' ? row.methodLabel : ''}</td>
                    <td className="border px-1 py-1">{row.rowKind === 'item' ? row.bank || '—' : ''}</td>
                    <td className="border px-1 py-1">{row.rowKind === 'item' ? row.reference || '—' : ''}</td>
                    <td className="border px-1 py-1 text-right tabular-nums">{money(row.amountCents)}</td>
                    <td className="border px-1 py-1">{row.why || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="font-semibold">Grand total not deducted: {formatCents(itemTotal)}</div>
    </div>
  );
}
