const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { sanitizeFileNameForStorage } = require('../utils/fileName');

const INLINE_RISKY_EXTENSIONS = new Set([
  '.htm',
  '.html',
  '.js',
  '.mjs',
  '.svg',
  '.xhtml',
  '.xml'
]);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

function createPresignTargetError(message) {
  const error = new Error(message);
  error.code = 'FILE_PRESIGN_INVALID_TARGET';
  error.statusCode = 400;
  return error;
}

function decodeStorageKey(rawKey) {
  try {
    return decodeURIComponent(rawKey);
  } catch {
    const sanitizedKey = String(rawKey || '').replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
    return decodeURIComponent(sanitizedKey);
  }
}

function normalizeStorageKey(rawKey, { strict = false } = {}) {
  const key = decodeStorageKey(String(rawKey || '').trim().replace(/^\/+/, ''));
  const segments = key.split('/');
  const invalid =
    !key ||
    key.length > 2048 ||
    /[\u0000-\u001f\u007f]/.test(key) ||
    segments.includes('..');

  if (invalid) {
    if (strict) {
      throw createPresignTargetError('Arquivo invalido para assinatura.');
    }
    return null;
  }

  return key;
}

function shouldUseLocalUploadFallback() {
  return (
    process.env.NODE_ENV !== 'production' &&
    (
      !process.env.AWS_S3_BUCKET ||
      process.env.AWS_S3_BUCKET === 'local-bucket' ||
      process.env.AWS_ACCESS_KEY_ID === 'local' ||
      process.env.AWS_SECRET_ACCESS_KEY === 'local'
    )
  );
}

async function uploadToLocal(file, folder) {
  const safeName = sanitizeFileNameForStorage(file.originalname);
  const relativeKey = `${folder}/${Date.now()}-${safeName}`.replace(/\\/g, '/');
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
  const absolutePath = path.join(uploadsDir, ...relativeKey.split('/'));

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, file.buffer);

  return `/uploads/${relativeKey}`;
}

async function uploadToS3(file, folder) {
  if (shouldUseLocalUploadFallback()) {
    return uploadToLocal(file, folder);
  }

  const safeName = sanitizeFileNameForStorage(file.originalname);
  const key = normalizeStorageKey(`${folder}/${Date.now()}-${safeName}`, { strict: true });
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await s3.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${command.input.Key}`;
}

function getKeyFromUrl(url, { strict = false } = {}) {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const parsed = new URL(url);

    if (!bucket || !['http:', 'https:'].includes(parsed.protocol)) {
      if (strict) throw createPresignTargetError('Arquivo fora do storage configurado.');
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    const bucketLower = String(bucket).toLowerCase();
    const regionLower = String(region || '').toLowerCase();
    const virtualHostedHosts = new Set([
      `${bucketLower}.s3.amazonaws.com`,
      regionLower ? `${bucketLower}.s3.${regionLower}.amazonaws.com` : null,
      regionLower ? `${bucketLower}.s3-${regionLower}.amazonaws.com` : null
    ].filter(Boolean));

    if (virtualHostedHosts.has(hostname) || hostname.startsWith(`${bucketLower}.s3`)) {
      return normalizeStorageKey(parsed.pathname.replace(/^\//, ''), { strict });
    }

    const pathStyleHosts = new Set([
      's3.amazonaws.com',
      regionLower ? `s3.${regionLower}.amazonaws.com` : null,
      regionLower ? `s3-${regionLower}.amazonaws.com` : null
    ].filter(Boolean));

    if (pathStyleHosts.has(hostname)) {
      const parts = parsed.pathname.replace(/^\//, '').split('/');
      const pathBucket = parts.shift();
      if (String(pathBucket || '').toLowerCase() === bucketLower) {
        return normalizeStorageKey(parts.join('/'), { strict });
      }
    }
  } catch (error) {
    if (strict && error?.code === 'FILE_PRESIGN_INVALID_TARGET') {
      throw error;
    }
  }

  if (strict) {
    throw createPresignTargetError('Arquivo fora do storage configurado.');
  }

  return null;
}

function getKeyFromTarget(urlOrKey, { strict = false } = {}) {
  const target = String(urlOrKey || '').trim();
  if (!target) {
    if (strict) throw createPresignTargetError('Arquivo invalido para assinatura.');
    return null;
  }

  if (/^https?:\/\//i.test(target)) {
    return getKeyFromUrl(target, { strict });
  }

  return normalizeStorageKey(target, { strict });
}

function shouldForceAttachmentForTarget(target) {
  const extension = String(path.extname(String(target || '').split('?')[0]) || '').toLowerCase();
  return INLINE_RISKY_EXTENSIONS.has(extension);
}

async function getPresignedUrl(urlOrKey, expiresIn = 300, options = {}) {
  if (!urlOrKey) return urlOrKey;
  if (String(urlOrKey).startsWith('/uploads/')) {
    return urlOrKey;
  }

  const key = getKeyFromTarget(urlOrKey, options);

  if (!key) {
    if (options.strict) {
      throw createPresignTargetError('Arquivo invalido para assinatura.');
    }
    return urlOrKey;
  }

  const riskyInlineTarget = shouldForceAttachmentForTarget(key);

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ...(riskyInlineTarget
      ? {
          ResponseContentDisposition: `attachment; filename="${sanitizeFileNameForStorage(path.basename(key))}"`,
          ResponseContentType: 'application/octet-stream'
        }
      : {})
  });

  return getSignedUrl(s3, command, { expiresIn });
}

module.exports = { uploadToS3, getPresignedUrl, shouldForceAttachmentForTarget };
