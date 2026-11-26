import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';

export default async function UnauthorizedAccessPage() {
  const session = await fetchServerSession();
  if (!session?.user) redirect('/login');

  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have permission to open this page. Ask an administrator to update your DPAY user group.
        </p>
        <Button asChild>
          <Link href="/welcome">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
