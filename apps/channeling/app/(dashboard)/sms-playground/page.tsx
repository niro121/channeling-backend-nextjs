import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { redirect } from 'next/navigation';
import SmsPlaygroundContent from './sms-playground-content';

export default async function SmsPlaygroundPage() {
  const canView = await checkRouteAccess('/sms-playground');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'sms-playground.visited',
      entityType: 'SmsPlayground',
      importance: 'low',
    });
  }
  return <SmsPlaygroundContent />;
}
