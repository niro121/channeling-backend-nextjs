import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Profile } from './profile';
import Providers from './providers';
import { PanelLeft, Hospital, UserLock } from "lucide-react";
import { Session } from "next-auth";
import DashboardBreadcrumb from "./breadcrumbs";
import { fetchServerSession } from "@/lib/session";
import { NavLink } from "@/components/common/nav-link";
import {
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
  DollarSign,
  UserCircle,
  Activity,
  MessageCircle,
} from 'lucide-react';
import { UserGroup } from "@/components/icons";
import { canAccessRoute } from "@/lib/permissions";
import { userTypes } from "@/lib/roles";
import { ChannelBookingLayoutClient } from "./channel-booking-layout-client";
import { ChannelBookingShiftBar } from "./channel-booking/shift-bar";
import { SignOutShiftReminder } from "./signout-shift-reminder";
import { NavigationLoadingWrapper } from "./navigation-loading-wrapper";

async function MobileNav({ session }: { session: Session | null }) {
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;

  // userType 1 = admin (backend-user), has access to all routes
  const hasAccess = (path: string) => {
    if (userType === userTypes.admin) {
      return true;
    }

    // Check permissions if user has a user group
    if (permissions) {
      return canAccessRoute(permissions, path);
    }

    return false;
  };

  return (
    <Sheet>
      <div></div>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs w-52 p-0 flex flex-col">
        {/* Sticky header: same height as top nav bar */}
        <div className="flex h-14 shrink-0 items-center border-b border-primary/20 bg-secondary px-3">
          <Link
            href="/welcome"
            className="flex shrink-0 items-center gap-2 text-foreground font-semibold min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Hospital className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex flex-col items-start">
              <span className="truncate w-full text-base leading-tight">Ruhunu Hospital</span>
              <span className="text-xs font-normal text-muted-foreground leading-tight">Channeling</span>
            </span>
          </Link>
        </div>
        {/* Scrollable menu with groups – only show links the user has view permission for */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto flex flex-col gap-6 py-4 px-3 min-h-0">
          {(hasAccess('/channel-booking') || hasAccess('/sessions')) && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Channeling</p>
              <div className="space-y-0.5">
                {hasAccess('/channel-booking') && <NavLink href="/channel-booking" label="Channel Booking" icon={<CalendarCheck className="h-5 w-5" />} />}
                {hasAccess('/sessions') && <NavLink href="/sessions" label="Sessions" icon={<Clock10 className="h-5 w-5" />} />}
              </div>
            </div>
          )}
          {(hasAccess('/doctors') || hasAccess('/doctor-sessions') || hasAccess('/specialities') || hasAccess('/doctor-leaves')) && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Consultants</p>
              <div className="space-y-0.5">
                {hasAccess('/doctors') && <NavLink href="/doctors" label="Doctor" icon={<Stethoscope className="h-5 w-5" />} />}
                {hasAccess('/doctor-sessions') && <NavLink href="/doctor-sessions" label="Doctor Session" icon={<Clock10 className="h-5 w-5" />} />}
                {hasAccess('/doctor-sessions') && <NavLink href="/doctor-sessions/bulk-price-change" label="Bulk Price Change" icon={<DollarSign className="h-5 w-5" />} />}
                {hasAccess('/specialities') && <NavLink href="/specialities" label="Speciality" icon={<StarIcon className="h-5 w-5" />} />}
                {hasAccess('/doctor-leaves') && <NavLink href="/doctor-leaves" label="Doctor Leave" icon={<UserLock className="h-5 w-5" />} />}
              </div>
            </div>
          )}
          {(hasAccess('/departments') || hasAccess('/zones') || hasAccess('/rooms') || hasAccess('/locations')) && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</p>
              <div className="space-y-0.5">
                {hasAccess('/departments') && <NavLink href="/departments" label="Department" icon={<Building2 className="h-5 w-5" />} />}
                {hasAccess('/zones') && <NavLink href="/zones" label="Zones" icon={<MapPinned className="h-5 w-5" />} />}
                {hasAccess('/rooms') && <NavLink href="/rooms" label="Rooms" icon={<LucideHome className="h-5 w-5" />} />}
                {hasAccess('/locations') && <NavLink href="/locations" label="Location" icon={<LocateFixedIcon className="h-5 w-5" />} />}
              </div>
            </div>
          )}
          {(hasAccess("/patients") || hasAccess("/staff") || hasAccess("/users") || hasAccess("/user-groups")) && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">People</p>
              <div className="space-y-0.5">
                {hasAccess("/patients") && <NavLink href="/patients" label="Patients" icon={<UserPlus className="h-5 w-5" />} />}
                {hasAccess("/staff") && <NavLink href="/staff" label="Staff" icon={<UserCircle className="h-5 w-5" />} />}
                {hasAccess('/users') && <NavLink href="/users" label="Users" icon={<UserGroup className="h-5 w-5" />} />}
                {hasAccess('/user-groups') && <NavLink href="/user-groups" label="User Groups" icon={<Users className="h-5 w-5" />} />}
              </div>
            </div>
          )}
          {(hasAccess("/agency-books") || hasAccess("/agencies") || hasAccess("/discounts")) && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Agency & billing</p>
              <div className="space-y-0.5">
                {hasAccess("/agency-books") && <NavLink href="/agency-books" label="Agency Books" icon={<BookOpen className="h-5 w-5" />} />}
                {hasAccess("/agencies") && <NavLink href="/agencies" label="Agency" icon={<Landmark className="h-5 w-5" />} />}
                {hasAccess('/discounts') && <NavLink href="/discounts" label="Discount" icon={<TicketIcon className="h-5 w-5" />} />}
              </div>
            </div>
          )}
          {(hasAccess("/tags") || hasAccess('/sms-playground') || hasAccess('/sms-templates') || hasAccess('/reports')) && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Other</p>
              <div className="space-y-0.5">
                {hasAccess("/tags") && <NavLink href="/tags" label="Tags" icon={<Tags className="h-5 w-5" />} />}
                {hasAccess('/sms-playground') && <NavLink href="/sms-playground" label="SMS Playground" icon={<MessageSquareText className="h-5 w-5" />} />}
                {hasAccess('/sms-templates') && <NavLink href="/sms-templates" label="SMS Templates" icon={<MessageSquareText className="h-5 w-5" />} />}
                {hasAccess('/reports') && <NavLink href="/reports" label="Reports" icon={<FileText className="h-5 w-5" />} />}
              </div>
            </div>
          )}
          {userType === userTypes.admin && (
            <div className="space-y-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Admin</p>
              <div className="space-y-0.5">
                <NavLink href="/admin/monitor" label="Server Monitor" icon={<Activity className="h-5 w-5" />} />
                <NavLink href="/reports/sms-activity" label="SMS Activity" icon={<MessageCircle className="h-5 w-5" />} />
              </div>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await fetchServerSession();

  // If no session, redirect to login (this should be handled by middleware, but adding as safety)
  if (!session || !session.user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  return (
    <Providers session={session}>
      <NavigationLoadingWrapper>
        <SignOutShiftReminder />
        <div className="flex min-h-screen w-full flex-col bg-background">
          <ChannelBookingLayoutClient session={session}>
            <header className="sticky top-0 z-40 flex h-14 shrink-0 flex-nowrap items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
              <MobileNav session={session} />
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-4 overflow-hidden">
                <DashboardBreadcrumb />
                <ChannelBookingShiftBar />
              </div>
              <div className="shrink-0">
                <Profile />
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-6">
              {children}
            </main>
          </ChannelBookingLayoutClient>
        </div>
      </NavigationLoadingWrapper>
    </Providers>
  );
}
