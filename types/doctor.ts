import { Speciality } from "./speciality";
import { User } from "./user";

export type Doctor = {
  id?: string;
  title: string;
  name: string;
  code: string;
  order: number;
  phone: string | null;
  mobile: string;
  fax: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  registrationNumber: string;
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

type Option = {
  id: string;
  name: string;
};

export const TITLE_OPTIONS: Option[] = [
  { id: 'Mr', name: 'Mr' },
  { id: 'Ms', name: 'Ms' },
  { id: 'Mrs', name: 'Mrs' },
  { id: 'Dr', name: 'Dr' },
  { id: 'Prof', name: 'Prof' }
];

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
