'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  PAYSHEET_COMPONENT_CODE_PREFIX,
  PAYSHEET_COMPONENT_INCLUDED_FOR,
  PAYSHEET_COMPONENT_KINDS,
  PAYSHEET_COMPONENT_TYPES,
  type GetPaysheetComponentParams,
  type PaysheetComponentPayload,
  type PaysheetComponentServiceRecord
} from '@/types/paysheet-component';

const paysheetComponentPayloadSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(150, 'Must be less than 150 characters')
      .transform((value) => value.trim()),
    kind: z.enum(PAYSHEET_COMPONENT_KINDS),
    typeId: z.enum(PAYSHEET_COMPONENT_TYPES),
    orderNo: z.coerce.number().int('Order no must be a whole number'),
    percentage: z.coerce.number().min(0).max(100).nullable().optional(),
    includedForIds: z
      .array(z.enum(PAYSHEET_COMPONENT_INCLUDED_FOR))
      .default([])
  })
  .superRefine((data, ctx) => {
    if (data.typeId === 'percentage_allowance') {
      if (data.percentage == null || Number.isNaN(data.percentage)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['percentage'],
          message: 'Percentage is required'
        });
      }
    }
  });

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapServiceRecord(
  record: {
    id: string;
    code: string;
    name: string;
    kind: string;
    typeId: string;
    orderNo: number;
    percentage: number | null;
    includedForIds: string[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): PaysheetComponentServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    kind: record.kind,
    typeId: record.typeId,
    orderNo: record.orderNo,
    percentage: record.percentage,
    includedForIds: record.includedForIds ?? [],
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(
  params: GetPaysheetComponentParams
): Prisma.PaysheetComponentWhereInput {
  const where: Prisma.PaysheetComponentWhereInput = {};
  const and: Prisma.PaysheetComponentWhereInput[] = [];

  if (params.kind) {
    and.push({ kind: params.kind });
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { typeId: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
}

const paysheetComponentSelect = {
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

function fieldError(
  field: string,
  message: string
): {
  success: false;
  error: { message: string; issues: Record<string, string[]> };
} {
  return {
    success: false,
    error: {
      message,
      issues: { [field]: [message] }
    }
  };
}

async function findDuplicateName(
  kind: string,
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  return prisma.paysheetComponent.findFirst({
    where: {
      kind,
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
}

async function findDuplicateOrderNo(
  kind: string,
  orderNo: number,
  excludeId?: string
): Promise<{ id: string; orderNo: number } | null> {
  return prisma.paysheetComponent.findFirst({
    where: {
      kind,
      orderNo,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, orderNo: true }
  });
}

function normalizePercentage(
  typeId: string,
  percentage: number | null | undefined
): number | null {
  if (typeId !== 'percentage_allowance') return null;
  return percentage ?? null;
}

export async function getPaysheetComponentList(
  params: GetPaysheetComponentParams = {}
): Promise<{
  success: boolean;
  data?: PaysheetComponentServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.paysheetComponent.findMany({
      where: buildWhere(params),
      select: paysheetComponentSelect,
      orderBy: [{ kind: 'asc' }, { orderNo: 'asc' }, { name: 'asc' }]
    });

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(record, {
          createdUser: record.createdUser,
          updatedUser: record.updatedUser
        })
      )
    };
  } catch (error: any) {
    console.error('getPaysheetComponentList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch paysheet components' }
    };
  }
}

export async function getPaysheetComponentById(id: string): Promise<{
  success: boolean;
  data?: PaysheetComponentServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid component ID' } };
    }

    const record = await prisma.paysheetComponent.findUnique({
      where: { id },
      select: paysheetComponentSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Paysheet component not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('getPaysheetComponentById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get paysheet component' }
    };
  }
}

export async function createPaysheetComponent(
  payload: PaysheetComponentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: PaysheetComponentServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = paysheetComponentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const duplicateName = await findDuplicateName(
      parsed.data.kind,
      parsed.data.name
    );
    if (duplicateName) {
      return fieldError(
        'name',
        `"${duplicateName.name}" already exists on this tab.`
      );
    }

    const duplicateOrder = await findDuplicateOrderNo(
      parsed.data.kind,
      parsed.data.orderNo
    );
    if (duplicateOrder) {
      return fieldError(
        'orderNo',
        `Order no ${duplicateOrder.orderNo} is already used on this tab.`
      );
    }

    const generated = await generateRecordCode(PAYSHEET_COMPONENT_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: {
          message: 'Failed to generate component code. Please try again.'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.paysheetComponent.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        kind: parsed.data.kind,
        typeId: parsed.data.typeId,
        orderNo: parsed.data.orderNo,
        percentage: normalizePercentage(
          parsed.data.typeId,
          parsed.data.percentage
        ),
        includedForIds: parsed.data.includedForIds,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: paysheetComponentSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('createPaysheetComponent error:', error);
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('orderNo') || target.includes('kind_orderNo')) {
        return fieldError(
          'orderNo',
          'Order no is already used on this tab.'
        );
      }
      return fieldError('name', 'A component with this name already exists.');
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create paysheet component' }
    };
  }
}

export async function updatePaysheetComponent(
  id: string,
  payload: PaysheetComponentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: PaysheetComponentServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid component ID' } };
    }

    const existing = await prisma.paysheetComponent.findUnique({
      where: { id },
      select: { id: true, kind: true }
    });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Paysheet component not found' }
      };
    }

    const parsed = paysheetComponentPayloadSchema.safeParse({
      ...payload,
      kind: payload.kind ?? existing.kind
    });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    // Kind is immutable after create (tab ownership).
    if (parsed.data.kind !== existing.kind) {
      return fieldError('kind', 'Cannot move a component between tabs.');
    }

    const duplicateName = await findDuplicateName(
      parsed.data.kind,
      parsed.data.name,
      id
    );
    if (duplicateName) {
      return fieldError(
        'name',
        `"${duplicateName.name}" already exists on this tab.`
      );
    }

    const duplicateOrder = await findDuplicateOrderNo(
      parsed.data.kind,
      parsed.data.orderNo,
      id
    );
    if (duplicateOrder) {
      return fieldError(
        'orderNo',
        `Order no ${duplicateOrder.orderNo} is already used on this tab.`
      );
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.paysheetComponent.update({
      where: { id },
      data: {
        name: parsed.data.name,
        typeId: parsed.data.typeId,
        orderNo: parsed.data.orderNo,
        percentage: normalizePercentage(
          parsed.data.typeId,
          parsed.data.percentage
        ),
        includedForIds: parsed.data.includedForIds,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: paysheetComponentSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('updatePaysheetComponent error:', error);
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('orderNo') || target.includes('kind_orderNo')) {
        return fieldError(
          'orderNo',
          'Order no is already used on this tab.'
        );
      }
      return fieldError('name', 'A component with this name already exists.');
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update paysheet component' }
    };
  }
}

export async function deletePaysheetComponent(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid component ID' } };
    }

    const existing = await prisma.paysheetComponent.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Paysheet component not found' }
      };
    }

    await prisma.paysheetComponent.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deletePaysheetComponent error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete paysheet component' }
    };
  }
}
