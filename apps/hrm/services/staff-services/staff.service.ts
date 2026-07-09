'use server';

import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import type { GetStaffParams, Staff } from '@/types/staff';

const staffSchema = z.object({
  code: z.string().min(1, 'Staff Code is required').max(50, 'Must be less than 50 characters'),
  title: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Name is required').max(150, 'Must be less than 150 characters'),
  nic: z.string().min(1, 'NIC is required').max(20, 'Must be less than 20 characters'),
  dateOfBirth: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  gender: z.string().min(1, 'Gender is required'),
  contactMobile: z
    .string()
    .min(1, 'Contact Mobile is required')
    .max(15, 'Must be less than 15 characters')
    .regex(MOBILE_NUMBER_REGEX, 'Mobile Number Ex: 07x xxxxxxx'),
  address: z.string().min(1, 'Address is required').max(500, 'Must be less than 500 characters'),
  dateJoined: z
    .union([z.coerce.date(), z.date(), z.null(), z.undefined()])
    .optional()
    .nullable(),
  status: z.number().int().refine((val) => val === 0 || val === 1, {
    message: 'Status must be Inactive (0) or Active (1)'
  })
});

const staffUpdateSchema = staffSchema.partial().extend({
  id: z.string().min(1, 'Staff ID is required')
});

function toDate(val: Date | number | string | null | undefined): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  return new Date(val);
}

export async function createStaff(
  payload: Staff,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffSchema.safeParse(payload);
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
    const staff = await prisma.staff.create({
      data: {
        code: data.code,
        title: data.title ?? '',
        name: data.name,
        nic: data.nic,
        dateOfBirth: toDate(data.dateOfBirth),
        gender: data.gender,
        contactMobile: data.contactMobile,
        address: data.address ?? '',
        dateJoined: toDate(data.dateJoined),
        status: data.status,
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

export async function updateStaff(
  id: string,
  payload: Partial<Staff>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = staffUpdateSchema.safeParse({ ...payload, id });
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
    const updateData: Prisma.StaffUpdateInput = {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.title !== undefined && { title: data.title ?? '' }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.nic !== undefined && { nic: data.nic }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: toDate(data.dateOfBirth) }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.contactMobile !== undefined && { contactMobile: data.contactMobile }),
      ...(data.address !== undefined && { address: data.address ?? '' }),
      ...(data.dateJoined !== undefined && { dateJoined: toDate(data.dateJoined) }),
      ...(data.status !== undefined && { status: data.status }),
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

export async function getStaff(params: GetStaffParams): Promise<{
  success: boolean;
  data?: { records: any[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const { page = '1', limit = '10', keyword = '' } = params;
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
