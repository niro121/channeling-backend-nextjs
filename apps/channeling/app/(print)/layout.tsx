import Providers from "@/app/(dashboard)/providers"
import { fetchServerSession } from "@/lib/session"
import { redirect } from "next/navigation"

/** Printable pages: no sidebar or header, just the content. */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await fetchServerSession()
  if (!session?.user) redirect("/login")
  return (
    <Providers session={session}>
      <div className="min-h-dvh bg-white text-black">{children}</div>
    </Providers>
  )
}
