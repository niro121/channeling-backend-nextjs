import { redirect } from 'next/navigation';

type SearchParams = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

/** Legacy combined financial reports URL — redirect to the matching dedicated report. */
export default async function FinancialReportsRedirectPage({
  searchParams,
}: SearchParams) {
  const params = await searchParams;
  if (params?.tab === 'doctor-payments') {
    redirect('/reports/doctor-payments');
  }
  redirect('/reports/receipts');
}
