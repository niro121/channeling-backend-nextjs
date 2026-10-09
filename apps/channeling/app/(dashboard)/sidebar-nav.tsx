"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRightLeft,
  Banknote,
  BookOpen,
  Building2,
  Calculator,
  CalendarCheck,
  CheckSquare,
  Clock10,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Key,
  Landmark,
  LayoutGrid,
  LocateFixedIcon,
  LucideHome,
  MapPinned,
  MessageCircle,
  MessageSquareText,
  Play,
  Receipt,
  SlidersHorizontal,
  StarIcon,
  Stethoscope,
  Tags,
  TicketIcon,
  Timer,
  UserCircle,
  UserLock,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { NavLink } from "@/components/common/nav-link";
import { UserGroup } from "@/components/icons";

type SidebarIcon = LucideIcon | typeof UserGroup;

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: SidebarIcon;
  /** Permission route. Defaults to href. */
  accessPath?: string;
  requiresE2e?: boolean;
};

export type SidebarNavGroup = {
  label: string;
  /** Shown only for admin user type. Items are not filtered by group permissions. */
  adminOnly?: boolean;
  items: SidebarNavItem[];
};

/** Single source for the desktop sidebar and the mobile left sheet. */
export const SIDEBAR_GROUPS: SidebarNavGroup[] = [
  {
    label: "Channeling",
    items: [
      { href: "/channel-booking", label: "Channel Booking", icon: CalendarCheck },
      { href: "/channel-room-dashboard", label: "Channel Room Dashboard", icon: LayoutGrid },
      { href: "/handovers", label: "Handovers", icon: ArrowRightLeft },
      { href: "/sessions", label: "Sessions", icon: Clock10 },
      { href: "/shifts", label: "Shifts", icon: Timer },
    ],
  },
  {
    label: "Consultants",
    items: [
      { href: "/doctors", label: "Doctor", icon: Stethoscope },
      { href: "/doctor-sessions", label: "Doctor Session", icon: Clock10 },
      {
        href: "/doctor-sessions/bulk-price-change",
        label: "Bulk Price Change",
        icon: DollarSign,
        accessPath: "/doctor-sessions",
      },
      { href: "/specialities", label: "Speciality", icon: StarIcon },
      { href: "/doctor-leaves", label: "Doctor Leave", icon: UserLock },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/departments", label: "Department", icon: Building2 },
      { href: "/zones", label: "Zones", icon: MapPinned },
      { href: "/rooms", label: "Rooms", icon: LucideHome },
      { href: "/locations", label: "Location", icon: LocateFixedIcon },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/patients", label: "Patients", icon: UserPlus },
      { href: "/staff", label: "Staff", icon: UserCircle },
      { href: "/users", label: "Users", icon: UserGroup },
      { href: "/user-groups", label: "User Groups", icon: Users },
    ],
  },
  {
    label: "Agency & billing",
    items: [
      { href: "/agency-books", label: "Agency Books", icon: BookOpen },
      { href: "/agencies", label: "Agency", icon: Landmark },
      {
        href: "/agencies/allowed-credit-limits",
        label: "Agency allowed limits",
        icon: SlidersHorizontal,
      },
      { href: "/credit-customers", label: "Credit Customers", icon: CreditCard },
      { href: "/discounts", label: "Discount", icon: TicketIcon },
      { href: "/accounting", label: "Accounting", icon: Calculator },
      { href: "/ledger", label: "Ledger", icon: Receipt },
      { href: "/bank-accounts", label: "Bank Accounts", icon: Building2 },
      { href: "/receipt-manager", label: "Receipt Manager", icon: Receipt },
      { href: "/reconciliation", label: "Reconciliation", icon: CheckSquare },
      { href: "/approvals", label: "Approval Center", icon: CheckSquare },
      { href: "/doctor-payments", label: "Doctor Payments", icon: DollarSign },
      { href: "/admin/receipt-templates", label: "Receipt templates", icon: FileText },
      { href: "/my-till", label: "My Till", icon: Wallet },
      { href: "/bulk-cashier", label: "Bulk Cashier", icon: Banknote },
      { href: "/float-transfers", label: "Float Transfers", icon: ArrowRightLeft },
    ],
  },
  {
    label: "Other",
    items: [
      { href: "/tags", label: "Tags", icon: Tags },
      { href: "/sms-playground", label: "SMS Playground", icon: MessageSquareText },
      { href: "/sms-templates", label: "SMS Templates", icon: MessageSquareText },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { href: "/admin/knowledge-hub", label: "Knowledge Hub", icon: BookOpen },
      { href: "/admin/monitor", label: "Server Monitor", icon: Activity },
      { href: "/admin/seed", label: "Database seeds", icon: Database },
      { href: "/admin/api-clients", label: "API Clients", icon: Key },
      {
        href: "/admin/run-e2e",
        label: "Run end-to-end (E2E) tests",
        icon: Play,
        requiresE2e: true,
      },
      { href: "/reports/sms-activity", label: "SMS Activity", icon: MessageCircle },
    ],
  },
];

function SidebarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function SidebarNavList({
  hasAccess,
  isAdmin,
  e2eRunEnabled = false,
}: {
  hasAccess: (path: string) => boolean;
  isAdmin: boolean;
  e2eRunEnabled?: boolean;
}) {
  return (
    <>
      {SIDEBAR_GROUPS.map((group) => {
        if (group.adminOnly && !isAdmin) return null;

        const items = group.items.filter((item) => {
          if (item.requiresE2e && !e2eRunEnabled) return false;
          if (group.adminOnly) return true;
          return hasAccess(item.accessPath ?? item.href);
        });

        if (items.length === 0) return null;

        return (
          <SidebarGroup key={group.label} label={group.label}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={<Icon className="h-5 w-5" />}
                />
              );
            })}
          </SidebarGroup>
        );
      })}
    </>
  );
}
