import { User } from './user';
import { DiscountMethod, PaymentType } from '@prisma/client';
import { Voucher, VoucherFormValues } from './voucher';

export type Discount = {
  id?: string;
  name: string;
  discountType: number; // 1 = percentage, 2 = fixed
  discountMethod: DiscountMethod[];
  paymentType: PaymentType[];
  discountValue: number;
  discountValueForeign: number;
  fromDate: Date;
  toDate: Date;
  isVoucher: number; // 0 = no, 1 = yes
  autoApply: boolean;
  status: number; // == 0: unpublish, 1: publish == //
  applyTo: number; // 1 = hospital-fee, 2 = professional-fee
  vouchers: Voucher[];
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
};

export type DiscountFormValues = {
  name: string;
  discountType: number; // 1 = percentage, 2 = fixed
  discountMethod: DiscountMethod[];
  paymentType: PaymentType[];
  discountValue: number;
  discountValueForeign: number;
  fromDate: Date;
  toDate: Date;
  isVoucher: number; // 0 = no, 1 = yes
  autoApply: boolean;
  status: number; // == 0: unpublish, 1: publish == //
  applyTo: number; // 1 = hospital-fee, 2 = professional-fee
  vouchers: VoucherFormValues[]
};

export type UpdatedDiscountPayload = Partial<{
  name: string;
  discountType: number; // 1 = percentage, 2 = fixed
  discountMethod: DiscountMethod[];
  paymentType: PaymentType[];
  discountValue: number;
  discountValueForeign: number;
  fromDate: Date;
  toDate: Date;
  isVoucher: number; // 0 = no, 1 = yes
  autoApply: boolean;
  status: number; // == 0: unpublish, 1: publish == //
  applyTo: number; // 1 = hospital-fee, 2 = professional-fee
  vouchers: VoucherFormValues[]
}>;

export type getDiscountParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  voucherCode?: string;
}

export type getDiscountQuery= {
  page?: number;
  limit?: number;
  keyword?: string;
  voucherCode?: string;
}

export type GetDiscountResponse = {
  data: Discount[];
  totalRecords: number;
}

type DiscountMethodOption = {
  id: string;
  type: DiscountMethod;
  name: string;
};

export const DISCOUNT_METHOD_OPTIONS: DiscountMethodOption[] = [
  { id: '1', type: DiscountMethod.POS, name: 'POS' },
  { id: '2', type: DiscountMethod.ON_CALL, name: 'On-Call' },
  { id: '3', type: DiscountMethod.AGENT, name: 'Agent' },
  { id: '4', type: DiscountMethod.API, name: 'API' },
  { id: '5', type: DiscountMethod.STAFF, name: 'Staff' }
];

type PaymentTypeOption = {
  id: string;
  type: PaymentType;
  name: string;
};

export const PAYMENT_METHOD_OPTIONS: PaymentTypeOption[] = [
  { id: '1', type: PaymentType.CASH, name: 'Cash' },
  { id: '2', type: PaymentType.CHEQUE, name: 'Cheque' },
  { id: '3', type: PaymentType.CREDIT_CARD, name: 'Credit Card' },
  { id: '4', type: PaymentType.SLIP, name: 'Slip' }
];

type ApplyToOption = {
  id: string,
  name: string
}

export const APPLY_TO_OPTIONS: ApplyToOption[] = [
  {id: "1", name: "Hospital Fee Only"},
  {id: "2", name: "Professional Fee Only"},
]
