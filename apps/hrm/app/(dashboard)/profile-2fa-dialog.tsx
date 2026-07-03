'use client';

import { useEffect, useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Input,
  Label,
  useToast,
} from '@archmage/ui';
import { changeOwnPassword } from '@/app/actions/user.actions';
import { TwoFASettings } from './two-fa-settings';
import { KeyRound, User } from 'lucide-react';

type Profile = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  userType: number;
};

export function Profile2FADialogContent() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setProfileLoading(true);
    fetch('/api/account/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, []);

  const userTypeLabel = (userType: number) => (userType === 1 ? 'Admin' : 'Staff');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await changeOwnPassword(currentPassword, newPassword);
      if (result.isError) {
        toast({ variant: 'destructive', title: 'Error', description: (result.errors as { message?: string })?.message ?? 'Failed to change password.' });
        return;
      }
      toast({ title: 'Success', description: 'Your password was changed successfully.' });
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message ?? 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="profile" className="gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="2fa">2FA</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-6 mt-0">
        {profileLoading ? (
          <div className="flex flex-col items-center">
            <User className="w-10 h-10 animate-pulse text-muted-foreground" />
            <p className="text-sm text-muted-foreground py-4">Loading profile…</p>
          </div>
        ) : profile ? (
          <>
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">
                Your details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground block">Full name</span>
                  <span className="font-medium">{profile.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email</span>
                  <span className="font-medium">{profile.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Username</span>
                  <span className="font-medium">{profile.username || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Phone</span>
                  <span className="font-medium">{profile.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">User type</span>
                  <span className="font-medium">{userTypeLabel(profile.userType)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                To change any of these details, contact your administrator.
              </p>
            </section>

            <section className="space-y-3 pt-2 border-t">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">
                Password
              </h3>
              {!showChangePassword ? (
                <Button type="button" variant="outline" className="gap-2" onClick={() => setShowChangePassword(true)}>
                  <KeyRound className="h-4 w-4" />
                  Change password
                </Button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters, with uppercase, lowercase, numbers and special characters.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={passwordSaving}>
                      {passwordSaving ? 'Saving…' : 'Update password'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowChangePassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4">Could not load profile.</p>
        )}
      </TabsContent>

      <TabsContent value="2fa" className="mt-0">
        <TwoFASettings />
      </TabsContent>
    </Tabs>
  );
}
