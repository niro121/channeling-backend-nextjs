'use server';

import { Prisma } from '@/lib/prisma';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import type { GetStaffParams, StaffGeneralPayload, StaffHrDetails } from '@/types/staff';

const STAFF_CODE_PREFIX = 'ST';
const STAFF_LEGACY_CODE_PREFIX = 'ST-LG';

// ** Staff Schema Validation * //
const staffSchema = z.object({
  code: z.string().max(50, 'Must be less than 50 characters').optional(),
  title: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Name is required').max(150, 'Must be less than 150 characters'),
  nic: z.string().max(20, 'Must be less than 20 characters').optional().nullable(),
  dateOfBirth: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  gender: z.string().max(50).optional().nullable(),
  contactMobile: z
    .string()
    .max(15, 'Must be less than 15 characters')
    .optional()
    .nullable()
    .refine((value) => !value || MOBILE_NUMBER_REGEX.test(value), {
      message: 'Mobile Number Ex: 07x xxxxxxx'
    }),
  address: z.string().max(500, 'Must be less than 500 characters').optional().nullable(),
  dateJoined: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  status: z.number().int().refine((val) => val === 0 || val === 1, {
    message: 'Status must be Inactive (0) or Active (1)'
  })
});

const staffHrDetailsSchema = z.object({
  initials: z.string().max(50).optional().nullable(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  homeTelephone: z.string().max(15).optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: 'Enter a valid email address'
    }),
  secondaryEmail: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: 'Enter a valid email address'
    }),
  zoneCode: z.string().optional().nullable(),
  fingerPrintRfid: z.string().max(100).optional().nullable(),
  epfNumber: z.string().max(50).optional().nullable(),
  etfNumber: z.string().max(50).optional().nullable(),
  registrationNumber: z.string().max(50).optional().nullable(),
  dateResigned: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  resignedWithoutNotice: z.boolean().optional(),
  resignedWithNoticeDate: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  dateRetired: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  speciality: z.string().optional().nullable()
});

const staffGeneralPayloadSchema = staffSchema.extend({
  hrDetails: staffHrDetailsSchema.optional()
});

const staffGeneralUpdatePayloadSchema = staffSchema.partial().extend({
  id: z.string().min(1, 'Staff ID is required'),
  hrDetails: staffHrDetailsSchema.optional()
});

function toDate(val: Date | number | string | null | undefined): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  return new Date(val);
}

function toHrDetailsInput(
  hrDetails: StaffHrDetails,
  staffCodeLegacy?: string | null
): Prisma.StaffHrDetailsCreateInput {
  return {
    initials: hrDetails.initials ?? null,
    firstName: hrDetails.firstName ?? null,
    lastName: hrDetails.lastName ?? null,
    homeTelephone: hrDetails.homeTelephone ?? null,
    email: hrDetails.email ?? null,
    secondaryEmail: hrDetails.secondaryEmail ?? null,
    zoneCode: hrDetails.zoneCode ?? null,
    fingerPrintRfid: hrDetails.fingerPrintRfid ?? null,
    staffCodeLegacy: staffCodeLegacy ?? hrDetails.staffCodeLegacy ?? null,
    epfNumber: hrDetails.epfNumber ?? null,
    etfNumber: hrDetails.etfNumber ?? null,
    registrationNumber: hrDetails.registrationNumber ?? null,
    dateResigned: toDate(hrDetails.dateResigned),
    resignedWithoutNotice: hrDetails.resignedWithoutNotice ?? false,
    resignedWithNoticeDate: toDate(hrDetails.resignedWithNoticeDate),
    dateRetired: toDate(hrDetails.dateRetired),
    speciality: hrDetails.speciality ?? null
  };
}

async function generateStaffLegacyCode(): Promise<
  { success: true; code: string } | { success: false; message: string }
> {
  const generated = await generateRecordCode(STAFF_LEGACY_CODE_PREFIX);
  if (!generated.success) {
    return {
      success: false,
      message: 'Failed to generate legacy staff code. Please try again.'
    };
  }

  return { success: true, code: generated.code };
}

// ** Get Staff List Service * //
export async function getStaff(params: GetStaffParams): Promise<{
  success: boolean;
  data?: { records: any[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const { page = process.env.DEFAULT_PAGE_SIZE ?? '0', limit = process.env.DEFAULT_PER_PAGE ?? '10', keyword = '' } = params;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
    const skip = (pageNumber - 1) * pageSize;
    const whereClause: Prisma.StaffWhereInput = {
      OR: [
        { name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { nic: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { contactMobile: { contains: keyword, mode: Prisma.QueryMode.insensitive } }
      ]
    };

    const [records, totalRecords] = await Promise.all([
      prisma.staff.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.staff.count({ where: whereClause })
    ]);

    const recordsWithUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: { records: recordsWithUsers, totalRecords },
      message: 'Staff fetched successfully'
    };
  } catch (error: any) {
    console.error('getStaff error:', error);
    return { success: false, error: { message: error.message || 'Failed to fetch staff' } };
  }
}

// ** Get Staff By ID Service * //
export async function getStaffById(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid staff ID' } };
    }

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    const [record] = await resolveAuthUsers([staff]);
    return { success: true, data: record, message: 'Staff fetched successfully' };
  } catch (error: any) {
    console.error('getStaffById error:', error);
    return { success: false, error: { message: error.message || 'Failed to get staff' } };
  }
}

// ** Create Staff Service * //
export async function createStaff(
  payload: StaffGeneralPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffGeneralPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error != null ? (parsed.error.flatten().fieldErrors as Record<string, string[]>) : undefined
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    let code = data.code?.trim();
    if (!code) {
      const generated = await generateRecordCode(STAFF_CODE_PREFIX);
      if (!generated.success) {
        return {
          success: false,
          error: { message: 'Failed to generate staff code. Please try again.' }
        };
      }
      code = generated.code;
    }

    const legacyGenerated = await generateStaffLegacyCode();
    if (!legacyGenerated.success) {
      return {
        success: false,
        error: { message: legacyGenerated.message }
      };
    }

    const staff = await prisma.staff.create({
      data: {
        code,
        title: data.title ?? '',
        name: data.name,
        nic: data.nic ?? '',
        dateOfBirth: toDate(data.dateOfBirth),
        gender: data.gender ?? '',
        contactMobile: data.contactMobile ?? '',
        address: data.address ?? '',
        dateJoined: toDate(data.dateJoined) ?? new Date(),
        status: data.status,
        hrDetails: toHrDetailsInput(data.hrDetails ?? {}, legacyGenerated.code),
        ...(auditUser?.id && { createdBy: auditUser.id, updatedBy: auditUser.id })
      }
    });

    return { success: true, data: staff, message: 'Staff created successfully' };
  } catch (error: any) {
    console.error('createStaff error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { code: ['Staff code already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create staff' }
    };
  }
}

// ** Update Staff Service * //
export async function updateStaff(
  id: string,
  payload: Partial<StaffGeneralPayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffGeneralUpdatePayloadSchema.safeParse({ ...payload, id });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error != null ? (parsed.error.flatten().fieldErrors as Record<string, string[]>) : undefined
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);
    const existing = await prisma.staff.findUnique({
      where: { id },
      select: { hrDetails: true }
    });

    if (!existing) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    let staffCodeLegacy = existing.hrDetails?.staffCodeLegacy ?? null;
    if (!staffCodeLegacy && data.hrDetails) {
      const legacyGenerated = await generateStaffLegacyCode();
      if (!legacyGenerated.success) {
        return {
          success: false,
          error: { message: legacyGenerated.message }
        };
      }
      staffCodeLegacy = legacyGenerated.code;
    }

    const updateData: Prisma.StaffUpdateInput = {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.title !== undefined && { title: data.title ?? '' }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.nic !== undefined && { nic: data.nic ?? '' }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: toDate(data.dateOfBirth) }),
      ...(data.gender !== undefined && { gender: data.gender ?? '' }),
      ...(data.contactMobile !== undefined && { contactMobile: data.contactMobile ?? '' }),
      ...(data.address !== undefined && { address: data.address ?? '' }),
      ...(data.dateJoined !== undefined && { dateJoined: toDate(data.dateJoined) }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.hrDetails && {
        hrDetails: toHrDetailsInput(
          {
            initials: data.hrDetails.initials ?? existing.hrDetails?.initials ?? null,
            firstName: data.hrDetails.firstName ?? existing.hrDetails?.firstName ?? null,
            lastName: data.hrDetails.lastName ?? existing.hrDetails?.lastName ?? null,
            homeTelephone:
              data.hrDetails.homeTelephone ?? existing.hrDetails?.homeTelephone ?? null,
            email: data.hrDetails.email ?? existing.hrDetails?.email ?? null,
            secondaryEmail:
              data.hrDetails.secondaryEmail ?? existing.hrDetails?.secondaryEmail ?? null,
            zoneCode: data.hrDetails.zoneCode ?? existing.hrDetails?.zoneCode ?? null,
            fingerPrintRfid:
              data.hrDetails.fingerPrintRfid ?? existing.hrDetails?.fingerPrintRfid ?? null,
            epfNumber: data.hrDetails.epfNumber ?? existing.hrDetails?.epfNumber ?? null,
            etfNumber: data.hrDetails.etfNumber ?? existing.hrDetails?.etfNumber ?? null,
            registrationNumber:
              data.hrDetails.registrationNumber ??
              existing.hrDetails?.registrationNumber ??
              null,
            dateResigned:
              data.hrDetails.dateResigned !== undefined
                ? data.hrDetails.dateResigned
                : (existing.hrDetails?.dateResigned ?? null),
            resignedWithoutNotice:
              data.hrDetails.resignedWithoutNotice ??
              existing.hrDetails?.resignedWithoutNotice ??
              false,
            resignedWithNoticeDate:
              data.hrDetails.resignedWithNoticeDate !== undefined
                ? data.hrDetails.resignedWithNoticeDate
                : (existing.hrDetails?.resignedWithNoticeDate ?? null),
            dateRetired:
              data.hrDetails.dateRetired !== undefined
                ? data.hrDetails.dateRetired
                : (existing.hrDetails?.dateRetired ?? null),
            speciality: data.hrDetails.speciality ?? existing.hrDetails?.speciality ?? null
          },
          staffCodeLegacy
        )
      }),
      ...(auditUser?.id && { updatedBy: auditUser.id }),
      updatedAt: new Date()
    };

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData
    });

    return { success: true, data: staff, message: 'Staff updated successfully' };
  } catch (error: any) {
    console.error('updateStaff error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Staff not found' } };
    }
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: { code: ['Staff code already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update staff' }
    };
  }
}

// ** Delete Staff Service * //
export async function deleteStaff(id: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> {
  try {
    await prisma.staff.delete({ where: { id } });
    return { success: true, message: 'Staff deleted successfully' };
  } catch (error: any) {
    console.error('deleteStaff error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Staff not found' } };
    }
    return { success: false, error: { message: error.message || 'Failed to delete staff' } };
  }
}

// ** Bulk Delete Staff Service * //
export async function deleteStaffs(ids: string[]): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids?.length) {
      return { success: false, error: { message: 'No staff IDs provided' } };
    }

    const result = await prisma.staff.deleteMany({ where: { id: { in: ids } } });
    if (result.count === 0) {
      return { success: false, error: { message: 'No staff found to delete' } };
    }

    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} staff member(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('deleteStaffs error:', error);
    return { success: false, error: { message: error.message || 'Failed to delete staff' } };
  }
}








export type StaffOption = { id: string; name: string; code: string };

export async function getStaffOptions(): Promise<{
  success: boolean;
  data?: StaffOption[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const records = await prisma.staff.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      take: 500,
      select: { id: true, name: true, code: true }
    });
    const data: StaffOption[] = records.map((record) => ({
      id: record.id,
      name: record.name ?? '',
      code: record.code ?? ''
    }));
    return { success: true, data, message: 'Staff options fetched' };
  } catch (error: any) {
    console.error('getStaffOptions error:', error);
    return { success: false, error: { message: error.message || 'Failed to fetch staff options' } };
  }
}
