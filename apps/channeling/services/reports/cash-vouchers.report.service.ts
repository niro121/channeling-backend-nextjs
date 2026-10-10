'use server';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { RECEIPT_METHOD, PAYMENT_METHOD_NAMES } from '@/types/receipt';
import { APPROVAL_REQUEST_TYPE } from '@/types/approval-request';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import type { CashVouchersReportQuery, CashVouchersReportRow } from '@/types/reports/cash-vouchers';

const MAX_RANGE_DAYS = getReportMaxRangeDays('cash_vouchers', 31);
const MAX_RECORDS = getReportMaxRecords('cash_vouchers', 20000);

function normAll(v: string | undefined): string {
  const s = (v ?? '').trim();
  return s || '__all__';
}

export async function getCashVouchersReportService(
  query: CashVouchersReportQuery
): Promise<{ success: boolean; data: CashVouchersReportRow[]; totalRecords: number; message?: string }> {
  const from = parseReportDateTime(query.dateFrom, false);
  const to = parseReportDateTime(query.dateTo, true);
  if (!from || !to) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  if (from.getTime() > to.getTime()) {
    return { success: false, data: [], totalRecords: 0, message: 'From date must be before or equal to to date.' };
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

  const accountId = normAll(query.accountId);
  const userId = normAll(query.userId);
  const branchLocationId = normAll(query.locationId);

  const where: Prisma.ReceiptWhereInput = {
    method: { in: [RECEIPT_METHOD.CASH_VOUCHER, RECEIPT_METHOD.CASH_VOUCHER_CANCEL] },
    createdAt: { gte: from, lte: to },
    ...(accountId !== '__all__' ? { bankId: accountId } : {}),
    ...(userId !== '__all__' ? { createdBy: userId } : {}),
    ...(branchLocationId !== '__all__'
      ? {
          OR: [
            { userLocationId: branchLocationId },
            { locationId: branchLocationId },
          ],
        }
      : {}),
  };

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { receiptNo: 'asc' }],
    take: MAX_RECORDS + 1,
    select: {
      id: true,
      method: true,
      receiptNoString: true,
      remarks: true,
      amount: true,
      bank: true,
      createdAt: true,
      locationId: true,
      userLocationId: true,
      createdBy: true,
      paymentLines: { select: { paymentMethod: true, amount: true } },
    },
  });

  const hasMore = receipts.length > MAX_RECORDS;
  const sliced = hasMore ? receipts.slice(0, MAX_RECORDS) : receipts;
  const locationIds = Array.from(
    new Set(
      sliced
        .flatMap((r) => [r.userLocationId, r.locationId])
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    )
  );
  const userIds = Array.from(
    new Set(sliced.map((r) => r.createdBy).filter((id): id is string => typeof id === 'string' && id.trim() !== ''))
  );
  const receiptIds = sliced.map((r) => r.id);

  const [locations, users, approvals] = await Promise.all([
    locationIds.length
      ? prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : Promise.resolve([]),
    receiptIds.length
      ? prisma.approvalRequest.findMany({
          where: { receiptId: { in: receiptIds }, type: APPROVAL_REQUEST_TYPE.CASH_VOUCHER },
          select: {
            receiptId: true,
            createdAt: true,
            approvedAt: true,
            requestedBy: { select: { id: true, name: true, staff: { select: { code: true } } } },
            approvedBy: { select: { id: true, name: true, staff: { select: { code: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  const locationById = new Map(locations.map((l) => [l.id, l]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const approvalByReceiptId = new Map<string, (typeof approvals)[number]>();
  for (const approval of approvals) {
    if (!approval.receiptId) continue;
    approvalByReceiptId.set(approval.receiptId, approval);
  }

  const data: CashVouchersReportRow[] = sliced.map((r) => {
    const userLocId = r.userLocationId ?? r.locationId ?? null;
    const loc = userLocId ? locationById.get(userLocId) ?? null : null;
    const creator = r.createdBy ? userById.get(r.createdBy) ?? null : null;
    const approval = approvalByReceiptId.get(r.id) ?? null;
    const requester = approval?.requestedBy ?? null;
    const approver = approval?.approvedBy ?? null;
    const convertedTypes = r.paymentLines
      .map((line) => PAYMENT_METHOD_NAMES[line.paymentMethod])
      .filter((label): label is string => Boolean(label))
      .join(', ');
    return {
      id: r.id,
      transactionType:
        r.method === RECEIPT_METHOD.CASH_VOUCHER_CANCEL ? 'Cash Voucher Cancel' : 'Cash Voucher',
      receiptNoString: r.receiptNoString ?? '',
      remarks: (r.remarks ?? '').trim(),
      userLocation: loc?.name ? `${loc.name}${loc.code ? ` (${loc.code})` : ''}` : '',
      user: creator ? formatUserDisplayName(creator.name, creator.id, creator.staff?.code) : '',
      createdAt: r.createdAt ?? null,
      requestedBy: requester ? formatUserDisplayName(requester.name, requester.id, requester.staff?.code) : null,
      requestedAt: approval?.createdAt ?? null,
      approvedBy: approver ? formatUserDisplayName(approver.name, approver.id, approver.staff?.code) : null,
      approvedAt: approval?.approvedAt ?? null,
      accountName: (r.bank ?? '').trim(),
      convertedTypes,
      totalAmount: Number(r.amount) || 0,
    };
  });

  return {
    success: true,
    data,
    totalRecords: data.length,
    message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
  };
}
