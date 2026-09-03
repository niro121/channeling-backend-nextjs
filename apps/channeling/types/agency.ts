// EXPORT ALL TYPES RELATED TO AGENCY FROM HERE

/** Stored in `Agency.creditLimitViolationReason` when allowed credit limit is set to the hard cap. */
export const AGENCY_VIOLATION_REASON_ALLOWED_AT_HARD_CAP = 'ALLOWED_AT_HARD_CAP' as const;

export type Agency = {
  id?: string;
  name: string;
  code?: string | null;
  chequePrintingName: string;
  parentAgencyId?: string | null;
  allowedCreditLimit: number;
  creditLimit: number;
  isCreditLimitViolation?: boolean;
  creditLimitViolationAt?: Date | null;
  creditLimitViolationReason?: string | null;
  balance: number;
  /** Hard cap from linked PAYABLE account, in LKR (minBalanceAllowed preferred, maxBalanceAllowed fallback) */
  maxCreditLimit?: number;
  /** Effective policy cap = min(allowedCreditLimit, maxCreditLimit) */
  standardCreditLimit?: number;
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
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  /** Linked GL account (PAYABLE) for balance/statement */
  accountId?: string | null;
  accountName?: string | null;
  accountCode?: string | null;
  // Audit user relations
  createdUser?: { id?: string; name?: string } | null;
  updatedUser?: { id?: string; name?: string } | null;
};

export type AgencyFormValues = {
  name: string;
  code?: string;
  chequePrintingName: string;
  parentAgencyId?: string;
  allowedCreditLimit: number;
  creditLimit: number;
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
  allowedCreditLimit: number;
  creditLimit: number;
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
  locationId?: string;
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

/** Rows from activity log for `agencies.limit.soft_changed` on one agency (allowed credit limit history). */
export type AgencyAllowedCreditLimitHistoryEntry = {
  id: string;
  createdAt: string;
  changedByUserId: string;
  changedByUserName: string;
  oldValue: number | null;
  newValue: number | null;
  delta: number | null;
  /** `source` from log metadata when stored; may be null on older entries. */
  source: string | null;
  /** Effective source after inference (e.g. allowed-limits page from formal-ack flag). */
  sourceResolved: string | null;
  field: string | null;
  agencyNameFromMetadata: string | null;
  agencyCodeFromMetadata: string | null;
  ipAddress: string | null;
  formalDeclarationAcknowledged: boolean;
  /** JSON of metadata keys not shown elsewhere (empty object → null). */
  otherMetadataJson: string | null;
};
