import 'server-only';

import { randomUUID } from 'crypto';
import {
  buildObjectKey,
  deleteObject,
  getHrmObjectPrefix,
  putObject
} from '@/lib/s3';

export const RESUME_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const RESUME_ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);

export type ResumeUploadInput = {
  bytes: Uint8Array | Buffer;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Extra key path segments under resumes/ (e.g. application, public). */
  keySegments?: string[];
  maxBytes?: number;
};

export type ResumeUploadResult =
  | { success: true; fileKey: string; fileName: string; contentType: string }
  | { success: false; error: string };

function extensionFromFileName(fileName: string, contentType: string): string {
  const fromName = fileName.includes('.')
    ? fileName.split('.').pop()?.toLowerCase()
    : undefined;
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;

  switch (contentType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

/**
 * Server-side resume put for public API (and other non-browser callers).
 * Validates MIME + size, then writes under the resumes prefix.
 */
export async function putResumeBytes(
  input: ResumeUploadInput
): Promise<ResumeUploadResult> {
  const contentType = input.contentType?.trim().toLowerCase() || '';
  if (!RESUME_ALLOWED_CONTENT_TYPES.has(contentType)) {
    return {
      success: false,
      error:
        'Unsupported file type. Use PDF or an image (JPEG, PNG, WebP, GIF).'
    };
  }

  const maxBytes = input.maxBytes ?? RESUME_MAX_BYTES;
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { success: false, error: 'Invalid file size.' };
  }
  if (input.sizeBytes > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { success: false, error: `File must be ${mb} MB or smaller.` };
  }

  const fileName = input.fileName?.trim() || 'resume';
  const segments = [
    ...(input.keySegments ?? []).map((s) => String(s || '').trim()).filter(Boolean),
    randomUUID()
  ];
  if (!segments.length) {
    return { success: false, error: 'Missing storage key segments.' };
  }

  const ext = extensionFromFileName(fileName, contentType);
  const fileKey = buildObjectKey(
    getHrmObjectPrefix('resumes'),
    segments,
    ext
  );

  try {
    await putObject(fileKey, input.bytes, contentType);
    return {
      success: true,
      fileKey,
      fileName,
      contentType
    };
  } catch (error: unknown) {
    console.error('putResumeBytes error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Could not upload resume to storage.';
    return { success: false, error: message };
  }
}

/** Best-effort cleanup when application create fails after upload. */
export async function deleteResumeQuietly(fileKey: string): Promise<void> {
  const key = fileKey?.trim();
  if (!key) return;
  try {
    await deleteObject(key);
  } catch (error) {
    console.error('deleteResumeQuietly error:', error);
  }
}
