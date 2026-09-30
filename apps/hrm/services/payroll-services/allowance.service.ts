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
  ALLOWANCE_COMPONENT_TYPE_IDS,
  ALLOWANCE_TYPE_LABELS,
  EMPTY_ALLOWANCE_SUMMARY,
  type AllowanceComponentTypeId,
  type AllowancePayload,
  type AllowanceRecord,
  type AllowanceSummary,
  type GetAllowanceParams
} from '@/types/payroll';
import type { PaysheetComponentKind } from '@/types/paysheet-component';

const ALLOWANCE_TYPE_SET = new Set<string>(ALLOWANCE_COMPONENT_TYPE_IDS);

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isAllowanceTypeId(typeId: string): typeId is AllowanceComponentTypeId {
  return ALLOWANCE_TYPE_SET.has(typeId);
}

function mapAllowanceRecord(record: {
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
}): AllowanceRecord {
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
  params: GetAllowanceParams
): Prisma.PaysheetComponentWhereInput {
  const and: Prisma.PaysheetComponentWhereInput[] = [
    { typeId: { in: [...ALLOWANCE_COMPONENT_TYPE_IDS] } }
  ];

  if (params.typeId && params.typeId !== '__all__') {
    if (isAllowanceTypeId(params.typeId)) {
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

const allowanceSelect = {
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

function validateAllowancePayload(payload: AllowancePayload): {
  ok: true;
  data: AllowancePayload;
} | {
  ok: false;
  message: string;
  issues?: Record<string, string[]>;
} {
  if (!isAllowanceTypeId(String(payload.typeId))) {
    return {
      ok: false,
      message: 'Invalid allowance type',
      issues: {
        typeId: [
          'Type must be Fixed allowance or Percentage allowance'
        ]
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

export async function getAllowanceList(
  params: GetAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: AllowanceRecord[];
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
        select: allowanceSelect,
        orderBy: [{ kind: 'asc' }, { orderNo: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    return {
      success: true,
      data: withUsers.map(mapAllowanceRecord),
      total
    };
  } catch (error: any) {
    console.error('getAllowanceList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch allowances' }
    };
  }
}

export async function getAllowanceSummary(
  params: GetAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: AllowanceSummary;
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const [totalAllowances, fixed, percentage, custom] = await Promise.all([
      prisma.paysheetComponent.count({ where }),
      prisma.paysheetComponent.count({
        where: { AND: [where, { typeId: 'fixed_allowance' }] }
      }),
      prisma.paysheetComponent.count({
        where: { AND: [where, { typeId: 'percentage_allowance' }] }
      }),
      prisma.paysheetComponent.count({
        where: { AND: [where, { kind: 'custom' }] }
      })
    ]);

    return {
      success: true,
      data: {
        totalAllowances,
        fixed,
        percentage,
        custom
      }
    };
  } catch (error: any) {
    console.error('getAllowanceSummary error:', error);
    return {
      success: false,
      data: EMPTY_ALLOWANCE_SUMMARY,
      error: { message: error.message || 'Failed to load allowance summary' }
    };
  }
}

export async function getAllowanceById(id: string): Promise<{
  success: boolean;
  data?: AllowanceRecord;
  error?: { message?: string };
}> {
  try {
    const result = await getPaysheetComponentById(id);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Allowance not found' }
      };
    }
    if (!isAllowanceTypeId(result.data.typeId)) {
      return {
        success: false,
        error: { message: 'Component is not an allowance type' }
      };
    }
    return {
      success: true,
      data: mapAllowanceRecord(result.data)
    };
  } catch (error: any) {
    console.error('getAllowanceById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get allowance' }
    };
  }
}

export async function createAllowance(
  payload: AllowancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AllowanceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const validated = validateAllowancePayload(payload);
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
        percentage: validated.data.percentage ?? null,
        includedForIds: validated.data.includedForIds ?? []
      },
      user
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: {
          message: result.error?.message ?? 'Failed to create allowance',
          issues: result.error?.issues
        }
      };
    }

    return {
      success: true,
      data: mapAllowanceRecord(result.data)
    };
  } catch (error: any) {
    console.error('createAllowance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create allowance' }
    };
  }
}

export async function updateAllowance(
  id: string,
  payload: AllowancePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AllowanceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const existing = await getPaysheetComponentById(id);
    if (!existing.success || !existing.data) {
      return {
        success: false,
        error: { message: existing.error?.message ?? 'Allowance not found' }
      };
    }
    if (!isAllowanceTypeId(existing.data.typeId)) {
      return {
        success: false,
        error: { message: 'Component is not an allowance type' }
      };
    }

    const validated = validateAllowancePayload({
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
        percentage: validated.data.percentage ?? null,
        includedForIds: validated.data.includedForIds ?? []
      },
      user
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: {
          message: result.error?.message ?? 'Failed to update allowance',
          issues: result.error?.issues
        }
      };
    }

    return {
      success: true,
      data: mapAllowanceRecord(result.data)
    };
  } catch (error: any) {
    console.error('updateAllowance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update allowance' }
    };
  }
}

export async function deleteAllowance(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    const existing = await getPaysheetComponentById(id);
    if (!existing.success || !existing.data) {
      return {
        success: false,
        error: { message: existing.error?.message ?? 'Allowance not found' }
      };
    }
    if (!isAllowanceTypeId(existing.data.typeId)) {
      return {
        success: false,
        error: { message: 'Component is not an allowance type' }
      };
    }
    return deletePaysheetComponent(id);
  } catch (error: any) {
    console.error('deleteAllowance error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete allowance' }
    };
  }
}

export async function getAllowanceExportRows(
  params: GetAllowanceParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, string>[];
  error?: { message?: string };
}> {
  try {
    const where = buildWhere(params);
    const rows = await prisma.paysheetComponent.findMany({
      where,
      select: allowanceSelect,
      orderBy: [{ kind: 'asc' }, { orderNo: 'asc' }, { name: 'asc' }]
    });
    const withUsers = await resolveAuthUsers(rows);
    const mapped = withUsers.map(mapAllowanceRecord);

    return {
      success: true,
      data: mapped.map((row) => ({
        code: row.code,
        name: row.name,
        kind: row.kind === 'system' ? 'System based' : 'Custom',
        typeId:
          ALLOWANCE_TYPE_LABELS[
            row.typeId as AllowanceComponentTypeId
          ] ?? row.typeId,
        orderNo: String(row.orderNo),
        percentage:
          row.percentage != null ? String(row.percentage) : '—',
        includedFor: row.includedForIds.join(', ') || '—',
        createdBy: row.createdBy ?? '—',
        createdAt: row.createdAt ?? '—',
        updatedBy: row.updatedBy ?? '—',
        updatedAt: row.updatedAt ?? '—'
      }))
    };
  } catch (error: any) {
    console.error('getAllowanceExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export allowances' }
    };
  }
}

export async function suggestAllowanceOrderNo(
  kind: string
): Promise<{
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
