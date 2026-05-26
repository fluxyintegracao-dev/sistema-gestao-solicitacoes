'use strict';

function stringifyPayload(payload) {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({ erro: 'Payload nao serializavel para log SST.' });
  }
}

async function safeCreate(modelName, payload) {
  const models = require('../../../../models');
  const model = models[modelName];
  if (!model) return null;
  return model.create({
    ...payload,
    payload_json: stringifyPayload(payload.payload_json),
    criado_por: payload.criado_por || null,
    atualizado_por: payload.atualizado_por || payload.criado_por || null
  });
}

async function logWorkflow(payload = {}) {
  return safeCreate('SstWorkflowLog', payload);
}

async function logAutomation(payload = {}) {
  return safeCreate('SstAutomationLog', payload);
}

async function logBlocking(payload = {}) {
  return safeCreate('SstBlockingLog', payload);
}

async function logIntegration(payload = {}) {
  return safeCreate('SstIntegrationLog', payload);
}

async function logSstOperation(tipo, payload = {}) {
  if (tipo === 'workflow') return logWorkflow(payload);
  if (tipo === 'automation') return logAutomation(payload);
  if (tipo === 'blocking') return logBlocking(payload);
  if (tipo === 'integration') return logIntegration(payload);
  return null;
}

module.exports = {
  logAutomation,
  logBlocking,
  logIntegration,
  logSstOperation,
  logWorkflow
};
