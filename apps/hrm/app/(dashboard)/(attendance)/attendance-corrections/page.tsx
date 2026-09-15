import { redirect } from 'next/navigation';
import Link from 'next/link';
import { checkRouteAccess } from '@/lib/server-permissions';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { Button } from '@archmage/ui';

/**
 * Stub for the Attendance Corrections module.
 * Full CRUD UI ships in P4; RFID Attendance “Add Correction” links here.
 */
export default async function AttendanceCorrectionsPage() {
  const canView = await checkRouteAccess('/attendance-corrections');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Attendance Corrections"
        description="Manual corrections to daily attendance status. Raw RFID punches stay immutable."
        backwordButton
      />
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Corrections register and forms will be built in a later phase (P4).
          Use this entry point from RFID Attendance for now.
        </p>
        <Button type="button" variant="outline" className="mt-4" asChild>
          <Link href="/rfid-attendance">Back to RFID Attendance</Link>
        </Button>
      </div>
    </div>
  );
}
