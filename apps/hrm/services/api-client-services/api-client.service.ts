'use server';

import { randomBytes, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { authPrisma } from '@archmage/db-auth';
import { userTypes } from '@archmage/shared';
import prisma from '@/lib/prisma';
import { toAuditUser, type AuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import {
  DEFAULT_PUBLIC_API_SCOPES,
  PUBLIC_API_SCOPE_IDS,
  isPublicApiScopeId
} from '@/lib/permissions';
import type {
  ApiClientCreatePayload,
  ApiClientRecord,
  ApiClientUpdatePayload,
  GetApiClientsQuery
} from '@/types/api-client';

const objectIdSchema = z
  .string()
  .min(1, 'User is required')
  .regex(/^[a-f\d]{24}$/i, 'Invalid user id');

const scopesSchema = z
  .array(z.enum(PUBLIC_API_SCOPE_IDS))
  .min(1, 'Select at least one scope')
  .optional();

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters'),
  actingUserId: objectIdSchema,
  scopes: scopesSchema
});

const updateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(150, 'Must be less than 150 characters')
    .optional(),
  isBlocked: z.boolean().optional(),
  actingUserId: objectIdSchema,
  scopes: scopesSchema
});

function normalizeScopes(scopes?: string[] | null): string[] {
  const cleaned = (scopes ?? [])
    .map((s) => s.trim())
    .filter(isPublicApiScopeId);
  if (!cleaned.length) return [...DEFAULT_PUBLIC_API_SCOPES];
  return Array.from(new Set(cleaned));
}

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

async function resolveActingUser(
  actingUserId: string
): Promise<
  | { ok: true; id: string; name: string }
  | { ok: false; message: string }
> {
  const user = await authPrisma.user.findUnique({
    where: { id: actingUserId },
    select: { id: true, name: true, userType: true, status: true }
  });
  if (!user) return { ok: false, message: 'User not found' };
  if (user.userType !== userTypes.apiUser) {
    return { ok: false, message: 'Selected user must be an API User' };
  }
  if (user.status !== 1) {
    return { ok: false, message: 'Selected user must be active' };
  }
  return { ok: true, id: user.id, name: user.name || user.id };
}

async function attachActingUserNames(
  rows: Array<{
    id: string;
    clientId: string;
    name: string;
    isBlocked: boolean;
    actingUserId: string;
    scopes: string[];
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdUser?: { name?: string } | null;
    updatedUser?: { name?: string } | null;
  }>
): Promise<ApiClientRecord[]> {
  const actingIds = Array.from(
    new Set(rows.map((r) => r.actingUserId).filter(Boolean))
  );
  const actingUsers =
    actingIds.length > 0
      ? await authPrisma.user.findMany({
          where: { id: { in: actingIds } },
          select: { id: true, name: true }
        })
      : [];
  const nameById = new Map(actingUsers.map((u) => [u.id, u.name]));

  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    isBlocked: row.isBlocked,
    actingUserId: row.actingUserId,
    actingUserName: nameById.get(row.actingUserId) ?? '—',
    scopes: row.scopes ?? [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    createdBy: row.createdUser?.name ?? '',
    updatedBy: row.updatedUser?.name ?? ''
  }));
}

export async function getApiClientUserOptions(): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: { message?: string };
}> {
  try {
    const users = await authPrisma.user.findMany({
      where: { status: 1, userType: userTypes.apiUser },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true }
    });
    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name || u.email
      }))
    };
  } catch (error: unknown) {
    console.error('getApiClientUserOptions error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to load API users'
      }
    };
  }
}

export async function getApiClients(
  query: GetApiClientsQuery
): Promise<{
  success: boolean;
  data?: { records: ApiClientRecord[]; totalRecords: number };
  error?: { message?: string };
}> {
  try {
    const page = Number.isFinite(query.page) ? query.page : 0;
    const limit = query.limit > 0 ? query.limit : 10;
    const keyword = query.keyword?.trim() ?? '';
    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { clientId: { contains: keyword, mode: 'insensitive' as const } }
          ]
        }
      : {};

    const [rows, totalRecords] = await Promise.all([
      prisma.apiClient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * limit,
        take: limit
      }),
      prisma.apiClient.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(rows);
    const records = await attachActingUserNames(withUsers);
    return {
      success: true,
      data: { records, totalRecords }
    };
  } catch (error: unknown) {
    console.error('getApiClients error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to fetch API clients'
      }
    };
  }
}

export async function getApiClientById(id: string): Promise<{
  success: boolean;
  data?: ApiClientRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid client ID' } };
    }
    const row = await prisma.apiClient.findUnique({ where: { id } });
    if (!row) {
      return { success: false, error: { message: 'API client not found' } };
    }
    const [withUsers] = await resolveAuthUsers([row]);
    const [mapped] = await attachActingUserNames([withUsers]);
    return { success: true, data: mapped };
  } catch (error: unknown) {
    console.error('getApiClientById error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to fetch API client'
      }
    };
  }
}

export async function createApiClient(
  payload: ApiClientCreatePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ApiClientRecord & { clientSecret: string };
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = createSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const acting = await resolveActingUser(parsed.data.actingUserId);
    if (!acting.ok) {
      return { success: false, error: { message: acting.message } };
    }

    const clientId = randomUUID();
    const clientSecret = randomBytes(32).toString('hex');
    const clientSecretHash = await argon2.hash(clientSecret);
    const scopes = normalizeScopes(parsed.data.scopes);
    const auditUser = toAuditUser(user);

    const created = await prisma.apiClient.create({
      data: {
        clientId,
        clientSecretHash,
        name: parsed.data.name,
        isBlocked: false,
        actingUserId: acting.id,
        scopes,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    const [mapped] = await attachActingUserNames([withUsers]);

    return {
      success: true,
      data: { ...mapped, clientSecret },
      message: 'API client created'
    };
  } catch (error: unknown) {
    console.error('createApiClient error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to create API client'
      }
    };
  }
}

export async function updateApiClient(
  id: string,
  payload: ApiClientUpdatePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ApiClientRecord;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid client ID' } };
    }

    const existing = await prisma.apiClient.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'API client not found' } };
    }

    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const acting = await resolveActingUser(parsed.data.actingUserId);
    if (!acting.ok) {
      return { success: false, error: { message: acting.message } };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.apiClient.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.isBlocked !== undefined
          ? { isBlocked: parsed.data.isBlocked }
          : {}),
        ...(parsed.data.scopes !== undefined
          ? { scopes: normalizeScopes(parsed.data.scopes) }
          : {}),
        actingUserId: acting.id,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    const [mapped] = await attachActingUserNames([withUsers]);
    return {
      success: true,
      data: mapped,
      message: 'API client updated'
    };
  } catch (error: unknown) {
    console.error('updateApiClient error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to update API client'
      }
    };
  }
}

export async function rotateApiClientSecret(
  id: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ApiClientRecord & { clientSecret: string };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid client ID' } };
    }
    const existing = await prisma.apiClient.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { message: 'API client not found' } };
    }

    const clientSecret = randomBytes(32).toString('hex');
    const clientSecretHash = await argon2.hash(clientSecret);
    const auditUser = toAuditUser(user);

    const updated = await prisma.apiClient.update({
      where: { id },
      data: {
        clientSecretHash,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    const [mapped] = await attachActingUserNames([withUsers]);
    return {
      success: true,
      data: { ...mapped, clientSecret },
      message: 'Client secret rotated'
    };
  } catch (error: unknown) {
    console.error('rotateApiClientSecret error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to rotate client secret'
      }
    };
  }
}

export async function deleteApiClient(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid client ID' } };
    }
    await prisma.apiClient.delete({ where: { id } });
    return { success: true, message: 'API client deleted' };
  } catch (error: unknown) {
    console.error('deleteApiClient error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to delete API client'
      }
    };
  }
}
