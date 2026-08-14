import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import {
  eligibleDoctorPayoutBillWhere,
  unpaidDoctorLineWhere,
} from '@/lib/doctor-payments/eligibility';
import type {
  DoctorDuePaymentReportParams,
  DoctorDuePaymentReportResult,
  DoctorDuePaymentReportRow,
} from '@/types/reports';

const DISPLAY_LIMIT = 10000;
const EXPORT_LIMIT = 10000;

function buildBillWhere(
  params: DoctorDuePaymentReportParams
): Prisma.PatientBillWhereInput {
  const where: Prisma.PatientBillWhereInput = {
    ...eligibleDoctorPayoutBillWhere,
    lineItems: {
      some: unpaidDoctorLineWhere,
    },
  };

  const admissionDateFilter: Prisma.DateTimeFilter = {};
  if (params.dateFrom) {
    const from = parseReportDateTimeSl(params.dateFrom, false);
    if (from) admissionDateFilter.gte = from;
  }
  if (params.dateTo) {
    const to = parseReportDateTimeSl(params.dateTo, true);
    if (to) admissionDateFilter.lte = to;
  }
  if (Object.keys(admissionDateFilter).length > 0) {
    where.admissionDate = admissionDateFilter;
  }

  const keyword = params.keyword?.trim();
  if (keyword) {
    where.OR = [
      { customerName: { contains: keyword, mode: 'insensitive' } },
      { billNumber: { contains: keyword, mode: 'insensitive' } },
      { bxtNumber: { contains: keyword, mode: 'insensitive' } },
      {
        lineItems: {
          some: {
            AND: [
              unpaidDoctorLineWhere,
              { doctorName: { contains: keyword, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  return where;
}

type BillWithUnpaidLines = {
  id: string;
  billNumber: string;
  bxtNumber: string;
  customerName: string;
  admissionDate: Date;
  status: string;
  lineItems: Array<{ id: string; doctorName: string; amount: number }>;
};

function buildRows(bills: BillWithUnpaidLines[]): DoctorDuePaymentReportRow[] {
  const rows: DoctorDuePaymentReportRow[] = [];

  for (const bill of bills) {
    const byDoctor = new Map<string, number>();
    for (const item of bill.lineItems) {
      const name = item.doctorName.trim();
      if (!name) continue;
      byDoctor.set(name, (byDoctor.get(name) ?? 0) + (item.amount || 0));
    }

    for (const [doctorName, dueAmount] of byDoctor) {
      if (dueAmount <= 0) continue;
      rows.push({
        id: `${bill.id}:${doctorName}`,
        doctorName,
        billId: bill.id,
        billNumber: bill.billNumber,
        bxtNumber: bill.bxtNumber,
        patientName: bill.customerName,
        admissionDate: bill.admissionDate.toISOString(),
        dueAmount,
        billStatus: bill.status,
      });
    }
  }

  return rows.sort((a, b) => {
    const doctorCmp = a.doctorName.localeCompare(b.doctorName);
    if (doctorCmp !== 0) return doctorCmp;
    return (
      new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()
    );
  });
}

function matchesKeyword(row: DoctorDuePaymentReportRow, keyword: string): boolean {
  const q = keyword.toLowerCase();
  return (
    row.doctorName.toLowerCase().includes(q) ||
    row.billNumber.toLowerCase().includes(q) ||
    row.bxtNumber.toLowerCase().includes(q) ||
    row.patientName.toLowerCase().includes(q)
  );
}

async function loadDueRows(
  params: DoctorDuePaymentReportParams
): Promise<DoctorDuePaymentReportRow[]> {
  const bills = await prisma.patientBill.findMany({
    where: buildBillWhere(params),
    orderBy: { admissionDate: 'desc' },
    select: {
      id: true,
      billNumber: true,
      bxtNumber: true,
      customerName: true,
      admissionDate: true,
      status: true,
      lineItems: {
        where: unpaidDoctorLineWhere,
        select: {
          id: true,
          doctorName: true,
          amount: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  const rows = buildRows(bills);
  const keyword = params.keyword?.trim();
  if (!keyword) return rows;
  return rows.filter((row) => matchesKeyword(row, keyword));
}

export async function getDoctorDuePaymentReport(
  params: DoctorDuePaymentReportParams = {}
): Promise<DoctorDuePaymentReportResult> {
  const allRows = await loadDueRows(params);
  const hasMore = allRows.length > DISPLAY_LIMIT;
  const data = hasMore ? allRows.slice(0, DISPLAY_LIMIT) : allRows;
  const totalDue = allRows.reduce((sum, row) => sum + row.dueAmount, 0);

  return {
    data,
    totalRecords: allRows.length,
    totalDue,
    hasMore,
  };
}

export async function getDoctorDuePaymentReportExport(
  params: DoctorDuePaymentReportParams = {}
): Promise<DoctorDuePaymentReportRow[]> {
  const allRows = await loadDueRows(params);
  return allRows.slice(0, EXPORT_LIMIT);
}
