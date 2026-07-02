import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Archmage HRM',
  description: 'Human Resource Management',
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
      </body>
    </html>
  );
}
