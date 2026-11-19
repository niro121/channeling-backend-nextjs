export type DpayUser = {
  id?: string;
  name: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  twoFactorEnabled?: boolean;
  password: string;
  confirmPassword?: string;
  userType: number;
  status: number;
  userGroupId?: string | null;
  userGroup?: { id: string; name: string; app?: string | null } | null;
  /** Channeling Location id — used for DPAY receipt numbering. */
  userLocationId?: string | null;
  /** Denormalized Location.code (e.g. NH). */
  locationCode?: string | null;
  /** Resolved for display only (not persisted). */
  userLocation?: { id: string; name: string; code: string } | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdUser?: { id?: string; name?: string; email?: string } | null;
  updatedUser?: { id?: string; name?: string; email?: string } | null;
};

export type GetUsersParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  userId?: string;
  status?: string;
};

export type GetUsersQuery = {
  page: number;
  limit: number;
  keyword: string;
  userId?: string;
  status?: string;
};

export type GetUsersReturn = {
  data: DpayUser[];
  totalRecords: number;
};

export type LocationOption = {
  id: string;
  name: string;
  code: string;
};
