'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/hooks/use-toast';
import { Smartphone, ShieldCheck, Copy, Check, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type SetupStep = 'idle' | 'show-qr' | 'verify';

export function SecurityPageClient() {
  const { toast } = useToast();
  const [hasAuthenticator, setHasAuthenticator] = useState<boolean | null>(null);
  const [groupRequires2FA, setGroupRequires2FA] = useState(false);
  const [require2FAAtLogin, setRequire2FAAtLogin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [setupData, setSetupData] = useState<{ uri: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa-status');
      const data = await res.json();
      if (res.ok) {
        setHasAuthenticator(!!data.hasAuthenticator);
        setGroupRequires2FA(!!data.groupRequires2FA);
        setRequire2FAAtLogin(data.require2FAAtLogin !== false);
      }
    } catch {
      setHasAuthenticator(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup-2fa', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to start setup');
      setSetupData({ uri: data.uri, secret: data.secret });
      setSetupStep('show-qr');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message ?? 'Could not start setup' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    toast({ title: 'Copied', description: 'Secret copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    const code = verifyCode.trim();
    if (!code || code.length !== 6) {
      toast({ variant: 'destructive', title: 'Invalid code', description: 'Enter the 6-digit code from your app' });
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-2fa-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Verification failed');
      toast({ title: 'Success', description: 'Authenticator app is set up. You can use it at login when your group requires 2FA.' });
      setSetupStep('idle');
      setSetupData(null);
      setVerifyCode('');
      fetchStatus();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message ?? 'Invalid code' });
    } finally {
      setVerifying(false);
    }
  };

  const handleBackFromSetup = () => {
    setSetupStep('idle');
    setSetupData(null);
    setVerifyCode('');
  };

  const formatSecret = (secret: string) => {
    return secret.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleRequire2FAToggle = async (checked: boolean) => {
    if (!groupRequires2FA) return;
    setPreferenceSaving(true);
    try {
      const res = await fetch('/api/auth/2fa-preference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require2FA: checked })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to update');
      setRequire2FAAtLogin(!!data.require2FAAtLogin);
      toast({
        title: checked ? '2FA required at login' : '2FA not required',
        description: checked
          ? 'You will be asked for a verification code when you sign in.'
          : 'You can sign in without a code until you turn this back on.'
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message ?? 'Could not update preference' });
    } finally {
      setPreferenceSaving(false);
    }
  };

  if (loading && hasAuthenticator === null) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupRequires2FA && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Require 2FA at login</CardTitle>
            </div>
            <CardDescription>
              Your group has 2FA enabled. You can turn this off for your account to sign in without a code (e.g. until you set up an authenticator app), then turn it back on when you&apos;re ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Ask for verification code when I sign in</p>
                <p className="text-sm text-muted-foreground">
                  {require2FAAtLogin ? '2FA is required for your account.' : '2FA is off — you can sign in with just your password.'}
                </p>
              </div>
              <Switch
                checked={require2FAAtLogin}
                onCheckedChange={handleRequire2FAToggle}
                disabled={preferenceSaving}
              />
            </div>
          </CardContent>
        </Card>
      )}

    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Authenticator app</CardTitle>
        </div>
        <CardDescription>
          Use an authenticator app (e.g. Google Authenticator, Authy) to get a verification code when your group requires 2FA at login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasAuthenticator && setupStep === 'idle' && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30 p-4">
            <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Authenticator app is set up</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                You will be asked for a code from your app when you sign in and your group has 2FA enabled.
              </p>
            </div>
          </div>
        )}

        {!hasAuthenticator && setupStep === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up an authenticator app so you can use it as a 2FA method at login. You will scan a QR code or enter a code into your app.
            </p>
            <Button onClick={handleStartSetup} disabled={loading}>
              Set up authenticator app
            </Button>
          </div>
        )}

        {setupStep === 'show-qr' && setupData && (
          <div className="space-y-6">
            <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
            <div className="flex justify-center rounded-lg border bg-white p-4 dark:bg-muted/30">
              <QRCodeSVG value={setupData.uri} size={200} level="M" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Can&apos;t scan? Enter this code manually</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono tracking-wider break-all">
                  {formatSecret(setupData.secret)}
                </code>
                <Button type="button" variant="outline" size="icon" onClick={handleCopySecret} aria-label="Copy secret">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              After adding the account in your app, click below and enter the 6-digit code to confirm.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setSetupStep('verify')}>I&apos;ve added the app — verify</Button>
              <Button type="button" variant="ghost" onClick={handleBackFromSetup}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {setupStep === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-code">Enter the 6-digit code from your app</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono text-lg tracking-widest w-32"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerify} disabled={verifying || verifyCode.length !== 6}>
                {verifying ? 'Verifying…' : 'Verify and finish'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSetupStep('show-qr')}>
                Back
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
