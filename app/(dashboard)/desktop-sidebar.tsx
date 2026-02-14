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
  DollarSign
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
        <SidebarGroup label="Channelling">
          <NavLink
            href={hasAccess("/channel-booking") ? "/channel-booking" : "unauthorized-access"}
            label="Channel Booking"
            icon={<CalendarCheck className="h-5 w-5" />}
          />
          <NavLink
            href={hasAccess("/sessions") ? "/sessions" : "unauthorized-access"}
            label="Sessions"
            icon={<Clock10 className="h-5 w-5" />}
          />
        </SidebarGroup>

        <SidebarGroup label="Consultants">
          <NavLink href={hasAccess("/doctors") ? "/doctors" : "unauthorized-access"} label="Doctor" icon={<Stethoscope className="h-5 w-5" />} />
          <NavLink href={hasAccess("/doctor-sessions") ? "/doctor-sessions" : "unauthorized-access"} label="Doctor Session" icon={<Clock10 className="h-5 w-5" />} />
          <NavLink href={hasAccess("/doctor-sessions") ? "/doctor-sessions/bulk-price-change" : "unauthorized-access"} label="Bulk Price Change" icon={<DollarSign className="h-5 w-5" />} />
          <NavLink href={hasAccess("/specialities") ? "/specialities" : "unauthorized-access"} label="Speciality" icon={<StarIcon className="h-5 w-5" />} />
          <NavLink href={hasAccess('/doctor-leaves') ? '/doctor-leaves' : 'unauthorized-access'} label="Doctor Leave" icon={<UserLock className="h-5 w-5" />} />
        </SidebarGroup>

        <SidebarGroup label="Organization">
          <NavLink href={hasAccess("/departments") ? "/departments" : "unauthorized-access"} label="Department" icon={<Building2 className="h-5 w-5" />} />
          <NavLink href={hasAccess("/zones") ? "/zones" : "unauthorized-access"} label="Zones" icon={<MapPinned className="h-5 w-5" />} />
          <NavLink href={hasAccess("/rooms") ? "/rooms" : "unauthorized-access"} label="Rooms" icon={<LucideHome className="h-5 w-5" />} />
          <NavLink href={hasAccess("/locations") ? "/locations" : "unauthorized-access"} label="Location" icon={<LocateFixedIcon className="h-5 w-5" />} />
        </SidebarGroup>

        <SidebarGroup label="People">
          <NavLink href={hasAccess("/patients") ? "/patients" : "unauthorized-access"} label="Patients" icon={<UserPlus className="h-5 w-5" />} />
          <NavLink href={hasAccess("/users") ? "/users" : "unauthorized-access"} label="Users" icon={<UserGroup className="h-5 w-5" />} />
          <NavLink href={hasAccess("/user-groups") ? "/user-groups" : "unauthorized-access"} label="User Groups" icon={<Users className="h-5 w-5" />} />
        </SidebarGroup>

        <SidebarGroup label="Agency & billing">
          <NavLink href={hasAccess("/agency-books") ? "/agency-books" : "unauthorized-access"} label="Agency Books" icon={<BookOpen className="h-5 w-5" />} />
          <NavLink href={hasAccess("/agencies") ? "/agencies" : "unauthorized-access"} label="Agency" icon={<Landmark className="h-5 w-5" />} />
          <NavLink href={hasAccess("/discounts") ? "/discounts" : "unauthorized-access"} label="Discount" icon={<TicketIcon className="h-5 w-5" />} />
        </SidebarGroup>

        <SidebarGroup label="Other">
          <NavLink href={hasAccess("/tags") ? "/tags" : "unauthorized-access"} label="Tags" icon={<Tags className="h-5 w-5" />} />
          <NavLink href={hasAccess("/sms-playground") ? "/sms-playground" : "unauthorized-access"} label="SMS Playground" icon={<MessageSquareText className="h-5 w-5" />} />
          <NavLink href={hasAccess("/reports") ? "/reports" : "unauthorized-access"} label="Reports" icon={<FileText className="h-5 w-5" />} />
        </SidebarGroup>
      </nav>
      <div className="shrink-0 border-t border-primary/20 bg-secondary px-3 py-3">
        <p className="text-muted-foreground text-xs">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</p>
      </div>
    </aside>
  );
}
