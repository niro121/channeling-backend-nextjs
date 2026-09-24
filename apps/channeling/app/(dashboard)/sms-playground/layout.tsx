import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';

export default async function SmsPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const canView = await checkRouteAccess('/sms-playground');
  if (!canView) redirect('/unauthorized-access');
  return <>{children}</>;
}
