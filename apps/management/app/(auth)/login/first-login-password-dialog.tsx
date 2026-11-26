'use client';

import { useState } from 'react';
import { Label, Input, CustomContentAlertDialog } from '@archmage/ui';
import { Eye, EyeOff } from 'lucide-react';
import { PASSWORD_REGEX, MIN_PASSWORD_LENGTH } from '@/lib/validations/password';

export type FirstLoginPasswordDialogProps = {
  open: boolean;
  email: string;
  onClose: () => void;
  onSuccess: (email: string, newPassword: string) => void;
};

export function FirstLoginPasswordDialog({ open, email, onClose, onSuccess }: FirstLoginPasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleClose = () => {
    if (!loading) { resetForm(); onClose(); }
  };

  const handleChangePassword = async () => {
    setError('');
    const curr = currentPassword.trim();
    const newP = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!curr) { setError('Please enter your current password.'); return; }
    if (!newP) { setError('Please enter a new password.'); return; }
    if (newP.length < MIN_PASSWORD_LENGTH || !PASSWORD_REGEX.test(newP)) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long and include uppercase, lowercase, number, special character, and no spaces.`);
      return;
    }
    if (newP !== conf) { setError('New password and confirmation do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword: curr, newPassword: newP }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? 'Could not change password. Try again.'); return; }
      resetForm();
      onClose();
      onSuccess(email, newP);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomContentAlertDialog
      open={open}
      title="Set a new password"
      description="You must set a new password before you can sign in."
      handleVisibilityChange={(value) => (value ? undefined : handleClose())}
      handleContinue={handleChangePassword}
      loading={loading}
      continueLabel="Change password & Login"
    >
      <div className="grid gap-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="first-login-current">Current password</Label>
          <div className="relative">
            <Input
              id="first-login-current"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter the password you were given"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onFocus={() => setError('')}
              className="pr-9"
              disabled={loading}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowCurrent((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="first-login-new">New password</Label>
          <div className="relative">
            <Input
              id="first-login-new"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setError('')}
              className="pr-9"
              disabled={loading}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowNew((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="first-login-confirm">Confirm new password</Label>
          <Input
            id="first-login-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setError('')}
            disabled={loading}
          />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    </CustomContentAlertDialog>
  );
}
