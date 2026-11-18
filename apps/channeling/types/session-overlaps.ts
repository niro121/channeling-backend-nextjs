export type OverlapSide = {
  id: string;
  name: string;
  timeLabel: string;
  detail?: string;
  /** Active bookings on a generated session (pending and paid). */
  appointmentCount?: number;
  /** When the generated session was created, in Sri Lanka time. */
  generatedLabel?: string;
  /** Generated session: true when the doctor is marked on leave. */
  onLeave?: boolean;
  startMinutes: number;
  endMinutes: number;
  status: number;
  /** Present on generated sessions so the edit dialog can load the time. */
  startTime?: string;
  endTime?: string;
  maxPatientNumber?: number;
};

export type OverlapPair = {
  dayLabel: string;
  left: OverlapSide;
  right: OverlapSide;
};

export type OverlapGroup = {
  doctorId: string;
  doctorName: string;
  locationId: string;
  locationName: string;
  pairs: OverlapPair[];
};

export type DoctorSessionOverlapScan = {
  groups: OverlapGroup[];
  sessionsScanned: number;
  doctorsScanned: number;
  pairCount: number;
};

export type GeneratedOverlapScan = DoctorSessionOverlapScan & {
  fromDate: string;
  toDate: string;
};
