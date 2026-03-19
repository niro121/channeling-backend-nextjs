'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  GetActiveSession,
  GetDoctorLeavesQuery,
  DoctorLeaveFormProps
} from '@/types/doctor.leave';

// ==== DOCTOR LEAVE: VALIDATION SCHEMAS ==== //
const sessionItemSchema = z.object({
  id: z.string().min(1, 'Session ID is required')
});

const doctorLeaveBaseSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  remarks: z.string().max(500).optional().nullable(),
  cancelRemarks: z.string().max(500).optional().nullable(),
  sessions: z
    .array(sessionItemSchema)
    .min(1, 'At least one session is required'),
  sendSms: z
    .number()
    .int()
    .refine((v) => v === 0 || v === 1, {
      message: 'Send SMS must be 0 (No) or 1 (Yes)'
    }),
  status: z
    .number()
    .int()
    .refine((v) => v === 0 || v === 1, {
      message: 'Status must be 0 (Cancel) or 1 (Active)'
    })
});

const doctorLeaveCreateSchema = doctorLeaveBaseSchema.refine(
  (data) => data.toDate >= data.fromDate,
  { message: 'To date must be on or after from date', path: ['toDate'] }
);

const doctorLeaveUpdateSchema = doctorLeaveBaseSchema.partial().extend({
  id: z.string().min(1, 'Doctor leave ID is required'),
  sessions: z.array(sessionItemSchema).optional()
});

export type DoctorLeaveCreateInput = z.infer<typeof doctorLeaveCreateSchema>;
export type DoctorLeaveUpdateInput = z.infer<typeof doctorLeaveUpdateSchema>;

/** Normalize form payload: accept sessions as { id }[] or legacy typo key */
function normalizeSessions(
  payload: DoctorLeaveFormProps & { sessions?: { id: string }[] }
): string[] {
  const raw = payload.sessions ?? (payload as any).sesssions ?? [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((s) => (typeof s === 'string' ? s : s?.id)).filter(Boolean);
}

/** Normalize sendSms: form may send boolean (true/false) or number (0/1); DB stores 0 or 1 */
function normalizeSendSms(value: unknown): 0 | 1 {
  if (value === true || value === 1) return 1;
  return 0;
}

/**
 * Set Session.status to match DoctorLeave for the given session IDs.
 * DoctorLeave status 1 (ACTIVE) = leave in effect → sessions on leave → Session.status = 0.
 * DoctorLeave status 0 (CANCEL) = leave cancelled → sessions available → Session.status = 1.
 */
async function setSessionsStatusByLeave(
  sessionIds: string[],
  leaveStatus: number,
  options?: {
    doctorLeaveRemark?: string;
    doctorLeaveCreator?: string;
    doctorLeaveCreatedAt?: number;
  }
) {
  if (sessionIds.length === 0) return;
  const status = leaveStatus === 1 ? 0 : 1; // Active leave → session 0 (on leave); Cancelled leave → session 1 (available)
  await prisma.session.updateMany({
    where: { id: { in: sessionIds } },
    data: {
      status,
      ...(options?.doctorLeaveRemark != null && {
        doctorLeaveRemark: options.doctorLeaveRemark
      }),
      ...(options?.doctorLeaveCreator != null && {
        doctorLeaveCreator: options.doctorLeaveCreator
      }),
      ...(options?.doctorLeaveCreatedAt != null && {
        doctorLeaveCreatedAt: options.doctorLeaveCreatedAt
      })
    }
  });
}

/** Restore sessions to active (status 1) and clear leave fields */
async function restoreSessionsToActive(sessionIds: string[]) {
  if (sessionIds.length === 0) return;
  await prisma.session.updateMany({
    where: { id: { in: sessionIds } },
    data: {
      status: 1,
      doctorLeaveRemark: null,
      doctorLeaveCreator: null,
      doctorLeaveCreatedAt: null
    }
  });
}

/** Get session IDs already used by other leaves for this doctor (for validation) */
async function getLockedSessionIdsForDoctor(
  doctorId: string,
  excludeLeaveId?: string | null
): Promise<Set<string>> {
  const res = await getSessionIdsLockedByOtherLeavesService(
    doctorId,
    excludeLeaveId
  );
  if (!res.success || !res.data) return new Set();
  return new Set(res.data);
}

// ================ //
// CRUD OPERATIONS
// ================ //

// ==== GET LEAVES FOR A SPECIFIC DOCTOR ==== //
export const getDoctorLeavesService = async ({
  page = 0,
  limit = 10,
  doctorId,
  fromDate,
  toDate
}: GetDoctorLeavesQuery): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  const skip = page * limit;

  try {
    const whereClause: Prisma.DoctorLeaveWhereInput = {
      doctorId
    };

    // ==== DATE FILTERING (DateTime fields) ==== //
    if (fromDate && toDate) {
      whereClause.AND = [
        { toDate: { gte: new Date(fromDate) } },
        { fromDate: { lte: new Date(toDate) } }
      ];
    } else if (fromDate) {
      whereClause.toDate = { gte: new Date(fromDate) };
    } else if (toDate) {
      whereClause.fromDate = { lte: new Date(toDate) };
    }

    const [records, totalRecords] = await Promise.all([
      prisma.doctorLeave.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { fromDate: 'desc' },
        include: {
          doctor: {
            select: { id: true, name: true, code: true }
          },
          createdUser: { select: { id: true, name: true } },
          updatedUser: { select: { id: true, name: true } }
        }
      }),
      prisma.doctorLeave.count({
        where: whereClause
      })
    ]);

    return {
      success: true,
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorLeavesService error:', error);

    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: {
        message: error?.message ?? 'Failed to fetch doctor leaves'
      }
    };
  }
};

// ==== GET ALL ACTIVE SESSIONS TO SPECIFIC DATE RANGE ==== //
export const getActiveSessionsService = async ({
  doctorId,
  fromDate,
  toDate
}: GetActiveSession): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const whereClause: Prisma.SessionWhereInput = {
      doctorId,
      status: 1 // ✅ ACTIVE sessions only
    };

    // Date filtering (Session.date is DateTime)
    if (fromDate && toDate) {
      whereClause.date = {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      };
    } else if (fromDate) {
      whereClause.date = {
        gte: new Date(fromDate)
      };
    } else if (toDate) {
      whereClause.date = {
        lte: new Date(toDate)
      };
    }

    const records = await prisma.session.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        date: true,
        doctor: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        room: { select: { id: true, number: true } },
        department: { select: { id: true, name: true } }
      }
    });

    const totalRecords = await prisma.session.count({
      where: whereClause
    });

    return {
      success: true,
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.error('getActiveSessionsService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch active sessions' }
    };
  }
};

// ==== GET ALL CANCELED SESSIONS (status 0) IN DATE RANGE ==== //
export const getCanceledSessionsService = async ({
  doctorId,
  fromDate,
  toDate
}: GetActiveSession): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const whereClause: Prisma.SessionWhereInput = {
      doctorId,
      status: 0 // canceled / on leave
    };

    if (fromDate && toDate) {
      whereClause.date = {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      };
    } else if (fromDate) {
      whereClause.date = { gte: new Date(fromDate) };
    } else if (toDate) {
      whereClause.date = { lte: new Date(toDate) };
    }

    const records = await prisma.session.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        date: true,
        doctor: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        room: { select: { id: true, number: true } },
        department: { select: { id: true, name: true } }
      }
    });

    const totalRecords = await prisma.session.count({
      where: whereClause
    });

    return {
      success: true,
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.error('getCanceledSessionsService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch canceled sessions' }
    };
  }
};

// ==== GET SESSION IDs LOCKED BY OTHER LEAVES (same doctor) ==== //
/** Returns session IDs that are already in another leave for this doctor. Exclude current leave when editing. */
export const getSessionIdsLockedByOtherLeavesService = async (
  doctorId: string,
  excludeLeaveId?: string | null
): Promise<{
  success: boolean;
  data?: string[];
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!doctorId?.trim()) {
      return { success: true, data: [] };
    }
    const where: Prisma.DoctorLeaveWhereInput = { doctorId };
    if (excludeLeaveId?.trim()) {
      where.id = { not: excludeLeaveId };
    }
    const leaves = await prisma.doctorLeave.findMany({
      where,
      select: { sessions: true }
    });
    const lockedIds = new Set<string>();
    for (const leave of leaves) {
      const raw = leave.sessions;
      if (raw == null) continue;
      const arr = Array.isArray(raw) ? raw : [];
      for (const item of arr) {
        const id =
          typeof item === 'string' ? item : (item as { id?: string })?.id;
        if (id && typeof id === 'string') lockedIds.add(id);
      }
    }
    return { success: true, data: Array.from(lockedIds) };
  } catch (error: any) {
    console.error('getSessionIdsLockedByOtherLeavesService error:', error);
    return {
      success: false,
      data: [],
      error: { message: error?.message ?? 'Failed to fetch locked session IDs' }
    };
  }
};

// ==== GET SESSIONS BY IDS (any status, for leave's canceled sessions display) ==== //
export const getSessionsByIdsService = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!ids?.length) {
      return { success: true, data: [] };
    }
    const validIds = ids.filter((id) => id && typeof id === 'string');
    if (validIds.length === 0) return { success: true, data: [] };

    const records = await prisma.session.findMany({
      where: { id: { in: validIds } },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        date: true,
        status: true,
        doctor: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        room: { select: { id: true, number: true } },
        department: { select: { id: true, name: true } }
      }
    });

    return { success: true, data: records };
  } catch (error: any) {
    console.error('getSessionsByIdsService error:', error);
    return {
      success: false,
      data: [],
      error: { message: error?.message ?? 'Failed to fetch sessions by ids' }
    };
  }
};

// ==== GET ONE DOCTOR LEAVE BY ID ==== //
export const getOneLeaveByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: { message: 'Doctor leave ID is required' }
      };
    }

    const leave = await prisma.doctorLeave.findUnique({
      where: { id },
      include: {
        doctor: { select: { id: true, name: true, code: true } },
        createdUser: { select: { id: true, name: true } },
        updatedUser: { select: { id: true, name: true } }
      }
    });

    if (!leave) {
      return {
        success: false,
        error: { message: 'Doctor leave not found' }
      };
    }

    return { success: true, data: leave };
  } catch (error: any) {
    console.error('getOneLeaveByIdService error:', error);
    return {
      success: false,
      error: { message: error?.message ?? 'Failed to fetch doctor leave' }
    };
  }
};

// ==== CREATE DOCTOR LEAVE ==== //
export const createDoctorLeaveService = async (
  payload: DoctorLeaveFormProps & { sessions?: { id: string }[] },
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> => {
  try {
    const sessionIds = normalizeSessions(payload);
    const toValidate = {
      doctorId: payload.doctorId,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      remarks: payload.remarks ?? undefined,
      cancelRemarks: (payload as any).cancelRemarks ?? undefined,
      sessions: sessionIds.map((id) => ({ id })),
      sendSms: normalizeSendSms(payload.sendSms),
      status: payload.status ?? 1
    };

    const parsed = doctorLeaveCreateSchema.safeParse(toValidate);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const lockedIds = await getLockedSessionIdsForDoctor(
      data.doctorId,
      undefined
    );
    const conflicting = data.sessions
      .map((s) => s.id)
      .filter((id) => lockedIds.has(id));
    if (conflicting.length > 0) {
      return {
        success: false,
        error: {
          message: `Cannot add sessions that are already in another leave for this doctor. ${conflicting.length} session(s) are already used.`
        }
      };
    }

    const sessionsJson = data.sessions.map(
      (s) => s.id
    ) as unknown as Prisma.InputJsonValue;
    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const leave = await prisma.doctorLeave.create({
      data: {
        fromDate: data.fromDate,
        toDate: data.toDate,
        remarks: data.remarks ?? null,
        cancelRemarks: data.cancelRemarks ?? null,
        sessions: sessionsJson,
        sendSms: normalizeSendSms(data.sendSms),
        status: data.status,
        doctor: { connect: { id: data.doctorId } },
        createdUser: userRelation,
        updatedUser: userRelation
      },
      include: {
        doctor: { select: { id: true, name: true, code: true } }
      }
    });

    // Apply DoctorLeave status to selected sessions: Active (1) → Session 0 (on leave), Cancel (0) → Session 1 (available).
    await setSessionsStatusByLeave(sessionIds, data.status, {
      doctorLeaveRemark: data.remarks ?? 'Doctor leave',
      doctorLeaveCreator: user?.name ?? undefined,
      doctorLeaveCreatedAt: Math.floor(Date.now() / 1000)
    });

    return {
      success: true,
      data: leave,
      message: 'Doctor leave created successfully'
    };
  } catch (error: any) {
    console.error('createDoctorLeaveService error:', error);
    return {
      success: false,
      error: { message: error?.message ?? 'Failed to create doctor leave' }
    };
  }
};

// ==== UPDATE DOCTOR LEAVE ==== //
export const updateDoctorLeaveService = async (
  id: string,
  payload: Partial<DoctorLeaveFormProps> & { sessions?: { id: string }[] },
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> => {
  try {
    const existing = await prisma.doctorLeave.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Doctor leave not found' }
      };
    }

    const sessionIds = normalizeSessions(payload as any);
    const toValidate = {
      id,
      doctorId: payload.doctorId ?? existing.doctorId,
      fromDate: payload.fromDate ?? existing.fromDate,
      toDate: payload.toDate ?? existing.toDate,
      remarks:
        payload.remarks !== undefined ? payload.remarks : existing.remarks,
      cancelRemarks: (payload as any).cancelRemarks ?? existing.cancelRemarks,
      sessions: sessionIds.length
        ? sessionIds.map((sid) => ({ id: sid }))
        : undefined,
      sendSms:
        payload.sendSms !== undefined
          ? normalizeSendSms(payload.sendSms)
          : (existing.sendSms ?? 0),
      status: payload.status ?? existing.status
    };

    const parsed = doctorLeaveUpdateSchema.safeParse(toValidate);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const newSessionIds = (data.sessions ?? []).map((s) => s.id);
    const lockedIds = await getLockedSessionIdsForDoctor(
      data.doctorId ?? existing.doctorId,
      id
    );
    const conflicting = newSessionIds.filter((sid) => lockedIds.has(sid));
    if (conflicting.length > 0) {
      return {
        success: false,
        error: {
          message: `Cannot add sessions that are already in another leave for this doctor. ${conflicting.length} session(s) are already used.`
        }
      };
    }

    const previousSessionIds = (existing.sessions as string[] | null) ?? [];
    const sessionsToRestore = previousSessionIds.filter(
      (sid) => !newSessionIds.includes(sid)
    );
    await restoreSessionsToActive(sessionsToRestore);

    const sessionsJson = newSessionIds.length
      ? (newSessionIds as unknown as Prisma.InputJsonValue)
      : ([] as unknown as Prisma.InputJsonValue);

    const leaveStatus = data.status ?? existing.status;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const leave = await prisma.doctorLeave.update({
      where: { id },
      data: {
        fromDate: data.fromDate ?? existing.fromDate,
        toDate: data.toDate ?? existing.toDate,
        remarks: data.remarks ?? existing.remarks,
        cancelRemarks: data.cancelRemarks ?? existing.cancelRemarks,
        sessions: sessionsJson,
        sendSms: data.sendSms ?? existing.sendSms ?? 0,
        status: leaveStatus,
        updatedUser: userRelation,
        updatedAt: new Date()
      },
      include: {
        doctor: { select: { id: true, name: true, code: true } }
      }
    });

    // Always apply DoctorLeave status to selected sessions: Active (1) → Session 0 (on leave), Cancel (0) → Session 1 (available).
    if (newSessionIds.length > 0) {
      await setSessionsStatusByLeave(newSessionIds, leaveStatus, {
        doctorLeaveRemark: data.remarks ?? 'Doctor leave',
        doctorLeaveCreator: user?.name ?? undefined,
        doctorLeaveCreatedAt: Math.floor(Date.now() / 1000)
      });
    }

    return {
      success: true,
      data: leave,
      message: 'Doctor leave updated successfully'
    };
  } catch (error: any) {
    console.error('updateDoctorLeaveService error:', error);
    if (error?.code === 'P2025') {
      return { success: false, error: { message: 'Doctor leave not found' } };
    }
    return {
      success: false,
      error: { message: error?.message ?? 'Failed to update doctor leave' }
    };
  }
};

// ==== DELETE ONE DOCTOR LEAVE ==== //
export const deleteOneDoctorLeaveService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: { message: 'Doctor leave ID is required' }
      };
    }

    const existing = await prisma.doctorLeave.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { message: 'Doctor leave not found' }
      };
    }

    const sessionIds = (existing.sessions as string[] | null) ?? [];
    await restoreSessionsToActive(sessionIds);

    await prisma.doctorLeave.delete({ where: { id } });

    return {
      success: true,
      message: 'Doctor leave deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteOneDoctorLeaveService error:', error);
    if (error?.code === 'P2025') {
      return { success: false, error: { message: 'Doctor leave not found' } };
    }
    return {
      success: false,
      error: { message: error?.message ?? 'Failed to delete doctor leave' }
    };
  }
};

// ==== BULK DELETE DOCTOR LEAVES ==== //
export const bulkDeleteDoctorLeavesService = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        error: { message: 'No doctor leave IDs provided' }
      };
    }

    const leaves = await prisma.doctorLeave.findMany({
      where: { id: { in: ids } },
      select: { id: true, sessions: true }
    });

    const allSessionIds = new Set<string>();
    for (const leave of leaves) {
      const sids = (leave.sessions as string[] | null) ?? [];
      sids.forEach((sid) => allSessionIds.add(sid));
    }
    await restoreSessionsToActive(Array.from(allSessionIds));

    const result = await prisma.doctorLeave.deleteMany({
      where: { id: { in: ids } }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: { message: 'No doctor leaves found to delete' }
      };
    }

    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} doctor leave(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('bulkDeleteDoctorLeavesService error:', error);
    return {
      success: false,
      error: {
        message: error?.message ?? 'Failed to bulk delete doctor leaves'
      }
    };
  }
};
