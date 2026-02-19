import { Location } from "./location"
import { User } from "./user"
import { Zone } from "./zone"

export type Room = {
  id?: string
  number: string
  description: string
  status: number // == 0: unpublish, 1: publish == //
  locationId: string | null
  location?: Location | null
  zoneId: string | null
  zone?: Zone | null
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
} 

export type RoomFormValues = {
  number: string
  description: string
  status: number // == 0: unpublish, 1: publish == //
  locationId: string
  zoneId: string
}

export type UpdateRoomPayload = Partial<{
  number: string
  description: string
  status: number // == 0: unpublish, 1: publish == //
  locationId: string
  zoneId: string
}>;

export type getRoomParam = {
  page?: string;
  limit?: string;
  keyword?: string;
  locationId?: string;
}

export type getRoomQuery = {
  page: number;
  limit: number;
  keyword: string;
  locationId?: string;
}