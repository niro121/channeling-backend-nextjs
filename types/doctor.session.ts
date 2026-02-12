import { Department } from './department';
import { Doctor } from './doctor';
import { Location } from './location';
import { Room } from './room';
import { User } from './user';

export type Fee = {
  id: string;
  name: string;
  feeType: string;
  localFee: number;
  foreignFee: number;
};

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
  fees: Fee[];
  amountLocal?: number;
  amountForeign?: number;
  applyTo: Date | undefined;
  dayType: number; // == 1: Sunday, 2: Monday, 3: Tuesday, 4: Wednesday, 5: Thursday, 6: Friday, 7: Saturday, 8: Specific day(eg: poya day) == //
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
  previousSessions?: DoctorSession[];
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
  fees: Fee[];
  amountLocal?: number;
  amountForeign?: number;
  applyTo: Date | undefined;
  dayType: number; // == 1: Sunday, 2: Monday, 3: Tuesday, 4: Wednesday, 5: Thursday, 6: Friday, 7: Saturday, 8: Specific day(eg: poya day) == //
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
};

export type CreateDoctorSessionPayload = DoctorSessionFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

export type UpdateDoctorSessionPayload = Partial<DoctorSessionFormValues>;

export type getDoctorSessionParams = {
  page?: string;
  limit?: string;
  locationId?: string;
  doctorId?: string;
  institutionId?: string;
};

export type getDoctorSessionQuery = {
  page: number;
  limit: number;
  locationId?: string;
  doctorId?: string;
  institutionId?: string;
};

type Option = {
  id: string;
  name: string;
};

export const INSTITUTION_LIST = [
  { id: 0, name: 'Ruhunu Hospital (Pvt) Ltd  (RH)' },
  { id: 1, name: 'Ruhunu Hospital Diagnostics (Private) Limited  (RHD)' },
  { id: 2, name: 'Ruhunu Hospital Training  (RHT)' },
  { id: 3, name: 'Ruhunu Pharmaceuticals & Services (Pvt) Ltd  (RPS)' }
] as const;

// For dropdowns that expect { id: string, name: string }
export const INSTITUTION_OPTIONS: Option[] = INSTITUTION_LIST.map((item) => ({
  id: String(item.id),
  name: item.name
}));

export const REFUNDABLE_OPTIONS: Option[] = [
  { id: '0', name: 'No' },
  { id: '1', name: 'Yes' }
];

export const FEE_TYPES: Fee[] = [
  {
    id: '0',
    name: 'Doctor Fee',
    feeType: 'Staff',
    localFee: 0,
    foreignFee: 0
  },
  {
    id: '1',
    name: 'Hospital Fee',
    feeType: 'Own Institution',
    localFee: 0,
    foreignFee: 0
  },
  {
    id: '2',
    name: 'Agency Fee',
    feeType: 'Other Institution',
    localFee: 0,
    foreignFee: 0
  },
  {
    id: '3',
    name: 'Scan Fee',
    feeType: 'Service',
    localFee: 0,
    foreignFee: 0
  },
  {
    id: '4',
    name: 'On-Call Fee',
    feeType: 'Own Institution',
    localFee: 0,
    foreignFee: 0
  },
  {
    id: '5',
    name: 'Credit Card Commission',
    feeType: 'Own Institution',
    localFee: 0,
    foreignFee: 0
  }
];

export const DAY_TYPES: Option[] = [
  { id: '1', name: 'Sunday' },
  { id: '2', name: 'Monday' },
  { id: '3', name: 'Tuesday' },
  { id: '4', name: 'Wednesday' },
  { id: '5', name: 'Thursday' },
  { id: '6', name: 'Friday' },
  { id: '7', name: 'Saturday' },
  { id: '8', name: 'Specific Date Only' }
];

export const ADVANCED_BOOKING_OPTIONS = Array.from({ length: 101 }, (_, i) => ({
  id: String(i),
  name: String(i)
}));
