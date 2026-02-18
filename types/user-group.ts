// EXPORT ALL TYPES RELATED TO USER GROUPS FROM HERE

export type PermissionAction = "view" | "add" | "edit" | "delete";

export type ResourcePermissions = {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
};

export type Permissions = {
  [resource: string]: ResourcePermissions;
};

/** 2FA method IDs: "1" = AUTH-APP, "2" = SMS, "3" = EMAIL (see types/2FA.ts) */
export type TwoFactorMethodId = string;

export type UserGroup = {
  id?: string;
  name: string;
  description?: string;
  status: number; // 0 = inactive, 1 = active
  permissions: Permissions;
  twoFactorEnabled?: boolean;
  twoFactorMethods?: TwoFactorMethodId[]; // e.g. ["1", "2", "3"]
  createdAt?: Date;
  updatedAt?: Date;
};

export type GetUserGroupsParams = {
  page?: string;
  limit?: string;
  keyword?: string;
};

export type GetUserGroupsQuery = {
  page: number;
  limit: number;
  keyword: string;
};

export type GetUserGroupsReturn = {
  data: UserGroup[];
  totalRecords: number;
};

// Resource with optional single-action display (e.g. only "Change Date" instead of View/Add/Edit/Delete)
export type ResourceWithOptionalActions = {
  id: string
  name: string
  /** If set, only these actions are shown in the User Group form for this resource. */
  actions?: readonly PermissionAction[]
  /** Custom labels for actions (e.g. view → "Change Date"). */
  actionLabels?: Partial<Record<PermissionAction, string>>
}

// Available resources in the system
export const RESOURCES: ResourceWithOptionalActions[] = [
  { id: "users", name: "Users" },
  { id: "channel-booking", name: "Channel Booking" },
  { id: "channel-booking-date", name: "Channel Booking – Change Date", actions: ["view"], actionLabels: { view: "Change Date" } },
  { id: "shift", name: "Shift (Channel Booking)" },
  { id: "doctors", name: "Doctors" },
  { id: "doctor-sessions", name: "Doctor Sessions" },
  { id: "departments", name: "Departments" },
  { id: "patients", name: "Patients" },
  { id: "tags", name: "Tags" },
  { id: "zones", name: "Zones" },
  { id: "rooms", name: "Rooms" },
  { id: "specialities", name: "Specialities" },
  { id: "locations", name: "Locations" },
  { id: "agency-books", name: "Agency Books" },
  { id: "agencies", name: "Agencies" },
  { id: "discounts", name: "Discounts" },
  { id: "doctor-leaves", name: "Doctor Leave" },
  { id: "sms-playground", name: "SMS Playground" },
  { id: "reports", name: "Reports" },
];

export const PERMISSION_ACTIONS: { id: PermissionAction; name: string; description: string }[] = [
  { id: "view", name: "View", description: "View list" },
  { id: "add", name: "Add", description: "Add new" },
  { id: "edit", name: "Edit", description: "Edit existing" },
  { id: "delete", name: "Delete", description: "Delete" },
] as const;
