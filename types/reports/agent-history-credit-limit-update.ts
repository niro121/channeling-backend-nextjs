export type AgentHistoryCreditLimitUpdateReportQuery = {
  /** '__all__' or agency id */
  agencyId?: string;
  /** '__all__' | 'soft' | 'hard' */
  limitType?: string;
  /** '__all__' or user id */
  changedByUserId?: string;
};

export type AgentHistoryCreditLimitUpdateReportRow = {
  id: string;
  createdAt: Date;
  changedByUserId: string;
  changedByUserName: string | null;
  limitType: 'soft' | 'hard';
  agencyId: string | null;
  agencyName: string | null;
  agencyCode: string | null;
  oldValue: number | null;
  newValue: number | null;
  delta: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
};

export type AgentHistoryCreditLimitUpdateReportExportRow = {
  no: string;
  agent: string;
  agentCode: string;
  limitType: string;
  beforeValue: string;
  updatedValue: string;
  delta: string;
  changedBy: string;
  dateTime: string;
};

