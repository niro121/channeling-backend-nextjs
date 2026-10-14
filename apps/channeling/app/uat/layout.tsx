import Link from "next/link";

export default function UatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="no-print flex flex-wrap gap-x-4 gap-y-1 border-b border-border px-4 py-2 text-sm print:hidden">
        <Link href="/uat" className="font-medium underline-offset-2 hover:underline">
          Guided UAT
        </Link>
        <Link href="/uat/cashier-summary" className="font-medium underline-offset-2 hover:underline">
          Cashier summary
        </Link>
        <Link href="/uat/call-center" className="font-medium underline-offset-2 hover:underline">
          Call center
        </Link>
      </nav>
      {children}
    </div>
  );
}
