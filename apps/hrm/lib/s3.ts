import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  HRM_S3_PREFIXES,
  type HrmS3PrefixKind
} from '@/types/s3-types';

export { HRM_S3_PREFIXES, type HrmS3PrefixKind } from '@/types/s3-types';

const DEFAULT_REGION = 'ap-south-1';
const DEFAULT_PUT_EXPIRES_SECONDS = 60;
const DEFAULT_GET_EXPIRES_SECONDS = 300;

export type HrmS3Config = {
  region: string;
  bucket: string;
};

export type S3ObjectBytes = {
  body: Uint8Array;
  contentType: string | undefined;
  contentLength: number | undefined;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Configure S3 env vars for HRM document storage.`);
  }
  return value;
}

function normalizePrefix(prefix: string): string {
  return prefix.replace(/^\/+|\/+$/g, '');
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '') || 'file';
}

function sanitizeExtension(ext: string): string {
  return ext.replace(/[^a-z0-9]/gi, '') || 'bin';
}

/** Bucket + region used by all HRM S3 helpers. */
export function getS3Config(): HrmS3Config {
  return {
    region: process.env.AWS_REGION?.trim() || DEFAULT_REGION,
    bucket: requiredEnv('S3_BUCKET')
  };
}

/**
 * Resolves a key prefix for a document kind.
 * Optional overrides: S3_RESUMES_PREFIX, S3_APPOINTMENT_LETTERS_PREFIX, S3_DOCUMENTS_PREFIX.
 */
export function getHrmObjectPrefix(kind: HrmS3PrefixKind): string {
  const envMap: Record<HrmS3PrefixKind, string | undefined> = {
    resumes: process.env.S3_RESUMES_PREFIX,
    appointmentLetters: process.env.S3_APPOINTMENT_LETTERS_PREFIX,
    documents: process.env.S3_DOCUMENTS_PREFIX
  };

  return normalizePrefix(envMap[kind]?.trim() || HRM_S3_PREFIXES[kind]);
}

/**
 * Builds a safe object key: `{prefix}/{...segments}.{ext}`.
 * Segments are sanitized; empty segments are dropped.
 */
export function buildObjectKey(
  prefix: string,
  segments: string[],
  ext: string
): string {
  const safePrefix = normalizePrefix(prefix);
  const safeSegments = segments.map(sanitizePathSegment).filter(Boolean);
  const safeExt = sanitizeExtension(ext);
  const path = [safePrefix, ...safeSegments].filter(Boolean).join('/');
  return `${path}.${safeExt}`;
}

let client: S3Client | null = null;

/** Shared S3 client (credentials from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY). */
export function getS3Client(): S3Client {
  if (!client) {
    const { region } = getS3Config();
    client = new S3Client({
      region,
      credentials: {
        accessKeyId: requiredEnv('AWS_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('AWS_SECRET_ACCESS_KEY')
      }
    });
  }
  return client;
}

/** Resets the cached client — useful in tests. */
export function resetS3Client(): void {
  client = null;
}

export async function putObject(
  key: string,
  body: Uint8Array | Buffer | string,
  contentType: string
): Promise<void> {
  const { bucket } = getS3Config();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
}

export async function getObjectBytes(key: string): Promise<S3ObjectBytes> {
  const { bucket } = getS3Config();
  const result = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const body = result.Body
    ? await result.Body.transformToByteArray()
    : new Uint8Array();
  return {
    body,
    contentType: result.ContentType,
    contentLength: result.ContentLength
  };
}

export async function deleteObject(key: string): Promise<void> {
  const { bucket } = getS3Config();
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
}

/** Returns true when the object exists. */
export async function headObject(key: string): Promise<boolean> {
  const { bucket } = getS3Config();
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds = DEFAULT_PUT_EXPIRES_SECONDS
): Promise<string> {
  const { bucket } = getS3Config();
  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function presignGetUrl(
  key: string,
  expiresInSeconds = DEFAULT_GET_EXPIRES_SECONDS
): Promise<string> {
  const { bucket } = getS3Config();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }),
    { expiresIn: expiresInSeconds }
  );
}
