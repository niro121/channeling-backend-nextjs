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

export type UserGroup = {
  id?: string;
  name: string;
  description?: string;
  status: number; // 0 = inactive, 1 = active
  permissions: Permissions;
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

// Available resources in the system
export const RESOURCES = [
  { id: "users", name: "Users" },
  { id: "channel-booking", name: "Channel Booking" },
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
] as const;

export const PERMISSION_ACTIONS: { id: PermissionAction; name: string; description: string }[] = [
  { id: "view", name: "View", description: "View list" },
  { id: "add", name: "Add", description: "Add new" },
  { id: "edit", name: "Edit", description: "Edit existing" },
  { id: "delete", name: "Delete", description: "Delete" },
] as const;
