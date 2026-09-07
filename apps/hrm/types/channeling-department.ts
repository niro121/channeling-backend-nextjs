/** Department DTO returned by Channeling public API (no audit fields). */
export type ChannelingPublicDepartmentDto = {
  id: string;
  name: string;
  description: string | null;
  /** 0=RH, 1=RHD, 2=RHT, 3=RPS */
  institution: number;
  /** 0 = unpublish, 1 = publish */
  status: number;
};

export type ChannelingDepartmentListResponse = {
  departments: ChannelingPublicDepartmentDto[];
  totalRecords: number;
};

export type ChannelingDepartmentByIdResponse = {
  department: ChannelingPublicDepartmentDto;
};

export type DepartmentSyncStats = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { id: string; name: string; message: string }[];
};
