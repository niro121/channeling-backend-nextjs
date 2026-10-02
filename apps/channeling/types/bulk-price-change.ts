export const LOCAL_FEE_OPERATORS = ['gt', 'gte', 'lt', 'lte', 'eq'] as const;
export type LocalFeeOperator = (typeof LOCAL_FEE_OPERATORS)[number];

export type RuleConditionType = 'single' | 'range';

export interface BulkPriceChangeRule {
  id?: string;
  bulkPriceChangeId?: string;
  /** single: op + value; range: use localFeeMin & localFeeMax */
  localFeeOp: LocalFeeOperator | 'range';
  localFeeValue: number;
  localFeeMin?: number | null;
  localFeeMax?: number | null;
  newLocalFee: number;
  newForeignFee: number;
  order?: number;
}

export interface DoctorSessionBulkPriceChangeRecord {
  id: string;
  name: string;
  feeTypeId: string;
  status: 'DRAFT' | 'PROCESSED';
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  rules?: BulkPriceChangeRule[];
  results?: BulkPriceChangeResultRow[];
}

export interface BulkPriceChangeResultRow {
  id?: string;
  doctorSessionId: string;
  sessionName?: string;
  doctorName?: string;
  oldLocalFee: number;
  oldForeignFee: number;
  newLocalFee: number;
  newForeignFee: number;
  processedAt?: Date;
}

export interface BulkPriceChangePreviewRow {
  doctorSessionId: string;
  sessionName?: string;
  doctorName?: string;
  currentLocalFee: number;
  currentForeignFee: number;
  newLocalFee: number;
  newForeignFee: number;
}
