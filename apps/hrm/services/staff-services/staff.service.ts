'use server';

import { Prisma } from '@/lib/prisma';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import { channelingStaffPayloadSchema } from '@/lib/helpers/staff-channeling-fields.helper';
import type {
  GetStaffParams,
  StaffEmploymentDetails,
  StaffEmploymentPayload,
  StaffGeneralPayload,
  StaffHrDetails,
  StaffPersonnelDetails,
  StaffPersonnelPayload
} from '@/types/staff';

const STAFF_CODE_PREFIX = 'ST';
const STAFF_LEGACY_CODE_PREFIX = 'ST-LG';

// ** Staff Schema Validation (Channeling-aligned fields + HRM HR details) * //
const staffSchema = channelingStaffPayloadSchema.extend({
  code: z.string().max(50, 'Must be less than 50 characters').optional()
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

const optionalCount = () =>
  z
    .union([z.coerce.number(), z.string()])
    .optional()
    .transform((value) => {
      if (value == null || value === '') return 0;
      const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    });

const staffPersonnelDetailsSchema = z.object({
  personal: z
    .object({
      nationality: z.string().optional().nullable(),
      bloodGroup: z.string().optional().nullable(),
      religion: z.string().optional().nullable(),
      civilStatus: z.string().optional().nullable(),
      gsDivision: z.string().max(100).optional().nullable(),
      pollingDivision: z.string().max(100).optional().nullable(),
      transportMode: z.string().optional().nullable()
    })
    .optional(),
  contact: z
    .object({
      permanentAddress: z.string().max(500).optional().nullable(),
      postalAddress: z.string().max(500).optional().nullable(),
      faxNumber: z.string().max(20).optional().nullable()
    })
    .optional(),
  family: z
    .object({
      spouseName: z.string().max(150).optional().nullable(),
      spouseOccupation: z.string().max(100).optional().nullable(),
      fatherName: z.string().max(150).optional().nullable(),
      fatherOccupation: z.string().max(100).optional().nullable(),
      motherName: z.string().max(150).optional().nullable(),
      motherOccupation: z.string().max(100).optional().nullable(),
      guardianName: z.string().max(150).optional().nullable(),
      guardianOccupation: z.string().max(100).optional().nullable(),
      guardianRelationship: z.string().optional().nullable(),
      guardianAddress: z.string().max(500).optional().nullable(),
      guardianContactNumber: z.string().max(15).optional().nullable(),
      fatherInLawName: z.string().max(150).optional().nullable(),
      fatherInLawOccupation: z.string().max(100).optional().nullable(),
      motherInLawName: z.string().max(150).optional().nullable(),
      motherInLawOccupation: z.string().max(100).optional().nullable(),
      inLawAddress: z.string().max(500).optional().nullable(),
      inLawContactNumber: z.string().max(15).optional().nullable()
    })
    .optional(),
  dependents: z
    .object({
      maleAbove18: optionalCount(),
      femaleAbove18: optionalCount(),
      maleBelow18: optionalCount(),
      femaleBelow18: optionalCount()
    })
    .optional(),
  emergency: z
    .object({
      name: z.string().max(150).optional().nullable(),
      relationship: z.string().max(100).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      contactNumber: z.string().max(15).optional().nullable()
    })
    .optional()
});

const staffPersonnelPayloadSchema = z.object({
  title: z.string().max(50).optional(),
  name: z.string().max(150).optional(),
  initials: z.string().max(50).optional().nullable(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  nic: z.string().max(20).optional(),
  dateOfBirth: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  contactMobile: z.string().max(15).optional(),
  homeTelephone: z.string().max(15).optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: 'Enter a valid email address'
    }),
  personnelDetails: staffPersonnelDetailsSchema.optional()
});

const staffPersonnelUpdatePayloadSchema = staffPersonnelPayloadSchema.extend({
  id: z.string().min(1, 'Staff ID is required')
});

const optionalFloat = () =>
  z
    .union([z.coerce.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null || value === '') return null;
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    });

const staffEmploymentDetailsSchema = z.object({
  welfare: z
    .object({
      eligibleValue: optionalFloat(),
      utilizedThisYear: optionalFloat()
    })
    .optional(),
  employment: z
    .object({
      institution: z.string().max(150).optional().nullable(),
      department: z.string().max(150).optional().nullable(),
      employeeStatus: z.string().optional().nullable(),
      staffCategory: z.string().optional().nullable(),
      staffGrade: z.string().optional().nullable(),
      staffDesignation: z.string().optional().nullable(),
      roster: z.string().optional().nullable(),
      shift: z.string().optional().nullable()
    })
    .optional(),
  payroll: z
    .object({
      payingMethod: z.string().optional().nullable(),
      salaryPaymentMethod: z.string().optional().nullable(),
      bank: z.string().optional().nullable(),
      bankBranch: z.string().max(100).optional().nullable(),
      accountNumber: z.string().max(50).optional().nullable()
    })
    .optional(),
  workingHours: z
    .object({
      perWeekStandard: optionalFloat(),
      perWeekOt: optionalFloat(),
      perWeekNoPay: optionalFloat()
    })
    .optional(),
  permissions: z
    .object({
      allowedLateInLeave: z.boolean().optional(),
      allowedEarlyOutLeave: z.boolean().optional()
    })
    .optional(),
  notes: z
    .object({
      memo: z.string().max(2000).optional().nullable()
    })
    .optional()
});

const staffEmploymentPayloadSchema = z.object({
  employmentDetails: staffEmploymentDetailsSchema.optional()
});

const staffEmploymentUpdatePayloadSchema = staffEmploymentPayloadSchema.extend({
  id: z.string().min(1, 'Staff ID is required')
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

function toPersonnelDetailsInput(
  personnelDetails: StaffPersonnelDetails
): Prisma.StaffPersonnelDetailsCreateInput {
  return {
    personal: personnelDetails.personal
      ? {
          nationality: personnelDetails.personal.nationality ?? null,
          bloodGroup: personnelDetails.personal.bloodGroup ?? null,
          religion: personnelDetails.personal.religion ?? null,
          civilStatus: personnelDetails.personal.civilStatus ?? null,
          gsDivision: personnelDetails.personal.gsDivision ?? null,
          pollingDivision: personnelDetails.personal.pollingDivision ?? null,
          transportMode: personnelDetails.personal.transportMode ?? null
        }
      : undefined,
    contact: personnelDetails.contact
      ? {
          permanentAddress: personnelDetails.contact.permanentAddress ?? null,
          postalAddress: personnelDetails.contact.postalAddress ?? null,
          faxNumber: personnelDetails.contact.faxNumber ?? null
        }
      : undefined,
    family: personnelDetails.family
      ? {
          spouseName: personnelDetails.family.spouseName ?? null,
          spouseOccupation: personnelDetails.family.spouseOccupation ?? null,
          fatherName: personnelDetails.family.fatherName ?? null,
          fatherOccupation: personnelDetails.family.fatherOccupation ?? null,
          motherName: personnelDetails.family.motherName ?? null,
          motherOccupation: personnelDetails.family.motherOccupation ?? null,
          guardianName: personnelDetails.family.guardianName ?? null,
          guardianOccupation: personnelDetails.family.guardianOccupation ?? null,
          guardianRelationship: personnelDetails.family.guardianRelationship ?? null,
          guardianAddress: personnelDetails.family.guardianAddress ?? null,
          guardianContactNumber: personnelDetails.family.guardianContactNumber ?? null,
          fatherInLawName: personnelDetails.family.fatherInLawName ?? null,
          fatherInLawOccupation: personnelDetails.family.fatherInLawOccupation ?? null,
          motherInLawName: personnelDetails.family.motherInLawName ?? null,
          motherInLawOccupation: personnelDetails.family.motherInLawOccupation ?? null,
          inLawAddress: personnelDetails.family.inLawAddress ?? null,
          inLawContactNumber: personnelDetails.family.inLawContactNumber ?? null
        }
      : undefined,
    dependents: personnelDetails.dependents
      ? {
          maleAbove18: personnelDetails.dependents.maleAbove18 ?? 0,
          femaleAbove18: personnelDetails.dependents.femaleAbove18 ?? 0,
          maleBelow18: personnelDetails.dependents.maleBelow18 ?? 0,
          femaleBelow18: personnelDetails.dependents.femaleBelow18 ?? 0
        }
      : undefined,
    emergency: personnelDetails.emergency
      ? {
          name: personnelDetails.emergency.name ?? null,
          relationship: personnelDetails.emergency.relationship ?? null,
          address: personnelDetails.emergency.address ?? null,
          contactNumber: personnelDetails.emergency.contactNumber ?? null
        }
      : undefined
  };
}

function toEmploymentDetailsInput(
  employmentDetails: StaffEmploymentDetails
): Prisma.StaffEmploymentDetailsCreateInput {
  return {
    welfare: employmentDetails.welfare
      ? {
          eligibleValue: employmentDetails.welfare.eligibleValue ?? null,
          utilizedThisYear: employmentDetails.welfare.utilizedThisYear ?? null
        }
      : undefined,
    employment: employmentDetails.employment
      ? {
          institution: employmentDetails.employment.institution ?? null,
          department: employmentDetails.employment.department ?? null,
          employeeStatus: employmentDetails.employment.employeeStatus ?? null,
          staffCategory: employmentDetails.employment.staffCategory ?? null,
          staffGrade: employmentDetails.employment.staffGrade ?? null,
          staffDesignation: employmentDetails.employment.staffDesignation ?? null,
          roster: employmentDetails.employment.roster ?? null,
          shift: employmentDetails.employment.shift ?? null
        }
      : undefined,
    payroll: employmentDetails.payroll
      ? {
          payingMethod: employmentDetails.payroll.payingMethod ?? null,
          salaryPaymentMethod: employmentDetails.payroll.salaryPaymentMethod ?? null,
          bank: employmentDetails.payroll.bank ?? null,
          bankBranch: employmentDetails.payroll.bankBranch ?? null,
          accountNumber: employmentDetails.payroll.accountNumber ?? null
        }
      : undefined,
    workingHours: employmentDetails.workingHours
      ? {
          perWeekStandard: employmentDetails.workingHours.perWeekStandard ?? null,
          perWeekOt: employmentDetails.workingHours.perWeekOt ?? null,
          perWeekNoPay: employmentDetails.workingHours.perWeekNoPay ?? null
        }
      : undefined,
    permissions: employmentDetails.permissions
      ? {
          allowedLateInLeave: employmentDetails.permissions.allowedLateInLeave ?? false,
          allowedEarlyOutLeave: employmentDetails.permissions.allowedEarlyOutLeave ?? false
        }
      : undefined,
    notes: employmentDetails.notes
      ? {
          memo: employmentDetails.notes.memo ?? null
        }
      : undefined
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
    const page = params.page ?? process.env.DEFAULT_PAGE ?? '0';
    const limit = params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10';
    const keyword = params.keyword ?? '';
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const maxTake =
      Number.parseInt(process.env.EXPORT_LIMIT ?? '1000', 10) || 1000;
    const pageSize = Math.min(
      maxTake,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );
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
        nic: data.nic,
        dateOfBirth: toDate(data.dateOfBirth),
        gender: data.gender,
        contactMobile: data.contactMobile,
        address: data.address,
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

// ** Update Staff Personnel Details Service * //
export async function updateStaffPersonnel(
  id: string,
  payload: StaffPersonnelPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffPersonnelUpdatePayloadSchema.safeParse({ ...payload, id });
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

    const mergedHrDetails = toHrDetailsInput(
      {
        initials: data.initials ?? existing.hrDetails?.initials ?? null,
        firstName: data.firstName ?? existing.hrDetails?.firstName ?? null,
        lastName: data.lastName ?? existing.hrDetails?.lastName ?? null,
        homeTelephone: data.homeTelephone ?? existing.hrDetails?.homeTelephone ?? null,
        email: data.email ?? existing.hrDetails?.email ?? null,
        secondaryEmail: existing.hrDetails?.secondaryEmail ?? null,
        zoneCode: existing.hrDetails?.zoneCode ?? null,
        fingerPrintRfid: existing.hrDetails?.fingerPrintRfid ?? null,
        staffCodeLegacy: existing.hrDetails?.staffCodeLegacy ?? null,
        epfNumber: existing.hrDetails?.epfNumber ?? null,
        etfNumber: existing.hrDetails?.etfNumber ?? null,
        registrationNumber: existing.hrDetails?.registrationNumber ?? null,
        dateResigned: existing.hrDetails?.dateResigned ?? null,
        resignedWithoutNotice: existing.hrDetails?.resignedWithoutNotice ?? false,
        resignedWithNoticeDate: existing.hrDetails?.resignedWithNoticeDate ?? null,
        dateRetired: existing.hrDetails?.dateRetired ?? null,
        speciality: existing.hrDetails?.speciality ?? null
      },
      existing.hrDetails?.staffCodeLegacy ?? null
    );

    const updateData: Prisma.StaffUpdateInput = {
      ...(data.title !== undefined && { title: data.title ?? '' }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.nic !== undefined && { nic: data.nic ?? '' }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: toDate(data.dateOfBirth) }),
      ...(data.contactMobile !== undefined && { contactMobile: data.contactMobile ?? '' }),
      hrDetails: mergedHrDetails,
      ...(data.personnelDetails && {
        personnelDetails: toPersonnelDetailsInput(data.personnelDetails)
      }),
      ...(auditUser?.id && { updatedBy: auditUser.id }),
      updatedAt: new Date()
    };

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData
    });

    return { success: true, data: staff, message: 'Staff HR details updated successfully' };
  } catch (error: any) {
    console.error('updateStaffPersonnel error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Staff not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update staff HR details' }
    };
  }
}

// ** Update Staff Employment Details Service * //
export async function updateStaffEmployment(
  id: string,
  payload: StaffEmploymentPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffEmploymentUpdatePayloadSchema.safeParse({ ...payload, id });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues:
            parsed.error != null
              ? (parsed.error.flatten().fieldErrors as Record<string, string[]>)
              : undefined
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);
    const existing = await prisma.staff.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return { success: false, error: { message: 'Staff not found' } };
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...(data.employmentDetails && {
          employmentDetails: toEmploymentDetailsInput(data.employmentDetails)
        }),
        ...(auditUser?.id && { updatedBy: auditUser.id }),
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      data: staff,
      message: 'Staff employment details updated successfully'
    };
  } catch (error: any) {
    console.error('updateStaffEmployment error:', error);
    if (error.code === 'P2025') {
      return { success: false, error: { message: 'Staff not found' } };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update staff employment details' }
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

//** Get Staff Options Service * //
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
      take:
        Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
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
