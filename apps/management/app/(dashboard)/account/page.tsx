import { Avatar, AvatarFallback } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { getUserTypeLabel } from '@/lib/roles';
import { Profile2FADialogContent } from '../profile-2fa-dialog';
import { AccountActions } from './account-actions';

export default async function AccountPage() {
  const session = await fetchServerSession();
  const user = session?.user;
  const initial = (user?.name?.trim() || user?.email?.trim() || 'U').charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary/10 text-xl font-medium text-primary">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user?.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user?.email}
            {user?.userType != null && ` · ${getUserTypeLabel(user.userType)}`}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="mb-4 font-semibold">Profile & security</h2>
        <Profile2FADialogContent />
      </section>

      <AccountActions />

      <p className="text-center text-xs text-muted-foreground">Version {process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}</p>
    </div>
  );
}
