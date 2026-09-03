'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notification.actions';
import type { NotificationListItem } from '@/services/notification.service';
import { NOTIFICATION_TYPES, REFERENCE_TYPES } from '@/types/notification';
import { Bell, CheckCheck, Loader2, Wallet, FileText, Inbox, CheckSquare } from 'lucide-react';

function formatDate(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getNotificationHref(item: NotificationListItem): string | null {
  if (item.referenceType === REFERENCE_TYPES.ShiftHandover && item.referenceId) {
    return `/handovers/${item.referenceId}`;
  }
  if (item.referenceType === REFERENCE_TYPES.FloatRequest && item.referenceId) {
    if (
      item.type === NOTIFICATION_TYPES.FloatRequested ||
      item.type === NOTIFICATION_TYPES.FloatCancelled
    ) {
      return '/bulk-cashier';
    }
    return '/channel-booking';
  }
  if (item.referenceType === REFERENCE_TYPES.ApprovalRequest) {
    return "/approvals";
  }
  return null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case NOTIFICATION_TYPES.FloatRequested:
    case NOTIFICATION_TYPES.FloatApproved:
    case NOTIFICATION_TYPES.FloatRejected:
    case NOTIFICATION_TYPES.FloatCancelled:
      return <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case NOTIFICATION_TYPES.HandoverSubmitted:
    case NOTIFICATION_TYPES.HandoverApproved:
    case NOTIFICATION_TYPES.HandoverRejected:
    case NOTIFICATION_TYPES.HandoverCancelled:
      return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case NOTIFICATION_TYPES.ApprovalRequested:
    case NOTIFICATION_TYPES.ApprovalApproved:
    case NOTIFICATION_TYPES.ApprovalRejected:
    case NOTIFICATION_TYPES.ApprovalWithdrawn:
      return <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />;
    default:
      return <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

export function NotificationsContent() {
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getNotificationsAction({ limit: 50 });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkAsRead(id: string) {
    await markNotificationReadAction(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const count = await markAllNotificationsReadAction();
      if (count > 0) {
        setItems((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() }))
        );
      }
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = items.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No notifications yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Float, handover, and approval updates will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {unreadCount > 0 && (
          <div className="flex items-center justify-end border-b border-border px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="gap-1"
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </Button>
          </div>
        )}
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const href = getNotificationHref(item);
            const isUnread = !item.readAt;
            const content = (
              <>
                <div className="flex gap-3 shrink-0 mt-0.5">
                  {getNotificationIcon(item.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={
                          isUnread
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }
                      >
                        {item.title}
                      </p>
                      <Badge
                        variant={isUnread ? 'default' : 'secondary'}
                        className={
                          isUnread
                            ? 'text-[10px] font-normal'
                            : 'text-[10px] font-normal text-muted-foreground'
                        }
                      >
                        {isUnread ? 'Unread' : 'Read'}
                      </Badge>
                    </div>
                    {item.message && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {item.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              </>
            );
            return (
              <li key={item.id}>
                {href ? (
                  <Link
                    href={href}
                    className={`flex px-4 py-3 hover:bg-muted/50 transition-colors ${
                      isUnread ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleMarkAsRead(item.id)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    className={`flex items-start justify-between gap-2 px-4 py-3 ${isUnread ? 'bg-muted/30' : ''}`}
                  >
                    <div className="min-w-0 flex-1">{content}</div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleMarkAsRead(item.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
