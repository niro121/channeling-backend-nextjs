import type { Metadata } from 'next';
import Image from 'next/image';
import { InstallSteps } from '@/components/pwa/install-steps';

export const metadata: Metadata = { title: 'Install Management' };

export default function InstallPage() {
  return (
    <div className="app-gradient flex min-h-dvh flex-col px-6 pt-safe pb-safe">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col py-10">
        <div className="flex items-center gap-3">
          <Image src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl" priority />
          <div>
            <p className="font-semibold leading-tight">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Management</p>
            <p className="text-sm text-muted-foreground">Your business at a glance</p>
          </div>
        </div>
        <div className="mt-10">
          <InstallSteps />
        </div>
      </div>
    </div>
  );
}
