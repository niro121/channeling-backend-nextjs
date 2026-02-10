import type { Doctor } from './doctor';
import type { Location } from './location';
import type { Room } from './room';

/**
 * Session = actual bookable session (from Prisma Session model).
 * DoctorSession is only the template used to create these.
 */
export type Session = {
  id: string;
  institution: number;
  date: Date;
  doctorSessionId: string;
  previousDoctorSession: string | null;
  /** Minutes from midnight (0–1439). */
  startTime: number;
  /** Minutes from midnight (0–1439). */
  endTime: number;
  durationMinutes: number | null;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number;
  fees: unknown;
  amountLocal: number | null;
  amountForeign: number | null;
  status: number; // 1: ACTIVE, 0: LEAVE
  remarks: string | null;
  appointmentNo: number;
  isScan: boolean;
  doctorId: string | null;
  departmentId: string | null;
  locationId: string | null;
  roomId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  doctor?: Doctor | null;
  location?: Location | null;
  room?: Room | null;
};

export type GetSessionsForChannelBookingParams = {
  doctorId: string;
  date: Date;
  locationId?: string | null;
};

export type GetSessionsForChannelBookingResult = {
  success: boolean;
  data?: Session[];
  message?: string;
  error?: { message?: string };
};