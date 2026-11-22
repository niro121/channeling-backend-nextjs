'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { DPAY_DOCTOR_PAYABLE_CODE_PREFIX } from '@/services/public/dpay-journal.service';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import type {
  DpayDoctorStatementQuery,
  DpayDoctorStatementRow,
} from '@/types/reports/dpay-doctor-statement';

const MAX_RANGE_DAYS = getReportMaxRangeDays('dpay_doctor_statement', 366);
const MAX_JOURNAL_LINES = getReportMaxRecords('dpay_doctor_statement', 20000);

function formatWhen(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function referenceLabel(referenceType: string | null | undefined): string {
  if (referenceType === 'DpayReceipt') return 'DPAY receipt';
  if (referenceType === 'DpayDoctorPayment') return 'DPAY doctor payment';
  return referenceType?.trim() || 'Journal';
}

export async function getDpayDoctorStatementReportService(
  query: DpayDoctorStatementQuery
): Promise<{
  success: boolean;
  data: DpayDoctorStatementRow[];
  totalRecords: number;
  message?: string;
}> {
  try {
    if (!query.doctorId || query.doctorId === '__all__') {
      return { success: false, data: [], totalRecords: 0, message: 'Select a doctor.' };
    }
    const from = parseReportDateTime(query.dateFrom ?? '', false);
    const to = parseReportDateTime(query.dateTo ?? '', true);
    if (!from || !to) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: 'From and To dates are required (YYYY-MM-DD).',
      };
    }
    if (from.getTime() > to.getTime()) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: 'From date must be before or equal to To date.',
      };
    }
    const daySpan = getInclusiveDaySpan(from, to);
    if (daySpan > MAX_RANGE_DAYS) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
      };
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: query.doctorId },
      select: { id: true, code: true, name: true },
    });
    if (!doctor) {
      return { success: false, data: [], totalRecords: 0, message: 'Selected doctor was not found.' };
    }

    const code = doctor.code?.trim()
      ? `${DPAY_DOCTOR_PAYABLE_CODE_PREFIX}${doctor.code.trim()}`
      : null;
    const accountSelect = {
      id: true,
      code: true,
      type: true,
      isActive: true,
      doctorId: true,
    } as const;
    const byCode = code
      ? await prisma.account.findUnique({ where: { code }, select: accountSelect })
      : null;
    const account =
      byCode &&
      byCode.isActive &&
      byCode.type === 'PAYABLE' &&
      byCode.code?.startsWith(DPAY_DOCTOR_PAYABLE_CODE_PREFIX)
        ? byCode
        : await prisma.account.findFirst({
            where: {
              doctorId: doctor.id,
              type: 'PAYABLE',
              isActive: true,
              code: { startsWith: DPAY_DOCTOR_PAYABLE_CODE_PREFIX },
            },
            select: accountSelect,
            orderBy: { createdAt: 'asc' },
          });

    if (!account) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `${doctor.name || 'This doctor'} has no DPAY payable account yet.`,
      };
    }

    const lineCount = await prisma.journalLine.count({ where: { accountId: account.id } });
    if (lineCount > MAX_JOURNAL_LINES) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Too many journal lines for this doctor (${lineCount}). Please contact an administrator.`,
      };
    }

    const lines = await prisma.journalLine.findMany({
      where: { accountId: account.id },
      select: {
        id: true,
        debitAmount: true,
        creditAmount: true,
        memo: true,
        journal: {
          select: {
            id: true,
            date: true,
            createdAt: true,
            description: true,
            referenceType: true,
          },
        },
      },
    });

    const dated = lines
      .map((line) => ({ line, journal: line.journal }))
      .filter((row) => row.journal?.date)
      .sort((a, b) => {
        const byDate = a.journal.date.getTime() - b.journal.date.getTime();
        if (byDate !== 0) return byDate;
        return a.journal.createdAt.getTime() - b.journal.createdAt.getTime();
      });

    let openingCents = 0;
    const inRange: typeof dated = [];
    for (const row of dated) {
      const at = row.journal.date.getTime();
      if (at < from.getTime()) {
        openingCents += netEffectForAccountType(row.line.debitAmount, row.line.creditAmount, 'PAYABLE');
      } else if (at <= to.getTime()) {
        inRange.push(row);
      }
    }

    const journalIds = Array.from(new Set(inRange.map((row) => row.journal.id)));
    const methodByJournal = new Map<string, number>();
    if (journalIds.length > 0) {
      const methodLines = await prisma.journalLine.findMany({
        where: { journalId: { in: journalIds }, paymentMethod: { not: null } },
        select: { journalId: true, paymentMethod: true },
      });
      for (const methodLine of methodLines) {
        if (methodLine.paymentMethod == null || methodByJournal.has(methodLine.journalId)) continue;
        methodByJournal.set(methodLine.journalId, methodLine.paymentMethod);
      }
    }

    const rows: DpayDoctorStatementRow[] = [
      {
        id: 'opening',
        kind: 'opening',
        date: query.dateFrom,
        particulars: `Opening balance — ${account.code}`,
        debit: null,
        credit: null,
        balance: openingCents / 100,
      },
    ];

    let runningCents = openingCents;
    for (const row of inRange) {
      const net = netEffectForAccountType(row.line.debitAmount, row.line.creditAmount, 'PAYABLE');
      runningCents += net;
      const method = methodByJournal.get(row.journal.id);
      const methodName = method == null ? '' : PAYMENT_METHOD_NAMES[method] ?? '';
      const description = row.journal.description?.trim() || row.line.memo?.trim() || referenceLabel(row.journal.referenceType);
      const particulars = [referenceLabel(row.journal.referenceType), description, methodName]
        .filter((part, index, all) => part && all.indexOf(part) === index)
        .join(' — ');
      rows.push({
        id: row.line.id,
        kind: 'line',
        date: formatWhen(row.journal.date),
        particulars,
        debit: (row.line.debitAmount ?? 0) / 100,
        credit: (row.line.creditAmount ?? 0) / 100,
        balance: runningCents / 100,
      });
    }

    return { success: true, data: rows, totalRecords: rows.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch DPAY doctor statement';
    console.error('getDpayDoctorStatementReportService error:', error);
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}
