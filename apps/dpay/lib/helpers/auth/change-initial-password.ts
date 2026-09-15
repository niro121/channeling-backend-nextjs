import * as argon2 from 'argon2';
import { authPrisma } from '@archmage/db-auth';
import { MIN_PASSWORD_LENGTH, PASSWORD_REGEX } from '@/lib/validations/password';

export type ChangeInitialPasswordResult =
  | { success: true }
  | { success: false; status: number; error: string };

export async function changeInitialPassword(input: {
  identifier: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangeInitialPasswordResult> {
  const identifier = input.identifier.trim();
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword.trim();

  if (!identifier || !currentPassword || !newPassword) {
    return { success: false, status: 400, error: 'Email/username, current password, and new password are required' };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, status: 400, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    return { success: false, status: 400, error: 'Password must include uppercase, lowercase, number, and special character, with no spaces' };
  }
  if (currentPassword === newPassword) {
    return { success: false, status: 400, error: 'New password must be different from the current password' };
  }

  const user = await authPrisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }], status: 1 },
  });

  if (!user || !user.password) return { success: false, status: 401, error: 'Invalid credentials' };
  if (user.mustChangePassword !== true) return { success: false, status: 400, error: 'This account does not require a password change' };

  const isCorrect = await argon2.verify(user.password, currentPassword);
  if (!isCorrect) return { success: false, status: 400, error: 'Current password is incorrect' };

  await authPrisma.user.update({
    where: { id: user.id },
    data: { password: await argon2.hash(newPassword), mustChangePassword: false },
  });

  return { success: true };
}
