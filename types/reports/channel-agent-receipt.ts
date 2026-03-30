export type ChannelAgentReceiptReportQuery = {
  bookNo?: string;
};

export type ChannelAgentReceiptReportRow = {
  id: string;
  refNo: string;
  billNo: string;
  agency: string;
  patient: string;
  status: string;
  creator: string;
  createdDate: Date;
  billValue: number;
};

export type ChannelAgentReceiptReportExportRow = {
  refNo: string;
  billNo: string;
  agency: string;
  patient: string;
  status: string;
  creator: string;
  createdDate: string;
  billValue: string;
};

export type ChannelAgentReceiptReportContentProps = Record<string, never>;
