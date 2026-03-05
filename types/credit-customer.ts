// Credit customers (companies) for payment method Credit — like agencies, basic details only.

export type CreditCustomer = {
  id?: string;
  name: string;
  code?: string | null;
  /** Balance from linked RECEIVABLE account (display units, e.g. dollars). */
  balance?: number;
  /** Linked RECEIVABLE account id (null if no GL account created yet). */
  accountId?: string | null;
  /** Linked account name for display (e.g. "Credit - Company Name"). */
  accountName?: string | null;
  /** Linked account code for display. */
  accountCode?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  contactPersonName: string;
  contactPersonPhone?: string | null;
  contactPersonEmail?: string | null;
  status?: number | null; // 0 = Unpublished, 1 = Published
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CreditCustomerFormValues = {
  name: string;
  code?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  contactPersonName: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  status: number; // 0 = Unpublished, 1 = Published
};

export type UpdateCreditCustomerPayload = Partial<CreditCustomerFormValues>;

export type GetCreditCustomersParams = {
  page?: string;
  limit?: string;
  keyword?: string;
};

export type GetCreditCustomersQuery = {
  page: number;
  limit: number;
  keyword: string;
};

export type GetCreditCustomersReturn = {
  data: CreditCustomer[];
  totalRecords: number;
};
