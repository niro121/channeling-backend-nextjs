export type RoomOccupancyReportQuery = {
  fromDateTime?: string
  toDateTime?: string
  institutionId?: string
  locationId?: string
  departmentId?: string
  roomId?: string
}

export type RoomOccupancyReportRow = {
  id: string
  roomId: string
  roomNumber: string
  roomNumberRowSpan: number
  date: Date
  slots: boolean[]
  bookedHours: number
}

export type RoomOccupancyReportExportRow = {
  roomNumber: string
  date: string
  bookedHours: string
  [key: string]: string
}

export type RoomOccupancyReportContentProps = {
  currentUserName: string
  institutionOptions: Array<{ id: string; name: string }>
  locationOptions: Array<{ id: string; name: string }>
  departmentOptions: Array<{ id: string; name: string }>
  roomOptions: Array<{ id: string; name: string }>
}
