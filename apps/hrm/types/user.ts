export type HrmUser = {
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
  staffId?: string | null;
  staff?: { id: string; name: string; code?: string } | null;
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
  data: HrmUser[];
  totalRecords: number;
};
