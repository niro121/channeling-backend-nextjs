import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUnreadNotificationCount } from '@/services/notification.service';
import prisma from '@/lib/prisma';

const DEBUG = process.env.NODE_ENV === 'development';

/** GET: returns unread notification count for the current user. Uses getToken(req) so session is read from request cookies in Route Handler. */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET ?? (DEBUG ? 'development-secret-key-change-in-production' : undefined),
    });
    const userId = token?.sub ?? null;

    if (DEBUG) {
      console.log('[notifications/unread-count]', {
        hasToken: !!token,
        userId: userId ?? 'none',
      });
    }

    if (!userId) {
      return NextResponse.json(
        { count: 0 },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
      );
    }

    const count = await getUnreadNotificationCount(userId);

    if (DEBUG) {
      const sample = await prisma.notification.findMany({
        where: { userId },
        select: { id: true, readAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      console.log('[notifications/unread-count]', {
        userId,
        count,
        sample: sample.map((s) => ({ id: s.id, readAt: s.readAt?.toISOString() ?? null })),
      });
    }

    return NextResponse.json(
      { count },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('GET /api/notifications/unread-count error:', e);
    return NextResponse.json(
      { count: 0 },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  }
}
