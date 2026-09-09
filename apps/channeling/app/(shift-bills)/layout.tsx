import type { Metadata, Viewport } from "next"
import { redirect } from "next/navigation"
import { fetchServerSession } from "@/lib/session"
import Providers from "@/app/(dashboard)/providers"
import { ShiftBillsChrome } from "@/app/(shift-bills)/shift-bills-chrome"

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Ruhunu"

export const metadata: Metadata = {
  title: `${brand} Shift bills`,
  description: "Photograph bills for your shift handover",
  manifest: "/shift-bills.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Shift bills",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/shift-bills-icon-192.png",
    icon: [
      { url: "/shift-bills-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/shift-bills-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default async function ShiftBillsLayout({ children }: { children: React.ReactNode }) {
  const session = await fetchServerSession()
  if (!session?.user) {
    redirect("/login?callbackUrl=/shift-bills")
  }

  return (
    <Providers session={session}>
      <ShiftBillsChrome session={session}>{children}</ShiftBillsChrome>
    </Providers>
  )
}
