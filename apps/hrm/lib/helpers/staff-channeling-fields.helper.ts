import type { Staff } from '@archmage/shared';
import { z } from 'zod';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';

export const CHANNELING_STAFF_FIELDS = [
  'code',
  'title',
  'name',
  'nic',
  'dateOfBirth',
  'gender',
  'contactMobile',
  'address',
  'dateJoined',
  'status'
] as const;

export type ChannelingStaffField = (typeof CHANNELING_STAFF_FIELDS)[number];

/** Fields required by Channeling staff create/update (matches channeling staff form). */
export const CHANNELING_STAFF_REQUIRED_FIELDS = [
  'code',
  'name',
  'nic',
  'dateOfBirth',
  'gender',
  'contactMobile',
  'address',
  'dateJoined',
  'status'
] as const satisfies readonly ChannelingStaffField[];

export const CHANNELING_STAFF_FIELD_LABELS: Record<ChannelingStaffField, string> = {
  code: 'Staff Code',
  title: 'Title',
  name: 'Name',
  nic: 'NIC',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  contactMobile: 'Mobile Number',
  address: 'Address',
  dateJoined: 'Date Joined',
  status: 'Status'
};

function normalizeChannelingValue(
  field: ChannelingStaffField,
  value: unknown
): string {
  if (value == null || value === '') return '';

  if (field === 'dateOfBirth' || field === 'dateJoined') {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  if (field === 'status') {
    return String(value);
  }

  return String(value).trim();
}

export function getChangedChannelingFieldLabels(
  original: Partial<Staff>,
  updated: Partial<Staff>
): string[] {
  const changed: string[] = [];

  for (const field of CHANNELING_STAFF_FIELDS) {
    const before = normalizeChannelingValue(field, original[field]);
    const after = normalizeChannelingValue(field, updated[field]);

    if (before !== after) {
      changed.push(CHANNELING_STAFF_FIELD_LABELS[field]);
    }
  }

  return changed;
}

export function hasChannelingFieldChanges(
  original: Partial<Staff>,
  updated: Partial<Staff>
): boolean {
  return getChangedChannelingFieldLabels(original, updated).length > 0;
}

export function toChannelingDateString(
  value: Date | string | null | undefined
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export type ChannelingStaffWriteBody = {
  code?: string;
  title?: string;
  name?: string;
  nic?: string;
  dateOfBirth?: string | null;
  gender?: string;
  contactMobile?: string;
  address?: string;
  dateJoined?: string | null;
  status?: number;
};

export const channelingStaffPayloadSchema = z.object({
  code: z.string().min(1, 'Staff Code is required').max(50, 'Must be less than 50 characters'),
  title: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Name is required').max(150, 'Must be less than 150 characters'),
  nic: z.string().min(1, 'NIC is required').max(20, 'Must be less than 20 characters'),
  dateOfBirth: z
    .union([z.coerce.date(), z.date()])
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: 'Date of Birth is required'
    }),
  gender: z.string().min(1, 'Gender is required'),
  contactMobile: z
    .string()
    .min(1, 'Contact Mobile is required')
    .max(15, 'Must be less than 15 characters')
    .regex(MOBILE_NUMBER_REGEX, 'Mobile Number Ex: 07x xxxxxxx'),
  address: z.string().min(1, 'Address is required').max(500, 'Must be less than 500 characters'),
  dateJoined: z
    .union([z.coerce.date(), z.date()])
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: 'Date Joined is required'
    }),
  status: z.number().int().refine((val) => val === 0 || val === 1, {
    message: 'Status must be Inactive (0) or Active (1)'
  })
});

export function staffRecordToChannelingPayload(
  staff: Partial<Staff> & { code?: string; name?: string; status?: number }
): Partial<Staff> {
  return {
    code: staff.code,
    title: staff.title ?? '',
    name: staff.name,
    nic: staff.nic ?? '',
    dateOfBirth: staff.dateOfBirth ?? undefined,
    gender: staff.gender ?? '',
    contactMobile: staff.contactMobile ?? '',
    address: staff.address ?? '',
    dateJoined: staff.dateJoined ?? undefined,
    status: staff.status
  };
}

export function toChannelingStaffBody(
  staff: Partial<Staff>
): ChannelingStaffWriteBody {
  const body: ChannelingStaffWriteBody = {};

  if (staff.code !== undefined) body.code = staff.code;
  if (staff.title !== undefined) body.title = staff.title ?? '';
  if (staff.name !== undefined) body.name = staff.name;
  if (staff.nic !== undefined) body.nic = staff.nic ?? '';
  if (staff.dateOfBirth !== undefined) {
    body.dateOfBirth = toChannelingDateString(staff.dateOfBirth);
  }
  if (staff.gender !== undefined) body.gender = staff.gender ?? '';
  if (staff.contactMobile !== undefined) body.contactMobile = staff.contactMobile ?? '';
  if (staff.address !== undefined) body.address = staff.address ?? '';
  if (staff.dateJoined !== undefined) {
    body.dateJoined = toChannelingDateString(staff.dateJoined);
  }
  if (staff.status !== undefined) body.status = staff.status;

  return body;
}
