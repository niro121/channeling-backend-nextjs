'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireReport } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatCents } from '@/lib/format-money';
import { getUnreconciledHandoversReportService } from '@/services/reports/unreconciled-handovers.report.service';
import type {
  UnreconciledHandoversReportExportRow,
  UnreconciledHandoversReportQuery,
  UnreconciledHandoversReportRow,
} from '@/types/reports/unreconciled-handovers';

function money(cents: number | null): string {
  if (cents == null) return '—';
  return formatCents(cents);
}

function toExportRow(row: UnreconciledHandoversReportRow): UnreconciledHandoversReportExportRow {
  return {
    rowKind: row.rowKind,
    groupLabel: row.groupLabel,
    method: row.methodLabel,
    tillBalance: money(row.tillCents),
    notDeducted: money(row.undeductedCents),
    difference: money(row.differenceCents),
    note: row.note || '—',
    handover: row.handoverNo || '—',
    reconciliationNo: row.reconciliationNo || '—',
    fromUser: row.fromUserName || '—',
    createdAt: row.createdAt || '—',
    status: row.reconciliationStatusLabel || '—',
    receipt: row.rowKind === 'subtotal' ? 'Handover total' : row.receiptNo || '—',
    sourceHandover: row.sourceHandoverNo || '—',
    bank: row.bank || '—',
    reference: row.reference || '—',
    amount: money(row.amountCents),
    why: row.why || '—',
    tillCents: row.tillCents,
    undeductedCents: row.undeductedCents,
    differenceCents: row.differenceCents,
    amountCents: row.amountCents,
  };
}

export async function getUnreconciledHandoversReportData(query: UnreconciledHandoversReportQuery) {
  await requireReport('unreconciled-handovers');
  try {
    return await getUnreconciledHandoversReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch unreconciled handover report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportUnreconciledHandoversReportData(
  query: UnreconciledHandoversReportQuery
): Promise<{ success: boolean; data?: UnreconciledHandoversReportExportRow[]; message?: string }> {
  await requireReport('unreconciled-handovers');
  try {
    const result = await getUnreconciledHandoversReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped = result.data.map(toExportRow);
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.unreconciled-handovers.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          userId: query.userId,
          paymentMethod: query.paymentMethod ?? '__all__',
          count: result.totalRecords,
        },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}
