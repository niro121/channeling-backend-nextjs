'use server';

import prisma from '@/lib/prisma';
import { Discount, getDiscountQuery } from '@/types/discount';
import { Prisma, DiscountMethod, PaymentType } from '@prisma/client';
import { z } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// ==== GET ALL DISCOUNTS ==== //
export const getAllDiscountsService = async ({
  page,
  limit,
  keyword,
  discountType
}: getDiscountQuery) => {
  const whereClause: Prisma.DiscountWhereInput | undefined =
    keyword && keyword.trim() !== ''
      ? {
          OR: [
            {
              name: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              vouchers: {
                some: {
                  code: {
                    contains: keyword,
                    mode: Prisma.QueryMode.insensitive
                  }
                }
              }
            }
          ],
          ...(discountType !== undefined ? { discountType } : {})
        }
      : discountType !== undefined
        ? { discountType }
        : undefined;

  try {
    const skip = page * limit;

    const records = await prisma.discount.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
      include: {
        vouchers: true,
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.discount.count({
      where: whereClause
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getAllDiscountsService error', error);
    throw error;
  }
};

// ==== DISCOUNT: VALIDATION SCHEMA ==== //
const discountSchema = z.object({
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(150, 'Must be less than 150 characters'),
  discountMethod: z
    .array(z.nativeEnum(DiscountMethod))
    .min(1, 'Select at least one booking method'),
  paymentType: z
    .array(z.nativeEnum(PaymentType))
    .min(1, 'Select at least one payment type'),
  discountType: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Discount type must be Percentage (0) or Fixed Value (1)'
    }),
  discountValue: z
    .number()
    .min(0, 'Discount value must be 0 or greater')
    .refine((val) => val !== undefined && val !== null, {
      message: 'This field is mandatory'
    }),
  discountValueForeign: z
    .number()
    .min(0, 'Discount foreign value must be 0 or greater')
    .refine((val) => val !== undefined && val !== null, {
      message: 'This field is mandatory'
    }),
  fromDate: z.date(),
  toDate: z.date(),
  isVoucher: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Is Voucher must be No (0) or Yes (1)'
    }),
  autoApply: z.boolean(),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Visibility must be Unpublish (0) or Publish (1)'
    }),
  applyTo: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Apply To must be Hospital Fee Only (0) or Professional Fee Only (1)'
    }),
  vouchers: z
    .array(
      z.object({
        code: z.string(),
        limit: z.number()
      })
    )
    .optional()
});

const discountUpdateSchema = discountSchema.partial().extend({
  id: z.string().min(1, 'Discount ID is required')
});

type discountInput = z.infer<typeof discountSchema>;

// ==== CREATE A DISCOUNT ==== //
export const checkUniqueVoucherCodes = async (codes: string[]) => {
  try {
    const uniqueVouchers = await prisma.voucherCode.findMany({
      where: {
        code: {
          in: codes
        }
      },
      select: { code: true }
    });

    return uniqueVouchers.map((voucher) => voucher.code);
  } catch (error: any) {
    throw new Error(error.message ?? 'checkUniqueVoucherCode Error');
  }
};

export const createDiscountService = async (
  payload: {
    name: string;
    discountType: number;
    discountMethod: DiscountMethod[];
    paymentType: PaymentType[];
    discountValue: number;
    discountValueForeign: number;
    fromDate: Date;
    toDate: Date;
    isVoucher: number;
    autoApply: boolean;
    status: number;
    applyTo: number;
    vouchers?: { code: string; limit: number }[];
    createdBy?: string;
    updatedBy?: string;
  },
  user?: { id?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  try {
    const parsed = discountSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const discount = await prisma.discount.create({
      data: {
        name: data.name,
        discountType: data.discountType,
        discountMethod: data.discountMethod,
        paymentType: data.paymentType,
        discountValue: data.discountValue,
        discountValueForeign: data.discountValueForeign,
        fromDate: data.fromDate,
        toDate: data.toDate,
        isVoucher: data.isVoucher,
        autoApply: data.autoApply,
        status: data.status,
        applyTo: data.applyTo,
        vouchers:
          data.isVoucher === 1 && data.vouchers && data.vouchers.length > 0
            ? {
                create: data.vouchers.map((voucher) => ({
                  code: voucher.code,
                  limit: voucher.limit,
                  status: 1,
                  createdUser: userRelation,
                  updatedUser: userRelation
                }))
              }
            : undefined,
        createdUser: userRelation,
        updatedUser: userRelation
      }
    });

    return {
      success: true,
      data: discount,
      message: 'Discount created successfully'
    };
  } catch (error: any) {
    console.error('createDiscountService error:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: {
            message: 'Duplicate record detected',
            issues: error.meta?.target
          }
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: {
            message: 'Record not found'
          }
        };
      }
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create discount'
      }
    };
  }
};

// ==== UPDATE A DISCOUNT ==== //
export const checkVouchers = async (id: string) => {
  try {
    const existingVouchers = await prisma.discount.findUnique({
      where: { id },
      select: { vouchers: true }
    });

    return existingVouchers;
  } catch (error: any) {
    console.log('checkVouchers error', error);
    throw error;
  }
};

export const updateOneDiscountService = async (
  id: string,
  payload: {
    name?: string;
    discountType?: number;
    discountMethod?: DiscountMethod[];
    paymentType?: PaymentType[];
    discountValue?: number;
    discountValueForeign?: number;
    fromDate?: Date;
    toDate?: Date;
    isVoucher?: number;
    autoApply?: boolean;
    status?: number;
    applyTo?: number;
    vouchers?: { code: string; limit: number }[];
  },
  user?: { id?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  try {
    const parsed = discountUpdateSchema.safeParse({
      ...payload,
      id
    });

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const updateData: Prisma.DiscountUpdateInput = {
      updatedAt: new Date(),
      ...(userRelation && { updatedUser: userRelation })
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountMethod !== undefined) updateData.discountMethod = data.discountMethod;
    if (data.paymentType !== undefined) updateData.paymentType = data.paymentType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.discountValueForeign !== undefined)
      updateData.discountValueForeign = data.discountValueForeign;
    if (data.fromDate !== undefined) updateData.fromDate = data.fromDate;
    if (data.toDate !== undefined) updateData.toDate = data.toDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.applyTo !== undefined) updateData.applyTo = data.applyTo;
    if (data.autoApply !== undefined) updateData.autoApply = data.autoApply;
    if (data.isVoucher !== undefined) updateData.isVoucher = data.isVoucher;

    const discount = await prisma.discount.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      data: discount,
      message: 'Discount updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneDiscountService error:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: {
            message: 'Duplicate record detected',
            issues: error.meta?.target
          }
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: {
            message: 'Record not found'
          }
        };
      }
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update discount'
      }
    };
  }
};

// ==== CREATE A VOUCHER ==== //
export const checkDiscountId = async (discountId: string) => {
  try {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    });

    if (!discount) {
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('checkDiscountId error', error);
    throw error;
  }
};

export const createOneVoucherService = async (
  discountId: string,
  payload: Prisma.VoucherCodeCreateInput
) => {
  try {
    const result = await prisma.voucherCode.create({
      data: {
        ...payload,
        discount: {
          connect: { id: discountId }
        }
      }
    });

    return result;
  } catch (error: any) {
    console.error('createOneVoucherService error', error);
    throw error;
  }
};

// ==== DELETE A VOUCHER ==== //
export const deleteOneVoucherService = async (id: string) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucherCode.findUnique({
        where: { id },
        include: {
          discount: {
            select: {
              id: true,
              isVoucher: true
            }
          }
        }
      });

      if (!voucher) {
        return {
          success: false,
          message: 'Voucher not found'
        };
      }

      if (voucher.discount?.isVoucher === 1) {
        const voucherCount = await tx.voucherCode.count({
          where: {
            discountId: voucher.discountId
          }
        });

        if (voucherCount <= 1) {
          return {
            success: false,
            message: 'At least one voucher code is required for this discount'
          };
        }
      }

      const deletedVoucher = await tx.voucherCode.delete({
        where: { id }
      });

      return {
        success: true,
        message: 'Voucher code deleted successfully',
        data: deletedVoucher
      };
    });
  } catch (error: any) {
    console.log('deleteOneVoucherService error', error);
    return {
      success: false,
      message: 'Something went wrong'
    };
  }
};

// ==== GET ONE DISCOUNT ==== //
export const getDiscountByIdService = async (id: string) => {
  try {
    const result = prisma.discount.findUnique({
      where: { id },
      include: {
        vouchers: true
      }
    });

    return result;
  } catch (error: any) {
    console.log('getDiscountByIdService error', error);
    throw error;
  }
};

// ==== DELETE A DISCOUNT ==== //
export const deleteDiscountByIdService = async (id: string) => {
  try {
    const result = await prisma.discount.delete({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('deleteDiscountByIdService error', error);
    throw error;
  }
};

// ==== DELETE DISCOUNTS ==== //
export const bulkDeleteDiscountsByIdsService = async (ids: string[]) => {
  try {
    const result = await prisma.discount.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return result;
  } catch (error: any) {
    console.log('bulkDeleteDiscountsByIdsService error', error);
    throw error;
  }
};
