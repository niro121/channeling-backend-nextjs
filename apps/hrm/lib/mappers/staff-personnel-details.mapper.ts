import type {
  HrDetailFormValues,
  StaffPersonnelDetails,
  StaffPersonnelPayload,
  StaffRecord
} from '@/types/staff';

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

function toCountString(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0';
  return String(Math.max(0, value));
}

function toCountNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export function staffRecordToHrDetailFormValues(staff: StaffRecord): HrDetailFormValues {
  const hr = staff.hrDetails;
  const personal = staff.personnelDetails?.personal;
  const contact = staff.personnelDetails?.contact;
  const family = staff.personnelDetails?.family;
  const dependents = staff.personnelDetails?.dependents;
  const emergency = staff.personnelDetails?.emergency;

  const firstName = hr?.firstName ?? '';
  const lastName = hr?.lastName ?? '';
  const initials = hr?.initials ?? '';

  return {
    title: staff.title ?? '',
    initials,
    firstName,
    lastName,
    fullName: getFullName(firstName, lastName) || staff.name || '',
    nameWithInitials: getNameWithInitials(initials, firstName, lastName) || staff.name || '',
    nic: staff.nic ?? '',
    dateOfBirth: toDate(staff.dateOfBirth),
    mobileNumber: staff.contactMobile ?? '',
    homeTelephone: hr?.homeTelephone ?? '',
    email: hr?.email ?? '',
    nationality: personal?.nationality ?? '',
    bloodGroup: personal?.bloodGroup ?? '',
    religion: personal?.religion ?? '',
    civilStatus: personal?.civilStatus ?? '',
    gsDivision: personal?.gsDivision ?? '',
    pollingDivision: personal?.pollingDivision ?? '',
    transportMode: personal?.transportMode ?? '',
    permanentAddress: contact?.permanentAddress ?? '',
    postalAddress: contact?.postalAddress ?? '',
    faxNumber: contact?.faxNumber ?? '',
    spouseName: family?.spouseName ?? '',
    spouseOccupation: family?.spouseOccupation ?? '',
    maleAbove18: toCountString(dependents?.maleAbove18),
    femaleAbove18: toCountString(dependents?.femaleAbove18),
    maleBelow18: toCountString(dependents?.maleBelow18),
    femaleBelow18: toCountString(dependents?.femaleBelow18),
    fatherName: family?.fatherName ?? '',
    fatherOccupation: family?.fatherOccupation ?? '',
    motherName: family?.motherName ?? '',
    motherOccupation: family?.motherOccupation ?? '',
    guardianName: family?.guardianName ?? '',
    guardianOccupation: family?.guardianOccupation ?? '',
    guardianRelationship: family?.guardianRelationship ?? '',
    guardianAddress: family?.guardianAddress ?? '',
    guardianContactNumber: family?.guardianContactNumber ?? '',
    fatherInLawName: family?.fatherInLawName ?? '',
    fatherInLawOccupation: family?.fatherInLawOccupation ?? '',
    motherInLawName: family?.motherInLawName ?? '',
    motherInLawOccupation: family?.motherInLawOccupation ?? '',
    inLawAddress: family?.inLawAddress ?? '',
    inLawContactNumber: family?.inLawContactNumber ?? '',
    emergencyContactName: emergency?.name ?? '',
    emergencyRelationship: emergency?.relationship ?? '',
    emergencyAddress: emergency?.address ?? '',
    emergencyContactNumber: emergency?.contactNumber ?? ''
  };
}

export function hrDetailFormValuesToPersonnelPayload(
  values: HrDetailFormValues
): StaffPersonnelPayload {
  const fullName = getFullName(values.firstName, values.lastName);
  const nameWithInitials = getNameWithInitials(
    values.initials,
    values.firstName,
    values.lastName
  );

  return {
    title: values.title ?? '',
    initials: values.initials || null,
    firstName: values.firstName || null,
    lastName: values.lastName || null,
    name: nameWithInitials || fullName,
    nic: values.nic ?? '',
    dateOfBirth: values.dateOfBirth ?? null,
    contactMobile: values.mobileNumber ?? '',
    homeTelephone: values.homeTelephone || null,
    email: values.email || null,
    personnelDetails: mapFormValuesToPersonnelDetails(values)
  };
}

function mapFormValuesToPersonnelDetails(
  values: HrDetailFormValues
): StaffPersonnelDetails {
  return {
    personal: {
      nationality: values.nationality || null,
      bloodGroup: values.bloodGroup || null,
      religion: values.religion || null,
      civilStatus: values.civilStatus || null,
      gsDivision: values.gsDivision || null,
      pollingDivision: values.pollingDivision || null,
      transportMode: values.transportMode || null
    },
    contact: {
      permanentAddress: values.permanentAddress || null,
      postalAddress: values.postalAddress || null,
      faxNumber: values.faxNumber || null
    },
    family: {
      spouseName: values.spouseName || null,
      spouseOccupation: values.spouseOccupation || null,
      fatherName: values.fatherName || null,
      fatherOccupation: values.fatherOccupation || null,
      motherName: values.motherName || null,
      motherOccupation: values.motherOccupation || null,
      guardianName: values.guardianName || null,
      guardianOccupation: values.guardianOccupation || null,
      guardianRelationship: values.guardianRelationship || null,
      guardianAddress: values.guardianAddress || null,
      guardianContactNumber: values.guardianContactNumber || null,
      fatherInLawName: values.fatherInLawName || null,
      fatherInLawOccupation: values.fatherInLawOccupation || null,
      motherInLawName: values.motherInLawName || null,
      motherInLawOccupation: values.motherInLawOccupation || null,
      inLawAddress: values.inLawAddress || null,
      inLawContactNumber: values.inLawContactNumber || null
    },
    dependents: {
      maleAbove18: toCountNumber(values.maleAbove18),
      femaleAbove18: toCountNumber(values.femaleAbove18),
      maleBelow18: toCountNumber(values.maleBelow18),
      femaleBelow18: toCountNumber(values.femaleBelow18)
    },
    emergency: {
      name: values.emergencyContactName || null,
      relationship: values.emergencyRelationship || null,
      address: values.emergencyAddress || null,
      contactNumber: values.emergencyContactNumber || null
    }
  };
}

export function personnelPayloadToStaffRecordSlice(
  payload: StaffPersonnelPayload
): Partial<StaffRecord> {
  return {
    title: payload.title,
    name: payload.name,
    nic: payload.nic,
    dateOfBirth: payload.dateOfBirth ?? undefined,
    contactMobile: payload.contactMobile,
    hrDetails: {
      initials: payload.initials ?? null,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      homeTelephone: payload.homeTelephone ?? null,
      email: payload.email ?? null
    }
  };
}
