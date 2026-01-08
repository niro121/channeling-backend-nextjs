'use server';

import { authOptions } from '@/lib/auth';
import {
  bulkDeleteDoctorsByIdsService,
  lastDoctorCode,
  createDoctorService,
  deleteDoctorByIdService,
  getAllDoctorsService,
  getDoctorByIdService,
  updateOneDoctorService,
  getAllDoctorsDownloadService,
  getAllSpecialityOptionsService
} from '@/services/doctor.service';
import {
  Doctor,
  getDoctorParams,
  getDoctorQuery,
  ExportDoctorParams,
  ExportDoctorsPdfResponse,
  DoctorFormValues,
  UpdateDoctorPayload
} from '@/types/doctor';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { padCode } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { Speciality } from '@/types/speciality';

type CreateDoctorPayload = DoctorFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

const PREFIX = 'DR';
const MAX_CODE = Number(process.env.MAX_CODE) || 1000;

// ==== GET ALL DOCTORS ==== //
export const getAllDoctors = async (sort: getDoctorParams) => {
  try {
    const validSpecialityId =
      sort.specialityId && /^[a-fA-F0-9]{24}$/.test(sort.specialityId)
        ? sort.specialityId
        : undefined;

    const newFilter: getDoctorQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      specialityId: validSpecialityId
    };

    const response = await getAllDoctorsService(newFilter);

    return {
      success: true,
      data: response.data as Doctor[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllDoctors error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE DOCTOR ==== //
export const getDoctorById = async (id: string) => {
  try {
    const response = await getDoctorByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getDoctorById error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. Please try again later',
      data: null
    };
  }
};

// ==== CREATE A DOCTOR ==== //
export const getNextDoctorCode = async (): Promise<string> => {
  const lastSpeciality = await lastDoctorCode();

  let nextNumber = 1;

  if (lastSpeciality?.code) {
    const match = lastSpeciality.code.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  if (nextNumber > MAX_CODE) {
    throw new Error('Maximum Doctor code limit reached');
  }

  return `${PREFIX}${padCode(nextNumber, 4)}`; // == FORMAT: DR0001 == //
};

export const createDoctor = async (
  payload: CreateDoctorPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const doctorCode = await getNextDoctorCode();

    if (!payload.specialityId) {
      throw new Error('Speciality is required');
    }

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const result = await createDoctorService({
      title: payload.title,
      name: payload.name,
      code: doctorCode,
      order: payload.order,
      phone: payload.phone,
      mobile: payload.mobile,
      fax: payload.fax,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      registrationNumber: payload.registrationNumber,
      qualification: payload.qualification,
      referralCharge: payload.referralCharge,
      sessionNoPrefix: payload.sessionNoPrefix,
      status: payload.status,
      speciality: {
        connect: { id: payload.specialityId }
      },
      createdUser: userRelation,
      updatedUser: userRelation
    });

    revalidatePath('/doctors');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createDoctor error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create doctor'
      }
    };
  }
};

// ==== UPDATE A DOCTOR ==== //
export const updateOneDoctor = async (
  id: string,
  payload: UpdateDoctorPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const data: Prisma.DoctorUpdateInput = {
      updatedAt: new Date(),
      ...(user?.id ? { updatedUser: { connect: { id: user.id } } } : {})
    };

    if (payload.title !== undefined) data.title = payload.title;
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.order !== undefined) data.order = payload.order;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.mobile !== undefined) data.mobile = payload.mobile;
    if (payload.fax !== undefined) data.fax = payload.fax;
    if (payload.addressLine1 !== undefined)
      data.addressLine1 = payload.addressLine1;
    if (payload.addressLine2 !== undefined)
      data.addressLine2 = payload.addressLine2;
    if (payload.city !== undefined) data.city = payload.city;
    if (payload.registrationNumber !== undefined)
      data.registrationNumber = payload.registrationNumber;
    if (payload.qualification !== undefined)
      data.qualification = payload.qualification;
    if (payload.referralCharge !== undefined)
      data.referralCharge = payload.referralCharge;
    if (payload.sessionNoPrefix !== undefined)
      data.sessionNoPrefix = payload.sessionNoPrefix;
    if (payload.status !== undefined) data.status = payload.status;

    if (payload.specialityId) {
      data.speciality = {
        connect: { id: payload.specialityId }
      };
    }

    const result = await updateOneDoctorService(id, data);

    revalidatePath('/doctors');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('updateDoctor error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update doctor'
      }
    };
  }
};

// ==== DELETE A DOCTOR ==== //
export const deleteDoctor = async (id: string) => {
  try {
    const result = await deleteDoctorByIdService(id);

    revalidatePath('/doctors');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('deleteDoctor error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete doctor'
      }
    };
  }
};

// ==== DELETE BULK DOCTORS ==== //
export const bulkDeleteDoctors = async (ids: string[]) => {
  try {
    const result = await bulkDeleteDoctorsByIdsService(ids);

    revalidatePath('/doctors');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteDoctors error', error);
    return false;
  }
};

// ==== GET ALL SPECIALITY OPTIONS ==== //
export const getAllSpecialityOptions = async () => {
  try {
    const response = await getAllSpecialityOptionsService();

    return {
      success: true,
      data: response.data as Speciality[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getAllSpecialityOptions error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get specialities'
      }
    };
  }
};

// ==== DOCTOR LIST DOWLOAD ==== //
export const getDoctorsExport = async (
  filters: ExportDoctorParams
): Promise<ExportDoctorsPdfResponse> => {
  try {
    const response = await getAllDoctorsDownloadService({
      keyword: filters.keyword ?? '',
      specialityId: filters.specialityId
    });

    if (!response.doctors?.length) {
      return {
        success: false,
        message: 'No available doctors in the database'
      };
    }

    return {
      success: true,
      data: response.doctors,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getDoctorsExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};
