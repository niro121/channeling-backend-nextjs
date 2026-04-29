'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { PAYMENT_METHOD_NAMES, RECEIPT_METHOD_NAMES } from '@/types/receipt';
import type { AgencyStatementQuery, AgencyStatementReportData, AgencyStatementRow } from '@/types/reports/agency-statement';

const MAX_RANGE_DAYS = getReportMaxRangeDays('agency_statement', 62);
const MAX_JOURNALS_SCAN = getReportMaxRecords('agency_statement', 20000);

function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = trimmed.split('-').map(Number);
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (asEnd) return new Date(year, month, day, 23, 59, 59, 999);
  return new Date(year, month, day, 0, 0, 0, 0);
}

function formatSessionDateTime(session: { date: Date; startTime?: Date | null } | null): string | null {
  if (!session) return null;
  const d = session.date instanceof Date ? session.date : new Date(session.date);
  if (session.startTime) {
    const t = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
    return `${d.toLocaleDateString()} ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString();
}

export async function getAgencyStatementReportService(
  query: AgencyStatementQuery
): Promise<{ success: boolean; data?: AgencyStatementReportData; message?: string }> {
  try {
    if (!query.agencyId || query.agencyId === '__all__') {
      return { success: false, message: 'Please select at least one agent.' };
    }
    const from = parseDateTime(query.dateFrom, false);
    const to = parseDateTime(query.dateTo, true);
    if (!from || !to) return { success: false, message: 'From and To date/time are required.' };
    if (from.getTime() > to.getTime()) return { success: false, message: 'From date/time must be before or equal to To date/time.' };
    const daySpan = getInclusiveDaySpan(from, to);
    if (daySpan > MAX_RANGE_DAYS) {
      return { success: false, message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` };
    }

    const agency = await prisma.agency.findUnique({
      where: { id: query.agencyId },
      select: {
        id: true,
        name: true,
        code: true,
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
    if (!agency) return { success: false, message: 'Selected agent not found.' };

    const account = agency.accounts?.[0] ?? null;
    if (!account?.id) {
      return {
        success: true,
        data: {
          agencyId: agency.id,
          agencyName: agency.name || '-',
          agencyCode: agency.code || '-',
          accountLinked: false,
          accountName: null,
          openingBalance: 0,
          closingBalance: 0,
          rows: [],
          message: 'No linked PAYABLE account found for this agent. Statement cannot be generated until an account is linked.',
        },
      };
    }

    const openingBalanceCents = await getAccountBalance(account.id, new Date(from.getTime() - 1));

    // Mongo-safe two-step filtering: first journals in range, then lines for account.
    const matchedJournals = await prisma.journal.count({
      where: { date: { gte: from, lte: to } },
    });
    if (matchedJournals > MAX_JOURNALS_SCAN) {
      return {
        success: false,
        message: `Too many records in selected range (${matchedJournals}). Please narrow filters/date range.`,
      };
    }

    const journals = await prisma.journal.findMany({
      where: { date: { gte: from, lte: to } },
      select: {
        id: true,
        date: true,
        createdAt: true,
        description: true,
        referenceType: true,
        referenceId: true,
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    const journalIds = journals.map((j) => j.id);
    const journalMap = new Map(journals.map((j) => [j.id, j]));

    const lines = journalIds.length
      ? await prisma.journalLine.findMany({
          where: { accountId: account.id, journalId: { in: journalIds } },
          select: {
            id: true,
            journalId: true,
            debitAmount: true,
            creditAmount: true,
            paymentMethod: true,
          },
          orderBy: [{ journal: { date: 'asc' } }, { journal: { createdAt: 'asc' } }],
        })
      : [];

    const receiptIds = Array.from(
      new Set(
        lines
          .map((line) => {
            const j = journalMap.get(line.journalId);
            return j?.referenceType?.toLowerCase() === 'receipt' ? j.referenceId : null;
          })
          .filter(Boolean)
      )
    ) as string[];

    const receipts = receiptIds.length
      ? await prisma.receipt.findMany({
          where: { id: { in: receiptIds } },
          select: {
            id: true,
            receiptNoString: true,
            method: true,
            amount: true,
            remarks: true,
            createdBy: true,
            paymentLines: { select: { paymentMethod: true, amount: true } },
            booking: {
              select: {
                bookingid_string: true,
                title: true,
                name: true,
                session: { select: { date: true, startTime: true } },
                professionalFee: true,
                hospitalFee: true,
                hospitalFeeDiscount: true,
                professionsalFeeDiscount: true,
                discount: true,
              },
            },
          },
        })
      : [];
    const receiptMap = new Map(receipts.map((r) => [r.id, r]));

    const creatorIds = Array.from(new Set(receipts.map((r) => r.createdBy).filter(Boolean))) as string[];
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : [];
    const creatorMap = new Map(creators.map((u) => [u.id, formatUserDisplayName(u.name, u.id, u.staff?.code)]));

    let runningBalanceCents = openingBalanceCents;
    const rows: AgencyStatementRow[] = lines.map((line, idx) => {
      const journal = journalMap.get(line.journalId);
      const receipt =
        journal?.referenceType?.toLowerCase() === 'receipt' && journal.referenceId
          ? receiptMap.get(journal.referenceId)
          : undefined;
      const booking = receipt?.booking;
      const net = netEffectForAccountType(line.debitAmount, line.creditAmount, 'PAYABLE');
      runningBalanceCents += net;

      const patient = booking ? [booking.title, booking.name].filter(Boolean).join(' ') : null;
      const particulars = booking
        ? `Booking${patient ? ` - ${patient}` : ''}`
        : receipt
          ? (RECEIPT_METHOD_NAMES[receipt.method] ?? 'Receipt')
          : (journal?.description || 'Journal Entry');
      const discount = Number(
        ((booking?.hospitalFeeDiscount ?? 0) + (booking?.professionsalFeeDiscount ?? 0)) || booking?.discount || 0
      );
      const paymentBreakdown =
        receipt?.paymentLines?.length
          ? receipt.paymentLines
              .map((line) => `${PAYMENT_METHOD_NAMES[line.paymentMethod] ?? line.paymentMethod}: ${line.amount}`)
              .join(', ')
          : '';

      return {
        no: idx + 1,
        date: journal?.date ?? new Date(),
        particulars,
        appointmentDateTime: booking?.session
          ? formatSessionDateTime({ date: booking.session.date, startTime: booking.session.startTime })
          : null,
        receiptNo: receipt?.receiptNoString || '-',
        docFee: Number(booking?.professionalFee ?? 0),
        hosFee: Number(booking?.hospitalFee ?? 0),
        discount,
        amount: Number(net),
        runningBalance: Number(runningBalanceCents),
        comments:
          receipt?.remarks ||
          (paymentBreakdown ? `Payment lines: ${paymentBreakdown}` : '') ||
          journal?.description ||
          '',
        createdBy: receipt?.createdBy ? creatorMap.get(receipt.createdBy) || 'Unknown user' : 'System',
      };
    });

    const closingBalanceCents = runningBalanceCents;

    return {
      success: true,
      data: {
        agencyId: agency.id,
        agencyName: agency.name || '-',
        agencyCode: agency.code || '-',
        accountLinked: !!account?.id,
        accountName: account?.name ?? null,
        openingBalance: openingBalanceCents / 100,
        closingBalance: closingBalanceCents / 100,
        rows: rows.map((row) => ({
          ...row,
          docFee: row.docFee,
          hosFee: row.hosFee,
          discount: row.discount,
          amount: row.amount / 100,
          runningBalance: row.runningBalance / 100,
        })),
        message: !account?.id ? 'No linked PAYABLE account found for this agent. Balances are derived from receipt flow in range.' : undefined,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load agency statement report';
    console.error('getAgencyStatementReportService error:', error);
    return { success: false, message: msg };
  }
}
