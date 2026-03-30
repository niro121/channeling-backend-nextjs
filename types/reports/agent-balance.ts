export type AgentBalanceReportQuery = {
  agentId?: string; // __all__ or agency id
  status?: string; // __all__ | 1 | 0
};

export type AgentBalanceReportRow = {
  id: string;
  status: number;
  agentCode: string;
  parentAgent: string;
  agentName: string;
  agentPhoneNo: string;
  agentAddress: string;
  maxCreditLimit: number; // hard limit from associated account.maxBalanceAllowed
  allowedCreditLimit: number; // soft limit from agency.allowedCreditLimit
  agentBalance: number; // current account balance
};

export type AgentBalanceReportContentProps = {
  agentOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};
