const { CrmChannel, CrmPhoneAsset } = require('../models');

// -------------------------------------------------------
// Canais
// -------------------------------------------------------
async function listarCanais(query = {}) {
  const { status, type } = query;
  const where = { deleted_at: null };
  if (status) where.status = String(status).toUpperCase();
  if (type) where.type = String(type).toUpperCase();
  return CrmChannel.findAll({ where, order: [['nome', 'ASC']] });
}

async function obterCanal(id) {
  const canal = await CrmChannel.findByPk(id);
  if (!canal || canal.deleted_at) throw Object.assign(new Error('Canal nao encontrado'), { status: 404 });
  return canal;
}

async function criarCanal(dados) {
  const campos = [
    'nome', 'type', 'status', 'provider', 'public_label',
    'business_main_phone', 'operational_phone', 'tracking_phone', 'destination_phone',
    'meta_waba_id', 'meta_phone_number_id', 'google_customer_id', 'config_json'
  ];
  if (!dados.nome?.trim()) throw Object.assign(new Error('Nome e obrigatorio'), { status: 400 });
  const payload = {};
  for (const campo of campos) {
    if (dados[campo] !== undefined) payload[campo] = dados[campo];
  }
  return CrmChannel.create(payload);
}

async function atualizarCanal(id, dados) {
  const canal = await CrmChannel.findByPk(id);
  if (!canal || canal.deleted_at) throw Object.assign(new Error('Canal nao encontrado'), { status: 404 });
  const campos = [
    'nome', 'type', 'status', 'provider', 'public_label',
    'business_main_phone', 'operational_phone', 'tracking_phone', 'destination_phone',
    'meta_waba_id', 'meta_phone_number_id', 'google_customer_id', 'config_json'
  ];
  const updates = {};
  for (const campo of campos) {
    if (dados[campo] !== undefined) updates[campo] = dados[campo];
  }
  await canal.update(updates);
  return canal;
}

async function excluirCanal(id) {
  const canal = await CrmChannel.findByPk(id);
  if (!canal || canal.deleted_at) throw Object.assign(new Error('Canal nao encontrado'), { status: 404 });
  await canal.update({ deleted_at: new Date() });
  return { ok: true, softDelete: true };
}

// -------------------------------------------------------
// Phone Assets
// -------------------------------------------------------
async function listarPhoneAssets(query = {}) {
  const { status, role_type } = query;
  const where = { deleted_at: null };
  if (status) where.status = String(status).toUpperCase();
  if (role_type) where.role_type = String(role_type).toUpperCase();
  return CrmPhoneAsset.findAll({ where, order: [['role_type', 'ASC'], ['label', 'ASC']] });
}

async function obterPhoneAsset(id) {
  const asset = await CrmPhoneAsset.findByPk(id);
  if (!asset || asset.deleted_at) throw Object.assign(new Error('Numero nao encontrado'), { status: 404 });
  return asset;
}

async function criarPhoneAsset(dados) {
  if (!dados.phone_number?.trim()) throw Object.assign(new Error('Numero de telefone e obrigatorio'), { status: 400 });
  if (!dados.label?.trim()) throw Object.assign(new Error('Label e obrigatorio'), { status: 400 });
  if (!dados.role_type) throw Object.assign(new Error('role_type e obrigatorio'), { status: 400 });
  const campos = [
    'label', 'phone_number', 'country_code', 'role_type', 'provider',
    'is_whatsapp_enabled', 'is_google_ads_enabled', 'is_meta_ads_enabled',
    'display_name', 'risk_level', 'can_receive_messages', 'can_receive_calls',
    'forward_to_phone', 'status', 'notes'
  ];
  const payload = {};
  for (const campo of campos) {
    if (dados[campo] !== undefined) payload[campo] = dados[campo];
  }
  return CrmPhoneAsset.create(payload);
}

async function atualizarPhoneAsset(id, dados) {
  const asset = await CrmPhoneAsset.findByPk(id);
  if (!asset || asset.deleted_at) throw Object.assign(new Error('Numero nao encontrado'), { status: 404 });
  const campos = [
    'label', 'phone_number', 'country_code', 'role_type', 'provider',
    'is_whatsapp_enabled', 'is_google_ads_enabled', 'is_meta_ads_enabled',
    'display_name', 'risk_level', 'can_receive_messages', 'can_receive_calls',
    'forward_to_phone', 'status', 'notes'
  ];
  const updates = {};
  for (const campo of campos) {
    if (dados[campo] !== undefined) updates[campo] = dados[campo];
  }
  await asset.update(updates);
  return asset;
}

async function excluirPhoneAsset(id) {
  const asset = await CrmPhoneAsset.findByPk(id);
  if (!asset || asset.deleted_at) throw Object.assign(new Error('Numero nao encontrado'), { status: 404 });
  await asset.update({ deleted_at: new Date() });
  return { ok: true, softDelete: true };
}

module.exports = {
  listarCanais, obterCanal, criarCanal, atualizarCanal, excluirCanal,
  listarPhoneAssets, obterPhoneAsset, criarPhoneAsset, atualizarPhoneAsset, excluirPhoneAsset
};
