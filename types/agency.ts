// EXPORT ALL TYPES RELATED TO AGENCY FROM HERE

export type Agency = {
  id?: string;
  name: string;
  code?: string | null;
  chequePrintingName: string;
  parentAgencyId?: string | null;
  creditLimit: number;
  allowedCreditLimit: number;
  maxCreditLimit: number;
  balance: number;
  phone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  memo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  contactPersonName: string;
  contactPersonPhone?: string | null;
  contactPersonMobile?: string | null;
  contactPersonEmail?: string | null;
  sendSms?: number | null; // 0 = No, 1 = Yes
  status?: number | null; // 0 = Unpublish, 1 = Publish
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  // Relations
  parentAgency?: Agency | null;
  user?: any | null;
};

export type AgencyFormValues = {
  name: string;
  code?: string;
  chequePrintingName: string;
  parentAgencyId?: string;
  creditLimit: number;
  allowedCreditLimit: number;
  maxCreditLimit: number;
  phone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  memo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  contactPersonName: string;
  contactPersonPhone?: string;
  contactPersonMobile?: string;
  contactPersonEmail?: string;
  sendSms: number; // 0 = No, 1 = Yes
  status: number; // 0 = Unpublish, 1 = Publish
  // Login tab fields
  fullName?: string;
  loginEmail?: string;
  password?: string;
  confirmPassword?: string;
  locationId?: string;
};

export type UpdateAgencyPayload = Partial<{
  name: string;
  code?: string;
  chequePrintingName: string;
  parentAgencyId?: string;
  creditLimit: number;
  allowedCreditLimit: number;
  maxCreditLimit: number;
  phone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  memo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  contactPersonName: string;
  contactPersonPhone?: string;
  contactPersonMobile?: string;
  contactPersonEmail?: string;
  sendSms: number;
  status: number;
}>;

export type GetAgenciesParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  parentAgencyId?: string;
};

export type GetAgenciesQuery = {
  page: number;
  limit: number;
  keyword: string;
  parentAgencyId?: string;
};

export type GetAgenciesReturn = {
  data: Agency[];
  totalRecords: number;
};
