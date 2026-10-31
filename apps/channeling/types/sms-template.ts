export type SmsTemplate = {
  id?: string
  name: string
  type: number | null
  message: string
  status: number | null // 0 = inactive, 1 = active
  createdAt?: Date
  updatedAt?: Date
}

export type SmsTemplateFormValues = {
  name: string
  type: number | null
  message: string
  status: number
}

export type GetSmsTemplateParam = {
  page?: string
  limit?: string
  keyword?: string
  type?: string
  status?: string
}

export type GetSmsTemplateQuery = {
  page: number
  limit: number
  keyword: string
  type?: number | null
  status?: number | null
}

/** Template type options for dropdown (id + name). */
export const SMS_TEMPLATE_TYPES = [
  { id: 0, name: "Channel Doctor Arrival" },
  { id: 1, name: "Channel Doctor Departure" },
  { id: 2, name: "Channel Doctor Leave/Absent" },
  { id: 3, name: "Appointment Reschedule" },
  { id: 4, name: "Agent Balance Message after Booking Agent Channel" },
  { id: 5, name: "Appointments count SMS For Doctor (Block wise)" },
] as const
