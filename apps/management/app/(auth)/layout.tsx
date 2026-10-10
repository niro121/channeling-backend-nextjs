import Image from 'next/image';

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu';

/** Phones and iPads: a full-screen app sign-in. Large screens: brand panel + form. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-gradient grid min-h-dvh lg:grid-cols-2 lg:bg-none">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary/15 via-secondary to-muted p-10 lg:flex">
        <div className="flex items-center gap-3 font-semibold">
          <Image src="/icon-192.png" alt="" width={36} height={36} className="rounded-lg" />
          <span className="text-xl">{brand} Management</span>
        </div>
        <div className="space-y-3">
          <p className="text-4xl font-medium leading-tight tracking-tight">Your business,<br />at a glance.</p>
          <p className="max-w-sm text-muted-foreground">Channeling, HR and doctor payments in one view — on your desk, phone or iPad.</p>
        </div>
        <div className="text-sm text-muted-foreground">{brand} Management · Secure access for management</div>
      </div>
      <div className="flex flex-col px-6 pt-safe pb-safe lg:items-center lg:justify-center lg:p-12">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col lg:flex-none">
          <div className="flex items-center gap-3 pt-10 lg:hidden">
            <Image src="/icon-192.png" alt="" width={44} height={44} className="rounded-xl shadow-md shadow-primary/20" priority />
            <span className="font-semibold leading-tight">{brand}<br /><span className="text-sm font-normal text-muted-foreground">Management</span></span>
          </div>
          <div className="flex flex-1 flex-col pb-8 pt-10 lg:pt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
