import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { LOCATION_OPTIONS } from '@/types/location';
import { SEX_OPTIONS } from '@/types/channel-booking';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import { BOOKING_METHODS } from '@/types/channel-booking';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import ChannelBookingsReportContent from './channel-bookings-report-content';
import { STATUS_OPTIONS, REFUND_STATUS_OPTIONS, DATE_TYPE_OPTIONS } from '@/types/reports/channel-bookings';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function ChannelBookingsReportPage() {
  const canView = await checkRouteAccess('/reports/channel-bookings');
  if (!canView) redirect('/unauthorized-access');

  const [
    session,
    doctorRef,
    locRef,
    deptRef,
    specRef,
    areaRef,
    agencyRef,
  ] = await Promise.all([
    fetchServerSession(),
    getReportFilterOptions({ doctors: true }),
    getReportFilterOptions({ locations: true }),
    getReportFilterOptions({ departments: true }),
    getReportFilterOptions({ specialities: true }),
    getReportFilterOptions({ areas: true }),
    getReportFilterOptions({ agencies: true }),
  ]);

  const currentUser =
    session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : null;
  const currentUserName = formatUserDisplayName(
    currentUser?.name ?? session?.user?.name,
    currentUser?.id ?? session?.user?.id,
    currentUser?.staff?.code
  );

  const doctorOptions: Array<{ id: string; name: string }> =
    doctorRef.success && doctorRef.doctorOptions
      ? doctorRef.doctorOptions
      : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locRef.success && locRef.locationOptions
      ? locRef.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    deptRef.success && deptRef.departmentOptions
      ? deptRef.departmentOptions
      : [{ id: '__all__', name: 'All Departments' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specRef.success && specRef.specialityOptions
      ? specRef.specialityOptions
      : [{ id: '__all__', name: 'All Specialities' }];

  const areaOptions: Array<{ id: string; name: string }> =
    areaRef.success && areaRef.areaOptions
      ? areaRef.areaOptions
      : [{ id: '__all__', name: 'All Areas' }];

  const agencyOptions: Array<{ id: string; name: string }> =
    agencyRef.success && agencyRef.agencyOptions
      ? agencyRef.agencyOptions
      : [{ id: '__all__', name: 'All Agents' }];

  const branchTypeOptions = [
    // { id: '__all__', name: 'All Branch Types' },
    ...LOCATION_OPTIONS.map((opt) => ({ id: opt.id, name: opt.name })),
  ];

  const genderOptions: Array<{ id: string; name: string }> = [
    // { id: '__all__', name: 'All' },
    ...SEX_OPTIONS.map((s) => ({ id: s.id, name: s.name })),
  ];

  const paymentTypeOptions: Array<{ id: string; name: string }> = [
    // { id: '__all__', name: 'All' },
    ...Object.entries(PAYMENT_METHOD_NAMES).map(([id, name]) => ({
      id,
      name,
    })),
  ];

  const methodOptions: Array<{ id: string; name: string }> = [
    // { id: '__all__', name: 'All' },
    ...BOOKING_METHODS.map((m) => ({ id: String(m.id), name: m.name })),
  ];

  return (
    <ChannelBookingsReportContent
      currentUserName={currentUserName}
      institutionOptions={INSTITUTION_OPTIONS}
      locationOptions={locationOptions}
      departmentOptions={departmentOptions}
      branchTypeOptions={branchTypeOptions}
      specialityOptions={specialityOptions}
      doctorOptions={doctorOptions}
      statusOptions={STATUS_OPTIONS}
      refundStatusOptions={REFUND_STATUS_OPTIONS}
      dateTypeOptions={DATE_TYPE_OPTIONS}
      areaOptions={areaOptions}
      agencyOptions={agencyOptions}
      genderOptions={genderOptions}
      paymentTypeOptions={paymentTypeOptions}
      methodOptions={methodOptions}
    />
  );
}
