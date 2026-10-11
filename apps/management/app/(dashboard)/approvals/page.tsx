import { isChannelingUserApiConfigured } from '@/lib/channeling-user-api';
import { ApprovalsContent } from './approvals-content';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;

  if (!isChannelingUserApiConfigured()) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Approvals are not connected yet. Set CHANNELING_API_URL and MANAGEMENT_APP_JWT_SECRET.
      </div>
    );
  }

  return <ApprovalsContent initialId={id ?? null} />;
}
