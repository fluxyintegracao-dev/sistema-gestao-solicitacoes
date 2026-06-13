'use strict';

function safeJson(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return JSON.stringify({ erro: 'contexto_invalido' });
  }
}

async function logAccess(req, acao, contexto = {}) {
  try {
    const { GovernancaAccessLog } = require('../../../models');
    if (!GovernancaAccessLog) return;

    await GovernancaAccessLog.create({
      usuario_id: req?.user?.id || null,
      acao: String(acao || 'ACESSO_GOVERNANCA').slice(0, 120),
      ip: String(req?.ip || req?.headers?.['x-forwarded-for'] || '').slice(0, 80) || null,
      user_agent: String(req?.headers?.['user-agent'] || '').slice(0, 500) || null,
      contexto_json: safeJson(contexto)
    });
  } catch {
    // Log de governanca nunca pode derrubar a rota operacional.
  }
}

module.exports = {
  logAccess
};
