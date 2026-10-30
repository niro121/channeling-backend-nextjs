import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  getStaffByIdAction,
  getStaffEmploymentFormOptionsAction
} from '@/app/actions/staff-actions/staff.actions';
import { getStaffSpecialityOptionsAction } from '@/app/actions/hr-admin-actions/staff-speciality.actions';
import { getPublishedZoneOptionsAction } from '@/app/actions/organization-actions/zone.actions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkPermission } from '@/lib/server-permissions';
import TabLayout from '../../tab-layout';

type EditStaffPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditStaffPage({ params }: EditStaffPageProps) {
  const canEdit = await checkPermission('staff', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'staff.visited',
      entityType: 'Staff',
      entityId: id,
      importance: 'low'
    });
  }

  const response = await getStaffByIdAction(id);

  if (response.isError || !response.data) {
    notFound();
  }

  const selectedIds = response.data.hrDetails?.specialityIds ?? [];
  const [optionsRes, zonesRes, employmentOptsRes] = await Promise.all([
    getStaffSpecialityOptionsAction({
      activeOnly: true,
      includeIds: selectedIds
    }),
    getPublishedZoneOptionsAction(response.data.hrDetails?.zoneCode),
    getStaffEmploymentFormOptionsAction()
  ]);
  const specialityOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);
  const zoneOptions = zonesRes.isError ? [] : (zonesRes.data ?? []);
  const employmentFormOptions = employmentOptsRes.isError
    ? {
        departments: [],
        designations: [],
        grades: [],
        rosters: []
      }
    : (employmentOptsRes.data ?? {
        departments: [],
        designations: [],
        grades: [],
        rosters: []
      });

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Edit Staff"
        description="Update staff member details."
        backwordButton={true}
      />
      <TabLayout
        staff={response.data}
        staffId={id}
        isEditPage
        specialityOptions={specialityOptions}
        zoneOptions={zoneOptions}
        employmentFormOptions={employmentFormOptions}
      />
    </div>
  );
}
