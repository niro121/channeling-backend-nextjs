export type DpayDoctorStatementQuery = {
  doctorId: string;
  /** YYYY-MM-DD, start of day. */
  dateFrom: string;
  /** YYYY-MM-DD, end of day. */
  dateTo: string;
};

export type DpayDoctorStatementRowKind = 'opening' | 'line';

export type DpayDoctorStatementRow = {
  id: string;
  kind: DpayDoctorStatementRowKind;
  date: string;
  particulars: string;
  /** Rupees. Null on the opening row. */
  debit: number | null;
  /** Rupees. Null on the opening row. */
  credit: number | null;
  /** Running DPAY payable balance in rupees. */
  balance: number;
};

export type DpayDoctorStatementExportRow = {
  date: string;
  particulars: string;
  debit: number | '';
  credit: number | '';
  balance: number;
};
