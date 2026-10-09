import './globals.css';
import { Toaster } from '@archmage/ui';
import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegister } from './service-worker-register';

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu';

export const metadata: Metadata = {
  title: `${brand} Management`,
  description: `${brand} management statistics`,
  applicationName: `${brand} Management`,
  appleWebApp: { capable: true, title: 'Management', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' }
};

export const viewport: Viewport = {
  themeColor: '#1a7046',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col" suppressHydrationWarning>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
