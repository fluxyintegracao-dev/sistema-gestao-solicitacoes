const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `${folder}/${Date.now()}-${safeName}`,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await s3.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${command.input.Key}`;
}

function getKeyFromUrl(url) {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const parsed = new URL(url);
    if (!parsed.hostname.startsWith(`${bucket}.s3`)) return null;
    const rawKey = parsed.pathname.replace(/^\//, '');
    try {
      return decodeURIComponent(rawKey);
    } catch {
      // Alguns anexos antigos podem ter "%" literal no nome do arquivo.
      // Escapa apenas "%" inválidos para permitir decodificação sem quebrar a URL.
      const sanitizedKey = rawKey.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
      return decodeURIComponent(sanitizedKey);
    }
  } catch (error) {
    return null;
  }
}

function shouldForceAttachmentForTarget(target) {
  const extension = String(path.extname(String(target || '').split('?')[0]) || '').toLowerCase();
  return INLINE_RISKY_EXTENSIONS.has(extension);
}

async function getPresignedUrl(urlOrKey, expiresIn = 300) {
  if (!urlOrKey) return urlOrKey;
  if (String(urlOrKey).startsWith('/uploads/')) {
    return urlOrKey;
  }

  const key = urlOrKey?.startsWith?.('http')
    ? getKeyFromUrl(urlOrKey)
    : urlOrKey;

  if (!key) return urlOrKey;

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
