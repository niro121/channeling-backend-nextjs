import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  AppointmentLetterFilters,
  AppointmentLetterRecord
} from '@/types/recruitment';
import AppointmentLettersWorkspace from './appointment-letters-workspace';
import {
  SAMPLE_APPOINTMENT_LETTERS,
  SAMPLE_APPOINTMENT_LETTER_SUMMARY
} from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    letterNumber?: string;
    candidateName?: string;
    position?: string;
    department?: string;
    letterDate?: string;
    status?: string;
    search?: string;
    evaluationId?: string;
    candidate?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function filterLetters(
  records: AppointmentLetterRecord[],
  filters: AppointmentLetterFilters
): AppointmentLetterRecord[] {
  const letterNumber = filters.letterNumber?.toLowerCase();
  const candidateName = filters.candidateName?.toLowerCase();
  const position = filters.position?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const status = filters.status?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (
      letterNumber &&
      !row.letterNumber.toLowerCase().includes(letterNumber)
    ) {
      return false;
    }
    if (
      candidateName &&
      !row.candidateName.toLowerCase().includes(candidateName)
    ) {
      return false;
    }
    if (position && !row.position.toLowerCase().includes(position)) {
      return false;
    }
    if (department && row.department.toLowerCase() !== department) {
      return false;
    }
    if (filters.letterDate && row.letterDate !== filters.letterDate) {
      return false;
    }
    if (status && row.status.toLowerCase() !== status) return false;
    if (search) {
      const haystack = [
        row.letterNumber,
        row.candidateName,
        row.position,
        row.department,
        row.salary
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export default async function AppointmentLettersPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/appointment-letters');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'appointment_letters.visited',
      entityType: 'AppointmentLetter',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: AppointmentLetterFilters = {
    letterNumber: normalizeFilter(params?.letterNumber),
    candidateName:
      normalizeFilter(params?.candidateName) ??
      normalizeFilter(params?.candidate),
    position: normalizeFilter(params?.position),
    department: normalizeFilter(params?.department),
    letterDate: normalizeFilter(params?.letterDate),
    status: normalizeFilter(params?.status),
    search: normalizeFilter(params?.search)
  };

  let filtered = filterLetters(SAMPLE_APPOINTMENT_LETTERS, filters);
  if (params?.evaluationId) {
    const byEval = SAMPLE_APPOINTMENT_LETTERS.filter(
      (r) => r.evaluationId === params.evaluationId
    );
    if (byEval.length) filtered = byEval;
  }

  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = filtered.slice(start, start + pageSize);

  return (
    <AppointmentLettersWorkspace
      initialRecords={pageRecords}
      totalRecords={filtered.length}
      summary={SAMPLE_APPOINTMENT_LETTER_SUMMARY}
      page={params?.page}
      initialFilters={filters}
    />
  );
}
