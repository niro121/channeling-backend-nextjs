'use server';

import {
  buildObjectKey,
  getHrmObjectPrefix,
  presignGetUrl,
  presignPutUrl
} from '@/lib/s3';
import type { HrmS3PrefixKind } from '@/types/s3-types';
import { fetchServerSession } from '@/lib/session';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);

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

async function requireSignedIn(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'You must be signed in.' };
  }
  return { ok: true };
}

/**
 * Issues a short-lived PUT URL. The client uploads the file, then stores the
 * returned `objectKey` on the domain record when the form saves.
 */
export async function requestS3UploadAction(input: {
  prefixKind: HrmS3PrefixKind;
  keySegments: string[];
  fileName: string;
  contentType: string;
  sizeBytes: number;
  maxBytes?: number;
}): Promise<
  | { success: true; objectKey: string; uploadUrl: string }
  | { success: false; error: string }
> {
  const auth = await requireSignedIn();
  if (!auth.ok) return { success: false, error: auth.error };

  const contentType = input.contentType?.trim().toLowerCase() || '';
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return {
      success: false,
      error:
        'Unsupported file type. Use PDF or an image (JPEG, PNG, WebP, GIF).'
    };
  }

  const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { success: false, error: 'Invalid file size.' };
  }
  if (input.sizeBytes > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { success: false, error: `File must be ${mb} MB or smaller.` };
  }

  const segments = (input.keySegments ?? [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (!segments.length) {
    return { success: false, error: 'Missing storage key segments.' };
  }

  try {
    const ext = extensionFromFileName(input.fileName || '', contentType);
    const objectKey = buildObjectKey(
      getHrmObjectPrefix(input.prefixKind),
      segments,
      ext
    );
    const uploadUrl = await presignPutUrl(objectKey, contentType);
    return { success: true, objectKey, uploadUrl };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Could not prepare upload.';
    console.error('requestS3UploadAction error:', error);
    return { success: false, error: message };
  }
}

/** Issues a short-lived GET URL so the UI can preview / download a stored object. */
export async function getS3DownloadUrlAction(
  objectKey: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const auth = await requireSignedIn();
  if (!auth.ok) return { success: false, error: auth.error };

  const key = objectKey?.trim();
  if (!key) {
    return { success: false, error: 'Missing file key.' };
  }

  try {
    const url = await presignGetUrl(key);
    return { success: true, url };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Could not prepare download.';
    console.error('getS3DownloadUrlAction error:', error);
    return { success: false, error: message };
  }
}
