export type ChannelAgentReceiptReportQuery = {
  bookNo?: string;
};

export type ChannelAgentReceiptReportRow = {
  id: string;
  agentRef: string;
  refNo: string;
  agency: string;
  patient: string;
  status: string;
  creator: string;
  createdDate: Date;
  billValue: number;
};

export type ChannelAgentReceiptReportExportRow = {
  agentRef: string;
  refNo: string;
  agency: string;
  patient: string;
  status: string;
  creator: string;
  createdDate: string;
  billValue: string;
};

export type ChannelAgentReceiptReportContentProps = Record<string, never>;
