'use strict';

const fs = require('fs/promises');
const https = require('https');
const { URL } = require('url');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertHttpsEndpoint(endpointUrl) {
  let url;
  try {
    url = new URL(endpointUrl);
  } catch {
    throw createHttpError('Endpoint SEFAZ invalido para envio SOAP.', 400);
  }

  if (url.protocol !== 'https:') {
    throw createHttpError('Endpoint SEFAZ deve usar HTTPS.', 400);
  }

  return url;
}

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      const lowerKey = String(key).toLowerCase();
      if (lowerKey.includes('authorization') || lowerKey.includes('cookie')) {
        return [key, '[REDACTED]'];
      }
      return [key, value];
    })
  );
}

async function buildHttpsAgentFromCertificate(certificate) {
  if (!certificate) {
    throw createHttpError('Certificado fiscal ativo nao encontrado para chamada SEFAZ.', 400);
  }

  if (certificate.storage_type !== 'local_secure_path') {
    throw createHttpError('Nesta fase, chamadas SEFAZ reais aceitam apenas certificado em caminho local seguro.', 400);
  }

  if (!certificate.certificate_path) {
    throw createHttpError('Caminho local do certificado fiscal nao esta configurado.', 400);
  }

  const pfx = await fs.readFile(certificate.certificate_path);
  const agentOptions = { pfx };
  if (certificate.password) agentOptions.passphrase = certificate.password;

  return new https.Agent(agentOptions);
}

function normalizeSoapRequest(soapRequest) {
  const body = soapRequest?.body;
  if (!body || typeof body !== 'string') {
    throw createHttpError('Corpo SOAP ausente para chamada SEFAZ.', 400);
  }

  return {
    body,
    contentType: soapRequest.content_type || 'application/soap+xml; charset=utf-8'
  };
}

async function postSoapRequest({
  endpointUrl,
  soapRequest,
  certificate,
  timeoutMs = 30000
} = {}) {
  const url = assertHttpsEndpoint(endpointUrl);
  const normalized = normalizeSoapRequest(soapRequest);
  const agent = await buildHttpsAgentFromCertificate(certificate);
  const startedAt = Date.now();
  const headers = {
    Accept: 'application/soap+xml, text/xml, */*',
    'Content-Type': normalized.contentType,
    'Content-Length': Buffer.byteLength(normalized.body)
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers,
      agent,
      timeout: timeoutMs
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString('utf8');
        const result = {
          http_status: res.statusCode,
          headers: sanitizeHeaders(res.headers),
          body: responseBody,
          elapsed_ms: Date.now() - startedAt
        };

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = createHttpError('Chamada SOAP SEFAZ falhou.', res.statusCode || 502);
          error.details = result;
          return reject(error);
        }

        return resolve(result);
      });
    });

    req.on('timeout', () => {
      req.destroy(createHttpError('Timeout na chamada SOAP SEFAZ.', 504));
    });
    req.on('error', reject);
    req.write(normalized.body);
    req.end();
  });
}

module.exports = {
  assertHttpsEndpoint,
  buildHttpsAgentFromCertificate,
  postSoapRequest,
  sanitizeHeaders
};
