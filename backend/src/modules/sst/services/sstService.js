'use strict';

const { Op } = require('sequelize');
const {
  EmpresaGrupo,
  Obra,
  RhColaborador,
  User,
  sequelize,
  SstAso,
  SstDocumento,
  SstEpiEntrega,
  SstExame,
  SstRisco,
  SstTreinamento
} = require('../../../models');
const { uploadToS3, getPresignedUrl } = require('../../../services/s3');
const { ValidationError } = require('../../../middlewares/validation');
const { SST_EVENT_TYPES, SST_RESOURCE_CONFIG, SST_VALIDITY_ALERT_DAYS } = require('../constants/sstConstants');
const { getSstConfig } = require('./sstConfigService');
const { registrarEventoSst } = require('./sstEventService');

function getConfig(resource) {
  const config = SST_RESOURCE_CONFIG[String(resource || '').trim().toLowerCase()];
  if (!config) throw new ValidationError('Recurso SST invalido.', 404);
  return config;
}

function getModel(resource) {
  const config = getConfig(resource);
  const model = require('../../../models')[config.modelName];
  if (!model) throw new ValidationError('Modelo SST indisponivel.', 500);
  return model;
}

function buildWhere(query = {}, model = null) {
  const where = {};
  if (query.empresa_id && (!model || model.rawAttributes?.empresa_id)) where.empresa_id = query.empresa_id;
  if (query.obra_id && (!model || model.rawAttributes?.obra_id)) where.obra_id = query.obra_id;
  if (query.colaborador_id && (!model || model.rawAttributes?.colaborador_id)) where.colaborador_id = query.colaborador_id;
  if (query.status && (!model || model.rawAttributes?.status)) where.status = query.status;
  if (typeof query.ativo === 'boolean' && (!model || model.rawAttributes?.ativo)) where.ativo = query.ativo;
  if (query.search) {
    const searchable = ['nome', 'titulo', 'descricao', 'responsavel', 'medico_responsavel', 'tipo_evento', 'mensagem']
      .filter((field) => !model || model.rawAttributes?.[field]);
    if (searchable.length) {
      where[Op.or] = searchable.map((field) => ({ [field]: { [Op.like]: `%${query.search}%` } }));
    }
  }
  return where;
}

function buildInclude(model) {
  const include = [];
  if (model.rawAttributes?.empresa_id) {
    include.push({ model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'nome', 'razao_social', 'cnpj'] });
  }
  if (model.rawAttributes?.obra_id) {
    include.push({ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo'] });
  }
  if (model.rawAttributes?.colaborador_id) {
    include.push({ model: RhColaborador, as: 'colaborador', attributes: ['id', 'nome', 'cpf', 'matricula', 'cargo', 'status'] });
  }
  if (model.rawAttributes?.criado_por) {
    include.push({ model: User, as: 'criadoPor', attributes: ['id', 'nome', 'email'] });
  }
  return include;
}

function todayDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function alertDate(days = SST_VALIDITY_ALERT_DAYS) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || SST_VALIDITY_ALERT_DAYS));
  return date.toISOString().slice(0, 10);
}

async function listResource(resource, query = {}) {
  const config = getConfig(resource);
  const model = getModel(resource);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(Math.max(1, Number(query.limit || 50)), 200);
  const { count, rows } = await model.findAndCountAll({
    where: buildWhere(query, model),
    include: buildInclude(model),
    order: config.listOrder || [['updatedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });
  return { rows, total: count, page, limit };
}

async function getResource(resource, id) {
  const model = getModel(resource);
  const item = await model.findByPk(id, { include: buildInclude(model) });
  if (!item) throw new ValidationError('Registro SST nao encontrado.', 404);
  return item;
}

async function createResource(resource, payload, user) {
  const config = getConfig(resource);
  const model = getModel(resource);
  const item = await sequelize.transaction(async (transaction) => {
    const created = await model.create({
      ...payload,
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    }, { transaction });

    await emitEventForResource(resource, created, user, transaction);
    return created;
  });

  return getResource(resource, item.id);
}

async function updateResource(resource, id, payload, user) {
  const item = await getResource(resource, id);
  await sequelize.transaction(async (transaction) => {
    await item.update({
      ...payload,
      atualizado_por: user?.id || null
    }, { transaction });
    await emitEventForResource(resource, item, user, transaction);
  });
  return getResource(resource, id);
}

async function uploadDocument(file, metadata, user) {
  if (!file?.buffer) {
    throw new ValidationError('Arquivo SST obrigatorio.');
  }

  const arquivo_url = await uploadToS3(file, 'sst/documentos');
  return createResource('documentos', {
    ...metadata,
    arquivo_url,
    nome_original: file.originalname,
    mimetype: file.mimetype,
    tamanho_bytes: file.size
  }, user);
}

async function getDocumentSignedUrl(id) {
  const documento = await getResource('documentos', id);
  if (!documento.arquivo_url) {
    throw new ValidationError('Documento sem arquivo vinculado.', 404);
  }
  return {
    id: documento.id,
    url: await getPresignedUrl(documento.arquivo_url, 300)
  };
}

async function dashboard(query = {}) {
  const sstConfig = await getSstConfig();
  const alertDays = Number(sstConfig?.dias_alerta_validade || SST_VALIDITY_ALERT_DAYS);
  const baseQuery = { ...query, search: null };
  const riscoWhere = buildWhere(baseQuery, SstRisco);
  const asoWhere = buildWhere(baseQuery, SstAso);
  const exameWhere = buildWhere(baseQuery, SstExame);
  const epiWhere = buildWhere(baseQuery, SstEpiEntrega);
  const treinamentoWhere = buildWhere(baseQuery, SstTreinamento);
  const documentoWhere = buildWhere(baseQuery, SstDocumento);
  const validadeExameWhere = {
    ...exameWhere,
    validade: { [Op.between]: [todayDate(), alertDate(alertDays)] }
  };
  const vencidosExameWhere = {
    ...exameWhere,
    validade: { [Op.lt]: todayDate() }
  };
  const validadeEpiWhere = { ...epiWhere, validade: { [Op.between]: [todayDate(), alertDate(alertDays)] } };
  const validadeTreinamentoWhere = { ...treinamentoWhere, validade: { [Op.between]: [todayDate(), alertDate(alertDays)] } };
  const validadeDocumentoWhere = { ...documentoWhere, validade: { [Op.between]: [todayDate(), alertDate(alertDays)] } };

  const [
    riscosCriticos,
    riscosTotal,
    asoTotal,
    colaboradoresInaptos,
    examesVencendo,
    examesVencidos,
    epiVencendo,
    treinamentosVencendo,
    documentosVencendo
  ] = await Promise.all([
    SstRisco.count({ where: { ...riscoWhere, severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true } }),
    SstRisco.count({ where: { ...riscoWhere, ativo: true } }),
    SstAso.count({ where: asoWhere }),
    SstAso.count({ where: { ...asoWhere, apto: false } }),
    SstExame.count({ where: validadeExameWhere }),
    SstExame.count({ where: vencidosExameWhere }),
    SstEpiEntrega.count({ where: validadeEpiWhere }),
    SstTreinamento.count({ where: validadeTreinamentoWhere }),
    SstDocumento.count({ where: validadeDocumentoWhere })
  ]);

  const totalConformidade = asoTotal + riscosTotal;
  const pendencias = colaboradoresInaptos + examesVencidos + riscosCriticos;
  const complianceScore = totalConformidade
    ? Math.max(0, Math.round(((totalConformidade - pendencias) / totalConformidade) * 100))
    : 100;

  return {
    periodo_alerta_dias: alertDays,
    cards: {
      riscos_total: riscosTotal,
      riscos_criticos: riscosCriticos,
      asos_total: asoTotal,
      colaboradores_inaptos: colaboradoresInaptos,
      exames_vencendo: examesVencendo,
      exames_vencidos: examesVencidos,
      epi_vencendo: epiVencendo,
      treinamentos_vencendo: treinamentosVencendo,
      documentos_vencendo: documentosVencendo,
      compliance_score: complianceScore
    }
  };
}

async function emitEventForResource(resource, item, user, transaction) {
  const plain = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  if (resource === 'acidentes') {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.ACIDENTE_REGISTRADO,
      severidade: ['GRAVE', 'FATAL'].includes(String(plain.gravidade || '').toUpperCase()) ? 'CRITICA' : 'ALERTA',
      origem_tipo: 'sst_acidentes',
      origem_id: plain.id,
      mensagem: `Acidente/incidente registrado: ${plain.tipo}`,
      usuario_id: user?.id || null,
      transaction
    });
  }

  if (resource === 'riscos' && ['ALTA', 'CRITICA'].includes(String(plain.severidade || '').toUpperCase())) {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      tipo_evento: SST_EVENT_TYPES.RISCO_CRITICO_IDENTIFICADO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_riscos',
      origem_id: plain.id,
      mensagem: `Risco critico identificado: ${plain.nome}`,
      usuario_id: user?.id || null,
      transaction
    });
  }

  if (resource === 'aso' && plain.apto === false) {
    await registrarEventoSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.COLABORADOR_INAPTO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_aso',
      origem_id: plain.id,
      mensagem: 'Colaborador marcado como inapto em ASO.',
      usuario_id: user?.id || null,
      transaction
    });
  }
}

module.exports = {
  createResource,
  dashboard,
  getDocumentSignedUrl,
  getResource,
  listResource,
  updateResource,
  uploadDocument
};
