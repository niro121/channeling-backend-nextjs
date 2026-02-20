import { fetchServerSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { SecurityPageClient } from './security-page-client';

export default async function AccountSecurityPage() {
  const session = await fetchServerSession();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account security</h2>
        <p className="text-muted-foreground">
          Manage two-factor authentication and sign-in security.
        </p>
      </div>
      <SecurityPageClient />
    </div>
  );
}
