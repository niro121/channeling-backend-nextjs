'use server'

import { GetZonesParams, GetZonesQuery, Zone } from "@/types/zone"
import { deleteOneZone, deleteZones, getZones, saveZone, updateOneZone, getZoneById, checkZoneHasLinkedRecordsService, checkZonesHaveLinkedRecordsService } from "@/services/zone.service"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { fetchServerSession } from "@/lib/session"

export const getAllZones = async (filter: GetZonesParams) => {
    // Check view permission
    await requirePermission("zones", "view")
    
    try {
        let newFilter: GetZonesQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
            locationId: filter.locationId ?? undefined,
        }

        const response = await getZones(newFilter);

        if (!response.success) {
            return {
                success: false,
                message: response.error?.message || "Failed to fetch zones",
                data: [],
                totalRecords: 0
            };
        }

        return {
            success: true,
            data: response.data ?? [],
            totalRecords: response.totalRecords ?? 0
        };
    } catch (error: any) {
        console.error('getAllZones error:', error);
        return {
            success: false,
            message: error.message || "Error getting data. please try again later",
            data: [],
            totalRecords: 0
        };
    }
}

export const bulkDeleteZones = async (ids: string[]) => {
    // Check delete permission
    await requirePermission("zones", "delete")
    
    try {
        const result = await deleteZones(ids);

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to delete zones");
        }
        const session = await fetchServerSession();
        if (session?.user?.id) {
            logActivityNonBlocking({
                userId: session.user.id,
                action: "zones.zones.bulkDeleted",
                entityType: "Zone",
                importance: "high",
                metadata: { count: ids.length },
            });
        }
        revalidatePath('/zones');
        return true;
    } catch (error: any) {
        console.error('bulkDeleteZones error:', error);
        throw error;
    }
}

export const deleteZone = async (id: string) => {
    // Check delete permission
    await requirePermission("zones", "delete")
    
    try {
        const result = await deleteOneZone(id);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: result.message || "Zone deletion failed"
                }
            };
        }
        const session = await fetchServerSession();
        if (session?.user?.id) {
            logActivityNonBlocking({
                userId: session.user.id,
                action: "zones.zone.deleted",
                entityType: "Zone",
                entityId: id,
                importance: "high",
            });
        }
        revalidatePath('/zones');

        return {
            success: true,
            data: result.data,
            message: result.message || "Zone deleted successfully"
        };
    } catch (error: any) {
        console.error('deleteZone error:', error);
        return {
            success: false,
            error: {
                message: error.message || "Failed to delete zone"
            }
        };
    }
}

export const createNewZone = async (payload: Zone): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: {
        message?: string;
        issues?: any;
    };
}> => {
    // Check add permission
    await requirePermission("zones", "add")
    
    try {
        const session = await fetchServerSession();
        const user = session?.user?.id
            ? { id: session.user.id, name: session.user.name ?? undefined }
            : undefined;

        // Clean up payload
        const cleanPayload = { ...payload };
        delete cleanPayload.id;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        delete cleanPayload.location;

        // Set default status if not provided
        if (cleanPayload.status === undefined) {
            cleanPayload.status = 0;
        }

        const result = await saveZone(cleanPayload, user);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: result.message || "Zone creation failed"
                }
            };
        }
        if (user) {
            logActivityNonBlocking({
                userId: user.id,
                action: "zones.zone.created",
                entityType: "Zone",
                entityId: result.data?.id ?? undefined,
                importance: "high",
                metadata: result.data ? { name: result.data.name } : undefined,
            })
        }
        revalidatePath('/zones');

        return {
            success: true,
            data: result.data,
            message: result.message || "Zone created successfully"
        };
    } catch (error: any) {
        console.error('createNewZone action error:', error);

        return {
            success: false,
            error: {
                message: error.message || "Unexpected error occurred"
            }
        };
    }
}

export const updateZone = async (
    id: string,
    payload: Zone
): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: {
        message?: string;
        issues?: any;
    };
}> => {
    // Check edit permission
    await requirePermission("zones", "edit")
    
    try {
        const session = await fetchServerSession();
        const user = session?.user?.id
            ? { id: session.user.id, name: session.user.name ?? undefined }
            : undefined;

        // Clean up payload
        const cleanPayload = { ...payload };
        delete cleanPayload.id;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        delete cleanPayload.location;

        const result = await updateOneZone(id, cleanPayload, user);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: result.message || "Zone update failed"
                }
            };
        }
        if (user) {
            logActivityNonBlocking({
                userId: user.id,
                action: "zones.zone.updated",
                entityType: "Zone",
                entityId: id,
                importance: "high",
            })
        }
        revalidatePath('/zones');
        revalidatePath(`/zones/${id}/edit`);

        return {
            success: true,
            data: result.data,
            message: result.message || "Zone updated successfully"
        };
    } catch (error: any) {
        console.error('updateZone action error:', error);

        return {
            success: false,
            error: {
                message: error.message || "Unexpected error occurred"
            }
        };
    }
}

export const fetchZoneById = async (id: string) => {
    try {
        if (!id) {
            return {
                success: false,
                error: {
                    message: "Zone ID is required"
                },
                data: null
            };
        }

        const result = await getZoneById(id);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: "Failed to fetch zone"
                },
                data: null
            };
        }

        if (!result.data) {
            return {
                success: false,
                error: {
                    message: "Zone not found"
                },
                data: null
            };
        }

        return {
            success: true,
            data: result.data
        };
    } catch (error: any) {
        console.error("Error in fetchZoneById:", error);

        return {
            success: false,
            error: {
                message: error.message || "Unable to fetch zone"
            },
            data: null
        };
    }
};

// ==== ZONES EXPORT ==== //
export const getZonesExport = async (params: { keyword?: string; locationId?: string }) => {
  try {
    const response = await getAllZones({
      page: "0",
      limit: "10000", // Get all records
      keyword: params.keyword ?? "",
      locationId: params.locationId ?? undefined,
    });

    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.success ? 'No zones found' : response.message || 'Error getting data'
      };
    }
    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: "zones.exported",
        entityType: "Zone",
        importance: "medium",
        metadata: { count: response.data?.length ?? 0 },
      });
    }
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.log('getZonesExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};

// ==== CHECK SINGLE ZONE HAS LINKED RECORDS ==== //
export const checkZoneHasLinkedRecords = async (
  zoneId: string
): Promise<{
  success: boolean
  data?: {
    hasLinkedRecords: boolean
  }
  message?: string
  error?: { message?: string }
}> => {
  try {
    const result = await checkZoneHasLinkedRecordsService(zoneId)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || "Failed to check zone linked records"
      }
    }

    return {
      success: true,
      data: result.data,
      message: "Check completed successfully"
    }
  } catch (error: any) {
    console.error("checkZoneHasLinkedRecords action error:", error)
    return {
      success: false,
      error: {
        message: error.message || "Error checking zone linked records"
      }
    }
  }
}

// ==== CHECK ZONES HAVE LINKED RECORDS ==== //
export const checkZonesHaveLinkedRecords = async (
  zoneIds: string[]
): Promise<{
  success: boolean
  data?: {
    hasLinkedRecords: boolean
  }
  message?: string
  error?: { message?: string }
}> => {
  try {
    const result = await checkZonesHaveLinkedRecordsService(zoneIds)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || "Failed to check zones linked records"
      }
    }

    return {
      success: true,
      data: result.data,
      message: "Check completed successfully"
    }
  } catch (error: any) {
    console.error("checkZonesHaveLinkedRecords action error:", error)
    return {
      success: false,
      error: {
        message: error.message || "Error checking zones linked records"
      }
    }
  }
}