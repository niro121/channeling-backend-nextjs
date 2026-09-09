"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import * as argon2 from "argon2"
import * as crypto from "crypto"
import type { GetApiClientsQuery, GetApiClientsReturn, ApiClient } from "@/types/api-client"
import { userTypes } from "@/lib/roles"

const actingUserIdSchema = z
  .string()
  .min(1, "User is required")
  .regex(/^[a-f\d]{24}$/i, "User is required")

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Must be less than 150 characters").trim(),
  actingUserId: actingUserIdSchema,
})

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Must be less than 150 characters").trim().optional(),
  isBlocked: z.boolean().optional(),
  actingUserId: actingUserIdSchema,
})

export type CreateApiClientPayload = z.infer<typeof createSchema>
export type UpdateApiClientPayload = z.infer<typeof updateSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaClient includes apiClient after generate
const prismaApiClient = (prisma as any).apiClient

const apiClientSelect = {
  id: true,
  clientId: true,
  name: true,
  isBlocked: true,
  actingUserId: true,
  actingUser: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const

function toApiClient(row: {
  id: string
  clientId: string
  name: string
  isBlocked: boolean
  actingUserId: string
  actingUser: { id: string; name: string }
  createdAt: Date
  updatedAt: Date
}): ApiClient {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    isBlocked: row.isBlocked,
    actingUserId: row.actingUserId,
    actingUserName: row.actingUser.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function resolveActingUserId(
  actingUserId: string
): Promise<{ ok: true; value: string } | { ok: false; message: string }> {
  const trimmed = actingUserId?.trim()
  if (!trimmed) return { ok: false, message: "User is required" }
  const user = await prisma.user.findUnique({
    where: { id: trimmed },
    select: { id: true, userType: true, status: true },
  })
  if (!user) return { ok: false, message: "User not found" }
  if (user.userType !== userTypes.apiUser) {
    return { ok: false, message: "Selected user must be API User type" }
  }
  if (user.status !== 1) {
    return { ok: false, message: "Selected user must be active" }
  }
  return { ok: true, value: trimmed }
}

export async function getApiClientUserOptionsService(): Promise<
  { success: true; data: { id: string; name: string }[] } | { success: false; message: string }
> {
  try {
    const users = await prisma.user.findMany({
      where: { status: 1, userType: userTypes.apiUser },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })
    return { success: true, data: users }
  } catch (e) {
    console.error("getApiClientUserOptionsService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load users",
    }
  }
}

export async function getApiClientsService(
  query: GetApiClientsQuery
): Promise<{ success: true; data: ApiClient[]; totalRecords: number } | { success: false; message: string }> {
  try {
    const { page = 0, limit = 10, keyword = "" } = query
    const skip = page * limit
    const where = keyword.trim()
      ? { name: { contains: keyword.trim() } }
      : {}

    const [records, total] = await Promise.all([
      prismaApiClient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: apiClientSelect,
      }),
      prismaApiClient.count({ where }),
    ])

    return {
      success: true,
      data: records.map(toApiClient),
      totalRecords: total,
    }
  } catch (e) {
    console.error("getApiClientsService error", e)
    return { success: false, message: e instanceof Error ? e.message : "Failed to fetch API clients" }
  }
}

export async function getApiClientByIdService(
  id: string
): Promise<{ success: true; data: ApiClient } | { success: false; message: string; code?: string }> {
  try {
    const row = await prismaApiClient.findUnique({
      where: { id },
      select: apiClientSelect,
    })
    if (!row) return { success: false, message: "API client not found", code: "NOT_FOUND" }
    return { success: true, data: toApiClient(row) }
  } catch (e) {
    console.error("getApiClientByIdService error", e)
    return { success: false, message: e instanceof Error ? e.message : "Failed to fetch API client" }
  }
}

export async function createApiClientService(
  payload: CreateApiClientPayload
): Promise<
  | { success: true; data: ApiClient & { clientSecret: string } }
  | { success: false; message: string; error?: { issues: Record<string, string[]> } }
> {
  const parsed = createSchema.safeParse(payload)
  if (!parsed.success) {
    const issues: Record<string, string[]> = {}
    parsed.error.flatten().fieldErrors &&
      Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
        issues[k] = (v ?? []) as string[]
      })
    return { success: false, message: "Validation failed", error: { issues } }
  }

  try {
    const { name, actingUserId: actingUserIdRaw } = parsed.data
    const actingResolved = await resolveActingUserId(actingUserIdRaw)
    if (!actingResolved.ok) {
      return { success: false, message: actingResolved.message }
    }

    const clientId = crypto.randomUUID()
    const clientSecret = crypto.randomBytes(32).toString("hex")
    const clientSecretHash = await argon2.hash(clientSecret)

    const row = await prismaApiClient.create({
      data: {
        clientId,
        clientSecretHash,
        name,
        isBlocked: false,
        actingUserId: actingResolved.value,
      },
      select: apiClientSelect,
    })

    return {
      success: true,
      data: { ...toApiClient(row), clientSecret },
    }
  } catch (e) {
    console.error("createApiClientService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to create API client",
    }
  }
}

export async function updateApiClientService(
  id: string,
  payload: UpdateApiClientPayload
): Promise<
  | { success: true; data: ApiClient }
  | { success: false; message: string; error?: { issues: Record<string, string[]> }; code?: string }
> {
  const parsed = updateSchema.safeParse(payload)
  if (!parsed.success) {
    const issues: Record<string, string[]> = {}
    parsed.error.flatten().fieldErrors &&
      Object.entries(parsed.error.flatten().fieldErrors).forEach(([k, v]) => {
        issues[k] = (v ?? []) as string[]
      })
    return { success: false, message: "Validation failed", error: { issues } }
  }

  try {
    const { actingUserId: actingUserIdRaw, ...rest } = parsed.data
    const actingResolved = await resolveActingUserId(actingUserIdRaw)
    if (!actingResolved.ok) {
      return { success: false, message: actingResolved.message }
    }

    const row = await prismaApiClient.update({
      where: { id },
      data: { ...rest, actingUserId: actingResolved.value },
      select: apiClientSelect,
    })
    return { success: true, data: toApiClient(row) }
  } catch (e: unknown) {
    const isNotFound =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025"
    if (isNotFound) return { success: false, message: "API client not found", code: "NOT_FOUND" }
    console.error("updateApiClientService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to update API client",
    }
  }
}

export async function deleteApiClientByIdService(
  id: string
): Promise<{ success: true } | { success: false; message: string; code?: string }> {
  try {
    await prismaApiClient.delete({ where: { id } })
    return { success: true }
  } catch (e: unknown) {
    const isNotFound =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025"
    if (isNotFound) return { success: false, message: "API client not found", code: "NOT_FOUND" }
    console.error("deleteApiClientByIdService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to delete API client",
    }
  }
}
