'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notification.service';

/** Get unread count for the current user. */
export async function getUnreadNotificationCountAction(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 0;
  return getUnreadNotificationCount(session.user.id);
}

/** List notifications for the current user. */
export async function getNotificationsAction(options: { limit?: number; offset?: number } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { items: [], total: 0 };
  return getNotifications(session.user.id, options);
}

/** Mark one notification as read. */
export async function markNotificationReadAction(notificationId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  const ok = await markNotificationRead(notificationId, session.user.id);
  if (ok) revalidatePath('/notifications');
  return ok;
}

/** Mark all notifications as read for the current user. */
export async function markAllNotificationsReadAction(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return 0;
  const count = await markAllNotificationsRead(session.user.id);
  if (count > 0) revalidatePath('/notifications');
  return count;
}
