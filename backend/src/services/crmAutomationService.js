const { CrmAutomationRule, User } = require('../models');

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw Object.assign(new Error('JSON invalido informado.'), { status: 400 });
  }
}

async function listarAutomacoes(query = {}) {
  const { ativo, trigger_type } = query;
  const where = {};
  if (ativo !== undefined && ativo !== '') where.ativo = ativo === 'true' || ativo === true || ativo === 1 || ativo === '1';
  if (trigger_type) where.trigger_type = String(trigger_type).toUpperCase();

  return CrmAutomationRule.findAll({
    where,
    include: [
      { model: User, as: 'criadoPor', attributes: ['id', 'nome'] },
      { model: User, as: 'atualizadoPor', attributes: ['id', 'nome'] }
    ],
    order: [['ativo', 'DESC'], ['priority', 'ASC'], ['nome', 'ASC']]
  });
}

async function criarAutomacao(dados = {}, userId) {
  if (!dados.nome?.trim()) throw Object.assign(new Error('Nome da automacao e obrigatorio.'), { status: 400 });
  if (!dados.trigger_type) throw Object.assign(new Error('Gatilho da automacao e obrigatorio.'), { status: 400 });

  return CrmAutomationRule.create({
    nome: dados.nome.trim(),
    trigger_type: String(dados.trigger_type).toUpperCase(),
    conditions_json: parseJsonField(dados.conditions_json, {}),
    actions_json: parseJsonField(dados.actions_json, []),
    ativo: dados.ativo !== false,
    priority: Number(dados.priority || 100),
    created_by_user_id: userId || null,
    updated_by_user_id: userId || null
  });
}

async function atualizarAutomacao(id, dados = {}, userId) {
  const rule = await CrmAutomationRule.findByPk(id);
  if (!rule) throw Object.assign(new Error('Automacao CRM nao encontrada'), { status: 404 });

  const updates = {};
  if (dados.nome !== undefined) updates.nome = String(dados.nome || '').trim();
  if (dados.trigger_type !== undefined) updates.trigger_type = String(dados.trigger_type).toUpperCase();
  if (dados.conditions_json !== undefined) updates.conditions_json = parseJsonField(dados.conditions_json, {});
  if (dados.actions_json !== undefined) updates.actions_json = parseJsonField(dados.actions_json, []);
  if (dados.ativo !== undefined) updates.ativo = Boolean(dados.ativo);
  if (dados.priority !== undefined) updates.priority = Number(dados.priority || 100);
  updates.updated_by_user_id = userId || null;

  if (!updates.nome && dados.nome !== undefined) {
    throw Object.assign(new Error('Nome da automacao e obrigatorio.'), { status: 400 });
  }

  await rule.update(updates);
  return rule.reload();
}

async function ativarAutomacao(id, userId) {
  const rule = await CrmAutomationRule.findByPk(id);
  if (!rule) throw Object.assign(new Error('Automacao CRM nao encontrada'), { status: 404 });
  await rule.update({ ativo: true, updated_by_user_id: userId || null });
  return rule;
}

async function desativarAutomacao(id, userId) {
  const rule = await CrmAutomationRule.findByPk(id);
  if (!rule) throw Object.assign(new Error('Automacao CRM nao encontrada'), { status: 404 });
  await rule.update({ ativo: false, updated_by_user_id: userId || null });
  return rule;
}

module.exports = {
  listarAutomacoes,
  criarAutomacao,
  atualizarAutomacao,
  ativarAutomacao,
  desativarAutomacao
};
