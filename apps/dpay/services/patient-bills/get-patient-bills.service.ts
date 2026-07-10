import prisma from '@/lib/prisma';
import type { GetPatientBillsParams, GetPatientBillsResult } from '@/types/patient-bill';
import { mapPatientBillRecord } from '@/lib/patient-bills/mappers';
import type { Prisma } from '@/lib/generated/prisma';

export async function getPatientBills(
  params: GetPatientBillsParams = {}
): Promise<GetPatientBillsResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const keyword = params.keyword?.trim();

  const where: Prisma.PatientBillWhereInput = keyword
    ? {
        OR: [
          { customerName: { contains: keyword, mode: 'insensitive' } },
          { billNumber: { contains: keyword, mode: 'insensitive' } },
          { bxtNumber: { contains: keyword, mode: 'insensitive' } },
        ],
      }
    : {};

  const [records, totalRecords] = await Promise.all([
    prisma.patientBill.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: {
          select: { doctorName: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.patientBill.count({ where }),
  ]);

  return {
    data: records.map(mapPatientBillRecord),
    totalRecords,
  };
}
