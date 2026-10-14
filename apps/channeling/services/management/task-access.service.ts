import "server-only"
import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { isDashboardLoginUserType, userTypes } from "@/lib/roles"
import { MANAGEMENT_APP_ACCESS, MANAGEMENT_APP_RESOURCE, type ManagementActor } from "@/lib/management-app-auth"
import { createNotification } from "@/services/notification.service"
import { REFERENCE_TYPES } from "@/types/notification"
import type { Permissions } from "@/types/user-group"

/**
 * Task Manager privileges for the management app. Tasks themselves live in the management DB;
 * channeling only decides who may do what (group privileges) and delivers notifications.
 */
export const MANAGEMENT_TASKS_RESOURCE = "management-tasks"

export type TaskPermissions = {
  view: boolean
  create: boolean
  recurring: boolean
  manageAll: boolean
}

export function taskPermissionsFor(isAdmin: boolean, permissions: Permissions | null): TaskPermissions {
  if (isAdmin) return { view: true, create: true, recurring: true, manageAll: true }
  const can = (action: string) => hasPermission(permissions, MANAGEMENT_TASKS_RESOURCE, action)
  // Every other task privilege implies using tasks at all
  const create = can("create")
  const recurring = can("recurring")
  const manageAll = can("manage-all")
  return { view: can("view") || create || recurring || manageAll, create, recurring, manageAll }
}

export function actorTaskPermissions(actor: ManagementActor): TaskPermissions {
  return taskPermissionsFor(actor.isAdmin, actor.permissions)
}

export type TaskPerson = { id: string; name: string; email: string }

/** Active staff who can open the management app and use tasks — the people a task can be assigned to. */
export async function listTaskPeople(): Promise<TaskPerson[]> {
  const users = await prisma.user.findMany({
    where: { status: 1, userType: { in: [userTypes.admin, userTypes.staff] } },
    select: { id: true, name: true, email: true, userType: true, userGroup: { select: { permissions: true } } },
    orderBy: { name: "asc" },
  })
  return users
    .filter((u) => {
      if (!isDashboardLoginUserType(u.userType)) return false
      const permissions = (u.userGroup?.permissions as Permissions | null) ?? null
      const isAdmin = u.userType === userTypes.admin
      const appAccess = isAdmin || hasPermission(permissions, MANAGEMENT_APP_RESOURCE, MANAGEMENT_APP_ACCESS)
      return appAccess && taskPermissionsFor(isAdmin, permissions).view
    })
    .map((u) => ({ id: u.id, name: u.name, email: u.email }))
}

const TASK_NOTIFICATION_TYPES = new Set([
  "task_assigned",
  "task_unassigned",
  "task_status",
  "task_comment",
  "task_due_soon",
  "task_overdue",
  "task_updated",
])

/**
 * In-app notification (+ phone push via the push worker) for task events. Recipients must be
 * people who can use tasks, so a management user can't message arbitrary channeling users.
 */
export async function sendTaskNotifications(input: {
  recipientIds: string[]
  type: string
  title: string
  message?: string | null
  taskId: string
}): Promise<{ sent: number }> {
  if (!TASK_NOTIFICATION_TYPES.has(input.type)) throw new Error("Unknown task notification type")
  if (!/^[a-f0-9]{24}$/i.test(input.taskId)) throw new Error("Invalid task id")
  const wanted = new Set(input.recipientIds)
  if (wanted.size === 0) return { sent: 0 }
  const allowed = (await listTaskPeople()).filter((p) => wanted.has(p.id))
  await Promise.all(
    allowed.map((p) =>
      createNotification({
        userId: p.id,
        type: input.type,
        title: input.title.slice(0, 160),
        message: input.message?.slice(0, 500) ?? null,
        referenceType: REFERENCE_TYPES.ManagementTask,
        referenceId: input.taskId,
      })
    )
  )
  return { sent: allowed.length }
}

const UNREAD = { OR: [{ readAt: null }, { readAt: { isSet: false } }] }

/** The management app's bell: this user's task notifications, newest first. */
export async function listTaskNotifications(userId: string, limit = 30) {
  const where = { userId, referenceType: REFERENCE_TYPES.ManagementTask }
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
      select: { id: true, type: true, title: true, message: true, referenceId: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { ...where, ...UNREAD } }),
  ])
  return { items, unread }
}

/** Mark read: one task's notifications (when the task is opened), or all task notifications. */
export async function markTaskNotificationsRead(userId: string, taskId?: string | null): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      referenceType: REFERENCE_TYPES.ManagementTask,
      ...(taskId ? { referenceId: taskId } : {}),
      ...UNREAD,
    },
    data: { readAt: new Date() },
  })
  return result.count
}
