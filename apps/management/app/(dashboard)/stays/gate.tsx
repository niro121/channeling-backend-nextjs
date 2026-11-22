import { isChannelingUserApiConfigured } from '@/lib/channeling-user-api';
import { getManagementFeatures, type ManagementFeatures } from '@/lib/management-access';

/** Shared "not connected / no access" screens for the stays pages. Returns null when the user may continue. */
export async function staysGate(need: (f: ManagementFeatures['roomStays']) => boolean = (f) => f.view) {
  if (!isChannelingUserApiConfigured()) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Check-in is not connected yet. Set CHANNELING_API_URL and MANAGEMENT_APP_JWT_SECRET.
      </div>
    );
  }
  const features = await getManagementFeatures();
  if (!need(features.roomStays)) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have access to this. Ask an admin for the Room Check-in / Check-out privilege.
      </div>
    );
  }
  return null;
}
