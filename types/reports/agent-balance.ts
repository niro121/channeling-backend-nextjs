export type AgentBalanceReportQuery = {
  agentId?: string;
  date?: string; // YYYY-MM-DD
  language?: string; // 'en' | 'si'
};

export type AgentBalanceReportData = {
  agentName: string;
  agentCode: string;
  balance: number;
  address?: string;
  date: string; // YYYY-MM-DD
};

export type AgentBalanceReportContentProps = {
  agentOptions: Array<{ id: string; name: string }>;
};
