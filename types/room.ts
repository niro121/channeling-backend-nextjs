import { Location } from "./location"
import { User } from "./user"

export type Room = {
  id?: string
  number: number
  description: string
  status: number // == 0: unpublish, 1: publish == //
  locationId: string
  location: Location | null
  createdUser?: User | null;
  updatedUser?: User | null;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
} 

export type RoomFormValues = {
  number: number
  description: string
  status: number // == 0: unpublish, 1: publish == //
  locationId: string
}

export type UpdateRoomPayload = Partial<{
  number: number
  description: string
  status: number // == 0: unpublish, 1: publish == //
  locationId: string
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