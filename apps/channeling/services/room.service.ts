'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Room, getRoomQuery, RoomFormValues } from '@/types/room';
import { z } from 'zod';

// ==== ROOM: VALIDATION SCHEMA ==== //
const roomSchema = z.object({
  number: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Must be less than 500 characters')
    .optional()
    .nullable(),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    }),
  locationId: z.string().min(1, 'This field is mandatory'),
  zoneId: z.string().min(1, 'This field is mandatory')
});

const roomUpdateSchema = roomSchema.partial().extend({
  id: z.string().min(1, 'Room ID is required')
});

type roomInput = z.infer<typeof roomSchema>;

// ==== GET ALL ROOMS ==== //
export const getAllRoomsService = async ({
  page,
  limit,
  keyword,
  locationId
}: getRoomQuery): Promise<{
  success: boolean;
  data?: Room[];
  totalRecords?: number;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    const roomModel = (prisma as unknown as {
      room: {
        findMany: (args: object) => Promise<Room[]>
        count: (args: object) => Promise<number>
      }
    }).room;
    const whereClause: Prisma.RoomWhereInput | undefined =
      keyword && keyword.trim() !== ''
        ? {
            OR: [
              {
                number: {
                  contains: keyword,
                  mode: Prisma.QueryMode.insensitive
                }
              },
              {
                zone: {
                  is: {
                    name: {
                      contains: keyword,
                      mode: Prisma.QueryMode.insensitive
                    }
                  }
                }
              }
            ],
            ...(locationId ? { locationId } : {})
          }
        : locationId
          ? { locationId: locationId }
          : undefined;

    const skip = page * limit;

    const records = await roomModel.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
      include: {
        location: true,
        zone: true,
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await roomModel.count({
      where: whereClause
    });

    return {
      success: true,
      data: records as Room[],
      totalRecords
    };
  } catch (error: any) {
    console.error('getAllRoomsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch rooms'
      }
    };
  }
};

// ==== CHECK ROOM NUMBER ==== //
export const checkRoomNumber = async (
  number: string,
  locationId: string,
  zoneId: string
) => {
  try {
    const existing = await prisma.room.findFirst({
      where: {
        number,
        locationId,
        zoneId
      }
    });

    return !existing; // == true: unique, false: duplicate == //
  } catch (error: any) {
    console.log('checkRoomNumber error', error);
    throw error;
  }
};

// ==== CREATE ROOM ==== //
export const createRoomService = async (
  payload: RoomFormValues,
  user?: { id?: string; name?: string }
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
    const parsed = roomSchema.safeParse(payload);

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

    // Check if room number already exists for the same location and zone
    const existingRoom = await prisma.room.findFirst({
      where: {
        number: data.number,
        locationId: data.locationId,
        zoneId: data.zoneId
      }
    });

    if (existingRoom) {
      return {
        success: false,
        error: {
          message: 'Room number already exists for this location and zone',
          issues: { number: ['Room number must be unique within the same location and zone'] }
        }
      };
    }

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const room = await prisma.room.create({
      data: {
        number: data.number,
        description: data.description ?? '',
        status: data.status,
        location: {
          connect: { id: data.locationId }
        },
        zone: {
          connect: { id: data.zoneId }
        },
        createdUser: userRelation,
        updatedUser: userRelation
      }
    });

    return {
      success: true,
      data: room,
      message: 'Room created successfully'
    };
  } catch (error: any) {
    console.error('createRoomService error:', error);

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create room'
      }
    };
  }
};

// ==== UPDATE ROOM ==== //
export const updateOneRoomService = async (
  id: string,
  payload: Partial<RoomFormValues>,
  user?: { id?: string; name?: string }
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
    const parsed = roomUpdateSchema.safeParse({
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

    // Check if room number is being updated and if it already exists
    if (data.number && data.locationId && data.zoneId) {
      const existingRoom = await prisma.room.findFirst({
        where: {
          number: data.number,
          locationId: data.locationId,
          zoneId: data.zoneId,
          id: { not: id }
        }
      });

      if (existingRoom) {
        return {
          success: false,
          error: {
            message: 'Room number already exists for this location and zone',
            issues: { number: ['Room number must be unique within the same location and zone'] }
          }
        };
      }
    }

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const updateData: Prisma.RoomUpdateInput = {
      updatedAt: new Date(),
      updatedUser: userRelation
    };

    if (data.number !== undefined) updateData.number = data.number;
    if (data.description !== undefined) updateData.description = data.description ?? '';
    if (data.status !== undefined) updateData.status = data.status;

    if (data.locationId !== undefined) {
      updateData.location = {
        connect: { id: data.locationId }
      };
    }

    if (data.zoneId !== undefined) {
      updateData.zone = {
        connect: { id: data.zoneId }
      };
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      data: room,
      message: 'Room updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneRoomService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Room not found'
        }
      };
    }

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update room'
      }
    };
  }
};

// ==== GET ONE ROOM ==== //
export const getRoomByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: Room | null;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: {
          message: 'Room ID is required'
        }
      };
    }

    const result = await prisma.room.findUnique({
      where: { id },
      include: {
        location: true,
        createdUser: true,
        updatedUser: true
      }
    });

    return {
      success: true,
      data: result as Room | null
    };
  } catch (error: any) {
    console.error('getRoomByIdService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch room'
      }
    };
  }
};

// ==== DELETE ROOM ==== //
export const deleteRoomByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: {
          message: 'Room ID is required'
        }
      };
    }

    const room = await prisma.room.delete({
      where: { id }
    });

    return {
      success: true,
      data: room,
      message: 'Room deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteRoomByIdService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Room not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete room'
      }
    };
  }
};

// ==== BULK DELETE ROOMS ==== //
export const bulkDeleteRoomsByIdsService = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: {
    count: number;
  };
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        error: {
          message: 'No room IDs provided'
        }
      };
    }

    const result = await prisma.room.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: {
          message: 'No rooms found to delete'
        }
      };
    }

    return {
      success: true,
      data: {
        count: result.count
      },
      message: `${result.count} room(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('bulkDeleteRoomsByIdsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete rooms'
      }
    };
  }
};

// ==== GET LOCATIONS ==== //
export const getAllLocationsService = async () => {
  try {
    const records = await prisma.location.findMany({
      where: { status: 1 },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });

    return records
  } catch (error: any) {
    console.log('getAllLocationsService error', error);
    throw error;
  }
};

// ==== GET ALL ZONES BY LOCATION ID ==== //
export const getAllZonesByLocaionIDService = async (locationId: string) => {
  try {
    const records = await prisma.zone.findMany({
      where: { status: 1, locationId },
      orderBy: { name: 'asc' }
    });

    return records;
  } catch (error: any) {
    console.log('getAllZonesByLocaionID error', error);
    throw error;
  }
};

// ==== CHECK SINGLE ROOM HAS LINKED RECORDS ==== //
export const checkRoomHasLinkedRecordsService = async (
    roomId: string
): Promise<{
    success: boolean
    data?: {
        hasLinkedRecords: boolean
    }
    error?: { message?: string }
}> => {
    try {
        if (!roomId) {
            return {
                success: false,
                error: {
                    message: "Invalid room ID"
                }
            }
        }

        // Check if room has zoneId assigned
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { zoneId: true, locationId: true }
        })

        // Check for DoctorSession records associated with this room
        const doctorSessionCount = await prisma.doctorSession.count({
            where: {
                roomId: roomId
            }
        })

        // Check for Session records associated with this room
        const sessionCount = await prisma.session.count({
            where: {
                roomId: roomId
            }
        })

        const hasLinkedRecords = 
            (room?.zoneId !== null && room?.zoneId !== undefined) ||
            (room?.locationId !== null && room?.locationId !== undefined) ||
            doctorSessionCount > 0 ||
            sessionCount > 0

        return {
            success: true,
            data: {
                hasLinkedRecords
            }
        }
    } catch (error: any) {
        console.error("checkRoomHasLinkedRecordsService error", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to check room linked records"
            }
        }
    }
}

// ==== CHECK ROOMS HAVE LINKED RECORDS ==== //
export const checkRoomsHaveLinkedRecordsService = async (
    roomIds: string[]
): Promise<{
    success: boolean
    data?: {
        hasLinkedRecords: boolean
    }
    error?: { message?: string }
}> => {
    try {
        if (!roomIds || roomIds.length === 0) {
            return {
                success: false,
                error: {
                    message: "Invalid room IDs"
                }
            }
        }

        // Check if any rooms have zoneId or locationId assigned
        const roomsWithAssignments = await prisma.room.count({
            where: {
                id: {
                    in: roomIds
                },
                OR: [
                    { zoneId: { not: null } },
                    { locationId: { not: null } }
                ]
            }
        })

        // Check for DoctorSession records associated with any of these rooms
        const doctorSessionCount = await prisma.doctorSession.count({
            where: {
                roomId: {
                    in: roomIds
                }
            }
        })

        // Check for Session records associated with any of these rooms
        const sessionCount = await prisma.session.count({
            where: {
                roomId: {
                    in: roomIds
                }
            }
        })

        const hasLinkedRecords = roomsWithAssignments > 0 || doctorSessionCount > 0 || sessionCount > 0

        return {
            success: true,
            data: {
                hasLinkedRecords
            }
        }
    } catch (error: any) {
        console.error("checkRoomsHaveLinkedRecordsService error", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to check rooms linked records"
            }
        }
    }
}