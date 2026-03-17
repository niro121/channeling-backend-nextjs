import {
  getDoctorOptions,
  getLocationOptions,
  getDepartmentOptions,
} from '@/app/actions/doctor.sessions.action';
import { getAllSpecialityOptions } from '@/app/actions/doctor.actions';
import { getAreasForChannelBooking } from '@/app/actions/channel-booking/get-areas.action';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { LOCATION_OPTIONS } from '@/types/location';
import { SEX_OPTIONS } from '@/types/channel-booking';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import { BOOKING_METHODS } from '@/types/channel-booking';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ChannelBookingsReportContent from './channel-bookings-report-content';
import { STATUS_OPTIONS, REFUND_STATUS_OPTIONS, DATE_TYPE_OPTIONS } from '@/types/reports/channel-bookings';

export const dynamic = 'force-dynamic';

export default async function ChannelBookingsReportPage() {
  const canView = await checkRouteAccess('/reports/channel-bookings');
  if (!canView) redirect('/unauthorized-access');

  const [
    doctorsResult,
    locationsResult,
    specialityRes,
    areasRes,
    agenciesRes,
  ] = await Promise.all([
    getDoctorOptions(),
    getLocationOptions(),
    getAllSpecialityOptions(),
    getAreasForChannelBooking(),
    getAllAgenciesOptions(),
  ]);

  const doctorOptions: Array<{ id: string; name: string }> =
    doctorsResult.success && doctorsResult.data
      ? [
          { id: '__all__', name: 'All Doctors' },
          ...doctorsResult.data
            .filter((d: any) => d.id)
            .map((d: any) => ({
              id: d.id || '',
              name: formatDoctorName(d),
            })),
        ]
      : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.data
      ? [
          { id: '__all__', name: 'All Branches' },
          ...locationsResult.data.map((loc: any) => ({
            id: loc.id || '',
            name: loc.name || '',
          })),
        ]
      : [{ id: '__all__', name: 'All Branches' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specialityRes.success && specialityRes.data
      ? [
          { id: '__all__', name: 'All Specialities' },
          ...specialityRes.data.map((s: any) => ({
            id: s.id || '',
            name: s.name || '',
          })),
        ]
      : [{ id: '__all__', name: 'All Specialities' }];

  const areaOptions: Array<{ id: string; name: string }> =
    areasRes.success && areasRes.data
      ? [
          { id: '__all__', name: 'All Areas' },
          ...areasRes.data.map((a: any) => ({
            id: a.id || '',
            name: a.name || '',
          })),
        ]
      : [{ id: '__all__', name: 'All Areas' }];

  const agencyOptions: Array<{ id: string; name: string }> =
    agenciesRes.success && agenciesRes.data
      ? [
          { id: '__all__', name: 'All Agencies' },
          ...agenciesRes.data.map((a: any) => ({
            id: a.id || '',
            name: a.name || '',
          })),
        ]
      : [{ id: '__all__', name: 'All Agencies' }];

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
      institutionOptions={INSTITUTION_OPTIONS}
      locationOptions={locationOptions}
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
