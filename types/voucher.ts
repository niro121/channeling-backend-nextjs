import { Discount } from './discount';
import { User } from './user';

export type Voucher = {
  id?: string;
  code: string;
  limit: number;
  status: number; // 0 = unpublish, 1 = publish
  discountId: string;
  discount: Discount;
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
};

export type VoucherFormValues = {
  code: string;
  limit: number;
  status: number; // 0 = unpublish, 1 = publish
  discountId: string;
  discount: Discount;
};
