"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import * as argon2 from "argon2"
import * as crypto from "crypto"
import type { GetApiClientsQuery, GetApiClientsReturn, ApiClient } from "@/types/api-client"

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Must be less than 150 characters").trim(),
})

const updateSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Must be less than 150 characters").trim().optional(),
  isBlocked: z.boolean().optional(),
})

export type CreateApiClientPayload = z.infer<typeof createSchema>
export type UpdateApiClientPayload = z.infer<typeof updateSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaClient includes apiClient after generate
const prismaApiClient = (prisma as any).apiClient

function toApiClient(row: {
  id: string
  clientId: string
  name: string
  isBlocked: boolean
  createdAt: Date
  updatedAt: Date
}): ApiClient {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    isBlocked: row.isBlocked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
        select: {
          id: true,
          clientId: true,
          name: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
        },
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
      select: {
        id: true,
        clientId: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
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
    const { name } = parsed.data
    const clientId = crypto.randomUUID()
    const clientSecret = crypto.randomBytes(32).toString("hex")
    const clientSecretHash = await argon2.hash(clientSecret)

    const row = await prismaApiClient.create({
      data: { clientId, clientSecretHash, name, isBlocked: false },
      select: {
        id: true,
        clientId: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
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
    const row = await prismaApiClient.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        clientId: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
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
