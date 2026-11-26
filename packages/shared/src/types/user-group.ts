export type PermissionAction = "view" | "add" | "edit" | "delete";

export type ResourcePermissions = Record<string, boolean>;

export type Permissions = {
  [resource: string]: ResourcePermissions;
};

/** 2FA method IDs: "1" = AUTH-APP, "2" = SMS, "3" = EMAIL */
export type TwoFactorMethodId = string;

export type UserGroup = {
  id?: string;
  name: string;
  description?: string;
  status: number; // 0 = inactive, 1 = active
  /** App scope: "hrm" | "dpay" | "channeling" (see AUTH_APPS). Null = legacy / unscoped. */
  app?: string | null;
  permissions: Permissions;
  twoFactorEnabled?: boolean;
  twoFactorMethods?: TwoFactorMethodId[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdUser?: { id?: string; name?: string; email?: string } | null;
  updatedUser?: { id?: string; name?: string; email?: string } | null;
};

export type GetUserGroupsParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  userGroupId?: string;
  status?: string;
};

export type GetUserGroupsQuery = {
  page: number;
  limit: number;
  keyword: string;
  userGroupId?: string;
  status?: string;
};

export type GetUserGroupsReturn = {
  data: UserGroup[];
  totalRecords: number;
};

export type ResourceWithOptionalActions = {
  id: string;
  name: string;
  actions?: readonly PermissionAction[];
  actionLabels?: Partial<Record<PermissionAction, string>>;
  customActions?: { id: string; name: string }[];
};

export const PERMISSION_ACTIONS: { id: PermissionAction; name: string; description: string }[] = [
  { id: "view", name: "View", description: "View list" },
  { id: "add", name: "Add", description: "Add new" },
  { id: "edit", name: "Edit", description: "Edit existing" },
  { id: "delete", name: "Delete", description: "Delete" },
] as const;
