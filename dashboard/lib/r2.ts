import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'coloriq-photos-beta';
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

/**
 * Short-lived signed READ URL for a stored object — used so external agents
 * (e.g. the AgentSocial posting flow) can fetch transformation photos.
 * Seam contract §3.1: media refs must be fetchable via signed or public URL.
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn });
}

/**
 * Normalize a stored photo ref to an R2 object key. Refs may be stored as
 * full URLs (R2_PUBLIC_URL + '/' + key) or as bare keys.
 */
export function extractR2Key(ref: string): string {
  if (!ref) return ref;
  if (R2_PUBLIC_URL && ref.startsWith(R2_PUBLIC_URL + '/')) {
    return ref.slice(R2_PUBLIC_URL.length + 1);
  }
  try {
    const u = new URL(ref);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.pathname.replace(/^\/+/, '');
    }
  } catch {
    // not a URL — treat as a bare key
  }
  return ref;
}
