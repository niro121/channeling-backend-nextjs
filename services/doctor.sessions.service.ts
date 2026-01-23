'use server';

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ==== GET LOCATION OPTIONS ==== //
export const getLocationOptionsService = async () => {
  try {
    const records = await prisma.location.findMany({
      where: { status: 1 },
      orderBy: {name: "asc"},
      select: {
        id: true,
        name: true
      }
    });

    const totalRecords = await prisma.location.count({
      where: { status: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getLocationOptionsService error', error);
    throw error;
  }
};

// ==== GET DOCTOR OPTIONS ==== //
export const getDoctorOptionsService = async () => {
  try {
    const records = await prisma.doctor.findMany({
      where: { status: 1 },
      orderBy: {name: "asc"},
      select: {
        id: true,
        name: true
      }
    });

    const totalRecords = await prisma.doctor.count({
      where: { status: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getDoctorOptionsService error', error);
    throw error;
  }
};
