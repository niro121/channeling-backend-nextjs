'use server';

import prisma from '@/lib/prisma';
import { Discount, getDiscountQuery } from '@/types/discount';
import { Prisma } from '@prisma/client';

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
  payload: Prisma.DiscountCreateInput
) => {
  try {
    const result = prisma.discount.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('createDiscountService error', error);
    throw error;
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
  payload: Prisma.DiscountUpdateInput
): Promise<Discount | null> => {
  try {
    const result = await prisma.discount.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('updateOneDiscountService error', error);
    throw error;
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
