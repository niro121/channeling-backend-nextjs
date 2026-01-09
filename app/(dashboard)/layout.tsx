import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Profile } from './profile';
import Providers from './providers';
import {
  PanelLeft,
  Stethoscope,
  Building2,
  StarIcon,
  LocateFixedIcon,
  LucideHome
} from 'lucide-react';
import { Session } from 'next-auth';
import { UserGroup } from '@/components/icons';
import DashboardBreadcrumb from './breadcrumbs';
import { fetchServerSession } from '@/lib/session';
import { NavLink } from '@/components/common/nav-link';

async function DesktopNav({ session }: { session: Session | null }) {
  const userType = session?.user?.userType;

  // userType 1 = admin (backend-user), has access to all routes
  const hasAccess = (path: string) => {
    if (userType === 1) {
      return true;
    }

    return false;
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 flex flex-col border-r bg-[#01012A] sm:flex overflow-hidden">
      <nav className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-stretch gap-2 px-3 sm:py-5">
        {/* // =========================== LOGO =========================== */}
        <div className="mb-1 shrink-0">
          <Link
            href="/welcome"
            className="group flex shrink-0 items-center justify-center text-base text-white"
          >
            <span className="text-xl font-bold">RUHUNU</span>
          </Link>
        </div>
        <div className="mb-2 px-1 shrink-0">
          <div className="h-px bg-white/10" />
        </div>

        {/* // =========================== USERS =========================== */}
        <NavLink
          href={hasAccess('/users') ? '/users' : 'unauthorized-access'}
          label="Users"
          icon={<UserGroup className="h-5 w-5" />}
        />

        {/* // =========================== DOCTOR =========================== */}
        <NavLink
          href={hasAccess('/doctors') ? '/doctors' : 'unauthorized-access'}
          label="Doctor"
          icon={<Stethoscope className="h-5 w-5" />}
        />

        {/* // =========================== DEPARTMENT =========================== */}
        <NavLink
          href={
            hasAccess('/departments') ? '/departments' : 'unauthorized-access'
          }
          label="Department"
          icon={<Building2 className="h-5 w-5" />}
        />

        {/* // =========================== ROSTERS =========================== */}
        <NavLink
          href={hasAccess('/rosters') ? '/rosters' : 'unauthorized-access'}
          label="Rosters"
          icon={<Building2 className="h-5 w-5" />}
        />

        {/* // =========================== PATIENTS =========================== */}
        <NavLink
          href={hasAccess('/patients') ? '/patients' : 'unauthorized-access'}
          label="Patients"
          icon={<Building2 className="h-5 w-5" />}
        />

        {/* // =========================== TAGS =========================== */}
        <NavLink
          href={hasAccess('/tags') ? '/tags' : 'unauthorized-access'}
          label="Tags"
          icon={<Building2 className="h-5 w-5" />}
        />

        {/* // =========================== ZONES =========================== */}
        <NavLink
          href={hasAccess('/zones') ? '/zones' : 'unauthorized-access'}
          label="Zones"
          icon={<Building2 className="h-5 w-5" />}
        />

        {/* // =========================== ROOMS =========================== */}
        <NavLink
          href={hasAccess('/rooms') ? '/rooms' : 'unauthorized-access'}
          label="Rooms"
          icon={<LucideHome className="h-5 w-5" />}
        />

        {/* // =========================== SPECIALITY =========================== */}
        <NavLink
          href={
            hasAccess('/specialities') ? '/specialities' : 'unauthorized-access'
          }
          label="Speciality"
          icon={<StarIcon className="h-5 w-5" />}
        />

        {/* // =========================== LOCATION =========================== */}
        <NavLink
          href={hasAccess('/locations') ? '/locations' : 'unauthorized-access'}
          label="Location"
          icon={<LocateFixedIcon className="h-5 w-5" />}
        />
      </nav>
      <nav className="shrink-0 flex flex-col items-center gap-4 px-2 sm:py-5 border-t border-white/10">
        <p className="text-white text-sm">{process.env.APP_VERSION}</p>
      </nav>
    </aside>
  );
}

async function MobileNav({ session }: { session: Session | null }) {
  const userType = session?.user?.userType;

  // userType 1 = admin (backend-user), has access to all routes
  const hasAccess = (path: string) => {
    if (userType === 1) {
      return true;
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
      <SheetContent side="left" className="sm:max-w-xs bg-[#01012A]">
        {/* // =========================== LOGO =========================== */}
        <nav className="grid gap-6 text-lg font-medium">
          <Link
            href="/welcome"
            className="group flex shrink-0 items-center justify-center text-base text-white"
          >
            <span className="text-xl font-bold">JP</span>
          </Link>

          {/* // =========================== USERS =========================== */}
          <NavLink
            href={hasAccess('/users') ? '/users' : 'unauthorized-access'}
            label="Users"
            icon={<UserGroup className="h-5 w-5" />}
          />

          {/* // =========================== DOCTOR =========================== */}
          <NavLink
            href={hasAccess('/doctors') ? '/doctors' : 'unauthorized-access'}
            label="Doctor"
            icon={<Stethoscope className="h-5 w-5" />}
          />

          {/* // =========================== DEPARTMENT =========================== */}
          <NavLink
            href={
              hasAccess('/departments') ? '/departments' : 'unauthorized-access'
            }
            label="Department"
            icon={<Building2 className="h-5 w-5" />}
          />

          {/* // =========================== ROSTERS =========================== */}
          <NavLink
            href={hasAccess('/rosters') ? '/rosters' : 'unauthorized-access'}
            label="Rosters"
            icon={<Building2 className="h-5 w-5" />}
          />

          {/* // =========================== PATIENTS =========================== */}
          <NavLink
            href={hasAccess('/patients') ? '/patients' : 'unauthorized-access'}
            label="Patients"
            icon={<Building2 className="h-5 w-5" />}
          />

          {/* // =========================== TAGS =========================== */}
          <NavLink
            href={hasAccess('/tags') ? '/tags' : 'unauthorized-access'}
            label="Tags"
            icon={<Building2 className="h-5 w-5" />}
          />

          {/* // =========================== ZONES =========================== */}
          <NavLink
            href={hasAccess('/zones') ? '/zones' : 'unauthorized-access'}
            label="Zones"
            icon={<Building2 className="h-5 w-5" />}
          />
          {/* // =========================== SPECIALITY =========================== */}
          <NavLink
            href={
              hasAccess('/specialities')
                ? '/specialities'
                : 'unauthorized-access'
            }
            label="Speciality"
            icon={<StarIcon className="h-5 w-5" />}
          />

          {/* // =========================== LOCATION =========================== */}
          <NavLink
            href={
              hasAccess('/locations') ? '/locations' : 'unauthorized-access'
            }
            label="Location"
            icon={<LocateFixedIcon className="h-5 w-5" />}
          />
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
      <main className="flex min-h-screen w-full flex-col bg-muted/40">
        <DesktopNav session={session} />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-56 relative">
          <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <MobileNav session={session} />
            <div className="flex-1 min-w-0 mr-4 relative z-0">
              <DashboardBreadcrumb />
            </div>
            <div className="mr-4 ml-4 sm:ml-auto relative flex-1 md:grow-0">
              {/* <SearchInput
                name="search"
                placeholder={"Search..."}
                className={
                  "w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                }
              /> */}
            </div>
            <Profile />
          </header>
          <main className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4 bg-muted/40">
            {children}
          </main>
        </div>
      </main>
    </Providers>
  );
}
