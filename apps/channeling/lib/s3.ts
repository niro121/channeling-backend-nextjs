import "server-only"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const PUT_EXPIRES_SECONDS = 60

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not set. Configure S3 bill-attachment env vars.`)
  }
  return value
}

function getS3Config() {
  return {
    region: process.env.AWS_REGION?.trim() || "ap-south-1",
    bucket: requiredEnv("S3_BUCKET"),
    prefix: (process.env.S3_BILL_ATTACHMENTS_PREFIX?.trim() || "shift-bills/").replace(
      /^\/+|\/+$/g,
      ""
    ),
  }
}

let client: S3Client | null = null

function getClient(): S3Client {
  if (!client) {
    const { region } = getS3Config()
    client = new S3Client({
      region,
      credentials: {
        accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
      },
    })
  }
  return client
}

function getBankDepositSlipPrefix() {
  return (process.env.S3_BANK_DEPOSIT_SLIPS_PREFIX?.trim() || "bank-deposit-slips").replace(
    /^\/+|\/+$/g,
    ""
  )
}

export function getBillAttachmentObjectKey(shiftId: string, attachmentId: string, ext: string) {
  const { prefix } = getS3Config()
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg"
  return `${prefix}/${shiftId}/${attachmentId}.${safeExt}`
}

export function bankDepositSlipKeyPrefixForUser(userId: string) {
  const safeUser = userId.replace(/[^a-zA-Z0-9]/g, "")
  return `${getBankDepositSlipPrefix()}/${safeUser}/`
}

export function getBankDepositSlipObjectKey(userId: string, uploadId: string, ext: string) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg"
  const safeUpload = uploadId.replace(/[^a-zA-Z0-9-]/g, "")
  return `${bankDepositSlipKeyPrefixForUser(userId)}${safeUpload}.${safeExt}`
}

export async function presignBillAttachmentPut(key: string, contentType: string): Promise<string> {
  const { bucket } = getS3Config()
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: PUT_EXPIRES_SECONDS }
  )
}

export async function headBillAttachmentObject(key: string): Promise<boolean> {
  const { bucket } = getS3Config()
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch {
    return false
  }
}

export async function getBillAttachmentBytes(key: string): Promise<{
  body: Uint8Array
  contentType: string | undefined
}> {
  const { bucket } = getS3Config()
  const result = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const body = result.Body ? await result.Body.transformToByteArray() : new Uint8Array()
  return { body, contentType: result.ContentType }
}

export async function putBillAttachmentObject(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const { bucket } = getS3Config()
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

export function getBillAttachmentThumbKey(originalKey: string) {
  const lastDot = originalKey.lastIndexOf(".")
  const withoutExt = lastDot > 0 ? originalKey.slice(0, lastDot) : originalKey
  return `${withoutExt}.thumb.webp`
}

export async function deleteBillAttachmentObject(key: string): Promise<void> {
  const { bucket } = getS3Config()
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
