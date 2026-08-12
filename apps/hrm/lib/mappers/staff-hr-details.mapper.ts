import type { GeneralFormValues } from '@/types/staff';
import type { StaffHrDetails } from '@/types/staff';

export function mapHrDetailsToFormValues(
  hrDetails?: StaffHrDetails | null
): Pick<
  GeneralFormValues,
  | 'initials'
  | 'firstName'
  | 'lastName'
  | 'homeTelephone'
  | 'email'
  | 'secondaryEmail'
  | 'zoneCode'
  | 'fingerPrintRfid'
  | 'staffCodeLegacy'
  | 'epfNumber'
  | 'etfNumber'
  | 'registrationNumber'
  | 'dateResigned'
  | 'resignedWithoutNotice'
  | 'resignedWithNoticeDate'
  | 'dateRetired'
  | 'speciality'
> {
  return {
    initials: hrDetails?.initials ?? '',
    firstName: hrDetails?.firstName ?? '',
    lastName: hrDetails?.lastName ?? '',
    homeTelephone: hrDetails?.homeTelephone ?? '',
    email: hrDetails?.email ?? '',
    secondaryEmail: hrDetails?.secondaryEmail ?? '',
    zoneCode: hrDetails?.zoneCode ?? '',
    fingerPrintRfid: hrDetails?.fingerPrintRfid ?? '',
    staffCodeLegacy: hrDetails?.staffCodeLegacy ?? '',
    epfNumber: hrDetails?.epfNumber ?? '',
    etfNumber: hrDetails?.etfNumber ?? '',
    registrationNumber: hrDetails?.registrationNumber ?? '',
    dateResigned: toDate(hrDetails?.dateResigned),
    resignedWithoutNotice: hrDetails?.resignedWithoutNotice ?? false,
    resignedWithNoticeDate: toDate(hrDetails?.resignedWithNoticeDate),
    dateRetired: toDate(hrDetails?.dateRetired),
    speciality: hrDetails?.speciality ?? ''
  };
}

export function mapFormValuesToHrDetails(values: GeneralFormValues): StaffHrDetails {
  return {
    initials: values.initials || null,
    firstName: values.firstName || null,
    lastName: values.lastName || null,
    homeTelephone: values.homeTelephone || null,
    email: values.email || null,
    secondaryEmail: values.secondaryEmail || null,
    zoneCode: values.zoneCode || null,
    fingerPrintRfid: values.fingerPrintRfid || null,
    epfNumber: values.epfNumber || null,
    etfNumber: values.etfNumber || null,
    registrationNumber: values.registrationNumber || null,
    dateResigned: values.dateResigned ?? null,
    resignedWithoutNotice: values.resignedWithoutNotice ?? false,
    resignedWithNoticeDate: values.resignedWithNoticeDate ?? null,
    dateRetired: values.dateRetired ?? null,
    speciality: values.speciality || null
  };
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
