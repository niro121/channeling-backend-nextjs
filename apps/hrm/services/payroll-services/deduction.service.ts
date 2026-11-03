'use server';

import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  createPaysheetComponent,
  deletePaysheetComponent,
  getPaysheetComponentById,
  updatePaysheetComponent
} from '@/services/hr-admin-services/paysheet-component.service';
import {
  DEDUCTION_COMPONENT_TYPE_IDS,
  DEDUCTION_TYPE_LABELS,
  EMPTY_DEDUCTION_SUMMARY,
  type DeductionComponentTypeId,
  type DeductionPayload,
  type DeductionRecord,
  type DeductionSummary,
  type GetDeductionParams
} from '@/types/payroll';
import type { PaysheetComponentKind } from '@/types/paysheet-component';

const DEDUCTION_TYPE_SET = new Set<string>(DEDUCTION_COMPONENT_TYPE_IDS);

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isDeductionTypeId(typeId: string): typeId is DeductionComponentTypeId {
  return DEDUCTION_TYPE_SET.has(typeId);
}

function mapDeductionRecord(record: {
  id: string;
  code: string;
  name: string;
  kind: string;
  typeId: string;
  orderNo: number;
  percentage: number | null;
  includedForIds: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser?: { name?: string | null } | null;
  updatedUser?: { name?: string | null } | null;
}): DeductionRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    kind: record.kind,
    typeId: record.typeId,
    orderNo: record.orderNo,
    percentage: record.percentage,
    includedForIds: record.includedForIds ?? [],
    createdBy: record.createdUser?.name ?? null,
    createdAt: toIsoString(record.createdAt),
    updatedBy: record.updatedUser?.name ?? null,
    updatedAt: toIsoString(record.updatedAt)
  };
}

function buildWhere(
  params: GetDeductionParams
): Prisma.PaysheetComponentWhereInput {
  const and: Prisma.PaysheetComponentWhereInput[] = [
    { typeId: { in: [...DEDUCTION_COMPONENT_TYPE_IDS] } }
  ];

  if (params.typeId && params.typeId !== '__all__') {
    if (isDeductionTypeId(params.typeId)) {
      and.push({ typeId: params.typeId });
    }
  }

  if (params.kind && params.kind !== '__all__') {
    and.push({ kind: params.kind });
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  return { AND: and };
}

const deductionSelect = {
  id: true,
  code: true,
  name: true,
  kind: true,
  typeId: true,
  orderNo: true,
  percentage: true,
  includedForIds: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

function validateDeductionPayload(payload: DeductionPayload): {
  ok: true;
  data: DeductionPayload;
} | {
  ok: false;
  message: string;
  issues?: Record<string, string[]>;
} {
  if (!isDeductionTypeId(String(payload.typeId))) {
    return {
      ok: false,
      message: 'Invalid deduction type',
      issues: {
        typeId: ['Type must be Fixed deduction, Loan, or Advance']
      }
    };
  }
  if (payload.kind !== 'system' && payload.kind !== 'custom') {
    return {
      ok: false,
      message: 'Invalid kind',
      issues: { kind: ['Kind must be system or custom'] }
    };
  }
  return { ok: true, data: payload };
}

async function nextOrderNo(kind: string): Promise<number> {
  const max = await prisma.paysheetComponent.aggregate({
    where: { kind },
    _max: { orderNo: true }
  });
  return (max._max.orderNo ?? 0) + 1;
}

export async function getDeductionList(
  params: GetDeductionParams = {}
): Promise<{
  success: boolean;
  data?: DeductionRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const pageNumber = Math.max(
      1,
      Number(params.page) ||
        Number.parseInt(process.env.DEFAULT_PAGE ?? '0', 10) ||
        1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number(params.limit) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;

    const [total, rows] = await Promise.all([
      prisma.paysheetComponent.count({ where }),
      prisma.paysheetComponent.findMany({
        where,
        select: deductionSelect,
        orderBy: [{ kind: 'asc' }, { orderNo: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: withUsers.map(mapDeductionRecord),
      total
    };
  } catch (error: any) {
    console.error('getDeductionList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch deductions' }
    };
  }
}

export async function getDeductionSummary(
  params: GetDeductionParams = {}
): Promise<{
  success: boolean;
  data?: DeductionSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const [totalDeductions, fixed, loan, advance] = await Promise.all([
      prisma.paysheetComponent.count({ where }),
      prisma.paysheetComponent.count({
        where: { AND: [where, { typeId: 'fixed_deduction' }] }
      }),
      prisma.paysheetComponent.count({
        where: { AND: [where, { typeId: 'loan' }] }
      }),
      prisma.paysheetComponent.count({
        where: { AND: [where, { typeId: 'advance' }] }
      })
    ]);

    return {
      success: true,
      data: {
        totalDeductions,
        fixed,
        loan,
        advance
      }
    };
  } catch (error: any) {
    console.error('getDeductionSummary error:', error);
    return {
      success: false,
      data: EMPTY_DEDUCTION_SUMMARY,
      error: { message: error.message || 'Failed to load deduction summary' }
    };
  }
}

export async function getDeductionById(id: string): Promise<{
  success: boolean;
  data?: DeductionRecord;
  error?: { message?: string };
}> {
  try {
    const result = await getPaysheetComponentById(id);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Deduction not found' }
      };
    }
    if (!isDeductionTypeId(result.data.typeId)) {
      return {
        success: false,
        error: { message: 'Component is not a deduction type' }
      };
    }
    return {
      success: true,
      data: mapDeductionRecord(result.data)
    };
  } catch (error: any) {
    console.error('getDeductionById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get deduction' }
    };
  }
}

export async function createDeduction(
  payload: DeductionPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: DeductionRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const validated = validateDeductionPayload(payload);
    if (!validated.ok) {
      return {
        success: false,
        error: {
          message: validated.message,
          issues: validated.issues
        }
      };
    }

    const orderNo =
      Number.isFinite(validated.data.orderNo) && validated.data.orderNo > 0
        ? validated.data.orderNo
        : await nextOrderNo(validated.data.kind);

    const result = await createPaysheetComponent(
      {
        name: validated.data.name,
        kind: validated.data.kind as PaysheetComponentKind,
        typeId: validated.data.typeId,
        orderNo,
        percentage: null,
        includedForIds: validated.data.includedForIds ?? []
      },
      user
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: {
          message: result.error?.message ?? 'Failed to create deduction',
          issues: result.error?.issues
        }
      };
    }

    return {
      success: true,
      data: mapDeductionRecord(result.data)
    };
  } catch (error: any) {
    console.error('createDeduction error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create deduction' }
    };
  }
}

export async function updateDeduction(
  id: string,
  payload: DeductionPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: DeductionRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const existing = await getPaysheetComponentById(id);
    if (!existing.success || !existing.data) {
      return {
        success: false,
        error: { message: existing.error?.message ?? 'Deduction not found' }
      };
    }
    if (!isDeductionTypeId(existing.data.typeId)) {
      return {
        success: false,
        error: { message: 'Component is not a deduction type' }
      };
    }

    const validated = validateDeductionPayload({
      ...payload,
      kind: (payload.kind ?? existing.data.kind) as 'system' | 'custom'
    });
    if (!validated.ok) {
      return {
        success: false,
        error: {
          message: validated.message,
          issues: validated.issues
        }
      };
    }

    const result = await updatePaysheetComponent(
      id,
      {
        name: validated.data.name,
        kind: existing.data.kind as PaysheetComponentKind,
        typeId: validated.data.typeId,
        orderNo: validated.data.orderNo,
        percentage: null,
        includedForIds: validated.data.includedForIds ?? []
      },
      user
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: {
          message: result.error?.message ?? 'Failed to update deduction',
          issues: result.error?.issues
        }
      };
    }

    return {
      success: true,
      data: mapDeductionRecord(result.data)
    };
  } catch (error: any) {
    console.error('updateDeduction error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update deduction' }
    };
  }
}

export async function deleteDeduction(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    const existing = await getPaysheetComponentById(id);
    if (!existing.success || !existing.data) {
      return {
        success: false,
        error: { message: existing.error?.message ?? 'Deduction not found' }
      };
    }
    if (!isDeductionTypeId(existing.data.typeId)) {
      return {
        success: false,
        error: { message: 'Component is not a deduction type' }
      };
    }
    return deletePaysheetComponent(id);
  } catch (error: any) {
    console.error('deleteDeduction error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete deduction' }
    };
  }
}

export async function getDeductionExportRows(
  params: GetDeductionParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const rows = await prisma.paysheetComponent.findMany({
      where,
      select: deductionSelect,
      orderBy: [{ kind: 'asc' }, { orderNo: 'asc' }, { name: 'asc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const mapped = withUsers.map(mapDeductionRecord);

    return {
      success: true,
      data: mapped.map((row) => ({
        code: row.code,
        name: row.name,
        kind: row.kind === 'system' ? 'System based' : 'Custom',
        typeId:
          DEDUCTION_TYPE_LABELS[row.typeId as DeductionComponentTypeId] ??
          row.typeId,
        orderNo: String(row.orderNo),
        includedFor: row.includedForIds.join(', ') || '—',
        createdBy: row.createdBy ?? '—',
        createdAt: row.createdAt ?? '—',
        updatedBy: row.updatedBy ?? '—',
        updatedAt: row.updatedAt ?? '—'
      }))
    };
  } catch (error: any) {
    console.error('getDeductionExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export deductions' }
    };
  }
}

export async function suggestDeductionOrderNo(kind: string): Promise<{
  success: boolean;
  data?: number;
  error?: { message?: string };
}> {
  try {
    const orderNo = await nextOrderNo(kind || 'custom');
    return { success: true, data: orderNo };
  } catch (error: any) {
    return {
      success: false,
      error: { message: error.message || 'Failed to suggest order no' }
    };
  }
}
