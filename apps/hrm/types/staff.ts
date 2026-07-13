import type { GetStaffParams, Staff } from '@archmage/shared';
import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';
import { TITLE_LIST, GENDER_OPTIONS, STAFF_STATUS_OPTIONS } from '@archmage/shared';

export type { GetStaffParams, Staff };

export { TITLE_LIST, GENDER_OPTIONS, STAFF_STATUS_OPTIONS };

export type StaffHrDetails = {
  initials?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  homeTelephone?: string | null;
  email?: string | null;
  secondaryEmail?: string | null;
  zoneCode?: string | null;
  fingerPrintRfid?: string | null;
  staffCodeLegacy?: string | null;
  epfNumber?: string | null;
  etfNumber?: string | null;
  registrationNumber?: string | null;
  dateResigned?: Date | null;
  resignedWithoutNotice?: boolean;
  resignedWithNoticeDate?: Date | null;
  dateRetired?: Date | null;
  speciality?: string | null;
};

export type StaffPersonalDetails = {
  nationality?: string | null;
  bloodGroup?: string | null;
  religion?: string | null;
  civilStatus?: string | null;
  gsDivision?: string | null;
  pollingDivision?: string | null;
  transportMode?: string | null;
};

export type StaffHrContactDetails = {
  permanentAddress?: string | null;
  postalAddress?: string | null;
  faxNumber?: string | null;
};

export type StaffDependentCounts = {
  maleAbove18?: number;
  femaleAbove18?: number;
  maleBelow18?: number;
  femaleBelow18?: number;
};

export type StaffFamilyInfo = {
  spouseName?: string | null;
  spouseOccupation?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  motherName?: string | null;
  motherOccupation?: string | null;
  guardianName?: string | null;
  guardianOccupation?: string | null;
  guardianRelationship?: string | null;
  guardianAddress?: string | null;
  guardianContactNumber?: string | null;
  fatherInLawName?: string | null;
  fatherInLawOccupation?: string | null;
  motherInLawName?: string | null;
  motherInLawOccupation?: string | null;
  inLawAddress?: string | null;
  inLawContactNumber?: string | null;
};

export type StaffEmergencyContact = {
  name?: string | null;
  relationship?: string | null;
  address?: string | null;
  contactNumber?: string | null;
};

export type StaffPersonnelDetails = {
  personal?: StaffPersonalDetails | null;
  contact?: StaffHrContactDetails | null;
  family?: StaffFamilyInfo | null;
  dependents?: StaffDependentCounts | null;
  emergency?: StaffEmergencyContact | null;
};

export type StaffPersonnelPayload = {
  title?: string;
  name?: string;
  initials?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nic?: string;
  dateOfBirth?: Date | null;
  contactMobile?: string;
  homeTelephone?: string | null;
  email?: string | null;
  personnelDetails?: StaffPersonnelDetails;
};

export type StaffGeneralPayload = Staff & {
  hrDetails?: StaffHrDetails;
};

export type StaffRecord = Staff & {
  id: string;
  migrateSourceId?: string | null;
  hrDetails?: StaffHrDetails | null;
  personnelDetails?: StaffPersonnelDetails | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type StaffWithAuthUsers = StaffRecord & {
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type StaffCrudOptions = {
  syncToChanneling?: boolean;
};

export type StaffActionResult = {
  saved: boolean;
  id?: string;
  channelingSynced?: boolean;
  channelingWarning?: string;
};

export type GeneralFormValues = {
  staffCode: string;
  title: string;
  initials: string;
  name: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  dateOfBirth: Date | undefined;
  gender: string;
  mobileNumber: string;
  homeTelephone: string;
  email: string;
  secondaryEmail: string;
  address: string;
  zoneCode: string;
  fingerPrintRfid: string;
  staffCodeLegacy: string;
  epfNumber: string;
  etfNumber: string;
  registrationNumber: string;
  dateJoined: Date | undefined;
  dateResigned: Date | undefined;
  resignedWithoutNotice: boolean;
  resignedWithNoticeDate: Date | undefined;
  dateRetired: Date | undefined;
  status: string;
  speciality: string;
};

export type HrDetailFormValues = {
  title: string;
  initials: string;
  firstName: string;
  lastName: string;
  fullName: string;
  nameWithInitials: string;
  nic: string;
  dateOfBirth: Date | undefined;
  mobileNumber: string;
  homeTelephone: string;
  email: string;
  nationality: string;
  bloodGroup: string;
  religion: string;
  civilStatus: string;
  gsDivision: string;
  pollingDivision: string;
  transportMode: string;
  permanentAddress: string;
  postalAddress: string;
  faxNumber: string;
  spouseName: string;
  spouseOccupation: string;
  maleAbove18: string;
  femaleAbove18: string;
  maleBelow18: string;
  femaleBelow18: string;
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  guardianName: string;
  guardianOccupation: string;
  guardianRelationship: string;
  guardianAddress: string;
  guardianContactNumber: string;
  fatherInLawName: string;
  fatherInLawOccupation: string;
  motherInLawName: string;
  motherInLawOccupation: string;
  inLawAddress: string;
  inLawContactNumber: string;
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyAddress: string;
  emergencyContactNumber: string;
};
