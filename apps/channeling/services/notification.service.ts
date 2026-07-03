'use server';

import prisma from '@/lib/prisma';
import type { NotificationCreateInput } from '@/types/notification';

/** Create a notification for a user (non-blocking; used after float/handover actions). */
export async function createNotification(input: NotificationCreateInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        readAt: null, // explicit so MongoDB has the field; unread until marked read
      },
    });
  } catch (e) {
    console.error('createNotification error:', e);
  }
}

/** Get unread notification count for a user. In MongoDB, documents created without readAt have the field missing; we count both null and missing as unread. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const list = await prisma.notification.findMany({
    where: { userId },
    select: { readAt: true },
  });
  return list.filter((n) => n.readAt == null).length;
}

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  referenceType: string | null;
  referenceId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** List notifications for a user (newest first), with optional limit. */
export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: NotificationListItem[]; total: number }> {
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        referenceType: true,
        referenceId: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    items: items as NotificationListItem[],
    total,
  };
}

/** Mark a single notification as read. */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  return updated.count > 0;
}

/** Mark all notifications for a user as read. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
