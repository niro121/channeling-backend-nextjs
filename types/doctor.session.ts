import { Department } from './department';
import { Doctor } from './doctor';
import { Room } from './room';
import { User } from './user';

export interface DoctorSession {
  id?: string;
  name: string;
  institution: number;
  startTime: Date;
  endTime: Date;
  durationMinutes?: number;
  scheduleId?: number;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number; // 0 = No, 1 = Yes
  advancedBookingDays: number;
  fees: Record<string, any>;
  amountLocal?: number;
  amountForeign?: number;
  applyTo: Date;
  dayType: number;
  status: number; // 0 = unpublish, 1 = publish
  doctorId?: string;
  doctor?: Doctor;
  departmentId?: string;
  department?: Department;
  locationId?: string;
  location?: Location;
  roomId?: string;
  room?: Room;
  previousSessionId?: string;
  previousSession?: DoctorSession;
  nextSessions?: DoctorSession[];
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
}

export type DoctorSessionFormValues = {
  name: string;
  institution: number;
  startTime: Date;
  endTime: Date;
  durationMinutes?: number;
  scheduleId?: number;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number; // 0 = No, 1 = Yes
  advancedBookingDays: number;
  fees: Record<string, any>;
  amountLocal?: number;
  amountForeign?: number;
  applyTo: Date;
  dayType: number; // == 0: Sunday, 2: Monday, 3: Tuesday, 4: Wednesday, 5: Thursday, 6: Friday, 7: Saturday, 8: Specific day(eg: poya day) == //
  status: number; // 0 = unpublish, 1 = publish
  doctorId?: string;
  doctor?: Doctor;
  departmentId?: string;
  department?: Department;
  locationId?: string;
  location?: Location;
  roomId?: string;
  room?: Room;
  previousSessionId?: string;
  previousSession?: DoctorSession;
  nextSessions?: DoctorSession[];
};

export type CreateDoctorSessionPayload = DoctorSessionFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

export type UpdateDoctorSessionPayload = Partial<DoctorSessionFormValues>;

export type getDosctorSessionParams = {
  page?: string;
  limit?: string;
  locationId?: string;
  doctorId?: string;
};

export type getDosctorSessionQuery = {
  page: number;
  limit: number;
  locationId?: string;
  doctorId?: string;
};

type Option = {
  id: string;
  name: string;
};

export const INSTITUTION_OPTIONS: Option[] = [
  { id: '1', name: 'Hospital Main' },
  { id: '2', name: 'Hospital A' },
  { id: '3', name: 'Hospital B' },
  { id: '4', name: 'Hospital C' },
  { id: '5', name: 'Hospital D' }
];
