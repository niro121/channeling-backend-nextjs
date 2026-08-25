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
  startTime: Date;
  endTime: Date;
  durationMinutes: number | null;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number;
  fees: unknown;
  amountLocal: number | null;
  amountForeign: number | null;
  status: number; // 1: ACTIVE, 0: LEAVE
  doctorLeaveRemark?: string | null;
  doctorLeaveCreator?: string | null;
  doctorLeaveCreatedAt?: number | null; // Unix seconds
  /** JSON array of { time, createdBy }; used to block booking/settle after departure. */
  doctorArrivalTime?: unknown;
  doctorDepatureTime?: unknown;
  remarks: string | null;
  appointmentNo: number;
  /** Numbers auto-allocation skips; managed from channel Bookings panel. */
  blockedAppointmentNumbers?: number[];
  /** `Sequence.lastValue` for scope `appointment:sessionId`, or `startingPatientNumber - 1` if no row yet. */
  appointmentSequenceLastValue?: number;
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
  /** Current booking count (paid + pending) for list display. */
  paidCount?: number;
  pendingCount?: number;
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