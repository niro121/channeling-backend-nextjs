import './globals.css';
import { Toaster } from '@archmage/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} DPAY`,
  description: `${process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Doctor Payment Management`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
