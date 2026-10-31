import { redirect } from 'next/navigation';
import { fetchServerSession } from '@/lib/session';
import { IntroSlides } from './intro-slides';

export default async function WelcomePage() {
  const session = await fetchServerSession();
  if (session) redirect('/dashboard');
  return <IntroSlides />;
}
