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
  /** Linked PAYABLE account hard cap (same source as Agencies “Hard credit limit”). */
  hardCreditLimit: number;
  /** Agency.creditLimit — same as Agencies “Agency credit limit”. */
  agencyCreditLimit: number;
  /** Agency.allowedCreditLimit — same as Agencies “Allowed credit limit”. */
  allowedCreditLimit: number;
  agentBalance: number; // current account balance
};

export type AgentBalanceReportContentProps = {
  agentOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};
