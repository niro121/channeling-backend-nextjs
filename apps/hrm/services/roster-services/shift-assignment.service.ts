'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  SHIFT_ASSIGNMENT_CODE_PREFIX,
  SHIFT_ASSIGNMENT_STATUSES,
  type GetShiftAssignmentsParams,
  type ShiftAssignmentFilterOptions,
  type ShiftAssignmentFormOptions,
  type ShiftAssignmentHistoryEntry,
  type ShiftAssignmentPayload,
  type ShiftAssignmentRecord,
  type ShiftAssignmentRosterScope,
  type ShiftAssignmentStatus,
  type ShiftAssignmentSummary
} from '@/types/roster';
import { getInstitutionName, INSTITUTION_OPTIONS } from '@/types/institution';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-category';
import { EMPLOYEE_STATUS_OPTIONS } from '@/types/staff-employment-options';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getRoomOptions } from '@/services/organization-services/room.service';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import { getStaffGradeOptions } from '@/services/hr-admin-services/staff-grade.service';

const assignmentPayloadSchema = z.object({
  staffId: z.string().min(1, 'Staff is required'),
  shiftTypeId: z.string().min(1, 'Shift type is required'),
  manageRosterId: z.string().min(1, 'Roster group is required'),
  rotationPattern: z.string().optional().default('fixed'),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable().optional(),
  weeklyOffDay: z.string().optional().default('sunday'),
  autoAssign: z.boolean().optional().default(true),
  status: z.enum(SHIFT_ASSIGNMENT_STATUSES).optional().default('active')
});

const assignmentUpdatePayloadSchema = assignmentPayloadSchema
  .partial()
  .extend({
    id: z.string().min(1, 'Assignment ID is required'),
    staffId: z.string().min(1, 'Staff is required').optional(),
    shiftTypeId: z.string().min(1, 'Shift type is required').optional(),
    manageRosterId: z.string().min(1, 'Roster group is required').optional(),
    effectiveFrom: z.coerce.date().optional()
  });

const bulkAssignmentPayloadSchema = assignmentPayloadSchema
  .omit({ staffId: true })
  .extend({
    staffIds: z
      .array(z.string().min(1))
      .min(1, 'Select at least one staff member')
  });

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toOption(value: string): { id: string; name: string } {
  return { id: value, name: value };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])
  ].sort((a, b) => a.localeCompare(b));
}

function rangesOverlap(
  fromA: Date,
  toA: Date | null | undefined,
  fromB: Date,
  toB: Date | null | undefined
): boolean {
  const endA = toA ?? new Date('9999-12-31T23:59:59.999Z');
  const endB = toB ?? new Date('9999-12-31T23:59:59.999Z');
  return fromA.getTime() <= endB.getTime() && fromB.getTime() <= endA.getTime();
}

async function getStaffSnapshot(staffId: string): Promise<{
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  designation: string;
} | null> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      code: true,
      name: true,
      employmentDetails: true
    }
  });
  if (!staff) return null;
  const employment = staff.employmentDetails?.employment;
  return {
    staffCode: staff.code ?? '',
    staffName: staff.name ?? '',
    department: employment?.department?.trim() ?? '',
    unit: '',
    designation: employment?.staffDesignation?.trim() ?? ''
  };
}

async function resolveStaffIdsForEmploymentFilters(
  params: GetShiftAssignmentsParams
): Promise<string[] | undefined> {
  const hasStaffFilter =
    params.institution ||
    params.staffCategory ||
    params.staffGrade ||
    params.employeeStatus;

  if (!hasStaffFilter) return undefined;

  const staffRecords = await prisma.staff.findMany({
    where: { status: 1 },
    select: { id: true, employmentDetails: true }
  });

  const filtered = staffRecords.filter((staff) => {
    const employment = staff.employmentDetails?.employment;
    if (params.institution && employment?.institution !== params.institution) {
      return false;
    }
    if (params.staffCategory && employment?.staffCategory !== params.staffCategory) {
      return false;
    }
    if (params.staffGrade && employment?.staffGrade !== params.staffGrade) {
      return false;
    }
    if (
      params.employeeStatus &&
      employment?.employeeStatus !== params.employeeStatus
    ) {
      return false;
    }
    return true;
  });

  return filtered.map((staff) => staff.id);
}

type OrgLabelMaps = {
  departmentNameById: Map<string, string>;
  designationNameById: Map<string, string>;
  unitNameById: Map<string, string>;
};

async function loadOrgLabelMaps(
  rows: Array<{
    department?: string | null;
    unit?: string | null;
    designation?: string | null;
  }>
): Promise<OrgLabelMaps> {
  const departmentIds = uniqueStrings(rows.map((row) => row.department));
  const designationIds = uniqueStrings(rows.map((row) => row.designation));
  const unitIds = uniqueStrings(rows.map((row) => row.unit));

  const [departments, designations, rooms] = await Promise.all([
    departmentIds.length
      ? prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true }
        })
      : Promise.resolve([]),
    designationIds.length
      ? prisma.designation.findMany({
          where: { id: { in: designationIds } },
          select: { id: true, name: true }
        })
      : Promise.resolve([]),
    unitIds.length
      ? prisma.room.findMany({
          where: { id: { in: unitIds } },
          select: { id: true, number: true, code: true }
        })
      : Promise.resolve([])
  ]);

  return {
    departmentNameById: new Map(departments.map((row) => [row.id, row.name])),
    designationNameById: new Map(designations.map((row) => [row.id, row.name])),
    unitNameById: new Map(
      rooms.map((row) => [
        row.id,
        row.code ? `${row.number} (${row.code})` : row.number
      ])
    )
  };
}

function resolveOrgLabel(
  value: string | null | undefined,
  nameById: Map<string, string>
): string {
  const id = value?.trim() ?? '';
  if (!id) return '';
  return nameById.get(id) ?? id;
}

function mapAssignmentRecord(
  record: any,
  labels?: OrgLabelMaps
): ShiftAssignmentRecord {
  const departmentId = record.department ?? '';
  const unitId = record.unit ?? '';
  const designationId = record.designation ?? '';

  return {
    id: record.id,
    code: record.code,
    staffId: record.staffId,
    shiftTypeId: record.shiftTypeId,
    manageRosterId: record.manageRosterId ?? '',
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: labels
      ? resolveOrgLabel(departmentId, labels.departmentNameById)
      : departmentId,
    unit: labels ? resolveOrgLabel(unitId, labels.unitNameById) : unitId,
    designation: labels
      ? resolveOrgLabel(designationId, labels.designationNameById)
      : designationId,
    rotationPattern: record.rotationPattern ?? 'fixed',
    effectiveFrom: toIsoString(record.effectiveFrom),
    effectiveTo: record.effectiveTo ? toIsoString(record.effectiveTo) : null,
    weeklyOffDay: record.weeklyOffDay ?? 'sunday',
    autoAssign: Boolean(record.autoAssign),
    status: (record.status as ShiftAssignmentStatus) ?? 'active',
    shiftTypeName: record.shiftType?.name ?? '',
    manageRosterCode: record.manageRoster?.code ?? '',
    manageRosterName: record.manageRoster?.name ?? '',
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    createdUser: record.createdUser ?? null,
    updatedUser: record.updatedUser ?? null
  };
}

const assignmentInclude = {
  shiftType: { select: { name: true } },
  manageRoster: { select: { id: true, code: true, name: true } }
} as const;

async function resolveManageRoster(manageRosterId: string): Promise<
  | { ok: true; id: string; code: string }
  | { ok: false; message: string; issues?: Record<string, string[]> }
> {
  const roster = await prisma.manageRoster.findUnique({
    where: { id: manageRosterId },
    select: { id: true, code: true }
  });
  if (!roster) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: { manageRosterId: ['Selected roster group was not found'] }
    };
  }
  return { ok: true, id: roster.id, code: roster.code.trim().toUpperCase() };
}

/**
 * INT-H2 — staff must belong to the selected Manage Roster group
 * (`employment.roster` = ManageRoster.code, case-insensitive).
 */
async function assertStaffBelongsToManageRoster(
  staffId: string,
  manageRosterCode: string
): Promise<
  | { ok: true }
  | { ok: false; message: string; issues?: Record<string, string[]> }
> {
  const expected = manageRosterCode.trim().toUpperCase();
  if (!expected) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: { manageRosterId: ['Roster group is required'] }
    };
  }

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { employmentDetails: true }
  });
  if (!staff) {
    return { ok: false, message: 'Staff member not found' };
  }

  const membership = (
    staff.employmentDetails?.employment?.roster ?? ''
  )
    .trim()
    .toUpperCase();

  if (!membership) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        staffId: [
          'This staff member has no roster group on Employment. Set roster membership first.'
        ]
      }
    };
  }

  if (membership !== expected) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: {
        staffId: [
          `Staff roster membership is "${membership}", which does not match selected roster group "${expected}".`
        ]
      }
    };
  }

  return { ok: true };
}

async function mapAssignmentRecords(
  records: any[]
): Promise<ShiftAssignmentRecord[]> {
  const labels = await loadOrgLabelMaps(records);
  return records.map((record) => mapAssignmentRecord(record, labels));
}

async function buildAssignmentWhere(
  params: GetShiftAssignmentsParams
): Promise<Prisma.StaffShiftAssignmentWhereInput> {
  const where: Prisma.StaffShiftAssignmentWhereInput = {};
  const and: Prisma.StaffShiftAssignmentWhereInput[] = [];

  if (params.staffId) where.staffId = params.staffId;
  if (params.shiftTypeId) where.shiftTypeId = params.shiftTypeId;
  if (params.department) where.department = params.department;
  if (params.unit) where.unit = params.unit;
  if (params.designation) where.designation = params.designation;

  if (params.status && params.status !== '__all__') {
    if ((SHIFT_ASSIGNMENT_STATUSES as readonly string[]).includes(params.status)) {
      where.status = params.status;
    }
  }

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { staffCode: { contains: search } },
        { staffName: { contains: search } },
        { code: { contains: search } }
      ]
    });
  }

  const staffIds = await resolveStaffIdsForEmploymentFilters(params);
  if (staffIds !== undefined) {
    where.staffId = staffIds.length ? { in: staffIds } : { in: ['__none__'] };
  }

  if (and.length) {
    where.AND = and;
  }

  return where;
}

/**
 * Reject only same staff + same shift type with overlapping effective dates.
 * INT-H7 — `inactive` rows do not block; `active` and `pending` still do.
 */
async function assertNoOverlap(
  staffId: string,
  shiftTypeId: string,
  effectiveFrom: Date,
  effectiveTo: Date | null | undefined,
  excludeId?: string
): Promise<string | null> {
  const existing = await prisma.staffShiftAssignment.findMany({
    where: {
      staffId,
      shiftTypeId,
      status: { in: ['active', 'pending'] },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: {
      id: true,
      code: true,
      effectiveFrom: true,
      effectiveTo: true
    }
  });

  for (const row of existing) {
    if (
      rangesOverlap(
        effectiveFrom,
        effectiveTo,
        row.effectiveFrom,
        row.effectiveTo
      )
    ) {
      return `Overlapping assignment dates for this staff member and shift type (${row.code}). Adjust effective dates or edit the existing assignment.`;
    }
  }

  return null;
}

export async function getShiftAssignments(
  params: GetShiftAssignmentsParams
): Promise<{
  success: boolean;
  data?: { records: ShiftAssignmentRecord[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageNumber = Math.max(
      1,
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '0', 10) || 1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number.parseInt(params.limit ?? defaultPerPage, 10) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = await buildAssignmentWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.staffShiftAssignment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: assignmentInclude
      }),
      prisma.staffShiftAssignment.count({ where })
    ]);

    const recordsWithUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: await mapAssignmentRecords(recordsWithUsers),
        totalRecords
      },
      message: 'Shift assignments fetched successfully'
    };
  } catch (error: any) {
    console.error('getShiftAssignments error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch shift assignments' }
    };
  }
}

export async function getShiftAssignmentsForExport(
  params: Omit<GetShiftAssignmentsParams, 'page' | 'limit'>
): Promise<{
  data: ShiftAssignmentRecord[];
  totalRecords: number;
}> {
  try {
    const where = await buildAssignmentWhere(params);
    const records = await prisma.staffShiftAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: assignmentInclude
    });
    const recordsWithUsers = await resolveAuthUsers(records);
    const data = await mapAssignmentRecords(recordsWithUsers);
    return {
      data,
      totalRecords: data.length
    };
  } catch (error) {
    console.error('getShiftAssignmentsForExport error', error);
    throw new Error('Error getting data');
  }
}

export async function getShiftAssignmentById(id: string): Promise<{
  success: boolean;
  data?: ShiftAssignmentRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid assignment ID' } };
    }

    const record = await prisma.staffShiftAssignment.findUnique({
      where: { id },
      include: assignmentInclude
    });
    if (!record) {
      return { success: false, error: { message: 'Shift assignment not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    const [mapped] = await mapAssignmentRecords([withUsers]);
    return {
      success: true,
      data: mapped,
      message: 'Shift assignment fetched successfully'
    };
  } catch (error: any) {
    console.error('getShiftAssignmentById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get shift assignment' }
    };
  }
}

export async function getShiftAssignmentSummary(): Promise<{
  success: boolean;
  data?: ShiftAssignmentSummary;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const [activeStaffTotal, assignedRows, rotationRows, expiringSoon] =
      await Promise.all([
        prisma.staff.count({ where: { status: 1 } }),
        prisma.staffShiftAssignment.findMany({
          where: { status: 'active' },
          select: { staffId: true },
          distinct: ['staffId']
        }),
        prisma.staffShiftAssignment.findMany({
          select: { rotationPattern: true }
        }),
        prisma.staffShiftAssignment.count({
          where: {
            status: 'active',
            effectiveTo: {
              gte: now,
              lte: in30Days
            }
          }
        })
      ]);

    const assignedStaff = assignedRows.length;
    const rotationPatterns = new Set(
      rotationRows.map((row) => row.rotationPattern).filter(Boolean)
    ).size;

    return {
      success: true,
      data: {
        assignedStaff,
        activeStaffTotal,
        unassigned: Math.max(0, activeStaffTotal - assignedStaff),
        rotationPatterns,
        expiringSoon
      },
      message: 'Shift assignment summary fetched'
    };
  } catch (error: any) {
    console.error('getShiftAssignmentSummary error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch shift assignment summary'
      }
    };
  }
}

export async function getShiftAssignmentFilterOptions(): Promise<{
  success: boolean;
  data?: ShiftAssignmentFilterOptions;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const [departmentRes, roomRes, designationRes, staffGradeRes] =
      await Promise.all([
        getDepartmentOptions(),
        getRoomOptions(),
        getDesignationOptions(),
        getStaffGradeOptions()
      ]);

    return {
      success: true,
      data: {
        institutions: INSTITUTION_OPTIONS.map((item) => ({
          id: item.id,
          name: item.name
        })),
        departments: departmentRes.data ?? [],
        units: roomRes.data ?? [],
        designations: designationRes.data ?? [],
        staffCategories: STAFF_CATEGORY_OPTIONS.map((item) => ({
          id: item.id,
          name: item.name
        })),
        staffGrades: staffGradeRes.data ?? [],
        employeeStatuses: EMPLOYEE_STATUS_OPTIONS.map((item) => ({
          id: item.id,
          name: item.name
        }))
      },
      message: 'Shift assignment filter options fetched'
    };
  } catch (error: any) {
    console.error('getShiftAssignmentFilterOptions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch shift assignment filter options'
      }
    };
  }
}

const HISTORY_TITLES: Record<string, string> = {
  'shift.assignment.created': 'Shift assignment created',
  'shift.assignment.updated': 'Shift assignment updated',
  'shift.assignment.deleted': 'Shift assignment deleted',
  'shift.assignment.bulkCreated': 'Bulk shift assignment created'
};

export async function getShiftAssignmentHistory(id: string): Promise<{
  success: boolean;
  data?: ShiftAssignmentHistoryEntry[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid assignment ID' } };
    }

    const logs = await prisma.activityLog.findMany({
      where: { entityType: 'ShiftAssignment', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const withUsers = await resolveAuthUsers(
      logs.map((log) => ({
        ...log,
        createdBy: log.userId,
        updatedBy: null
      }))
    );

    return {
      success: true,
      data: withUsers.map((log) => {
        const metadata = (log.metadata ?? {}) as {
          code?: string;
          staffName?: string;
        };
        const label = metadata.staffName ? metadata.staffName : 'Shift assignment';
        const code = metadata.code ? ` (${metadata.code})` : '';
        return {
          id: log.id,
          title: HISTORY_TITLES[log.action] ?? 'Shift assignment change',
          detail: `${label}${code}.`,
          userLabel: log.createdUser?.name ?? '—',
          at: toIsoString(log.createdAt)
        };
      }),
      message: 'Shift assignment history fetched'
    };
  } catch (error: any) {
    console.error('getShiftAssignmentHistory error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch shift assignment history'
      }
    };
  }
}

async function createAssignmentRecord(
  payload: ShiftAssignmentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShiftAssignmentRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  const parsed = assignmentPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
      }
    };
  }

  const data = parsed.data;
  if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
    return {
      success: false,
      error: {
        message: 'Effective To must be on or after Effective From',
        issues: { effectiveTo: ['Must be on or after Effective From'] }
      }
    };
  }

  const overlap = await assertNoOverlap(
    data.staffId,
    data.shiftTypeId,
    data.effectiveFrom,
    data.effectiveTo
  );
  if (overlap) {
    return { success: false, error: { message: overlap } };
  }

  const [staffSnapshot, shiftType, manageRoster] = await Promise.all([
    getStaffSnapshot(data.staffId),
    prisma.shiftType.findUnique({
      where: { id: data.shiftTypeId },
      select: { id: true, name: true, status: true }
    }),
    resolveManageRoster(data.manageRosterId)
  ]);

  if (!staffSnapshot) {
    return { success: false, error: { message: 'Staff member not found' } };
  }
  if (!shiftType) {
    return { success: false, error: { message: 'Shift type not found' } };
  }
  // INT-H5 — inactive templates cannot receive new standing rules.
  if (shiftType.status === 'inactive') {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        issues: {
          shiftTypeId: [
            'Selected shift type is inactive. Activate it or choose another shift type.'
          ]
        }
      }
    };
  }
  if (!manageRoster.ok) {
    return {
      success: false,
      error: {
        message: manageRoster.message,
        issues: manageRoster.issues
      }
    };
  }

  const membership = await assertStaffBelongsToManageRoster(
    data.staffId,
    manageRoster.code
  );
  if (!membership.ok) {
    return {
      success: false,
      error: {
        message: membership.message,
        issues: membership.issues
      }
    };
  }

  const generated = await generateRecordCode(SHIFT_ASSIGNMENT_CODE_PREFIX);
  if (!generated.success) {
    return {
      success: false,
      error: {
        message: 'Failed to generate assignment code. Please try again.'
      }
    };
  }

  const auditUser = toAuditUser(user);
  const record = await prisma.staffShiftAssignment.create({
    data: {
      code: generated.code,
      staffId: data.staffId,
      shiftTypeId: data.shiftTypeId,
      manageRosterId: manageRoster.id,
      staffCode: staffSnapshot.staffCode,
      staffName: staffSnapshot.staffName,
      department: staffSnapshot.department,
      unit: staffSnapshot.unit,
      designation: staffSnapshot.designation,
      rotationPattern: data.rotationPattern ?? 'fixed',
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
      weeklyOffDay: data.weeklyOffDay ?? 'sunday',
      autoAssign: data.autoAssign ?? true,
      status: data.status ?? 'active',
      ...(auditUser?.id && {
        createdBy: auditUser.id,
        updatedBy: auditUser.id
      })
    },
    include: assignmentInclude
  });

  const [mapped] = await mapAssignmentRecords([record]);
  return {
    success: true,
    data: mapped,
    message: 'Shift assignment created successfully'
  };
}

export async function createShiftAssignment(
  payload: ShiftAssignmentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShiftAssignmentRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    return await createAssignmentRecord(payload, user);
  } catch (error: any) {
    console.error('createShiftAssignment error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: { message: 'Duplicate assignment code detected' }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create shift assignment' }
    };
  }
}

export async function bulkCreateShiftAssignments(
  payload: Omit<ShiftAssignmentPayload, 'staffId'> & { staffIds: string[] },
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { count: number; ids: string[] };
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = bulkAssignmentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const createdIds: string[] = [];

    for (const staffId of data.staffIds) {
      const result = await createAssignmentRecord(
        {
          staffId,
          shiftTypeId: data.shiftTypeId,
          manageRosterId: data.manageRosterId,
          rotationPattern: data.rotationPattern,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          weeklyOffDay: data.weeklyOffDay,
          autoAssign: data.autoAssign,
          status: data.status
        },
        user
      );

      if (!result.success || !result.data?.id) {
        return {
          success: false,
          error: {
            message:
              result.error?.message ??
              'Failed to create one or more shift assignments'
          }
        };
      }

      createdIds.push(result.data.id);
    }

    return {
      success: true,
      data: { count: createdIds.length, ids: createdIds },
      message: `${createdIds.length} shift assignment(s) created successfully`
    };
  } catch (error: any) {
    console.error('bulkCreateShiftAssignments error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to bulk create shift assignments'
      }
    };
  }
}

export async function updateShiftAssignment(
  id: string,
  payload: Partial<ShiftAssignmentPayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ShiftAssignmentRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = assignmentUpdatePayloadSchema.safeParse({ ...payload, id });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const existing = await prisma.staffShiftAssignment.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Shift assignment not found' } };
    }

    const staffId = data.staffId ?? existing.staffId;
    const shiftTypeId = data.shiftTypeId ?? existing.shiftTypeId;
    const effectiveFrom = data.effectiveFrom ?? existing.effectiveFrom;
    const effectiveTo =
      data.effectiveTo !== undefined ? data.effectiveTo : existing.effectiveTo;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return {
        success: false,
        error: {
          message: 'Effective To must be on or after Effective From',
          issues: { effectiveTo: ['Must be on or after Effective From'] }
        }
      };
    }

    const overlap = await assertNoOverlap(
      staffId,
      shiftTypeId,
      effectiveFrom,
      effectiveTo,
      id
    );
    if (overlap) {
      return { success: false, error: { message: overlap } };
    }

    let snapshot = {
      staffCode: existing.staffCode,
      staffName: existing.staffName,
      department: existing.department,
      unit: existing.unit,
      designation: existing.designation
    };

    if (data.staffId && data.staffId !== existing.staffId) {
      const nextSnapshot = await getStaffSnapshot(data.staffId);
      if (!nextSnapshot) {
        return { success: false, error: { message: 'Staff member not found' } };
      }
      snapshot = nextSnapshot;
    }

    if (data.shiftTypeId) {
      const shiftType = await prisma.shiftType.findUnique({
        where: { id: data.shiftTypeId },
        select: { id: true, status: true }
      });
      if (!shiftType) {
        return { success: false, error: { message: 'Shift type not found' } };
      }
      // INT-H5 — inactive templates cannot be selected on update.
      if (shiftType.status === 'inactive') {
        return {
          success: false,
          error: {
            message: 'Validation failed',
            issues: {
              shiftTypeId: [
                'Selected shift type is inactive. Activate it or choose another shift type.'
              ]
            }
          }
        };
      }
    }

    let nextManageRosterId = existing.manageRosterId ?? '';
    let nextManageRosterCode = '';
    if (data.manageRosterId !== undefined) {
      const manageRoster = await resolveManageRoster(data.manageRosterId);
      if (!manageRoster.ok) {
        return {
          success: false,
          error: {
            message: manageRoster.message,
            issues: manageRoster.issues
          }
        };
      }
      nextManageRosterId = manageRoster.id;
      nextManageRosterCode = manageRoster.code;
    }
    if (!nextManageRosterId) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: { manageRosterId: ['Roster group is required'] }
        }
      };
    }
    if (!nextManageRosterCode) {
      const resolved = await resolveManageRoster(nextManageRosterId);
      if (!resolved.ok) {
        return {
          success: false,
          error: {
            message: resolved.message,
            issues: resolved.issues
          }
        };
      }
      nextManageRosterCode = resolved.code;
    }

    const membership = await assertStaffBelongsToManageRoster(
      staffId,
      nextManageRosterCode
    );
    if (!membership.ok) {
      return {
        success: false,
        error: {
          message: membership.message,
          issues: membership.issues
        }
      };
    }

    const auditUser = toAuditUser(user);
    const record = await prisma.staffShiftAssignment.update({
      where: { id },
      data: {
        ...(data.staffId !== undefined && { staffId: data.staffId }),
        ...(data.shiftTypeId !== undefined && { shiftTypeId: data.shiftTypeId }),
        manageRosterId: nextManageRosterId,
        staffCode: snapshot.staffCode,
        staffName: snapshot.staffName,
        department: snapshot.department,
        unit: snapshot.unit,
        designation: snapshot.designation,
        ...(data.rotationPattern !== undefined && {
          rotationPattern: data.rotationPattern
        }),
        ...(data.effectiveFrom !== undefined && {
          effectiveFrom: data.effectiveFrom
        }),
        ...(data.effectiveTo !== undefined && { effectiveTo: data.effectiveTo }),
        ...(data.weeklyOffDay !== undefined && {
          weeklyOffDay: data.weeklyOffDay
        }),
        ...(data.autoAssign !== undefined && { autoAssign: data.autoAssign }),
        ...(data.status !== undefined && { status: data.status }),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      include: assignmentInclude
    });

    const [mapped] = await mapAssignmentRecords([record]);
    return {
      success: true,
      data: mapped,
      message: 'Shift assignment updated successfully'
    };
  } catch (error: any) {
    console.error('updateShiftAssignment error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Shift assignment not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update shift assignment' }
    };
  }
}

export async function deleteShiftAssignment(id: string): Promise<{
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string };
}> {
  try {
    await prisma.staffShiftAssignment.delete({ where: { id } });
    return {
      success: true,
      data: { id },
      message: 'Shift assignment deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteShiftAssignment error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Shift assignment not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to delete shift assignment' }
    };
  }
}

export async function deleteShiftAssignments(ids: string[]): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids?.length) {
      return {
        success: false,
        error: { message: 'No shift assignment IDs provided' }
      };
    }

    const result = await prisma.staffShiftAssignment.deleteMany({
      where: { id: { in: ids } }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: { message: 'No shift assignments found to delete' }
      };
    }

    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} shift assignment(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('deleteShiftAssignments error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete shift assignments' }
    };
  }
}

/**
 * Roster selector options for Assign / Bulk / Edit sheets.
 * Option `id` = ManageRoster ObjectId (FK on StaffShiftAssignment).
 */
export async function getShiftAssignmentFormOptions(): Promise<{
  success: boolean;
  data?: ShiftAssignmentFormOptions;
  error?: { message?: string };
}> {
  try {
    const { getActiveShiftTypeOptions } = await import(
      '@/services/roster-services/shift-type.service'
    );

    const [rosterRows, shiftTypeRes] = await Promise.all([
      prisma.manageRoster.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' }
      }),
      getActiveShiftTypeOptions()
    ]);

    if (!shiftTypeRes.success) {
      return {
        success: false,
        error: {
          message:
            shiftTypeRes.error?.message ?? 'Failed to load shift type options'
        }
      };
    }

    return {
      success: true,
      data: {
        rosters: rosterRows
          .filter((row) => Boolean(row.code?.trim()))
          .map((row) => ({
            id: row.id,
            name: `${row.name} (${row.code.trim().toUpperCase()})`
          })),
        shiftTypes: (shiftTypeRes.data ?? []).map((shiftType) => ({
          id: shiftType.id,
          name: shiftType.code
            ? `${shiftType.code} — ${shiftType.name}`
            : shiftType.name
        }))
      }
    };
  } catch (error: any) {
    console.error('getShiftAssignmentFormOptions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load assignment form options'
      }
    };
  }
}

/**
 * Resolve ManageRoster.id from Staff.employment.roster code
 * (fallback when an older assignment has no manageRosterId).
 */
export async function getStaffManageRosterId(staffId: string): Promise<{
  success: boolean;
  data?: string | null;
  error?: { message?: string };
}> {
  try {
    if (!staffId) {
      return { success: false, error: { message: 'Staff is required' } };
    }
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { employmentDetails: true }
    });
    if (!staff) {
      return { success: false, error: { message: 'Staff not found' } };
    }
    const raw = staff.employmentDetails?.employment?.roster?.trim() ?? '';
    if (!raw) {
      return { success: true, data: null };
    }

    const roster = await prisma.manageRoster.findFirst({
      where: {
        code: { equals: raw.toUpperCase(), mode: Prisma.QueryMode.insensitive }
      },
      select: { id: true }
    });

    return {
      success: true,
      data: roster?.id ?? null
    };
  } catch (error: any) {
    console.error('getStaffManageRosterId error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to resolve staff roster' }
    };
  }
}

/**
 * Roster context card + staff options scoped to ManageRoster.
 * Staff membership uses employment.roster = ManageRoster.code.
 * Option labels include active standing assignment counts.
 */
export async function getShiftAssignmentRosterScope(
  manageRosterId: string
): Promise<{
  success: boolean;
  data?: ShiftAssignmentRosterScope;
  error?: { message?: string };
}> {
  try {
    const id = manageRosterId?.trim();
    if (!id) {
      return { success: false, error: { message: 'Roster is required' } };
    }

    const roster = await prisma.manageRoster.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        shiftsPerPersonPerDay: true,
        department: {
          select: { name: true, institution: true }
        }
      }
    });

    if (!roster) {
      return {
        success: false,
        error: { message: 'Roster group was not found in Manage Rosters' }
      };
    }

    const normalizedCode = roster.code.trim().toUpperCase();

    // INT-H6 — case-insensitive membership match on employment.roster.
    const staffRows = await prisma.staff.findMany({
      where: {
        status: 1,
        employmentDetails: {
          is: {
            employment: {
              is: {
                roster: {
                  equals: normalizedCode,
                  mode: Prisma.QueryMode.insensitive
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        code: true,
        name: true
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }]
    });

    const staffIds = staffRows.map((row) => row.id);
    const activeCounts = new Map<string, number>();

    if (staffIds.length) {
      const grouped = await prisma.staffShiftAssignment.groupBy({
        by: ['staffId'],
        where: {
          staffId: { in: staffIds },
          status: 'active'
        },
        _count: { _all: true }
      });
      for (const row of grouped) {
        activeCounts.set(row.staffId, row._count._all);
      }
    }

    return {
      success: true,
      data: {
        context: {
          id: roster.id,
          code: normalizedCode,
          name: roster.name,
          departmentName: roster.department?.name?.trim() || '—',
          institutionName: getInstitutionName(roster.department?.institution),
          shiftsPerPersonPerDay: roster.shiftsPerPersonPerDay
        },
        staff: staffRows.map((row) => {
          const activeAssignmentCount = activeCounts.get(row.id) ?? 0;
          const base = row.code
            ? `${row.code} — ${row.name}`
            : row.name;
          return {
            id: row.id,
            code: row.code,
            staffName: row.name,
            activeAssignmentCount,
            name: `${base} · Active rules: ${activeAssignmentCount}`
          };
        })
      }
    };
  } catch (error: any) {
    console.error('getShiftAssignmentRosterScope error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load roster staff options'
      }
    };
  }
}
