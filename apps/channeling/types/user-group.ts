import type { ResourceWithOptionalActions } from "@archmage/shared";

export {
  type PermissionAction,
  type ResourcePermissions,
  type Permissions,
  type TwoFactorMethodId,
  type UserGroup,
  type GetUserGroupsParams,
  type GetUserGroupsQuery,
  type GetUserGroupsReturn,
  type ResourceWithOptionalActions,
  PERMISSION_ACTIONS,
} from "@archmage/shared";

// Available resources in the system
export const RESOURCES: ResourceWithOptionalActions[] = [
  { id: "users", name: "Users" },
  { id: "channel-booking", name: "Channel Booking" },
  { id: "channel-booking-date", name: "Channel Booking – Change Date", actions: ["view"], actionLabels: { view: "Change Date" } },
  {
    id: "channel-booking-block",
    name: "Channel Booking – Block numbers",
    actions: ["view"],
    actionLabels: { view: "Block / unblock appointment numbers" },
  },
  {
    id: "channel-booking-forced-booking",
    name: "Channel Booking – Forced bookings",
    actions: ["view"],
    actionLabels: { view: "Book into blocked numbers" },
  },
  { id: "shift", name: "Shift (Channel Booking)" },
  { id: "handover", name: "Handed over to me", actions: ["view"] },
  { id: "shifts", name: "Shifts" },
  { id: "doctors", name: "Doctors" },
  { id: "sessions", name: "Sessions" },
  { id: "doctor-sessions", name: "Doctor Sessions" },
  { id: "departments", name: "Departments" },
  { id: "patients", name: "Patients" },
  { id: "tags", name: "Tags" },
  { id: "zones", name: "Zones" },
  { id: "rooms", name: "Rooms" },
  { id: "specialities", name: "Specialities" },
  { id: "locations", name: "Locations" },
  { id: "agency-books", name: "Agency Books" },
  {
    id: "agencies",
    name: "Agencies",
    customActions: [
      { id: "view", name: "View" },
      { id: "add", name: "Add" },
      { id: "edit", name: "Edit" },
      { id: "delete", name: "Delete" },
      { id: "edit-credit-limit", name: "Edit Credit Limit" },
      { id: "edit-allowed-credit-limit", name: "Edit Allowed Credit Limit" },
    ],
  },
  { id: "credit-customers", name: "Credit Customers" },
  { id: "discounts", name: "Discounts" },
  { id: "doctor-leaves", name: "Doctor Leave" },
  { id: "sms-playground", name: "SMS Playground" },
  { id: "reports", name: "Reports" },
  { id: "api-clients", name: "API Clients" },
  {
    id: "bulk-cashier",
    name: "Bulk Cashier",
    customActions: [
      { id: "float-view", name: "Float View" },
      { id: "float-approve", name: "Float Approve" },
      { id: "bulk-cashier-dashboard", name: "Bulk Cashier" },
      { id: "float-request", name: "Float Request" },
      { id: "my-till", name: "My Till" },
    ],
  },
  { id: "float-transfers", name: "Float Transfers" },
  { id: "doctor-payments", name: "Doctor Payments" },
  { id: "accounting", name: "Accounting" },
  { id: "ledger", name: "Ledger" },
  { id: "bank-accounts", name: "Bank Accounts" },
  { id: "receipt-manager", name: "Receipt Manager", actions: ["view"] },
  {
    id: "reconciliation",
    name: "Reconciliation",
    customActions: [
      { id: "view", name: "View" },
      { id: "submit-for-reconciliation", name: "Submit For Reconciliation" },
      { id: "approve-reconciliation", name: "Approve Reconciliation" },
    ],
  },
];

/** Extended permission actions specific to Bulk Cashier (use with customActions). */
export const BULK_CASHIER_ACTIONS = [
  { id: "float-view", name: "Float View" },
  { id: "float-approve", name: "Float Approve" },
  { id: "bulk-cashier-dashboard", name: "Bulk Cashier" },
  { id: "float-request", name: "Float Request" },
  { id: "my-till", name: "My Till" },
] as const;
