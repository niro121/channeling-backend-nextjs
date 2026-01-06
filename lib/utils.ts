import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Cryptr from 'cryptr';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const encryptCode = (code: string): string => {
  const secret = process.env.CRYPTR_SECRET_KEY!;
  const cryptr = new Cryptr(secret);

  return cryptr.encrypt(code);
};

export const decryptCode = (code: string): string => {
  const secret = process.env.CRYPTR_SECRET_KEY!;
  const cryptr = new Cryptr(secret);

  return cryptr.decrypt(code);
};

export function generateCode() {
  return encryptCode(Math.floor(1000 + Math.random() * 9000).toString());
}
