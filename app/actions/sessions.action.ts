"use server"

import {
  getDoctorsForSessionsService,
  getAllSessionsService,
  analyseSessionsService,
  updateSessionService,
  deleteSessionService,
} from '@/services/sessions';
import { getSessionParams, getSessionQuery } from "@/types/sessions";
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { parseSessionDateTime, timeToMinutes, calculateDurationMinutes } from '@/lib/utils';

// ==== GET SESSIONS ==== //
export const getAllSessions = async (sort: getSessionParams) => {
  // Check view permission
  await requirePermission('sessions', 'view');

  try {
    const parseDate = (s: string | undefined): Date | undefined => {
      if (!s) return undefined;
      const dateStr = s.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? undefined : d;
    };

    let parsedDate: Date | undefined;
    if (sort.date) {
      parsedDate = parseDate(sort.date);
      if (!parsedDate) {
        return { success: false, message: 'Invalid date format', data: [], totalRecords: 0 };
      }
    }

    const parsedFrom = parseDate(sort.fromDate);
    const parsedTo = parseDate(sort.toDate);

    const validDoctorId =
      sort.doctorId && sort.doctorId !== '__all__' && sort.doctorId !== '-1' && /^[a-fA-F0-9]{24}$/.test(sort.doctorId)
        ? sort.doctorId
        : undefined;

    const newFilter: getSessionQuery = {
      page: sort.page ? parseInt(sort.page) : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit ? parseInt(sort.limit) : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      date: parsedDate,
      fromDate: parsedFrom,
      toDate: parsedTo,
      doctorId: validDoctorId
    };

    const response = await getAllSessionsService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch sessions',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data?.records ?? [],
      totalRecords: response.data?.totalRecords ?? 0,
      message: response.message
    };
  } catch (error: any) {
    console.error('getAllSessions action error:', error);

    return {
      success: false,
      message: error.message || 'Error getting sessions. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET DOCTOR SESSIONS (doctors list for dropdown / Analyse & Create) ==== //
export const getDoctorOptions = async () => {
  try {
    const response = await getDoctorsForSessionsService();

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorOptions error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get doctors'
      }
    };
  }
};

// ==== ANALYSE & CREATE SESSIONS ==== //
// Loads doctor sessions (list of doctors) and filters to the selected doctor, or all doctors if "All" is picked.
export const createSessions = async (payload: {
  doctorId?: string | null;
  fromDate: string;
  toDate: string;
}) => {
  await requirePermission('sessions', 'add');
  const { fromDate, toDate, doctorId } = payload;
  if (!fromDate || !toDate) {
    return { success: false, message: 'From date and to date are required.' };
  }
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (fromDate < todayStr) {
    return { success: false, message: 'From date cannot be in the past.' };
  }
  if (toDate < todayStr) {
    return { success: false, message: 'To date cannot be in the past.' };
  }
  if (toDate < fromDate) {
    return { success: false, message: 'To date must be on or after from date.' };
  }
  try {
    const session = await fetchServerSession();
    const userId = session?.user?.id ?? undefined;

    const response = await getDoctorsForSessionsService();
    const doctors = (response.data ?? []).filter(
      (d) => !doctorId || doctorId === '__all__' || doctorId === '-1' || d.id === doctorId
    );
    if (doctors.length === 0) {
      return { success: false, message: 'No doctors found.' };
    }
    const CONCURRENCY = 20;
    let successCount = 0;
    let totalSessionsProcessed = 0;
    for (let i = 0; i < doctors.length; i += CONCURRENCY) {
      const chunk = doctors.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map((doctor) =>
          analyseSessionsService({
            fromDate,
            toDate,
            doctorId: doctor.id,
            update: false,
            userId
          })
        )
      );
      results.forEach((r) => {
        if (r.status) successCount += 1;
        if (Array.isArray(r.data)) totalSessionsProcessed += r.data.length;
      });
    }
    return {
      success: true,
      message: `Sessions created for ${successCount} of ${doctors.length} doctor(s).`,
      totalDoctors: doctors.length,
      successCount,
      totalSessionsProcessed
    };
  } catch (error: any) {
    console.error('createSessions error', error);
    return {
      success: false,
      message: error.message ?? 'Session creation failed.'
    };
  }
};

// ==== UPDATE SESSIONS ONLY ==== //
// Loads doctor sessions (list of doctors) and filters to the selected doctor, or all doctors if "All" is picked.
export const updateSessions = async (payload: {
  doctorId?: string | null;
  fromDate: string;
  toDate: string;
}) => {
  await requirePermission('sessions', 'edit');
  const { fromDate, toDate, doctorId } = payload;
  if (!fromDate || !toDate) {
    return { success: false, message: 'From date and to date are required.' };
  }
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (fromDate < todayStr) {
    return { success: false, message: 'From date cannot be in the past.' };
  }
  if (toDate < todayStr) {
    return { success: false, message: 'To date cannot be in the past.' };
  }
  if (toDate < fromDate) {
    return { success: false, message: 'To date must be on or after from date.' };
  }
  try {
    const session = await fetchServerSession();
    const userId = session?.user?.id ?? undefined;

    const response = await getDoctorsForSessionsService();
    const doctors = (response.data ?? []).filter(
      (d) => !doctorId || doctorId === '__all__' || doctorId === '-1' || d.id === doctorId
    );
    if (doctors.length === 0) {
      return { success: false, message: 'No doctors found.' };
    }
    const CONCURRENCY = 20;
    let successCount = 0;
    let totalSessionsProcessed = 0;
    for (let i = 0; i < doctors.length; i += CONCURRENCY) {
      const chunk = doctors.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map((doctor) =>
          analyseSessionsService({
            fromDate,
            toDate,
            doctorId: doctor.id,
            update: true,
            userId
          })
        )
      );
      results.forEach((r) => {
        if (r.status) successCount += 1;
        if (Array.isArray(r.data)) totalSessionsProcessed += r.data.length;
      });
    }
    return {
      success: true,
      message: `Sessions updated for ${successCount} of ${doctors.length} doctor(s).`,
      totalDoctors: doctors.length,
      successCount,
      totalSessionsProcessed
    };
  } catch (error: any) {
    console.error('updateSessions error', error);
    return {
      success: false,
      message: error.message ?? 'Session update failed.'
    };
  }
};

// ==== UPDATE SINGLE SESSION (edit session dialog) ==== //
export const updateSession = async (payload: {
  sessionId: string;
  startTimeValue: string;
  startMeridiem: 'AM' | 'PM';
  endTimeValue: string;
  endMeridiem: 'AM' | 'PM';
  maxPatientNumber: number;
}) => {
  await requirePermission('sessions', 'edit');
  const { sessionId, startTimeValue, startMeridiem, endTimeValue, endMeridiem, maxPatientNumber } = payload;
  if (!sessionId) return { success: false, message: 'Session ID is required.' };
  if (maxPatientNumber == null || maxPatientNumber < 0) return { success: false, message: 'Maximum patient number is required.' };
  try {
    const serverSession = await fetchServerSession();
    const userId = serverSession?.user?.id ?? undefined;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { date: true },
    });
    if (!session) return { success: false, message: 'Session not found.' };
    const baseDate = session.date instanceof Date ? session.date : new Date(session.date);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const sessionDateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`;
    if (sessionDateStr < todayStr) {
      return { success: false, message: 'Cannot edit a session that is in the past.' };
    }
    // Use same timezone logic as create/analyse: session date (UTC calendar) + time in HH:mm → parseSessionDateTime
    const y = baseDate.getUTCFullYear();
    const m = (baseDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = baseDate.getUTCDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const startMins = timeToMinutes(startTimeValue, startMeridiem);
    const endMins = timeToMinutes(endTimeValue, endMeridiem);
    const startTimeStr24 = `${Math.floor(startMins / 60).toString().padStart(2, '0')}:${(startMins % 60).toString().padStart(2, '0')}`;
    const endTimeStr24 = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
    const startTime = parseSessionDateTime(dateStr, startTimeStr24);
    const endTime = parseSessionDateTime(dateStr, endTimeStr24);
    const durationMinutes = calculateDurationMinutes(startTimeValue, startMeridiem, endTimeValue, endMeridiem);
    const result = await updateSessionService(sessionId, {
      startTime,
      endTime,
      durationMinutes,
      maxPatientNumber,
      updatedBy: userId,
    });
    if (!result.success) return { success: false, message: result.error ?? 'Failed to update session.' };
    return { success: true, message: 'Session updated successfully.' };
  } catch (error: any) {
    console.error('updateSession error', error);
    return { success: false, message: error.message ?? 'Failed to update session.' };
  }
};

// ==== DELETE SINGLE SESSION ==== //
export const deleteSession = async (sessionId: string) => {
  await requirePermission('sessions', 'delete');
  if (!sessionId) return { success: false, message: 'Session ID is required.' };
  try {
    const serverSession = await fetchServerSession();
    const userId = serverSession?.user?.id ?? undefined;
    const result = await deleteSessionService(sessionId, userId);
    if (!result.success) return { success: false, message: result.error ?? 'Failed to delete session.' };
    return { success: true, message: 'Session deleted successfully.' };
  } catch (error: any) {
    console.error('deleteSession error', error);
    return { success: false, message: error.message ?? 'Failed to delete session.' };
  }
};

// ==== GET SESSION ACTIVITY LOG (for session details popup) ==== //
export type SessionActivityEntry = {
  id: string;
  action: string;
  userName: string | null;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

export const getSessionActivity = async (
  sessionId: string
): Promise<{ success: boolean; data?: SessionActivityEntry[]; message?: string }> => {
  await requirePermission('sessions', 'view');
  if (!sessionId) return { success: false, message: 'Session ID is required.', data: [] };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma activityLog model
    const activityModel = (prisma as any).activityLog;
    if (!activityModel) return { success: true, data: [] };

    const rows = await activityModel.findMany({
      where: { entityType: 'Session', entityId: sessionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true } } },
    });

    const data: SessionActivityEntry[] = rows.map((r: { id: string; action: string; createdAt: Date; metadata: unknown; user: { name: string } | null }) => ({
      id: r.id,
      action: r.action,
      userName: r.user?.name ?? null,
      createdAt: r.createdAt,
      metadata: (r.metadata as Record<string, unknown>) ?? null,
    }));

    return { success: true, data };
  } catch (error: any) {
    console.error('getSessionActivity error', error);
    return { success: false, message: error.message ?? 'Failed to load activity.', data: [] };
  }
};