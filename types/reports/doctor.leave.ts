/** Report query params for doctor leave report */
export type DoctorLeaveReportQuery = {
  fromDateTime?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  toDateTime?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  specialityId?: string;
  doctorId?: string;
};