import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  ResumeBankFilters,
  ResumeBankRecord
} from '@/types/recruitment';
import ResumeBankWorkspace from './resume-bank-workspace';
import {
  SAMPLE_RESUME_BANK,
  SAMPLE_RESUME_BANK_SUMMARY
} from './sample-data';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    skills?: string;
    qualification?: string;
    location?: string;
    candidateName?: string;
    experience?: string;
    designation?: string;
    department?: string;
    source?: string;
    search?: string;
  }>;
};

function normalizeFilter(value?: string): string | undefined {
  if (!value || value === '__all__') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function matchesExperience(
  years: number,
  experience?: string
): boolean {
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

function filterResumeBank(
  records: ResumeBankRecord[],
  filters: ResumeBankFilters
): ResumeBankRecord[] {
  const skills = filters.skills?.toLowerCase();
  const qualification = filters.qualification?.toLowerCase();
  const location = filters.location?.toLowerCase();
  const candidateName = filters.candidateName?.toLowerCase();
  const designation = filters.designation?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const source = filters.source?.toLowerCase();
  const search = filters.search?.toLowerCase();

  return records.filter((row) => {
    if (
      skills &&
      !row.skills.some((skill) => skill.toLowerCase().includes(skills)) &&
      !row.skills.join(', ').toLowerCase().includes(skills)
    ) {
      return false;
    }
    if (
      qualification &&
      !row.qualifications.toLowerCase().includes(qualification)
    ) {
      return false;
    }
    if (location && !row.location.toLowerCase().includes(location)) {
      return false;
    }
    if (
      candidateName &&
      !row.candidateName.toLowerCase().includes(candidateName)
    ) {
      return false;
    }
    if (!matchesExperience(row.experienceYears, filters.experience)) {
      return false;
    }
    if (
      designation &&
      !row.preferredPosition.toLowerCase().includes(designation)
    ) {
      return false;
    }
    if (
      department &&
      !row.preferredDepartment.toLowerCase().includes(department)
    ) {
      return false;
    }
    if (source && row.source.toLowerCase() !== source) return false;
    if (search) {
      const haystack = [
        row.candidateName,
        row.email,
        row.qualifications,
        row.preferredPosition,
        row.preferredDepartment,
        row.location,
        row.skills.join(' '),
        row.resumeFileName
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export default async function ResumeBankPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/resume-bank');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'resume_bank.visited',
      entityType: 'ResumeBank',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const filters: ResumeBankFilters = {
    skills: normalizeFilter(params?.skills),
    qualification: normalizeFilter(params?.qualification),
    location: normalizeFilter(params?.location),
    candidateName: normalizeFilter(params?.candidateName),
    experience: normalizeFilter(params?.experience),
    designation: normalizeFilter(params?.designation),
    department: normalizeFilter(params?.department),
    source: normalizeFilter(params?.source),
    search: normalizeFilter(params?.search)
  };

  const filtered = filterResumeBank(SAMPLE_RESUME_BANK, filters);
  const pageSize = process.env.DEFAULT_PER_PAGE
    ? Number(process.env.DEFAULT_PER_PAGE)
    : 10;
  const pageNumber = params?.page ? Math.max(1, Number(params.page) || 1) : 1;
  const start = (pageNumber - 1) * pageSize;
  const pageRecords = filtered.slice(start, start + pageSize);

  return (
    <ResumeBankWorkspace
      initialRecords={pageRecords}
      totalRecords={filtered.length}
      summary={SAMPLE_RESUME_BANK_SUMMARY}
      page={params?.page}
      initialFilters={filters}
    />
  );
}
