const net = require('net');
const path = require('path');
const { env } = require('../config/env');
const { UploadSecurityError } = require('./uploadSecurityErrors');

function buildScannerUnavailableError(message = 'Scanner antivirus indisponivel.') {
  return new UploadSecurityError(message, 503, 'UPLOAD_SCANNER_UNAVAILABLE');
}

function parseClamAvResponse(response) {
  const normalized = String(response || '').replace(/\0/g, '').trim();
  if (!normalized) {
    throw buildScannerUnavailableError('Scanner antivirus retornou resposta vazia.');
  }

  if (normalized.includes('FOUND')) {
    const malwareName = normalized.split('FOUND')[0].split(':').slice(1).join(':').trim() || 'malware';
    throw new UploadSecurityError(
      `Arquivo bloqueado pelo antivirus (${malwareName}).`,
      422,
      'UPLOAD_MALWARE_DETECTED',
      { malware_name: malwareName }
    );
  }

  if (!normalized.includes('OK')) {
    throw buildScannerUnavailableError('Scanner antivirus retornou resposta inesperada.');
  }
}

async function streamBufferToClamAv(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: env.clamavHost,
      port: env.clamavPort
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(buildScannerUnavailableError('Scanner antivirus nao respondeu a tempo.'));
    }, Math.max(1000, Number(env.clamavTimeoutMs || 15000)));

    const responseChunks = [];

    socket.on('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'));

      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.length, 0);
        socket.write(header);
        socket.write(chunk);
      }

      const terminator = Buffer.alloc(4);
      terminator.writeUInt32BE(0, 0);
      socket.write(terminator);
    });

    socket.on('data', (chunk) => {
      responseChunks.push(chunk);
    });

    socket.on('end', () => {
      clearTimeout(timeout);
      try {
        parseClamAvResponse(Buffer.concat(responseChunks).toString('utf8'));
        resolve({ scanned: true, infected: false });
      } catch (error) {
        reject(error);
      }
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      reject(buildScannerUnavailableError('Falha ao conectar no scanner antivirus.'));
    });
  });
}

async function scanFileBufferIfEnabled(file) {
  if (!env.clamavEnabled) {
    return { scanned: false, skipped: true, reason: 'disabled' };
  }

  try {
    return await streamBufferToClamAv(file.buffer);
  } catch (error) {
    if (error instanceof UploadSecurityError) {
      if (error.code === 'UPLOAD_MALWARE_DETECTED') {
        throw error;
      }

      if (env.clamavFailClosed) {
        throw error;
      }

      console.warn(`Scanner antivirus indisponivel para ${path.basename(file.originalname || 'arquivo')}: ${error.message}`);
      return { scanned: false, skipped: true, reason: 'scanner_unavailable' };
    }

    throw error;
  }
}

async function ensureClamavReady() {
  if (!env.clamavRequired) {
    return;
  }

  if (!env.clamavEnabled) {
    throw buildScannerUnavailableError('CLAMAV_ENABLED deve estar ativo em producao.');
  }

  await streamBufferToClamAv(Buffer.from('FLUXY_HEALTHCHECK'));
}

module.exports = {
  scanFileBufferIfEnabled,
  ensureClamavReady
};
