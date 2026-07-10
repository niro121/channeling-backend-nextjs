import type { GeneralFormValues } from '@/app/(dashboard)/staff/general-form';
import type { Staff } from '@/types/staff';
import { STAFF_STATUS_OPTIONS } from '@archmage/shared';

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

export function staffRecordToGeneralFormValues(
  staff: Staff & { id?: string }
): GeneralFormValues {
  const nameParts = (staff.name ?? '').trim().split(/\s+/).filter(Boolean);
  const lastName = nameParts.length > 1 ? (nameParts[nameParts.length - 1] ?? '') : '';
  const firstName =
    nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (staff.name ?? '');

  return {
    staffCode: staff.code ?? '',
    title: staff.title ?? '',
    initials: '',
    name: staff.name ?? '',
    firstName,
    lastName,
    fullName: staff.name ?? '',
    nameWithInitials: staff.name ?? '',
    nic: staff.nic ?? '',
    dateOfBirth: toDate(staff.dateOfBirth),
    gender: staff.gender ?? '',
    mobileNumber: staff.contactMobile ?? '',
    homeTelephone: '',
    email: '',
    secondaryEmail: '',
    address: staff.address ?? '',
    zoneCode: '',
    fingerPrintRfid: '',
    staffCodeLegacy: '',
    epfNumber: '',
    etfNumber: '',
    registrationNumber: '',
    dateJoined: toDate(staff.dateJoined),
    dateResigned: undefined,
    resignedWithoutNotice: false,
    resignedWithNoticeDate: undefined,
    dateRetired: undefined,
    status:
      STAFF_STATUS_OPTIONS.find((option) => option.id === String(staff.status))?.id ??
      STAFF_STATUS_OPTIONS[1].id,
    speciality: ''
  };
}

export function generalFormValuesToStaff(values: GeneralFormValues): Staff {
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
    status: Number.parseInt(values.status, 10) || 1
  };
}
