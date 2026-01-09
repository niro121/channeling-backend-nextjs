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
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
};

export type LocationFormValues = {
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: string;
  status: number; // == 0: unpublish, 1: publish == //
};

export type UpdateLocationPayload = Partial<{
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: string;
  status: number; // == 0: unpublish, 1: publish == //
}>;

export type getLocationParam = {
  page?: string;
  limit?: string;
  keyword?: string;
  locationId?: string;
}

export type getLocationQuery = {
  page: number;
  limit: number;
  keyword: string;
  locationId?: number;
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