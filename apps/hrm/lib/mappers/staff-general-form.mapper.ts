import type { GeneralFormValues } from '@/types/staff';
import type { StaffGeneralPayload, StaffRecord } from '@/types/staff';
import { STAFF_STATUS_OPTIONS } from '@archmage/shared';
import {
  mapFormValuesToHrDetails,
  mapHrDetailsToFormValues
} from '@/lib/mappers/staff-hr-details.mapper';

function getFullName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function getNameWithInitials(
  initials: string,
  firstName: string,
  lastName: string
) {
  return [initials, firstName, lastName].filter(Boolean).join(' ').trim();
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function staffRecordToGeneralFormValues(staff: StaffRecord): GeneralFormValues {
  const hrValues = mapHrDetailsToFormValues(staff.hrDetails);
  const fullName = getFullName(hrValues.firstName, hrValues.lastName);
  const nameWithInitials = getNameWithInitials(
    hrValues.initials,
    hrValues.firstName,
    hrValues.lastName
  );

  return {
    staffCode: staff.code ?? '',
    title: staff.title ?? '',
    name: staff.name ?? '',
    nic: staff.nic ?? '',
    dateOfBirth: toDate(staff.dateOfBirth),
    gender: staff.gender ?? '',
    mobileNumber: staff.contactMobile ?? '',
    address: staff.address ?? '',
    dateJoined: toDate(staff.dateJoined),
    fullName: fullName || staff.name || '',
    nameWithInitials: nameWithInitials || staff.name || '',
    status:
      STAFF_STATUS_OPTIONS.find((option) => option.id === String(staff.status))?.id ??
      STAFF_STATUS_OPTIONS[1].id,
    ...hrValues
  };
}

export function generalFormValuesToStaffPayload(
  values: GeneralFormValues
): StaffGeneralPayload {
  const fullName = getFullName(values.firstName, values.lastName);
  const nameWithInitials = getNameWithInitials(
    values.initials,
    values.firstName,
    values.lastName
  );

  return {
    code: values.staffCode,
    title: values.title ?? '',
    name: values.name || nameWithInitials || fullName,
    nic: values.nic ?? '',
    dateOfBirth: values.dateOfBirth,
    gender: values.gender ?? '',
    contactMobile: values.mobileNumber ?? '',
    address: values.address ?? '',
    dateJoined: values.dateJoined,
    status: Number.parseInt(values.status, 10) || 1,
    hrDetails: mapFormValuesToHrDetails(values)
  };
}
