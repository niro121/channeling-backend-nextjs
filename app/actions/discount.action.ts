'use server';

import {
  createDiscountService,
  getAllDiscountsService,
  getDiscountByIdService,
  checkUniqueVoucherCodes,
  updateOneDiscountService,
  deleteDiscountByIdService,
  bulkDeleteDiscountsByIdsService,
  updateOneVoucherService,
  deleteOneVoucherService
} from '@/services/discount.service';
import {
  Discount,
  DiscountFormValues,
  getDiscountParams,
  getDiscountQuery,
  UpdatedDiscountPayload
} from '@/types/discount';
import { UpdatedVoucherPayload } from '@/types/voucher';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type createDiscountPayload = DiscountFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL DISCOUNTS ==== //
export const getAllDiscounts = async (sort: getDiscountParams) => {
  try {
    let newFilter: getDiscountQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      applyType: sort.applyType ? parseInt(sort.applyType) : undefined
    };

    const response = await getAllDiscountsService(newFilter);

    return {
      success: true,
      data: response.data as Discount[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllDiscounts error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE DISCOUNT ==== //
export const getDiscountById = async (id: string) => {
  try {
    const response = await getDiscountByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getDiscountByIdService error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: null
    };
  }
};

// ==== CREATE A DISCOUNT ==== //
export const createDiscount = async (
  payload: createDiscountPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const voucherAccepted = payload.isVoucher === 1;

    if (!voucherAccepted && payload.vouchers?.length) {
      return {
        success: false,
        error: {
          message: 'Vouchers are not allowed when isVoucher is disabled'
        }
      };
    }

    if (
      voucherAccepted &&
      (!payload.vouchers || payload.vouchers.length === 0)
    ) {
      return {
        success: false,
        error: {
          message:
            'At least one voucher code is required when isVoucher is enabled'
        }
      };
    }

    if (voucherAccepted && payload.vouchers) {
      const codes = payload.vouchers.map((v) => v.code);
      const duplicatedCodes = await checkUniqueVoucherCodes(codes);

      if (duplicatedCodes.length > 0) {
        return {
          success: false,
          error: {
            message: `Voucher code(s) already exist: ${duplicatedCodes.join(', ')}`
          }
        };
      }
    }

    const discountRelation = user?.id
      ? { connect: { id: user.id } }
      : undefined;

    const result = await createDiscountService({
      name: payload.name,
      discountType: payload.discountType,
      discountMethod: payload.discountMethod,
      paymentType: payload.paymentType,
      discountValue: payload.discountValue,
      discountValueForeign: payload.discountValueForeign,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      isVoucher: payload.isVoucher,
      autoApply: payload.autoApply,
      applyTo: payload.applyTo,
      vouchers:
        voucherAccepted && payload.vouchers && payload.vouchers.length > 0
          ? {
              create: payload.vouchers.map((voucher) => ({
                code: voucher.code,
                limit: voucher.limit,
                status: 1,
                createdUser: discountRelation,
                updatedUser: discountRelation
              }))
            }
          : undefined,
      status: payload.status,
      createdUser: discountRelation,
      updatedUser: discountRelation
    });

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createDiscount error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create discount'
      }
    };
  }
};

// ==== UPDATE A DISCOUNT ==== //
export const updateOneDiscount = async (
  id: string,
  payload: UpdatedDiscountPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const voucherAccepted = payload.isVoucher === 1;

    if (!voucherAccepted && payload.vouchers?.length) {
      return {
        success: false,
        error: {
          message: 'Vouchers are not allowed when isVoucher is disabled'
        }
      };
    }

    if (
      voucherAccepted &&
      (!payload.vouchers || payload.vouchers.length === 0)
    ) {
      return {
        success: false,
        error: {
          message:
            'At least one voucher code is required when isVoucher is enabled'
        }
      };
    }

    if (voucherAccepted && payload.vouchers) {
      const codes = payload.vouchers.map((v) => v.code);
      const duplicatedCodes = await checkUniqueVoucherCodes(codes);

      if (duplicatedCodes.length > 0) {
        return {
          success: false,
          error: {
            message: `Voucher code(s) already exist: ${duplicatedCodes.join(', ')}`
          }
        };
      }
    }

    const discountRelation = user?.id
      ? { connect: { id: user.id } }
      : undefined;

    const data: Prisma.DiscountUpdateInput = {
      updatedAt: new Date(),
      ...(discountRelation && { updatedUser: discountRelation })
    };

    if (payload.name !== undefined) data.name = payload.name;
    if (payload.discountType !== undefined)
      data.discountType = payload.discountType;
    if (payload.discountMethod !== undefined)
      data.discountMethod = payload.discountMethod;
    if (payload.paymentType !== undefined)
      data.paymentType = payload.paymentType;
    if (payload.discountValue !== undefined)
      data.discountValue = payload.discountValue;
    if (payload.discountValueForeign !== undefined)
      data.discountValueForeign = payload.discountValueForeign;
    if (payload.fromDate !== undefined) data.fromDate = payload.fromDate;
    if (payload.toDate !== undefined) data.toDate = payload.toDate;
    if (payload.isVoucher !== undefined) data.isVoucher = payload.isVoucher;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.applyTo !== undefined) data.applyTo = payload.applyTo;

    if (!voucherAccepted) {
      data.vouchers = {
        deleteMany: {}
      };
    }

    if (voucherAccepted && payload.vouchers) {
      data.vouchers = {
        deleteMany: {},
        create: payload.vouchers.map((voucher) => ({
          code: voucher.code,
          limit: voucher.limit,
          status: 1,
          createdUser: discountRelation,
          updatedUser: discountRelation
        }))
      };
    }

    const result = await updateOneDiscountService(id, data);

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('updateOneDiscount error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update Discount'
      }
    };
  }
};

// ==== UPDATE A VOUCHER ==== //
export const updateOneVoucher = async (
  id: string,
  discountId: string,
  payload: UpdatedVoucherPayload
) => {
  try {
    const result = await updateOneVoucherService(id, discountId, payload);

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('updateOneVoucher error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update Voucher'
      }
    };
  }
};

// ==== DELETE A VOUCHER ==== //
export const deleteOneVoucher = async (id: string) => {
  try {
    const result = await deleteOneVoucherService(id);

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.log('deleteOneVoucher error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete Voucher'
      }
    };
  }
};

// ==== DELETE A DISCOUNT ==== //
export const deleteDiscount = async (id: string) => {
  try {
    const result = await deleteDiscountByIdService(id);

    revalidatePath('/discounts');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('deleteDiscount error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete Discount'
      }
    };
  }
};

// ==== DELETE BULK DISCOUNTS ==== //
export const bulkDeleteDiscounts = async (ids: string[]) => {
  try {
    const result = await bulkDeleteDiscountsByIdsService(ids);

    revalidatePath('/discounts');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteDiscounts error', error);
    return false;
  }
};
