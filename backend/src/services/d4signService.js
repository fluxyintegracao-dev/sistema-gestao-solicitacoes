const DEFAULT_BASE_URL = 'https://secure.d4sign.com.br/api/v1';

function createHttpError(statusCode, message, details = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
}

function getConfig() {
  const tokenApi = String(process.env.D4SIGN_TOKEN_API || '').trim();
  const cryptKey = String(process.env.D4SIGN_CRYPT_KEY || '').trim();
  const safeUuid = String(process.env.D4SIGN_SAFE_UUID || '').trim();
  const baseUrl = String(process.env.D4SIGN_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/g, '');
  const webhookUrl = String(process.env.D4SIGN_WEBHOOK_URL || '').trim();

  if (!tokenApi || !cryptKey || !safeUuid) {
    throw createHttpError(
      503,
      'Integracao D4Sign nao configurada. Defina D4SIGN_TOKEN_API, D4SIGN_CRYPT_KEY e D4SIGN_SAFE_UUID no .env.'
    );
  }

  return {
    baseUrl,
    cryptKey,
    safeUuid,
    tokenApi,
    webhookUrl
  };
}

function appendAuth(url, config) {
  url.searchParams.set('tokenAPI', config.tokenApi);
  url.searchParams.set('cryptKey', config.cryptKey);
  return url;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function d4signRequest(pathname, options = {}) {
  const config = getConfig();
  const url = appendAuth(new URL(`${config.baseUrl}${pathname}`), config);
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.raw ||
      `Falha na comunicacao com D4Sign (${response.status}).`;
    throw createHttpError(502, String(message), payload);
  }

  return payload;
}

function normalizeSigner(signer = {}) {
  const email = String(signer.email || '').trim();
  if (!email) return null;

  return {
    email,
    act: String(signer.act || '1'),
    foreign: String(signer.foreign ?? '0'),
    certificadoicpbr: String(signer.certificadoicpbr || '0'),
    assinatura_presencial: String(signer.assinatura_presencial || '0'),
    docauth: String(signer.docauth || '0'),
    docauthandselfie: String(signer.docauthandselfie || '0'),
    embed_methodauth: String(signer.embed_methodauth || 'email'),
    embed_smsnumber: String(signer.embed_smsnumber || ''),
    upload_allow: String(signer.upload_allow || '0'),
    ...(signer.whatsapp_number ? { whatsapp_number: String(signer.whatsapp_number) } : {}),
    ...(signer.uuid_grupo ? { uuid_grupo: String(signer.uuid_grupo) } : {})
  };
}

async function uploadPdfDocument({ pdfBuffer, fileName, safeUuid, folderUuid }) {
  const config = getConfig();
  const targetSafeUuid = String(safeUuid || config.safeUuid).trim();
  const body = {
    base64_binary_file: Buffer.from(pdfBuffer).toString('base64'),
    mime_type: 'application/pdf',
    name: String(fileName || 'contrato.pdf').trim() || 'contrato.pdf',
    ...(folderUuid ? { uuid_folder: String(folderUuid).trim() } : {})
  };

  return d4signRequest(`/documents/${encodeURIComponent(targetSafeUuid)}/uploadbinary`, {
    method: 'POST',
    body
  });
}

async function registerWebhook(documentUuid, webhookUrl) {
  const config = getConfig();
  const url = String(webhookUrl || config.webhookUrl || '').trim();
  if (!url) return null;

  return d4signRequest(`/documents/${encodeURIComponent(documentUuid)}/webhooks`, {
    method: 'POST',
    body: { url }
  });
}

async function createSignerList(documentUuid, signers = []) {
  const normalized = signers.map(normalizeSigner).filter(Boolean);
  if (!normalized.length) {
    throw createHttpError(400, 'Informe ao menos um signatario com e-mail valido.');
  }

  return d4signRequest(`/documents/${encodeURIComponent(documentUuid)}/createlist`, {
    method: 'POST',
    body: { signers: normalized }
  });
}

async function sendToSigners(documentUuid, options = {}) {
  const skipEmail = String(options.skip_email ?? process.env.D4SIGN_SKIP_EMAIL ?? '0');
  const workflow = String(options.workflow ?? process.env.D4SIGN_WORKFLOW ?? '0');

  return d4signRequest(`/documents/${encodeURIComponent(documentUuid)}/sendtosigner`, {
    method: 'POST',
    body: {
      message: String(options.message || 'Documento enviado para assinatura.'),
      skip_email: skipEmail,
      workflow
    }
  });
}

module.exports = {
  createSignerList,
  getConfig,
  registerWebhook,
  sendToSigners,
  uploadPdfDocument
};
