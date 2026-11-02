'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import type {
  GetManageRosterParams,
  ManageRosterInspectActiveShift,
  ManageRosterInspectAssignment,
  ManageRosterInspectData,
  ManageRosterInspectStaffMember,
  ManageRosterPayload,
  ManageRosterServiceRecord
} from '@/types/manage-roster';

const manageRosterPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  code: z
    .string()
    .min(1, 'Roster code is required')
    .max(12, 'Must be 12 characters or less')
    .transform((value) => value.trim().toUpperCase()),
  departmentId: z.string().min(1, 'Department is required'),
  shiftsPerPersonPerDay: z.coerce
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function resolveActiveDepartment(
  departmentId: string
): Promise<
  | { ok: true; name: string }
  | { ok: false; message: string; issues: Record<string, string[]> }
> {
  try {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true, status: true }
    });

    if (!department) {
      return {
        ok: false,
        message: 'Validation failed',
        issues: { departmentId: ['Selected department was not found'] }
      };
    }
    if (department.status !== 1) {
      return {
        ok: false,
        message: 'Validation failed',
        issues: { departmentId: ['Selected department is not active'] }
      };
    }

    return { ok: true, name: department.name };
  } catch {
    return {
      ok: false,
      message: 'Validation failed',
      issues: { departmentId: ['Selected department is invalid'] }
    };
  }
}

type ManageRosterRow = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  shiftsPerPersonPerDay: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  department: { id: string; name: string } | null;
};

type ManageRosterUsage = {
  shiftAssignmentRefCount: number;
  /** Active standing assignments on this roster (status = active). */
  activeShiftCount: number;
  staffMembershipCount: number;
  inUse: boolean;
};

function emptyUsage(): ManageRosterUsage {
  return {
    shiftAssignmentRefCount: 0,
    activeShiftCount: 0,
    staffMembershipCount: 0,
    inUse: false
  };
}

function formatInUseMessage(usage: ManageRosterUsage): string {
  const parts: string[] = [];
  if (usage.shiftAssignmentRefCount > 0) {
    parts.push(
      `${usage.shiftAssignmentRefCount} shift assignment(s)`
    );
  }
  if (usage.staffMembershipCount > 0) {
    parts.push(`${usage.staffMembershipCount} staff member(s)`);
  }
  const detail = parts.length ? parts.join(' and ') : 'downstream records';
  return `This roster is in use (${detail}) and cannot be modified or deleted.`;
}

/**
 * INT-H3 — heal legacy rows that never got manageRosterId by resolving
 * Staff.employment.roster → ManageRoster.id for this code.
 */
async function backfillNullManageRosterIds(
  rosterId: string,
  code: string
): Promise<number> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return 0;

  const nullRows = await prisma.staffShiftAssignment.findMany({
    where: { manageRosterId: null },
    select: { id: true, staffId: true }
  });
  if (!nullRows.length) return 0;

  const staffIds = [...new Set(nullRows.map((row) => row.staffId))];
  const staffRows = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, employmentDetails: true }
  });

  const matchingStaffIds = new Set(
    staffRows
      .filter((staff) => {
        const roster =
          staff.employmentDetails?.employment?.roster?.trim().toUpperCase() ??
          '';
        return roster === normalized;
      })
      .map((staff) => staff.id)
  );

  const idsToHeal = nullRows
    .filter((row) => matchingStaffIds.has(row.staffId))
    .map((row) => row.id);

  if (!idsToHeal.length) return 0;

  const result = await prisma.staffShiftAssignment.updateMany({
    where: { id: { in: idsToHeal }, manageRosterId: null },
    data: { manageRosterId: rosterId }
  });

  return result.count;
}

/**
 * Count standing assignments with null manageRosterId whose staff membership
 * matches this roster code (legacy / pre-FK rows).
 */
async function countNullFkAssignmentsForCode(code: string): Promise<{
  all: number;
  active: number;
}> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { all: 0, active: 0 };

  const nullRows = await prisma.staffShiftAssignment.findMany({
    where: { manageRosterId: null },
    select: { id: true, staffId: true, status: true }
  });
  if (!nullRows.length) return { all: 0, active: 0 };

  const staffIds = [...new Set(nullRows.map((row) => row.staffId))];
  const staffRows = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, employmentDetails: true }
  });

  const matchingStaffIds = new Set(
    staffRows
      .filter((staff) => {
        const roster =
          staff.employmentDetails?.employment?.roster?.trim().toUpperCase() ??
          '';
        return roster === normalized;
      })
      .map((staff) => staff.id)
  );

  const matched = nullRows.filter((row) => matchingStaffIds.has(row.staffId));
  return {
    all: matched.length,
    active: matched.filter((row) => row.status === 'active').length
  };
}

/**
 * Derived "in use" — no stored flag.
 * Referenced by StaffShiftAssignment.manageRosterId and/or Staff.employment.roster code.
 * INT-H3 also counts legacy null-FK assignments whose staff membership matches the code.
 */
async function getManageRosterUsage(
  id: string,
  code: string
): Promise<ManageRosterUsage> {
  const normalized = code.trim().toUpperCase();
  const [
    shiftAssignmentRefCount,
    activeShiftCount,
    staffMembershipCount,
    nullFk
  ] = await Promise.all([
    prisma.staffShiftAssignment.count({
      where: { manageRosterId: id }
    }),
    prisma.staffShiftAssignment.count({
      where: { manageRosterId: id, status: 'active' }
    }),
    normalized
      ? prisma.staff.count({
          where: {
            employmentDetails: {
              is: {
                employment: {
                  is: {
                    // INT-H6 — case-insensitive membership match.
                    roster: {
                      equals: normalized,
                      mode: Prisma.QueryMode.insensitive
                    }
                  }
                }
              }
            }
          }
        })
      : Promise.resolve(0),
    countNullFkAssignmentsForCode(normalized)
  ]);

  const totalAssignmentRefs = shiftAssignmentRefCount + nullFk.all;
  const totalActive = activeShiftCount + nullFk.active;

  return {
    shiftAssignmentRefCount: totalAssignmentRefs,
    activeShiftCount: totalActive,
    staffMembershipCount,
    inUse: totalAssignmentRefs > 0 || staffMembershipCount > 0
  };
}

async function loadUsageByRoster(
  rows: Array<{ id: string; code: string }>
): Promise<Map<string, ManageRosterUsage>> {
  const result = new Map<string, ManageRosterUsage>();
  if (!rows.length) return result;

  for (const row of rows) {
    result.set(row.id, emptyUsage());
  }

  const ids = rows.map((row) => row.id);
  const codeById = new Map(
    rows.map((row) => [row.id, row.code.trim().toUpperCase()] as const)
  );
  const codes = [
    ...new Set(
      [...codeById.values()].filter((code) => Boolean(code))
    )
  ];

  const [assignmentGroups, activeAssignmentGroups, staffRows, nullFkRows] =
    await Promise.all([
      prisma.staffShiftAssignment.groupBy({
        by: ['manageRosterId'],
        where: { manageRosterId: { in: ids } },
        _count: { _all: true }
      }),
      prisma.staffShiftAssignment.groupBy({
        by: ['manageRosterId'],
        where: { manageRosterId: { in: ids }, status: 'active' },
        _count: { _all: true }
      }),
      codes.length
        ? prisma.staff.findMany({
            where: {
              OR: codes.map((code) => ({
                employmentDetails: {
                  is: {
                    employment: {
                      is: {
                        // INT-H6 — case-insensitive membership match.
                        roster: {
                          equals: code,
                          mode: Prisma.QueryMode.insensitive
                        }
                      }
                    }
                  }
                }
              }))
            },
            select: { id: true, employmentDetails: true }
          })
        : Promise.resolve([]),
      prisma.staffShiftAssignment.findMany({
        where: { manageRosterId: null },
        select: { staffId: true, status: true }
      })
    ]);

  for (const group of assignmentGroups) {
    const key = group.manageRosterId;
    if (!key) continue;
    const current = result.get(key) ?? emptyUsage();
    current.shiftAssignmentRefCount = group._count._all;
    current.inUse =
      current.shiftAssignmentRefCount > 0 || current.staffMembershipCount > 0;
    result.set(key, current);
  }

  for (const group of activeAssignmentGroups) {
    const key = group.manageRosterId;
    if (!key) continue;
    const current = result.get(key) ?? emptyUsage();
    current.activeShiftCount = group._count._all;
    result.set(key, current);
  }

  const staffCountByCode = new Map<string, number>();
  const staffCodeById = new Map<string, string>();
  for (const staff of staffRows) {
    const roster =
      staff.employmentDetails?.employment?.roster?.trim().toUpperCase() ?? '';
    if (!roster) continue;
    staffCountByCode.set(roster, (staffCountByCode.get(roster) ?? 0) + 1);
    staffCodeById.set(staff.id, roster);
  }

  // INT-H3 — null-FK standing rules keyed by staff membership code.
  if (nullFkRows.length) {
    const missingStaffIds = [
      ...new Set(
        nullFkRows
          .map((row) => row.staffId)
          .filter((staffId) => !staffCodeById.has(staffId))
      )
    ];
    if (missingStaffIds.length) {
      const extraStaff = await prisma.staff.findMany({
        where: { id: { in: missingStaffIds } },
        select: { id: true, employmentDetails: true }
      });
      for (const staff of extraStaff) {
        const roster =
          staff.employmentDetails?.employment?.roster?.trim().toUpperCase() ??
          '';
        if (roster) staffCodeById.set(staff.id, roster);
      }
    }

    const idByCode = new Map(
      [...codeById.entries()].map(([id, code]) => [code, id] as const)
    );

    for (const row of nullFkRows) {
      const code = staffCodeById.get(row.staffId);
      if (!code) continue;
      const rosterId = idByCode.get(code);
      if (!rosterId) continue;
      const current = result.get(rosterId) ?? emptyUsage();
      current.shiftAssignmentRefCount += 1;
      if (row.status === 'active') {
        current.activeShiftCount += 1;
      }
      result.set(rosterId, current);
    }
  }

  for (const [id, code] of codeById) {
    const current = result.get(id) ?? emptyUsage();
    current.staffMembershipCount = staffCountByCode.get(code) ?? 0;
    current.inUse =
      current.shiftAssignmentRefCount > 0 || current.staffMembershipCount > 0;
    result.set(id, current);
  }

  return result;
}

function mapServiceRecord(
  record: ManageRosterRow,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  },
  usage: ManageRosterUsage = emptyUsage()
): ManageRosterServiceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    departmentId: record.departmentId,
    departmentName: record.department?.name ?? '',
    shiftsPerPersonPerDay: record.shiftsPerPersonPerDay,
    assignedStaffCount: usage.staffMembershipCount,
    activeShiftCount: usage.activeShiftCount,
    inUse: usage.inUse,
    shiftAssignmentRefCount: usage.shiftAssignmentRefCount,
    staffMembershipCount: usage.staffMembershipCount,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(
  params: GetManageRosterParams
): Prisma.ManageRosterWhereInput {
  const where: Prisma.ManageRosterWhereInput = {};
  const and: Prisma.ManageRosterWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
}

const manageRosterSelect = {
  id: true,
  code: true,
  name: true,
  departmentId: true,
  shiftsPerPersonPerDay: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  department: {
    select: { id: true, name: true }
  }
} as const;

export async function getManageRosterList(
  params: GetManageRosterParams = {}
): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.manageRoster.findMany({
      where: buildWhere(params),
      select: manageRosterSelect,
      orderBy: { name: 'asc' }
    });

    const withUsers = await resolveAuthUsers(records);
    const usageById = await loadUsageByRoster(
      withUsers.map((row) => ({ id: row.id, code: row.code }))
    );
    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(
          record,
          {
            createdUser: record.createdUser,
            updatedUser: record.updatedUser
          },
          usageById.get(record.id) ?? emptyUsage()
        )
      )
    };
  } catch (error: any) {
    console.error('getManageRosterList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch rosters' }
    };
  }
}

export async function getManageRosterById(id: string): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const record = await prisma.manageRoster.findUnique({
      where: { id },
      select: manageRosterSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Roster not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    const usage = await getManageRosterUsage(record.id, record.code);
    return {
      success: true,
      data: mapServiceRecord(
        withUsers,
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        },
        usage
      )
    };
  } catch (error: any) {
    console.error('getManageRosterById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get roster' }
    };
  }
}

async function findDuplicateName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.manageRoster.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

async function findDuplicateCode(
  code: string,
  excludeId?: string
): Promise<{ id: string; code: string } | null> {
  const existing = await prisma.manageRoster.findFirst({
    where: {
      code: { equals: code, mode: Prisma.QueryMode.insensitive },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, code: true }
  });
  return existing;
}

function duplicateFieldError(
  field: 'name' | 'code',
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

export async function createManageRoster(
  payload: ManageRosterPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = manageRosterPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const department = await resolveActiveDepartment(parsed.data.departmentId);
    if (!department.ok) {
      return {
        success: false,
        error: {
          message: department.message,
          issues: department.issues
        }
      };
    }

    const duplicateName = await findDuplicateName(parsed.data.name);
    if (duplicateName) {
      return duplicateFieldError(
        'name',
        `"${duplicateName.name}" already exists.`
      );
    }

    const duplicateCode = await findDuplicateCode(parsed.data.code);
    if (duplicateCode) {
      return duplicateFieldError(
        'code',
        `Roster code "${duplicateCode.code}" already exists.`
      );
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.manageRoster.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        departmentId: parsed.data.departmentId,
        shiftsPerPersonPerDay: parsed.data.shiftsPerPersonPerDay,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: manageRosterSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapServiceRecord(
        withUsers,
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        },
        emptyUsage()
      )
    };
  } catch (error: any) {
    console.error('createManageRoster error:', error);
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('code')) {
        return duplicateFieldError(
          'code',
          'A roster with this code already exists.'
        );
      }
      return duplicateFieldError(
        'name',
        'A roster with this name already exists.'
      );
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create roster' }
    };
  }
}

export async function updateManageRoster(
  id: string,
  payload: ManageRosterPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ManageRosterServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const existing = await prisma.manageRoster.findUnique({
      where: { id },
      select: { id: true, code: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Roster not found' } };
    }

    // INT-H3 — heal null-FK standing rules before in-use evaluation.
    await backfillNullManageRosterIds(existing.id, existing.code);

    const usage = await getManageRosterUsage(existing.id, existing.code);
    if (usage.inUse) {
      return {
        success: false,
        error: { message: formatInUseMessage(usage) }
      };
    }

    const parsed = manageRosterPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const department = await resolveActiveDepartment(parsed.data.departmentId);
    if (!department.ok) {
      return {
        success: false,
        error: {
          message: department.message,
          issues: department.issues
        }
      };
    }

    const duplicateName = await findDuplicateName(parsed.data.name, id);
    if (duplicateName) {
      return duplicateFieldError(
        'name',
        `"${duplicateName.name}" already exists.`
      );
    }

    // Keep business code stable after create (staff/roster snapshots key on it).
    const auditUser = toAuditUser(user);
    const updated = await prisma.manageRoster.update({
      where: { id },
      data: {
        code: existing.code,
        name: parsed.data.name,
        departmentId: parsed.data.departmentId,
        shiftsPerPersonPerDay: parsed.data.shiftsPerPersonPerDay,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: manageRosterSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapServiceRecord(
        withUsers,
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        },
        emptyUsage()
      )
    };
  } catch (error: any) {
    console.error('updateManageRoster error:', error);
    if (error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('code')) {
        return duplicateFieldError(
          'code',
          'A roster with this code already exists.'
        );
      }
      return duplicateFieldError(
        'name',
        'A roster with this name already exists.'
      );
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update roster' }
    };
  }
}

export async function deleteManageRoster(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const existing = await prisma.manageRoster.findUnique({
      where: { id },
      select: { id: true, code: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Roster not found' } };
    }

    // INT-H3 — heal null-FK standing rules before in-use evaluation.
    await backfillNullManageRosterIds(existing.id, existing.code);

    const usage = await getManageRosterUsage(existing.id, existing.code);
    if (usage.inUse) {
      return {
        success: false,
        error: { message: formatInUseMessage(usage) }
      };
    }

    await prisma.manageRoster.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteManageRoster error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete roster' }
    };
  }
}

function mapInspectAssignment(row: {
  id: string;
  code: string;
  shiftTypeId: string;
  status: string;
  rotationPattern: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  shiftType: { code: string; name: string } | null;
}): ManageRosterInspectAssignment {
  return {
    id: row.id,
    code: row.code,
    shiftTypeId: row.shiftTypeId,
    shiftTypeCode: row.shiftType?.code ?? '',
    shiftTypeName: row.shiftType?.name ?? '',
    status: row.status,
    rotationPattern: row.rotationPattern || 'fixed',
    effectiveFrom: toIsoString(row.effectiveFrom),
    effectiveTo: row.effectiveTo ? toIsoString(row.effectiveTo) : null
  };
}

/**
 * R10 inspect payload — assigned staff (employment.roster) with their
 * standing assignments on this Manage Roster, plus active-shift rollup.
 */
export async function getManageRosterInspectData(id: string): Promise<{
  success: boolean;
  data?: ManageRosterInspectData;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid roster ID' } };
    }

    const roster = await prisma.manageRoster.findUnique({
      where: { id },
      select: { id: true, code: true, name: true }
    });
    if (!roster) {
      return { success: false, error: { message: 'Roster not found' } };
    }

    const rosterCode = roster.code.trim().toUpperCase();

    const [staffRows, assignmentRows] = await Promise.all([
      prisma.staff.findMany({
        where: {
          employmentDetails: {
            is: {
              employment: {
                is: {
                  // INT-H6 — case-insensitive membership match.
                  roster: {
                    equals: rosterCode,
                    mode: Prisma.QueryMode.insensitive
                  }
                }
              }
            }
          }
        },
        select: { id: true, code: true, name: true, status: true },
        orderBy: [{ name: 'asc' }, { code: 'asc' }]
      }),
      prisma.staffShiftAssignment.findMany({
        where: { manageRosterId: roster.id },
        select: {
          id: true,
          code: true,
          staffId: true,
          staffCode: true,
          staffName: true,
          shiftTypeId: true,
          status: true,
          rotationPattern: true,
          effectiveFrom: true,
          effectiveTo: true,
          shiftType: { select: { code: true, name: true } }
        },
        orderBy: [{ effectiveFrom: 'desc' }, { code: 'asc' }]
      })
    ]);

    const assignmentsByStaff = new Map<string, ManageRosterInspectAssignment[]>();
    const assignmentStaffMeta = new Map<
      string,
      { code: string; name: string }
    >();
    for (const row of assignmentRows) {
      const mapped = mapInspectAssignment(row);
      const list = assignmentsByStaff.get(row.staffId) ?? [];
      list.push(mapped);
      assignmentsByStaff.set(row.staffId, list);
      if (!assignmentStaffMeta.has(row.staffId)) {
        assignmentStaffMeta.set(row.staffId, {
          code: row.staffCode,
          name: row.staffName
        });
      }
    }

    const staff: ManageRosterInspectStaffMember[] = staffRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      assignments: assignmentsByStaff.get(row.id) ?? []
    }));

    // Include assignment-only staff not on employment.roster (legacy / edge).
    for (const [staffId, assignments] of assignmentsByStaff) {
      if (staff.some((row) => row.id === staffId)) continue;
      const meta = assignmentStaffMeta.get(staffId);
      staff.push({
        id: staffId,
        code: meta?.code ?? '',
        name: meta?.name || 'Unknown staff',
        assignments
      });
    }

    const activeByShift = new Map<string, ManageRosterInspectActiveShift>();
    for (const row of assignmentRows) {
      if (row.status !== 'active') continue;
      const mapped = mapInspectAssignment(row);
      const existing = activeByShift.get(row.shiftTypeId);
      if (!existing) {
        activeByShift.set(row.shiftTypeId, {
          shiftTypeId: row.shiftTypeId,
          shiftTypeCode: mapped.shiftTypeCode,
          shiftTypeName: mapped.shiftTypeName,
          activeAssignmentCount: 1,
          staffCount: 1,
          assignments: [mapped]
        });
      } else {
        existing.activeAssignmentCount += 1;
        existing.assignments.push(mapped);
      }
    }

    for (const shift of activeByShift.values()) {
      const staffIds = new Set(
        assignmentRows
          .filter(
            (row) =>
              row.status === 'active' && row.shiftTypeId === shift.shiftTypeId
          )
          .map((row) => row.staffId)
      );
      shift.staffCount = staffIds.size;
    }

    const activeShifts = [...activeByShift.values()].sort((a, b) =>
      a.shiftTypeName.localeCompare(b.shiftTypeName, undefined, {
        sensitivity: 'base'
      })
    );

    return {
      success: true,
      data: {
        rosterId: roster.id,
        rosterCode,
        rosterName: roster.name,
        staff,
        activeShifts
      }
    };
  } catch (error: any) {
    console.error('getManageRosterInspectData error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load roster inspect data'
      }
    };
  }
}

/** Lightweight manage-roster options for cross-module filters.
 * Option `id` is the business **code** (e.g. CHN) — same key Staff.employment.roster
 * and Roster & Shifts snapshots should store (not Mongo ObjectId).
 * `departmentId` is included so Employment can filter rosters by working department.
 */
export async function getManageRosterOptions(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string; departmentId: string }>;
  error?: { message?: string };
}> {
  try {
    const rows = await prisma.manageRoster.findMany({
      select: { name: true, code: true, departmentId: true },
      orderBy: { name: 'asc' }
    });
    return {
      success: true,
      data: rows
        .filter((row) => Boolean(row.code?.trim()))
        .map((row) => ({
          id: row.code.trim().toUpperCase(),
          name: `${row.name} (${row.code.trim().toUpperCase()})`,
          departmentId: row.departmentId
        }))
    };
  } catch (error: any) {
    console.error('getManageRosterOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load roster options' }
    };
  }
}
