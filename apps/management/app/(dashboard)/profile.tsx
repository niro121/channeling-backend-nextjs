'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  CustomDialog,
} from '@archmage/ui';
import { useSession, signOut } from 'next-auth/react';
import { UserCircle } from 'lucide-react';
import { Profile2FADialogContent } from './profile-2fa-dialog';

function getInitial(name?: string | null, email?: string | null): string {
  if (name?.trim()) return name.trim().charAt(0).toUpperCase();
  if (email?.trim()) return email.trim().charAt(0).toUpperCase();
  return 'U';
}

export function Profile() {
  const { data: session } = useSession();
  const user = session?.user;
  const initial = getInitial(user?.name ?? null, user?.email ?? null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="shrink-0 h-9 w-9" aria-hidden />;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="overflow-hidden rounded-full h-9 w-9">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">{initial}</AvatarFallback>
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
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/login' })}>
              Sign Out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <a href="/login">Sign In</a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomDialog open={profileDialogOpen} setOpen={setProfileDialogOpen} title="Profile & 2FA">
        <Profile2FADialogContent />
      </CustomDialog>
    </>
  );
}
