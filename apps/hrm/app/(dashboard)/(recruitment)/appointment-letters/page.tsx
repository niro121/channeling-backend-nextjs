import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getAppointmentLetterFormOptionsAction,
  getAppointmentLetterSummaryAction,
  getAppointmentLettersAction
} from '@/app/actions/recruitment-actions/appointment-letter.actions';
import { getEvaluationByIdAction } from '@/app/actions/recruitment-actions/evaluation.actions';
import type {
  AppointmentLetterFilters,
  AppointmentLetterRecord,
  AppointmentLetterSummary,
  VacancySelectOption
} from '@/types/recruitment';
import AppointmentLettersWorkspace from './appointment-letters-workspace';

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

const EMPTY_SUMMARY: AppointmentLetterSummary = {
  offersExtended: 0,
  pendingApproval: 0,
  accepted: 0,
  declined: 0
};

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
  const evaluationId = normalizeFilter(params?.evaluationId);
  const filters: AppointmentLetterFilters = {
    letterNumber: normalizeFilter(params?.letterNumber),
    candidateName:
      normalizeFilter(params?.candidateName) ??
      normalizeFilter(params?.candidate),
    position: normalizeFilter(params?.position),
    department: normalizeFilter(params?.department),
    letterDate: normalizeFilter(params?.letterDate),
    status: normalizeFilter(params?.status),
    search: normalizeFilter(params?.search),
    evaluationId
  };

  const [listRes, summaryRes, optionsRes] = await Promise.all([
    getAppointmentLettersAction({
      ...filters,
      page: params?.page,
      limit: process.env.DEFAULT_PER_PAGE
    }),
    getAppointmentLetterSummaryAction(),
    getAppointmentLetterFormOptionsAction()
  ]);

  const pageRecords = listRes.isError ? [] : (listRes.data?.data ?? []);
  const totalRecords = listRes.isError
    ? 0
    : (listRes.data?.totalRecords ?? 0);
  const summary = summaryRes.isError
    ? EMPTY_SUMMARY
    : (summaryRes.data ?? EMPTY_SUMMARY);
  const evaluationOptions: VacancySelectOption[] = optionsRes.isError
    ? []
    : (optionsRes.data?.evaluations ?? []);

  let createPrefill: Partial<AppointmentLetterRecord> | null = null;
  if (evaluationId && pageRecords.length === 0) {
    const evalRes = await getEvaluationByIdAction(evaluationId);
    if (!evalRes.isError && evalRes.data) {
      createPrefill = {
        evaluationId: evalRes.data.id,
        evaluationCode: evalRes.data.evaluationCode,
        candidateName: evalRes.data.candidateName,
        position: evalRes.data.jobTitle,
        applicationRefId: evalRes.data.applicationRefId,
        applicationId: evalRes.data.applicationId
      };
    }
  }

  return (
    <AppointmentLettersWorkspace
      initialRecords={pageRecords}
      totalRecords={totalRecords}
      summary={summary}
      page={params?.page}
      initialFilters={filters}
      evaluationOptions={evaluationOptions}
      createPrefill={createPrefill}
    />
  );
}
