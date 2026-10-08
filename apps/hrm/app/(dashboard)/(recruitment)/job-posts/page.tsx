import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type { JobPostFilters, JobPostRecord } from '@/types/recruitment';
import JobPostsWorkspace from './job-posts-workspace';
import { SAMPLE_JOB_POSTS, SAMPLE_JOB_POST_SUMMARY } from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    jobTitle?: string;
    department?: string;
    designation?: string;
    employmentType?: string;
    status?: string;
    postedDate?: string;
    closingDate?: string;
    search?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function filterJobPosts(
  records: JobPostRecord[],
  filters: JobPostFilters
): JobPostRecord[] {
  const jobTitle = filters.jobTitle?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const designation = filters.designation?.toLowerCase();
  const employmentType = filters.employmentType?.toLowerCase();
  const status = filters.status?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (jobTitle && !row.jobTitle.toLowerCase().includes(jobTitle)) {
      return false;
    }
    if (department && row.department.toLowerCase() !== department) {
      return false;
    }
    if (designation && row.designation.toLowerCase() !== designation) {
      return false;
    }
    if (
      employmentType &&
      row.employmentType.toLowerCase() !== employmentType
    ) {
      return false;
    }
    if (status && row.status.toLowerCase() !== status) {
      return false;
    }
    if (filters.postedDate && row.postedDate !== filters.postedDate) {
      return false;
    }
    if (filters.closingDate && row.closingDate !== filters.closingDate) {
      return false;
    }
    if (search) {
      const haystack = [
        row.jobPostId,
        row.jobTitle,
        row.department,
        row.designation,
        row.employmentType,
        row.status
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export default async function JobPostsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/job-posts');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'job-posts.visited',
      entityType: 'JobPost',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: JobPostFilters = {
    jobTitle: normalizeFilter(params?.jobTitle),
    department: normalizeFilter(params?.department),
    designation: normalizeFilter(params?.designation),
    employmentType: normalizeFilter(params?.employmentType),
    status: normalizeFilter(params?.status),
    postedDate: normalizeFilter(params?.postedDate),
    closingDate: normalizeFilter(params?.closingDate),
    search: normalizeFilter(params?.search)
  };

  const filtered = filterJobPosts(SAMPLE_JOB_POSTS, filters);
  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = filtered.slice(start, start + pageSize);

  return (
    <JobPostsWorkspace
      initialRecords={pageRecords}
      totalRecords={filtered.length}
      summary={SAMPLE_JOB_POST_SUMMARY}
      page={params?.page}
      initialFilters={filters}
    />
  );
}
