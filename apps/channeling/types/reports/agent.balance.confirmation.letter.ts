export type AgentBalanceConfirmationLetterQuery = {
  agentId?: string;
  asAtDate?: string; // YYYY-MM-DD
  language?: 'en' | 'si';
};

export type AgentBalanceConfirmationLetterRow = {
  id: string;
  agentName: string;
  agentCode: string;
  balance: number;
  address: string;
  asAtDate: string;
  language: 'en' | 'si';
  isPlaceholder?: boolean;
};

export type AgentBalanceConfirmationLetterExportRow = {
  language: string;
  asAtDate: string;
  agentName: string;
  agentCode: string;
  address: string;
  balance: string;
};

export type AgentBalanceConfirmationLetterContentProps = {
  agentOptions: Array<{ id: string; name: string }>;
};
