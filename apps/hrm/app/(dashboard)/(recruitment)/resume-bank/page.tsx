import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import {
  getResumeBankExport,
  getResumeBankFormOptionsAction,
  getResumeBankProfilesAction,
  getResumeBankSummaryAction
} from '@/app/actions/recruitment-actions/resume-bank.actions';
import {
  APPLICATION_SOURCE_LABELS,
  RESUME_BANK_STATUS_LABELS,
  type ApplicationSource,
  type ResumeBankFilters,
  type ResumeBankStatus,
  type ResumeBankSummary,
  type VacancySelectOption
} from '@/types/recruitment';
import ResumeBankWorkspace from './resume-bank-workspace';

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

const EMPTY_SUMMARY: ResumeBankSummary = {
  profilesInBank: 0,
  addedThisMonth: 0,
  linkedToApplications: 0,
  clinicalProfilesPercent: 0
};

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
      entityType: 'ResumeBankProfile',
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

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getResumeBankProfilesAction({
      ...filters,
      page: params?.page,
      limit: process.env.DEFAULT_PER_PAGE
    }),
    getResumeBankSummaryAction(),
    getResumeBankFormOptionsAction()
  ]);

  const records = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const departmentOptions: VacancySelectOption[] =
    optionsRes.data?.departments ?? [];
  const designationOptions: VacancySelectOption[] =
    optionsRes.data?.designations ?? [];
  const publishedJobPosts = optionsRes.data?.publishedJobPosts ?? [];

  const handleExport = async () => {
    'use server';

    const exportResponse = await getResumeBankExport({
      skills: filters.skills,
      qualification: filters.qualification,
      location: filters.location,
      candidateName: filters.candidateName,
      experience: filters.experience,
      designation: filters.designation,
      department: filters.department,
      source: filters.source,
      search: filters.search
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No candidates found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row) => ({
        profileId: row.profileId || '-',
        candidateName: row.candidateName || '-',
        resumeFileName: row.resumeFileName || '-',
        email: row.email || '-',
        phone: row.phone || '-',
        qualifications: row.qualifications || '-',
        experienceYears: `${row.experienceYears} yrs`,
        skills: row.skills.join(', ') || '-',
        preferredPosition: row.preferredPosition || '-',
        preferredDepartment: row.preferredDepartment || '-',
        location: row.location || '-',
        source:
          APPLICATION_SOURCE_LABELS[row.source as ApplicationSource] ??
          row.source ??
          '-',
        dateAdded: row.dateAdded ? formatDate(row.dateAdded) : '-',
        status:
          RESUME_BANK_STATUS_LABELS[row.status as ResumeBankStatus] ??
          row.status ??
          '-',
        createdAt: row.createdAt ? formatDateTime(row.createdAt) : '-',
        updatedAt: row.updatedAt ? formatDateTime(row.updatedAt) : '-'
      }))
    };
  };

  return (
    <ResumeBankWorkspace
      initialRecords={records}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      publishedJobPosts={publishedJobPosts}
      onExport={handleExport}
    />
  );
}
