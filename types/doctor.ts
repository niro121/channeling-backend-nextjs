import { Speciality } from "./speciality";
import { User } from "./user";

export type Doctor = {
  id?: string;
  title: string;
  name: string;
  code: string;
  order: number;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  registrationNumber: string | null;
  qualification: string;
  referralCharge: number;
  sessionNoPrefix: string | null;
  status: number; // == 0: unpublish, 1: publish == //
  specialityId: string;
  speciality?: Speciality
  createdUser?: User | null
  updatedUser?: User | null
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
};

export type DoctorFormValues = {
  title: string;
  name: string;
  code: string;
  order: number;
  phone: string;
  mobile: string;
  fax: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  registrationNumber: string;
  qualification: string;
  referralCharge: number;
  sessionNoPrefix: string;
  status: number; // == 0: unpublish, 1: publish == //
  specialityId: string;
};

export type CreateDoctorPayload = DoctorFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

export type UpdateDoctorPayload = Partial<{
  title: string;
  name: string;
  order: number;
  phone: string;
  mobile: string;
  fax: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  registrationNumber: string;
  qualification: string;
  referralCharge: number;
  sessionNoPrefix: string;
  status: number; // == 0: unpublish, 1: publish == //
  specialityId: string;
}>;


export type getDoctorParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  specialityId?: string;
};

export type getDoctorQuery = {
  page: number;
  limit: number;
  keyword: string;
  specialityId?: string;
};

export type GetDoctorResponse = {
  data: Doctor[];
  totalRecords: number;
};

export type TitleItem = {
  id: number;
  name: string;
  sex: string;
};

export const TITLE_LIST: TitleItem[] = [
  { id: 0, name: 'MR.', sex: 'Male' },
  { id: 1, name: 'MRS.', sex: 'Female' },
  { id: 2, name: 'MISS.', sex: 'Female' },
  { id: 3, name: 'MS.', sex: 'Female' },
  { id: 4, name: "Ma'am", sex: 'Female' },
  { id: 5, name: 'DR.', sex: 'Male' },
  { id: 6, name: 'DR.(MRS)', sex: 'Female' },
  { id: 7, name: 'DR.(MS)', sex: 'Female' },
  { id: 8, name: 'DR.(MISS)', sex: 'Female' },
  { id: 9, name: 'PROF.', sex: 'Male' },
  { id: 10, name: 'PROF.(MRS)', sex: 'Female' },
  { id: 11, name: 'MASTER.', sex: 'Male' },
  { id: 12, name: 'BABY.', sex: 'Male' },
  { id: 14, name: 'REV.', sex: 'Male' },
  { id: 15, name: 'RT.REV.', sex: 'Male' },
  { id: 16, name: 'HON.', sex: 'Male' },
  { id: 17, name: 'RT.HON.', sex: 'Male' },
  { id: 18, name: 'OTHER', sex: 'Other' },
  { id: 19, name: 'BABY OF', sex: 'Other' }
];

/** Options for Title dropdown: value is title name (stored in DB) */
export const TITLE_OPTIONS: { id: string; name: string }[] = TITLE_LIST.map((t) => ({
  id: t.name,
  name: t.name
}));

/** Get sex for a title name (e.g. when title is selected). */
export function getSexForTitle(titleName: string): string | null {
  const item = TITLE_LIST.find((t) => t.name === titleName);
  return item?.sex ?? null;
}

/** Normalize stored title to match a TITLE_LIST option (exact or case-insensitive). */
export function normalizeTitleForSelect(title: string | null | undefined): string {
  if (!title || !title.trim()) return '';
  const exact = TITLE_LIST.find((t) => t.name === title);
  if (exact) return exact.name;
  const lower = title.trim().toLowerCase();
  const match = TITLE_LIST.find((t) => t.name.toLowerCase() === lower);
  return match?.name ?? title.trim();
}

/** Resolve old DB/API title id (number) to title name string (e.g. 0 -> "MR.", 5 -> "DR."). */
export function getTitleNameById(titleId: number | string | null | undefined): string | null {
  if (titleId === null || titleId === undefined) return null;
  const id = typeof titleId === 'string' ? parseInt(titleId, 10) : titleId;
  if (Number.isNaN(id)) return null;
  const item = TITLE_LIST.find((t) => t.id === id);
  return item?.name ?? null;
}

export type ExportDoctorParams = {
  keyword?: string;
  specialityId?: string;
};

export type ExportDoctorQuery = {
  keyword?: string;
  specialityId?: string;
};

export type ExportDoctorsPdfResponse =
  | { success: true; data: Doctor[]; totalRecords: number }
  | { success: false; message: string };
