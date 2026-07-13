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

export type StaffGeneralPayload = Staff & {
  hrDetails?: StaffHrDetails;
};

export type StaffRecord = Staff & {
  id: string;
  migrateSourceId?: string | null;
  hrDetails?: StaffHrDetails | null;
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
