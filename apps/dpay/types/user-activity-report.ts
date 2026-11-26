export type UserActivityReportQuery = {
  userId?: string;
  action?: string;
  dateFrom: string;
  dateTo: string;
};

export type UserActivityReportRow = {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  importance: string | null;
  createdAt: Date;
};

export type UserActivityReportResponse = {
  success: boolean;
  data: UserActivityReportRow[];
  totalReturned: number;
  hasMore: boolean;
  message?: string;
};

export type ExportUserActivityData = {
  createdAt: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  importance: string;
};
