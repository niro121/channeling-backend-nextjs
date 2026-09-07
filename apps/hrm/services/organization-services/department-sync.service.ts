'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  CHANNELING_DEPARTMENT_PAGE_SIZE,
  CHANNELING_DEPARTMENT_PAGE_START,
  fetchChannelingDepartmentList
} from '@/services/organization-services/channeling-department.service';
import type {
  ChannelingPublicDepartmentDto,
  DepartmentSyncStats
} from '@/types/channeling-department';

function mapDtoToDepartmentData(
  dto: ChannelingPublicDepartmentDto,
  auditUserId?: string
) {
  return {
    name: dto.name,
    description: dto.description ?? '',
    institution: dto.institution,
    status: dto.status,
    migrateSourceId: dto.id,
    ...(auditUserId && { updatedBy: auditUserId })
  };
}

async function findExistingDepartment(dto: ChannelingPublicDepartmentDto) {
  if (dto.id) {
    const bySource = await prisma.department.findFirst({
      where: { migrateSourceId: dto.id },
      select: { id: true }
    });
    if (bySource) return bySource;
  }

  if (dto.name != null && dto.institution != null) {
    return prisma.department.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        institution: dto.institution
      },
      select: { id: true }
    });
  }

  return null;
}

/** Upsert a department from a Channeling public department DTO. */
export async function upsertDepartmentFromChanneling(
  dto: ChannelingPublicDepartmentDto,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  data?: { id: string };
  error?: { message?: string };
}> {
  if (!dto.id || !dto.name || dto.institution == null) {
    return {
      success: false,
      action: 'skipped',
      error: { message: 'Department id, name, and institution are required' }
    };
  }

  const auditUser = toAuditUser(user);
  const auditUserId = auditUser?.id;
  const data = mapDtoToDepartmentData(dto, auditUserId);

  try {
    const existing = await findExistingDepartment(dto);

    if (existing) {
      const department = await prisma.department.update({
        where: { id: existing.id },
        data
      });
      return { success: true, action: 'updated', data: { id: department.id } };
    }

    const department = await prisma.department.create({
      data: {
        ...data,
        ...(auditUserId && { createdBy: auditUserId })
      }
    });
    return { success: true, action: 'created', data: { id: department.id } };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to save department';
    console.error('upsertDepartmentFromChanneling error:', error);
    return { success: false, error: { message } };
  }
}

/** Sync all departments from Channeling public API into HRM. */
export async function syncAllDepartmentsFromChanneling(
  user?: AuditUser,
  keyword = ''
): Promise<{
  success: boolean;
  data?: DepartmentSyncStats;
  message?: string;
  error?: { message?: string };
}> {
  const stats: DepartmentSyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    errors: []
  };

  let page = CHANNELING_DEPARTMENT_PAGE_START;
  let totalRecords = 0;
  let processed = 0;

  while (true) {
    const fetchResult = await fetchChannelingDepartmentList({
      page,
      limit: CHANNELING_DEPARTMENT_PAGE_SIZE,
      keyword
    });

    if (!fetchResult.success || !fetchResult.data) {
      return {
        success: false,
        error: {
          message:
            fetchResult.error?.message ??
            'Failed to fetch departments from Channeling'
        }
      };
    }

    const { departments, totalRecords: total } = fetchResult.data;
    totalRecords = total;
    stats.total = totalRecords;

    for (const dto of departments) {
      const result = await upsertDepartmentFromChanneling(dto, user);

      if (!result.success) {
        stats.failed += 1;
        stats.errors.push({
          id: dto.id,
          name: dto.name,
          message: result.error?.message ?? 'Unknown error'
        });
        continue;
      }

      if (result.action === 'created') stats.created += 1;
      else if (result.action === 'updated') stats.updated += 1;
      else stats.skipped += 1;
    }

    processed += departments.length;

    if (processed >= totalRecords || departments.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    success: true,
    data: stats,
    message: `Synced ${stats.total} department(s): ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`
  };
}
