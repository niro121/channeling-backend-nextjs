import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';

export default async function LeaveManagementPage() {
  const canView = await checkRouteAccess('/leave-management');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Leave Management"
        description="Review and manage employee leave requests."
      />
      {/* TODO: Leave management UI */}
      <div className="min-h-40 rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        Leave management placeholder
      </div>
    </div>
  );
}
