/**
 * Staff form and API types.
 */

export type Staff = {
  id?: string
  code: string
  title: string
  name: string
  nic: string
  dateOfBirth: Date | undefined
  gender: string
  contactMobile: string
  address: string
  dateJoined: Date | undefined
  status: number // 0 = Inactive, 1 = Active
}

export const GENDER_OPTIONS = [
  { id: '0', name: 'Male' },
  { id: '1', name: 'Female' },
  { id: '2', name: 'Other' },
] as const

export const STAFF_STATUS_OPTIONS = [
  { id: '0', name: 'Inactive' },
  { id: '1', name: 'Active' },
] as const

export type GetStaffParams = {
  page?: string
  limit?: string
  keyword?: string
}
