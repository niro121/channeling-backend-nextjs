// Reports require auth; avoid static prerender so permission checks run at request time.
export const dynamic = 'force-dynamic';

export default function ReportsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
