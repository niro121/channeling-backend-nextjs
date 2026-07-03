import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Channeling`,
  description: `${process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Channeling System`,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '512x512', type: 'image/x-icon' },
    ],
    
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
      <Analytics />
    </html>
  );
}
