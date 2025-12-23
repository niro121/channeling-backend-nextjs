import Link from "next/link"
import Image from "next/image"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Profile } from "./profile"
import Providers from "./providers"
import { NavItem } from "./nav-item"
import { FolderSyncIcon, PanelLeft } from "lucide-react"
import { Session } from "next-auth";
import {
  UserGroup,
  FileUser,
  DoubleArrow,
  Earth,
  Article,
  DBIcon,
  // FolderLock,
  SettingIcon,
  AnalyticsIcon,
  StockIcon,
  UserAnalyticsIcon,
} from "@/components/icons"
// import Logo from "../../public/Logo.svg"
import MobileNavItem from "./mobile-nav-item"
import DashboardBreadcrumb from "./breadcrumbs"
import { fetchServerSession } from "@/lib/session"
import { ALL_ROLES } from "@/lib/roles"

async function DesktopNav({ session }: { session: Session | null }) {

  const role = session?.user?.role

  const hasAccess = (path: string) => {
    if (role !== undefined) {
      return ALL_ROLES[role]?.includes(path)
    }

    return
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-20 flex-col border-r bg-black sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <div className="mb-5">
          <Link
            href="/welcome"
            className="group flex shrink-0 items-center justify-center gap-2 text-base text-white md:h-8 md:w-8"
          >
            {/* <Image src={} alt="Home" className="h-5 w-5" unoptimized /> */}
            <span>JP</span>
          </Link>
        </div>
        <NavItem
          href={`${hasAccess("/users") ? "/users" : "unauthorized-access"}`}
          label="Users"
        >
          <UserGroup className="h-5 w-5" />
          <span className="sr-only"></span>
        </NavItem>

        <NavItem
          href={`${hasAccess("/accounts") ? "/accounts" : "unauthorized-access"
            }`}
          label="Accounts"
        >
          <FileUser className="h-5 w-5" />
          <span className="sr-only"></span>
        </NavItem>

        <Tooltip>
          <TooltipTrigger asChild>
            <Menubar className="bg-transparent border-0! cursor-pointer! focus:bg-transparent!">
              <MenubarMenu>
                <MenubarTrigger className="p-0 outline-hidden cursor-pointer! focus:bg-transparent! data-[state=open]:bg-transparent!">
                  <AnalyticsIcon className="h-5 w-5 text-white" />
                </MenubarTrigger>
                <MenubarContent className="bg-black! text-white border-2 border-primary">
                  <Link href="/livestock">
                    <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                      <StockIcon className="h-5 w-5" />
                      <span className="inline-block">Livestock</span>
                    </MenubarItem>
                  </Link>
                  <Link href="/crops">
                    <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                      <StockIcon className="h-5 w-5" />
                      <span className="inline-block">Crops</span>
                    </MenubarItem>
                  </Link>
                  <Link href="/forage">
                    <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                      <StockIcon className="h-5 w-5" />
                      <span className="inline-block">Forage</span>
                    </MenubarItem>
                  </Link>
                  <Link href="/user-data">
                    <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                      <UserAnalyticsIcon className="h-5 w-5" />
                      <span className="inline-block">User-Data</span>
                    </MenubarItem>
                  </Link>
                  <Link href="/user-analytics">
                    <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                      <UserAnalyticsIcon className="h-5 w-5" />
                      <span className="inline-block">User-Analytics</span>
                    </MenubarItem>
                  </Link>
                  <Link href="/download">
                    <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                      <UserAnalyticsIcon className="h-5 w-5" />
                      <span className="inline-block">Download</span>
                    </MenubarItem>
                  </Link>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </TooltipTrigger>
          <TooltipContent side="right">Analytics</TooltipContent>
        </Tooltip>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <NavItem
          href={`${hasAccess("/settings") ? "/settings" : "unauthorized-access"
            }`}
          label="Settings"
        >
          <SettingIcon className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </NavItem>
        <p className="text-white">
          {process.env.APP_VERSION}
        </p>
      </nav>
    </aside>
  )
}

async function MobileNav({ session }: { session: Session | null }) {
  const role = session?.user?.role

  const hasAccess = (path: string) => {
    if (role !== undefined) {
      return ALL_ROLES[role]?.includes(path)
    }

    return
  }

  return (
    <Sheet>
      <div></div>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs bg-black">
        <nav className="grid gap-6 text-lg font-medium">
          <Link
            href="/welcome"
            className="group flex shrink-0 items-center justify-start gap-2 text-base text-white md:h-8 md:w-8"
          >
            {/* <Image src={Logo} alt="Home" className="h-5 w-5" unoptimized /> */}
            <span>JP</span>
          </Link>
          <MobileNavItem
            href={`${hasAccess("/users") ? "/users" : "unauthorized-access"}`}
            label="Users"
          >
            <UserGroup className="h-5 w-5" />
          </MobileNavItem>

          <MobileNavItem
            href={`${hasAccess("/accounts") ? "/accounts" : "unauthorized-access"
              }`}
            label="Accounts"
          >
            <FileUser className="h-5 w-5" />
          </MobileNavItem>

          <Menubar className="bg-transparent border-0! cursor-pointer! focus:bg-transparent! p-0">
            <MenubarMenu>
              <MenubarTrigger className="py-0 px-2.5 outline-hidden cursor-pointer! focus:bg-transparent! data-[state=open]:bg-transparent! flex gap-4">
                <AnalyticsIcon className="h-5 w-5 text-white" />
                <span className="text-white">Analytics</span>
              </MenubarTrigger>
              <MenubarContent className="bg-black! text-white border-2 border-primary">
                <Link href="/livestock">
                  <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                    <StockIcon className="h-5 w-5" />
                    <span className="inline-block">Livestock</span>
                  </MenubarItem>
                </Link>
                <Link href="/crops">
                  <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                    <StockIcon className="h-5 w-5" />
                    <span className="inline-block">Crops</span>
                  </MenubarItem>
                </Link>
                <Link href="/forage">
                  <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                    <StockIcon className="h-5 w-5" />
                    <span className="inline-block">Forage</span>
                  </MenubarItem>
                </Link>
                <Link href="/user-data">
                  <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                    <UserAnalyticsIcon className="h-5 w-5" />
                    <span className="inline-block">User-Data</span>
                  </MenubarItem>
                </Link>
                <Link href="/user-analytics">
                  <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                    <UserAnalyticsIcon className="h-5 w-5" />
                    <span className="inline-block">User-Analytics</span>
                  </MenubarItem>
                </Link>
                <Link href="/download">
                  <MenubarItem className="flex gap-3 items-center hover:bg-primary!">
                    <UserAnalyticsIcon className="h-5 w-5" />
                    <span className="inline-block">Download</span>
                  </MenubarItem>
                </Link>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
          <MobileNavItem
            href={`${hasAccess("/settings") ? "/settings" : "unauthorized-access"
              }`}
            label="Settings"
          >
            <SettingIcon className="h-5 w-5 text-white" />
          </MobileNavItem>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const session = await fetchServerSession();

  return (
    <Providers session={session}>
      <main className="flex min-h-screen w-full flex-col bg-muted/40">
        <DesktopNav session={session} />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-20">
          <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <MobileNav session={session} />
            <DashboardBreadcrumb />
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
  )
}
