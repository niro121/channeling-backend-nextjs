'use server';

import { authPrisma } from '@archmage/db-auth';
import { fetchServerSession } from '@/lib/session';
import argon2 from 'argon2';

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  try {
    const session = await fetchServerSession();
    if (!session?.user?.id) {
      return { isError: true, errors: { message: 'You must be signed in to change your password.' }, data: {} };
    }

    if (!currentPassword || !newPassword) {
      return { isError: true, errors: { message: 'Current password and new password are required.' }, data: {} };
    }

    const passwordRegex = /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/;
    if (!passwordRegex.test(newPassword)) {
      return {
        isError: true,
        errors: {
          message: 'New password must contain uppercase, lowercase, numbers and special characters.',
        },
        data: {},
      };
    }
    if (newPassword.length < 8) {
      return { isError: true, errors: { message: 'New password must be at least 8 characters long.' }, data: {} };
    }

    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      return { isError: true, errors: { message: 'User not found.' }, data: {} };
    }

    const valid = await argon2.verify(user.password, currentPassword);
    if (!valid) {
      return { isError: true, errors: { message: 'Current password is incorrect.' }, data: {} };
    }

    const hashedPassword = await argon2.hash(newPassword);
    await authPrisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return { isError: false, errors: {}, data: { saved: true } };
  } catch (error: any) {
    return {
      isError: true,
      errors: { message: error?.message ?? 'Something went wrong. Please try again later.' },
      data: {},
    };
  }
}
