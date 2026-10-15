import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';

/** App entry (the PWA's start_url): signed in → dashboard, otherwise the intro / sign-in. */
export default async function RootPage() {
  const session = await fetchServerSession();
  redirect(session ? '/dashboard' : '/welcome');
}
