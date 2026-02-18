"use client";

import Link from "next/link";
import { Session } from "next-auth";
import { NavLink } from "@/components/common/nav-link";
import {
  Hospital,
  Stethoscope,
  Building2,
  StarIcon,
  LocateFixedIcon,
  UserPlus,
  Tags,
  MapPinned,
  Landmark,
  BookOpen,
  Users,
  FileText,
  MessageSquareText,
  Clock10,
  CalendarCheck,
  LucideHome,
  TicketIcon,
  UserLock,
  DollarSign,
  UserCircle
} from "lucide-react";
import { UserGroup } from "@/components/icons";
import { canAccessRoute } from "@/lib/permissions";
import { userTypes } from "@/lib/roles";
import { cn } from "@/lib/utils";

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

export function DesktopSidebar({
  session,
  className,
}: {
  session: Session | null;
  className?: string;
}) {
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;

  const hasAccess = (path: string) => {
    if (userType === userTypes.admin) return true;
    if (permissions) return canAccessRoute(permissions, path);
    return false;
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-primary/20 bg-secondary overflow-hidden sm:flex",
        className
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-primary/20 bg-secondary px-3">
        <Link
          href="/welcome"
          className="flex shrink-0 items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity min-w-0"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Hospital className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex flex-col items-start">
            <span className="truncate w-full text-base leading-tight">Ruhunu Hospital</span>
            <span className="text-xs font-normal text-muted-foreground leading-tight">Channelling</span>
          </span>
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 px-3 py-4 min-h-0">
        {(hasAccess("/channel-booking") || hasAccess("/sessions")) && (
          <SidebarGroup label="Channelling">
            {hasAccess("/channel-booking") && (
              <NavLink href="/channel-booking" label="Channel Booking" icon={<CalendarCheck className="h-5 w-5" />} />
            )}
            {hasAccess("/sessions") && (
              <NavLink href="/sessions" label="Sessions" icon={<Clock10 className="h-5 w-5" />} />
            )}
          </SidebarGroup>
        )}

        {(hasAccess("/doctors") || hasAccess("/doctor-sessions") || hasAccess("/specialities") || hasAccess("/doctor-leaves")) && (
          <SidebarGroup label="Consultants">
            {hasAccess("/doctors") && <NavLink href="/doctors" label="Doctor" icon={<Stethoscope className="h-5 w-5" />} />}
            {hasAccess("/doctor-sessions") && <NavLink href="/doctor-sessions" label="Doctor Session" icon={<Clock10 className="h-5 w-5" />} />}
            {hasAccess("/doctor-sessions") && <NavLink href="/doctor-sessions/bulk-price-change" label="Bulk Price Change" icon={<DollarSign className="h-5 w-5" />} />}
            {hasAccess("/specialities") && <NavLink href="/specialities" label="Speciality" icon={<StarIcon className="h-5 w-5" />} />}
            {hasAccess("/doctor-leaves") && <NavLink href="/doctor-leaves" label="Doctor Leave" icon={<UserLock className="h-5 w-5" />} />}
          </SidebarGroup>
        )}

        {(hasAccess("/departments") || hasAccess("/zones") || hasAccess("/rooms") || hasAccess("/locations")) && (
          <SidebarGroup label="Organization">
            {hasAccess("/departments") && <NavLink href="/departments" label="Department" icon={<Building2 className="h-5 w-5" />} />}
            {hasAccess("/zones") && <NavLink href="/zones" label="Zones" icon={<MapPinned className="h-5 w-5" />} />}
            {hasAccess("/rooms") && <NavLink href="/rooms" label="Rooms" icon={<LucideHome className="h-5 w-5" />} />}
            {hasAccess("/locations") && <NavLink href="/locations" label="Location" icon={<LocateFixedIcon className="h-5 w-5" />} />}
          </SidebarGroup>
        )}

        {(hasAccess("/patients") || hasAccess("/staff") || hasAccess("/users") || hasAccess("/user-groups")) && (
          <SidebarGroup label="People">
            {hasAccess("/patients") && <NavLink href="/patients" label="Patients" icon={<UserPlus className="h-5 w-5" />} />}
            {hasAccess("/staff") && <NavLink href="/staff" label="Staff" icon={<UserCircle className="h-5 w-5" />} />}
            {hasAccess("/users") && <NavLink href="/users" label="Users" icon={<UserGroup className="h-5 w-5" />} />}
            {hasAccess("/user-groups") && <NavLink href="/user-groups" label="User Groups" icon={<Users className="h-5 w-5" />} />}
          </SidebarGroup>
        )}

        {(hasAccess("/agency-books") || hasAccess("/agencies") || hasAccess("/discounts")) && (
          <SidebarGroup label="Agency & billing">
            {hasAccess("/agency-books") && <NavLink href="/agency-books" label="Agency Books" icon={<BookOpen className="h-5 w-5" />} />}
            {hasAccess("/agencies") && <NavLink href="/agencies" label="Agency" icon={<Landmark className="h-5 w-5" />} />}
            {hasAccess("/discounts") && <NavLink href="/discounts" label="Discount" icon={<TicketIcon className="h-5 w-5" />} />}
          </SidebarGroup>
        )}

        {(hasAccess("/tags") || hasAccess("/sms-playground") || hasAccess("/reports")) && (
          <SidebarGroup label="Other">
            {hasAccess("/tags") && <NavLink href="/tags" label="Tags" icon={<Tags className="h-5 w-5" />} />}
            {hasAccess("/sms-playground") && <NavLink href="/sms-playground" label="SMS Playground" icon={<MessageSquareText className="h-5 w-5" />} />}
            {hasAccess("/reports") && <NavLink href="/reports" label="Reports" icon={<FileText className="h-5 w-5" />} />}
          </SidebarGroup>
        )}
      </nav>
      <div className="shrink-0 border-t border-primary/20 bg-secondary px-3 py-3">
        <p className="text-muted-foreground text-xs">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</p>
      </div>
    </aside>
  );
}
