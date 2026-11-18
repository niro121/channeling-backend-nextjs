import { isChannelingUserApiConfigured } from '@/lib/channeling-user-api';
import { getManagementFeatures } from '@/lib/management-access';
import { RoomsContent } from './rooms-content';

export const dynamic = 'force-dynamic';

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ locationId?: string }> }) {
  if (!isChannelingUserApiConfigured()) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Rooms are not connected yet. Set CHANNELING_API_URL and MANAGEMENT_APP_JWT_SECRET.
      </div>
    );
  }

  const features = await getManagementFeatures();
  if (!features.roomInventory.view) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have access to room inventory. Ask an admin for the Room Inventory privilege.
      </div>
    );
  }

  const { locationId } = await searchParams;
  return <RoomsContent initialLocationId={locationId ?? null} />;
}
