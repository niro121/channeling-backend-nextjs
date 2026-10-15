'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import type { DoctorBalanceReportQuery, DoctorBalanceReportRow } from '@/types/reports/doctor-balance';

const MAX_DOCTORS = 5000;
const MAX_JOURNAL_LINES = getReportMaxRecords('doctor_balance', 50000);

export async function getDoctorBalanceReportService(
  query: DoctorBalanceReportQuery
): Promise<{
  success: boolean;
  data: DoctorBalanceReportRow[];
  totalRecords: number;
  message?: string;
}> {
  try {
    const asOf = parseReportDateTime(query.asOfDate ?? '', true);
    if (!asOf) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: 'As-of date is required (YYYY-MM-DD).',
      };
    }

    const where: Prisma.DoctorWhereInput = {};
    if (query.doctorId && query.doctorId !== '__all__') {
      where.id = query.doctorId;
    }
    if (query.specialityId && query.specialityId !== '__all__') {
      where.specialityId = query.specialityId;
    }
    if (query.status && query.status !== '__all__') {
      const parsedStatus = Number(query.status);
      if (!Number.isFinite(parsedStatus) || ![0, 1].includes(parsedStatus)) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          message: 'Invalid status filter. Allowed values are Active or Inactive.',
        };
      }
      where.status = parsedStatus;
    }

    const doctorCount = await prisma.doctor.count({ where });
    if (doctorCount > MAX_DOCTORS) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Too many doctors for this report (${doctorCount}). Please narrow doctor or speciality filters.`,
      };
    }

    const doctors = await prisma.doctor.findMany({
      where,
      select: {
        id: true,
        status: true,
        title: true,
        name: true,
        code: true,
        phone: true,
        mobile: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        specialityId: true,
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const specialityIds = Array.from(
      new Set(doctors.map((d) => d.specialityId).filter((id): id is string => Boolean(id)))
    );
    const specialityNameById = new Map<string, string>();
    if (specialityIds.length > 0) {
      const specialities = await prisma.speciality.findMany({
        where: { id: { in: specialityIds } },
        select: { id: true, name: true },
      });
      for (const s of specialities) {
        specialityNameById.set(s.id, s.name);
      }
    }

    const accountIds = doctors.map((d) => d.accounts?.[0]?.id).filter(Boolean) as string[];
    const balanceByAccountId = new Map<string, number>();

    if (accountIds.length > 0) {
      const lineCount = await prisma.journalLine.count({
        where: { accountId: { in: accountIds } },
      });
      if (lineCount > MAX_JOURNAL_LINES) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          message: `Too many records for the selected filters (${lineCount}). Please narrow doctor or speciality filters.`,
        };
      }

      const lines = await prisma.journalLine.findMany({
        where: { accountId: { in: accountIds } },
        select: {
          accountId: true,
          debitAmount: true,
          creditAmount: true,
          journal: { select: { date: true } },
        },
      });

      const sums = new Map<string, { debit: number; credit: number }>();
      for (const line of lines) {
        const journalDate = line.journal?.date;
        if (!journalDate || journalDate.getTime() > asOf.getTime()) continue;
        const cur = sums.get(line.accountId) ?? { debit: 0, credit: 0 };
        cur.debit += line.debitAmount ?? 0;
        cur.credit += line.creditAmount ?? 0;
        sums.set(line.accountId, cur);
      }

      for (const [accountId, sum] of sums) {
        balanceByAccountId.set(accountId, netEffectForAccountType(sum.debit, sum.credit, 'PAYABLE'));
      }
    }

    const data: DoctorBalanceReportRow[] = doctors.map((d) => {
      const acc = d.accounts?.[0];
      const balanceCents = acc?.id ? balanceByAccountId.get(acc.id) ?? 0 : 0;
      const address = [d.addressLine1, d.addressLine2, d.city].filter(Boolean).join(', ');
      return {
        id: d.id,
        status: Number(d.status ?? 0),
        doctorCode: d.code || '-',
        doctorName: [d.title, d.name].filter(Boolean).join(' ').trim() || '-',
        speciality: (d.specialityId && specialityNameById.get(d.specialityId)) || '-',
        doctorPhoneNo: d.mobile || d.phone || '-',
        doctorAddress: address || '-',
        doctorBalance: Number(balanceCents || 0) / 100,
      };
    });

    return {
      success: true,
      data,
      totalRecords: data.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor balance report';
    console.error('getDoctorBalanceReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: msg,
    };
  }
}
