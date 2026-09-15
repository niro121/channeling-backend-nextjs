'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { LogOut, ShieldAlert } from 'lucide-react';

export default function SessionEndedPage() {
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
              <ShieldAlert className="h-10 w-10 text-amber-700 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Session ended</CardTitle>
          <CardDescription className="text-base">
            You were signed out because this account signed in from another
            place. Only one active login is allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-8">
          <p className="text-center text-sm text-muted-foreground">
            Click OK to continue to the login page.
          </p>
          <Button
            className="w-full max-w-xs gap-2"
            disabled={loading}
            onClick={handleOk}
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Signing out…' : 'OK'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
