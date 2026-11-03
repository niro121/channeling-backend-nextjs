import type { Metadata } from 'next';
import Image from 'next/image';
import { InstallSteps } from '@/components/pwa/install-steps';

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu';

export const metadata: Metadata = {
  title: `Install ${BRAND} Management`,
  description: 'Get the Management app on your phone — channel insights and approvals, with notifications.'
};

/** /install — public, no login needed: the link to send managers. Shows the right steps for the
 * device it's opened on (Android/desktop: one-tap install; iPhone/iPad: Share → Add to Home Screen),
 * and opens the app when it's already installed. Same page as the KLV app's /install. */
export default function InstallPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="rounded-b-[28px] bg-gradient-to-br from-[hsl(152_55%_34%)] via-primary to-[hsl(152_70%_16%)] px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-14 text-center">
        <Image
          src="/icon-192.png"
          alt=""
          width={84}
          height={84}
          priority
          className="mx-auto rounded-[18px] bg-white shadow-[0_4px_10px_rgba(0,0,0,.15)]"
        />
        <h1 className="mt-4 text-[28px] font-bold tracking-[-0.5px] text-white">{BRAND} Management</h1>
        <p className="mx-auto mt-1 max-w-[280px] text-sm text-white/75">
          Channel insights and approvals — with notifications on your phone.
        </p>
      </div>
      <div className="relative -mt-6 flex-1 rounded-t-[21px] bg-background px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-4px_10px_rgba(0,0,0,.06)]">
        <div className="mx-auto w-full max-w-md">
          <InstallSteps />
        </div>
      </div>
    </main>
  );
}
