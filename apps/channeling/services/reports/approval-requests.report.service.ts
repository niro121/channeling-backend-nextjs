'use server';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import {
  APPROVAL_REQUEST_STATUS,
  APPROVAL_REQUEST_TYPE,
  approvalRequestStatusLabel,
  type BankDepositSnapshot,
} from '@/types/approval-request';
import type {
  ApprovalRequestsReportQuery,
  ApprovalRequestsReportRow,
} from '@/types/reports/approval-requests';

const MAX_RANGE_DAYS = getReportMaxRangeDays('approval_requests', 31);
const MAX_RECORDS = getReportMaxRecords('approval_requests', 10000);

const TYPE_LABELS: Record<string, string> = {
  [APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL]: 'Cancel',
  [APPROVAL_REQUEST_TYPE.CHANNEL_REFUND]: 'Refund',
  [APPROVAL_REQUEST_TYPE.BANK_DEPOSIT]: 'Bank deposit',
};

const STATUS_FILTER_MAP: Record<string, number> = {
  pending: APPROVAL_REQUEST_STATUS.PENDING,
  approved: APPROVAL_REQUEST_STATUS.APPROVED,
  rejected: APPROVAL_REQUEST_STATUS.REJECTED,
  withdrawn: APPROVAL_REQUEST_STATUS.WITHDRAWN,
  completed: APPROVAL_REQUEST_STATUS.COMPLETED,
};

type UserNameSelect = {
  id: string;
  name: string | null;
  staff: { code: string | null } | null;
};

function normAll(v: string | undefined): string {
  const s = (v ?? '').trim();
  return s || '__all__';
}

function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseReportDateTime(dateFrom, false);
  const end = parseReportDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function userName(user?: UserNameSelect | null): string {
  if (!user) return '—';
  return formatUserDisplayName(user.name, user.id, user.staff?.code);
}

function depositSnapshot(raw: unknown): BankDepositSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as BankDepositSnapshot;
}

function formatDoctorName(doctor?: { title?: string | null; name?: string | null } | null): string {
  if (!doctor) return '';
  return [doctor.title, doctor.name].filter(Boolean).join(' ').trim();
}

export async function getApprovalRequestsReportService(
  query: ApprovalRequestsReportQuery
): Promise<{
  success: boolean;
  data: ApprovalRequestsReportRow[];
  totalRecords: number;
  message?: string;
}> {
  const range = parseFromTo(query.dateFrom, query.dateTo);
  if (!range) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  const { start: from, end: to } = range;
  if (from.getTime() > to.getTime()) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: 'From date must be before or equal to to date.',
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

  const dateField = normAll(query.dateField).toLowerCase() === 'decided' ? 'decided' : 'requested';
  const typeFilter = normAll(query.type);
  const statusFilter = normAll(query.status).toLowerCase();
  const requestedById = normAll(query.requestedById);
  const decidedById = normAll(query.decidedById);

  const dateWhere: Prisma.ApprovalRequestWhereInput =
    dateField === 'decided'
      ? {
          OR: [{ approvedAt: { gte: from, lte: to } }, { rejectedAt: { gte: from, lte: to } }],
        }
      : { createdAt: { gte: from, lte: to } };

  const typeWhere: Prisma.ApprovalRequestWhereInput =
    typeFilter !== '__all__' &&
    (typeFilter === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL ||
      typeFilter === APPROVAL_REQUEST_TYPE.CHANNEL_REFUND ||
      typeFilter === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT)
      ? { type: typeFilter }
      : {};

  const statusValue = STATUS_FILTER_MAP[statusFilter];
  const statusWhere: Prisma.ApprovalRequestWhereInput =
    statusValue === undefined ? {} : { status: statusValue };

  const decidedWhere: Prisma.ApprovalRequestWhereInput =
    decidedById !== '__all__'
      ? { OR: [{ approvedById: decidedById }, { rejectedById: decidedById }] }
      : {};

  const where: Prisma.ApprovalRequestWhereInput = {
    AND: [
      dateWhere,
      typeWhere,
      statusWhere,
      decidedWhere,
      requestedById !== '__all__' ? { requestedById } : {},
    ],
  };

  const totalRecords = await prisma.approvalRequest.count({ where });
  if (totalRecords > MAX_RECORDS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Too many records (${totalRecords.toLocaleString()}). Please narrow the date range or filters (max ${MAX_RECORDS.toLocaleString()}).`,
    };
  }

  const rows = await prisma.approvalRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      remarks: true,
      rejectReason: true,
      paymentLines: true,
      createdAt: true,
      approvedAt: true,
      rejectedAt: true,
      requestedBy: { select: { id: true, name: true, staff: { select: { code: true } } } },
      approvedBy: { select: { id: true, name: true, staff: { select: { code: true } } } },
      rejectedBy: { select: { id: true, name: true, staff: { select: { code: true } } } },
      bankAccount: { select: { name: true, accountNumber: true } },
      receipt: { select: { receiptNoString: true } },
      booking: {
        select: {
          title: true,
          name: true,
          appointmentNo: true,
          receiptNoString: true,
          bookingid_string: true,
          doctor: { select: { title: true, name: true } },
          session: {
            select: {
              date: true,
              doctor: { select: { title: true, name: true } },
            },
          },
        },
      },
    },
  });

  const data: ApprovalRequestsReportRow[] = rows.map((row) => {
    const isDeposit = row.type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT;
    const snap = depositSnapshot(row.paymentLines);
    const doctorName =
      formatDoctorName(row.booking?.doctor) || formatDoctorName(row.booking?.session?.doctor);
    const patientName = `${row.booking?.title ?? ''} ${row.booking?.name ?? ''}`.trim();
    const billNo =
      row.booking?.receiptNoString ??
      row.booking?.bookingid_string ??
      row.receipt?.receiptNoString ??
      '';
    const sessionDate = row.booking?.session?.date
      ? new Date(row.booking.session.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    const bankLabel = row.bankAccount?.name || snap.bank_name || 'Bank deposit';
    const bankSub = [
      row.bankAccount?.accountNumber || snap.account_number,
      snap.slip_ref ? `Slip ${snap.slip_ref}` : null,
      row.receipt?.receiptNoString,
    ]
      .filter(Boolean)
      .join(' · ');

    const details = isDeposit ? bankLabel : patientName || '—';
    const detailsSub = isDeposit
      ? bankSub
      : [
          doctorName || null,
          row.booking?.appointmentNo != null
            ? `Appt ${String(row.booking.appointmentNo).padStart(2, '0')}`
            : null,
          billNo || null,
          sessionDate || null,
        ]
          .filter(Boolean)
          .join(' · ');

    return {
      id: row.id,
      type: row.type,
      typeLabel: typeLabel(row.type),
      status: row.status,
      statusLabel: approvalRequestStatusLabel(row.status),
      details,
      detailsSub,
      amount: Number(row.amount) || 0,
      requestedByName: userName(row.requestedBy),
      requestedAt: row.createdAt,
      approvedByName: row.approvedBy ? userName(row.approvedBy) : null,
      approvedAt: row.approvedAt,
      rejectedByName: row.rejectedBy ? userName(row.rejectedBy) : null,
      rejectedAt: row.rejectedAt,
      remarks: row.remarks ?? '',
      rejectReason: row.rejectReason,
    };
  });

  return { success: true, data, totalRecords: data.length };
}
