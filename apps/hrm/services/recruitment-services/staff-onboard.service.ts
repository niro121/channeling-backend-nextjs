'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { STAFF_STATUS_OPTIONS, type GeneralFormValues } from '@/types/staff';

export type AppointmentLetterOnboardSummary = {
  letterId: string;
  letterNumber: string;
  candidateName: string;
  position: string;
  department: string;
  employmentType: string;
  appointmentDate: string;
  salary: string;
  status: string;
  staffId: string | null;
  alreadyOnboarded: boolean;
};

function toYmd(date?: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function splitCandidateName(full: string): {
  firstName: string;
  lastName: string;
  name: string;
} {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: '', lastName: '', name: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: '', name: trimmed };
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(' '),
    name: trimmed
  };
}

function emptyGeneralForm(): GeneralFormValues {
  return {
    staffCode: '',
    title: '',
    initials: '',
    name: '',
    firstName: '',
    lastName: '',
    fullName: '',
    nameWithInitials: '',
    nic: '',
    dateOfBirth: undefined,
    gender: '',
    mobileNumber: '',
    homeTelephone: '',
    email: '',
    secondaryEmail: '',
    address: '',
    zoneCode: '',
    fingerPrintRfid: '',
    staffCodeLegacy: '',
    epfNumber: '',
    etfNumber: '',
    registrationNumber: '',
    dateJoined: new Date(),
    dateResigned: undefined,
    resignedWithoutNotice: false,
    resignedWithNoticeDate: undefined,
    dateRetired: undefined,
    status: STAFF_STATUS_OPTIONS[1]?.id ?? '1',
    specialityIds: []
  };
}

/**
 * Load accepted appointment letter for staff onboarding choice + prefill.
 */
export async function getAppointmentLetterOnboardContext(letterId: string): Promise<{
  success: boolean;
  data?: {
    letter: AppointmentLetterOnboardSummary;
    prefill: GeneralFormValues;
    employmentHints: {
      department: string;
      designation: string;
      employmentType: string;
      salary: string;
    };
  };
  error?: { message?: string };
}> {
  try {
    if (!letterId.trim()) {
      return { success: false, error: { message: 'Letter ID is required' } };
    }

    const letter = await prisma.appointmentLetter.findUnique({
      where: { id: letterId.trim() }
    });
    if (!letter) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (letter.status !== 'accepted') {
      return {
        success: false,
        error: {
          message: 'Only accepted appointment letters can start staff onboarding'
        }
      };
    }

    const application = await prisma.application.findUnique({
      where: { id: letter.applicationId },
      select: {
        candidateEmail: true,
        candidatePhone: true,
        departmentName: true,
        designationName: true
      }
    });

    const names = splitCandidateName(letter.candidateName);
    const prefill = emptyGeneralForm();
    prefill.firstName = names.firstName;
    prefill.lastName = names.lastName;
    prefill.name = names.name;
    prefill.fullName = names.name;
    prefill.nameWithInitials = names.name;
    prefill.email = application?.candidateEmail?.trim() ?? '';
    prefill.mobileNumber = application?.candidatePhone?.trim() ?? '';
    if (letter.appointmentDate) {
      prefill.dateJoined = new Date(
        letter.appointmentDate.getFullYear(),
        letter.appointmentDate.getMonth(),
        letter.appointmentDate.getDate()
      );
    }

    const summary: AppointmentLetterOnboardSummary = {
      letterId: letter.id,
      letterNumber: letter.letterNumber,
      candidateName: letter.candidateName,
      position: letter.position,
      department: letter.department,
      employmentType: letter.employmentType,
      appointmentDate: toYmd(letter.appointmentDate),
      salary: letter.salary,
      status: letter.status,
      staffId: letter.staffId ?? null,
      alreadyOnboarded: Boolean(letter.staffId)
    };

    return {
      success: true,
      data: {
        letter: summary,
        prefill,
        employmentHints: {
          department:
            letter.department || application?.departmentName || '',
          designation:
            letter.position || application?.designationName || '',
          employmentType: letter.employmentType,
          salary: letter.salary
        }
      }
    };
  } catch (error: any) {
    console.error('getAppointmentLetterOnboardContext error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load onboarding context' }
    };
  }
}

/**
 * Link a newly created Staff record to an accepted appointment letter (idempotent).
 */
export async function linkStaffToAppointmentLetter(
  staffId: string,
  letterId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!staffId || !letterId) {
      return { success: false, error: { message: 'Staff and letter IDs are required' } };
    }

    const letter = await prisma.appointmentLetter.findUnique({
      where: { id: letterId }
    });
    if (!letter) {
      return { success: false, error: { message: 'Appointment letter not found' } };
    }
    if (letter.status !== 'accepted') {
      return {
        success: false,
        error: { message: 'Letter must be accepted before linking staff' }
      };
    }
    if (letter.staffId && letter.staffId !== staffId) {
      return {
        success: false,
        error: {
          message: 'This letter is already linked to another staff member'
        }
      };
    }

    const existingByLetter = await prisma.staff.findFirst({
      where: { appointmentLetterId: letterId }
    });
    if (existingByLetter && existingByLetter.id !== staffId) {
      return {
        success: false,
        error: {
          message: 'Another staff record is already linked to this letter'
        }
      };
    }

    const auditUser = toAuditUser(user);

    await prisma.staff.update({
      where: { id: staffId },
      data: {
        appointmentLetterId: letterId,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    await prisma.appointmentLetter.update({
      where: { id: letterId },
      data: {
        staffId,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('linkStaffToAppointmentLetter error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to link staff to letter' }
    };
  }
}
