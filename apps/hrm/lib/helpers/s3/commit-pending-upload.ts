'use client';

import { requestS3UploadAction } from '@/app/actions/s3-actions/s3-storage.actions';
import type { HrmS3PrefixKind } from '@/types/s3-types';

export type CommitPendingUploadResult =
  | {
      success: true;
      fileKey: string;
      fileName: string;
      contentType: string;
    }
  | { success: false; error: string };

export type CommitPendingUploadOptions = {
  file: File;
  prefixKind: HrmS3PrefixKind;
  /** Path segments under the prefix (sanitized server-side). */
  keySegments: string[];
  maxBytes?: number;
};

/**
 * Uploads a locally selected file to S3 via a presigned PUT.
 * Call this from a form `onSubmit` before persisting `fileKey` / `fileName`.
 */
export async function commitPendingUpload(
  options: CommitPendingUploadOptions
): Promise<CommitPendingUploadResult> {
  const { file, prefixKind, keySegments, maxBytes } = options;
  const contentType = file.type || 'application/octet-stream';

  const requested = await requestS3UploadAction({
    prefixKind,
    keySegments,
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
    maxBytes
  });

  if (!requested.success) {
    return { success: false, error: requested.error };
  }

  try {
    const put = await fetch(requested.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!put.ok) {
      return {
        success: false,
        error: 'Upload to storage failed. Try again.'
      };
    }

    return {
      success: true,
      fileKey: requested.objectKey,
      fileName: file.name,
      contentType
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Upload to storage failed.';
    return { success: false, error: message };
  }
}
