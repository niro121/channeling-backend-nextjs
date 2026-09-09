/** Staff DTO returned by Channeling public API (no audit fields). */
export type ChannelingPublicStaffDto = {
  id: string;
  code: string;
  title: string;
  name: string;
  nic: string;
  /** YYYY-MM-DD when set */
  dateOfBirth: string | null;
  gender: string;
  contactMobile: string;
  address: string;
  /** YYYY-MM-DD when set */
  dateJoined: string | null;
  /** 0 = Inactive, 1 = Active */
  status: number;
};

export type ChannelingStaffListResponse = {
  staff: ChannelingPublicStaffDto[];
  totalRecords: number;
};

export type ChannelingStaffByIdResponse = {
  staff: ChannelingPublicStaffDto;
};

export type StaffSyncStats = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { id: string; code: string; message: string }[];
};
