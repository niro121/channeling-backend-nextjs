'use client';

/** Shrinks a camera photo to at most 1600px JPEG before upload, so phones on ward Wi-Fi send ~300 KB, not 5 MB. */
async function shrink(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return out ?? file;
  } catch {
    return file;
  }
}

/** Uploads a photo (or signature) through the management server; returns the S3 key to store in the answer. */
export async function uploadChecklistPhoto(file: Blob, { shrinkFirst = true } = {}): Promise<string> {
  const body = new FormData();
  const blob = shrinkFirst ? await shrink(file) : file;
  body.set('file', blob, blob.type === 'image/png' ? 'photo.png' : 'photo.jpg');
  const res = await fetch('/api/stays/photos', { method: 'POST', body });
  const data = (await res.json().catch(() => null)) as { success?: boolean; data?: { key: string }; message?: string } | null;
  if (!res.ok || !data?.success || !data.data?.key) throw new Error(data?.message ?? 'Upload failed. Try again.');
  return data.data.key;
}

export function checklistPhotoUrl(key: string, stayId?: string | null) {
  const qs = new URLSearchParams({ key });
  if (stayId) qs.set('stayId', stayId);
  return `/api/stays/photos?${qs}`;
}
