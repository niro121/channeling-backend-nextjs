'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SignOutButton from '@/components/common/signout-btn';
import { useSession } from 'next-auth/react';
import { CustomDialog } from '@/components/common/custom-dialog';
import { Profile2FADialogContent } from '@/app/_account/profile-2fa-dialog';
import { UserCircle, Wallet } from 'lucide-react';

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

  return (
    <>
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
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem>
              <SignOutButton />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <a href="/login">Sign In</a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
