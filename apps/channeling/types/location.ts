import { Option } from 'react-day-picker';
import { User } from './user';

export type Location = {
  id?: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: number;
  status: number; // == 0: unpublish, 1: publish == //
  code: string
  /** Display order in branch dropdowns (lower first). */
  order?: number;
  /** Hex color for branch UI (e.g. #22c55e). */
  color?: string | null;
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
  /** Linked GL account (CASH / branch cash book) */
  accountId?: string | null;
  accountName?: string | null;
  accountCode?: string | null;
  /** Balance from linked account (display units) */
  balance?: number | null;
  /** Linked INCOME account for the branch/location */
  incomeAccountId?: string | null;
  incomeAccountName?: string | null;
  incomeAccountCode?: string | null;
  /** Linked EXPENSE account for the branch/location */
  expenseAccountId?: string | null;
  expenseAccountName?: string | null;
  expenseAccountCode?: string | null;
};

export type LocationFormValues = {
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: string;
  status: number; // == 0: unpublish, 1: publish == //
  order: number;
  color: string;
};

export type UpdateLocationPayload = Partial<{
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: string;
  status: number; // == 0: unpublish, 1: publish == //
  order: number;
  color: string;
}>;

export type getLocationParam = {
  page?: string;
  limit?: string;
  keyword?: string;
  locationId?: string;
  /** When true, only return published locations (status === 1). Use for dropdowns. */
  publishedOnly?: boolean;
}

export type getLocationQuery = {
  page: number;
  limit: number;
  keyword: string;
  locationId?: number;
  publishedOnly?: boolean;
}

export type GetLocationResponse = {
  data: Location[];
  totalRecords: number
}

type Option = {
  id: string;
  name: string;
};

export const LOCATION_OPTIONS: Option[] = [
  {id: "1", name: "Main Location"},
  {id: "2", name: "Branch"},
  {id: "3", name: "Collection Center"},
]