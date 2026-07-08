/**
 * Experience Lead Router
 * Entrada publica protegida por secret para leads captados no FLUXY EXPERIENCE.
 * Mantem isolamento: nao usa JWT do CORE e grava pelo servico oficial do CRM.
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { criarLead } = require('../services/crmService');

function requireLeadSecret(req, res, next) {
  const key = String(
    process.env.EXPERIENCE_LEAD_SECRET
    || process.env.FLUXY_CORE_LEAD_SECRET
    || ''
  ).trim();
  if (!key) {
    return res.status(503).json({ error: 'Integracao de leads do Experience nao configurada' });
  }

  const header = String(
    req.headers['x-experience-lead-secret']
    || req.headers['x-experience-secret']
    || ''
  ).trim();

  const headerBuffer = Buffer.from(header);
  const keyBuffer = Buffer.from(key);
  if (headerBuffer.length !== keyBuffer.length || !crypto.timingSafeEqual(headerBuffer, keyBuffer)) {
    return res.status(401).json({ error: 'Chave de integracao invalida' });
  }

  return next();
}

function cleanText(value, max = 255) {
  if (value === undefined || value === null) return null;
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max) || null;
}

function cleanLongText(value, max = 4000) {
  if (value === undefined || value === null) return null;
  return String(value).trim().slice(0, max) || null;
}

function cleanInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePayload(body = {}, req) {
  const nome = cleanText(body.nome, 160);
  const email = cleanText(body.email, 120);
  const telefone = cleanText(body.telefone, 30);

  if (!nome || (!email && !telefone)) {
    const error = new Error('nome e email ou telefone sao obrigatorios');
    error.status = 422;
    throw error;
  }

  const empreendimentoNome = cleanText(
    body.empreendimento_nome || body.empreendimento_interesse || body.interesse,
    160
  );
  const empreendimentoCoreId = cleanInt(body.empreendimento_core_id);
  const origem = cleanText(body.origem, 120) || 'site_experience';
  const sourceDetail = cleanText(body.source_detail, 500);
  const ip = cleanText(
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
    45
  );

  const observacoes = [
    cleanLongText(body.mensagem, 2500),
    empreendimentoCoreId ? `Empreendimento CORE ID: ${empreendimentoCoreId}` : null,
    cleanText(body.experience_lead_id, 80) ? `Experience Lead ID: ${cleanText(body.experience_lead_id, 80)}` : null,
    sourceDetail ? `Origem detalhe: ${sourceDetail}` : null,
    ip ? `IP origem: ${ip}` : null,
  ].filter(Boolean).join('\n\n') || null;

  return {
    external_source_id: cleanText(body.external_source_id, 120),
    source_type: 'SITE',
    source_name: 'FLUXY Experience',
    source_detail: origem,
    nome,
    email,
    telefone,
    empreendimento_interesse: empreendimentoNome,
    produto_interesse: cleanText(body.produto_interesse || body.interesse, 160),
    observacoes,
    utm_source: cleanText(body.utm_source, 120),
    utm_medium: cleanText(body.utm_medium, 120),
    utm_campaign: cleanText(body.utm_campaign, 120),
    utm_content: cleanText(body.utm_content, 120),
    utm_term: cleanText(body.utm_term, 120),
    tags: ['experience', 'site'],
    temperatura: 'FRIO',
  };
}

router.post('/leads', requireLeadSecret, async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {}, req);
    const lead = await criarLead(payload, null, req);
    return res.status(201).json({ id: lead.id, status: lead.lifecycle_status });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message, duplicateId: error.duplicateId });
    }
    const status = Number(error.status || error.statusCode || 500);
    if (status >= 400 && status < 500) {
      return res.status(status).json({ error: error.message || 'Payload invalido' });
    }
    console.error('[ExperienceLeadRouter] leads', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/health', requireLeadSecret, (req, res) => {
  res.json({ status: 'ok', service: 'fluxy-core-experience-leads' });
});

module.exports = router;
