import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  ShortlistingFilters,
  ShortlistingRecord
} from '@/types/recruitment';
import ShortlistingWorkspace from './shortlisting-workspace';
import {
  SAMPLE_SHORTLISTING,
  SAMPLE_SHORTLISTING_SUMMARY
} from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    jobPostId?: string;
    department?: string;
    designation?: string;
    candidateName?: string;
    applicationDate?: string;
    experience?: string;
    status?: string;
    search?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function matchesExperience(years: number, experience?: string): boolean {
  if (!experience) return true;
  switch (experience) {
    case '0-1':
      return years >= 0 && years <= 1;
    case '1-3':
      return years > 1 && years <= 3;
    case '3-5':
      return years > 3 && years <= 5;
    case '5+':
      return years > 5;
    default:
      return true;
  }
}

function filterShortlisting(
  records: ShortlistingRecord[],
  filters: ShortlistingFilters
): ShortlistingRecord[] {
  const jobPostId = filters.jobPostId?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const designation = filters.designation?.toLowerCase();
  const candidateName = filters.candidateName?.toLowerCase();
  const status = filters.status?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (jobPostId && row.jobPostId.toLowerCase() !== jobPostId) return false;
    if (department && row.department.toLowerCase() !== department) {
      return false;
    }
    if (designation && row.designation.toLowerCase() !== designation) {
      return false;
    }
    if (
      candidateName &&
      !row.candidateName.toLowerCase().includes(candidateName)
    ) {
      return false;
    }
    if (
      filters.applicationDate &&
      row.appliedDate !== filters.applicationDate
    ) {
      return false;
    }
    if (!matchesExperience(row.experienceYears, filters.experience)) {
      return false;
    }
    if (status && row.shortlistStatus.toLowerCase() !== status) return false;
    if (search) {
      const haystack = [
        row.applicationId,
        row.candidateName,
        row.jobTitle,
        row.department,
        row.designation,
        row.qualifications,
        row.skills.join(' '),
        row.shortlistStatus,
        row.currentStage
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export default async function ShortlistingPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/shortlisting');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'shortlisting.visited',
      entityType: 'Shortlisting',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: ShortlistingFilters = {
    jobPostId: normalizeFilter(params?.jobPostId),
    department: normalizeFilter(params?.department),
    designation: normalizeFilter(params?.designation),
    candidateName: normalizeFilter(params?.candidateName),
    applicationDate: normalizeFilter(params?.applicationDate),
    experience: normalizeFilter(params?.experience),
    status: normalizeFilter(params?.status),
    search: normalizeFilter(params?.search)
  };

  const filtered = filterShortlisting(SAMPLE_SHORTLISTING, filters);
  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = filtered.slice(start, start + pageSize);

  return (
    <ShortlistingWorkspace
      initialRecords={pageRecords}
      totalRecords={filtered.length}
      summary={SAMPLE_SHORTLISTING_SUMMARY}
      page={params?.page}
      initialFilters={filters}
    />
  );
}
