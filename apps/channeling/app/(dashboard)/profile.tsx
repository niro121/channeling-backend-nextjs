'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { dispatchSignOutRequested } from '@/app/(dashboard)/signout-shift-reminder';
import { useSession } from 'next-auth/react';
import { CustomDialog } from '@/components/common/custom-dialog';
import { Profile2FADialogContent } from '@/app/_account/profile-2fa-dialog';
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notification.actions';
import type { NotificationListItem } from '@/services/notification.service';
import { NOTIFICATION_TYPES } from '@/types/notification';
import { UserCircle, Wallet, Bell, FileText, Loader2, CheckSquare } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';

function getInitial(name?: string | null, email?: string | null): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (email?.trim()) return email.trim().charAt(0).toUpperCase();
  return 'U';
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

export function Profile() {
  const { data: session } = useSession();
  const user = session?.user;
  const initial = getInitial(user?.name ?? null, user?.email ?? null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationListItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshUnreadCount = useCallback((): Promise<void> => {
    if (!session?.user?.id) {
      setUnreadCount(0);
      return Promise.resolve();
    }
    const url = `/api/notifications/unread-count?t=${Date.now()}`;
    return fetch(url, { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { count?: number }) => {
        const count = Number(data?.count) ?? 0;
        if (process.env.NODE_ENV === 'development') {
          console.log('[Notifications] unread count API response:', { count, raw: data });
        }
        setUnreadCount(count);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Notifications] unread count fetch failed:', err);
        }
        setUnreadCount(0);
      });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setUnreadCount(0);
      return;
    }
    refreshUnreadCount();
  }, [session?.user?.id, pathname, refreshUnreadCount]);

  useEffect(() => {
    const onFocus = () => session?.user?.id && refreshUnreadCount();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [session?.user?.id, refreshUnreadCount]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 20_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, refreshUnreadCount]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (typeof window === 'undefined' || !userId) return;

    const socket: Socket = io(window.location.origin, {
      path: '/socket.io',
      addTrailingSlash: false,
    });
    const subscribe = () => socket.emit('notification:subscribe', { userId });
    if (socket.connected) subscribe();
    else socket.once('connect', subscribe);

    const onNotificationUpdate = () => {
      refreshUnreadCount();
    };
    socket.on('notification-update', onNotificationUpdate);

    return () => {
      socket.emit('notification:unsubscribe', { userId });
      socket.off('notification-update', onNotificationUpdate);
      socket.disconnect();
    };
  }, [session?.user?.id, refreshUnreadCount]);

  async function handleNotificationsOpenChange(open: boolean) {
    setNotificationsOpen(open);
    if (open) {
      setNotificationsLoading(true);
      try {
        await markAllNotificationsReadAction();
        await refreshUnreadCount();
        const res = await getNotificationsAction({ limit: 10 });
        setNotificationItems(res.items);
      } finally {
        setNotificationsLoading(false);
      }
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Bell when there are unread notifications or when the panel is open (so panel stays visible after marking read). */}
        {mounted && (unreadCount > 0 || notificationsOpen) && (
          <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`relative rounded-full p-1.5 transition-colors hover:bg-muted ${
                  unreadCount > 0 ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white px-1 shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
              <div className="border-b border-border px-4 py-3">
                <h3 className="font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="max-h-[min(60vh,400px)] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notificationItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No notifications
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {notificationItems.map((item) => {
                      const isUnread = !item.readAt;
                      return (
                        <li key={item.id}>
                          <div className="flex gap-3 px-4 py-3">
                            <div className="relative shrink-0">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                {getNotificationIcon(item.type)}
                              </div>
                              {isUnread && (
                                <span
                                  className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.title}
                              </p>
                              {item.message && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {item.message}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(item.createdAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="border-t border-border px-4 py-2">
                <Link
                  href="/notifications"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setNotificationsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full h-9 w-9"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? 'Profile'} />
                <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setProfileDialogOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <UserCircle className="h-4 w-4" />
              Profile & 2FA
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-till" className="gap-2 cursor-pointer">
                <Wallet className="h-4 w-4" />
                My Till
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="gap-2 cursor-pointer">
                <Bell className="h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem onSelect={() => dispatchSignOutRequested()}>
              Sign Out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <a href="/login">Sign In</a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      <CustomDialog
        open={profileDialogOpen}
        setOpen={setProfileDialogOpen}
        title="Profile & 2FA"
      >
        <Profile2FADialogContent />
      </CustomDialog>
    </>
  );
}
