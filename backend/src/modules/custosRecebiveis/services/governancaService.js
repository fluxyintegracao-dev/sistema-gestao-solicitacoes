'use strict';

const { Op } = require('sequelize');
const db = require('../../../models');

const VALID_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const VALID_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;
const VALID_ROLES = new Set(['RESPONSAVEL', 'SUBSTITUTO']);

function businessError(statusCode, code, message, details = null) {
  const error = new Error(message);
  error.name = 'CustosRecebiveisBusinessError';
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

function dependencies(overrides = {}) {
  return {
    sequelize: db.sequelize,
    User: db.User,
    UsuarioObra: db.UsuarioObra,
    CrResponsavelObra: db.CrResponsavelObra,
    CrAuditoria: db.CrAuditoria,
    ...overrides
  };
}

function plain(value) {
  return value?.toJSON ? value.toJSON() : { ...(value || {}) };
}

function positiveId(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw businessError(400, 'CR_INVALID_ID', `${label} invalido.`);
  }
  return parsed;
}

function normalizeText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentCompetencia() {
  return new Date().toISOString().slice(0, 7);
}

function previousDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isCalendarDate(value) {
  if (!VALID_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function serializeResponsibility(record) {
  const item = plain(record);
  return {
    id: Number(item.id),
    obra_id: Number(item.obra_id),
    user_id: Number(item.user_id),
    usuario: item.usuario ? {
      id: Number(item.usuario.id),
      nome: item.usuario.nome,
      email: item.usuario.email || null
    } : null,
    papel: item.papel,
    competencia_inicial: item.competencia_inicial,
    vigencia_inicio: item.vigencia_inicio,
    vigencia_fim: item.vigencia_fim || null,
    ativo: Boolean(item.ativo),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  };
}

async function listarResponsaveisObra(obraIdValue, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const [records, links] = await Promise.all([
    deps.CrResponsavelObra.findAll({
      where: { obra_id: obraId },
      include: [{
        model: deps.User,
        as: 'usuario',
        attributes: ['id', 'nome', 'email'],
        required: false
      }],
      order: [['ativo', 'DESC'], ['papel', 'ASC'], ['vigencia_inicio', 'DESC']]
    }),
    deps.UsuarioObra.findAll({
      where: { obra_id: obraId },
      include: [{
        model: deps.User,
        as: 'usuario',
        attributes: ['id', 'nome', 'email', 'ativo'],
        where: { ativo: true },
        required: true
      }],
      order: [[{ model: deps.User, as: 'usuario' }, 'nome', 'ASC']]
    })
  ]);

  const eligible = new Map();
  links.forEach((link) => {
    const item = plain(link);
    if (!item.usuario) return;
    eligible.set(Number(item.usuario.id), {
      id: Number(item.usuario.id),
      nome: item.usuario.nome,
      email: item.usuario.email || null,
      perfil_obra: item.perfil || null
    });
  });

  return {
    items: records.map(serializeResponsibility),
    usuarios_elegiveis: [...eligible.values()]
  };
}

async function cadastrarResponsavelObra(
  actor,
  obraIdValue,
  payload = {},
  idempotencyKey = null,
  overrides = {}
) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const userId = positiveId(payload.user_id, 'Usuario');
  const papel = normalizeText(payload.papel, 20).toUpperCase();
  const competenciaInicial = normalizeText(
    payload.competencia_inicial || currentCompetencia(),
    7
  );
  const vigenciaInicio = normalizeText(payload.vigencia_inicio || today(), 10);
  const key = normalizeText(idempotencyKey, 180);

  if (!key) {
    throw businessError(
      400,
      'CR_IDEMPOTENCY_REQUIRED',
      'Idempotency-Key e obrigatoria para cadastrar uma responsabilidade.'
    );
  }
  if (!VALID_ROLES.has(papel)) {
    throw businessError(422, 'CR_RESPONSIBILITY_ROLE_INVALID', 'Papel de responsabilidade invalido.');
  }
  if (!VALID_COMPETENCIA.test(competenciaInicial)) {
    throw businessError(422, 'CR_COMPETENCIA_INVALID', 'Competencia inicial invalida.');
  }
  if (competenciaInicial < currentCompetencia()) {
    throw businessError(
      422,
      'CR_RESPONSIBILITY_RETROACTIVE_FORBIDDEN',
      'A competencia inicial nao pode ser anterior ao mes corrente.'
    );
  }
  if (!isCalendarDate(vigenciaInicio)) {
    throw businessError(422, 'CR_RESPONSIBILITY_DATE_INVALID', 'Data inicial invalida.');
  }
  if (vigenciaInicio > today()) {
    throw businessError(
      422,
      'CR_RESPONSIBILITY_FUTURE_START_FORBIDDEN',
      'A vigencia de um vinculo ativo nao pode comecar em data futura.'
    );
  }

  return deps.sequelize.transaction(async (transaction) => {
    const target = await deps.User.findByPk(userId, {
      attributes: ['id', 'nome', 'email', 'ativo'],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!target || target.ativo === false) {
      throw businessError(404, 'CR_RESPONSIBILITY_USER_NOT_FOUND', 'Usuario ativo nao encontrado.');
    }

    const link = await deps.UsuarioObra.findOne({
      where: { obra_id: obraId, user_id: userId },
      transaction
    });
    if (!link) {
      throw businessError(
        422,
        'CR_RESPONSIBILITY_WORK_SCOPE_REQUIRED',
        'O usuario precisa estar vinculado a obra antes de assumir essa responsabilidade.'
      );
    }

    const activeUserAssignment = await deps.CrResponsavelObra.findOne({
      where: { obra_id: obraId, user_id: userId, ativo: true },
      include: [{
        model: deps.User,
        as: 'usuario',
        attributes: ['id', 'nome', 'email'],
        required: false
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (activeUserAssignment?.papel === papel) {
      const current = plain(activeUserAssignment);
      if (
        current.competencia_inicial === competenciaInicial
        && current.vigencia_inicio === vigenciaInicio
      ) {
        return {
          idempotente: true,
          responsabilidade: serializeResponsibility(activeUserAssignment)
        };
      }
      throw businessError(
        409,
        'CR_RESPONSIBILITY_ALREADY_ACTIVE',
        'O usuario ja possui esse papel ativo na obra. Encerre o vinculo atual antes de criar outro.'
      );
    }

    const replacedIds = [];
    if (activeUserAssignment) {
      const current = plain(activeUserAssignment);
      const proposedEnd = previousDate(vigenciaInicio);
      await activeUserAssignment.update({
        ativo: false,
        vigencia_fim: proposedEnd < current.vigencia_inicio
          ? current.vigencia_inicio
          : proposedEnd
      }, { transaction });
      replacedIds.push(Number(current.id));
    }

    if (papel === 'RESPONSAVEL') {
      const activeResponsibles = await deps.CrResponsavelObra.findAll({
        where: { obra_id: obraId, papel: 'RESPONSAVEL', ativo: true },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      for (const current of activeResponsibles) {
        const item = plain(current);
        if (replacedIds.includes(Number(item.id))) continue;
        const proposedEnd = previousDate(vigenciaInicio);
        await current.update({
          ativo: false,
          vigencia_fim: proposedEnd < item.vigencia_inicio
            ? item.vigencia_inicio
            : proposedEnd
        }, { transaction });
        replacedIds.push(Number(item.id));
      }
    }

    const record = await deps.CrResponsavelObra.create({
      obra_id: obraId,
      user_id: userId,
      papel,
      competencia_inicial: competenciaInicial,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: null,
      ativo: true
    }, { transaction });

    await deps.CrAuditoria.create({
      obra_id: obraId,
      competencia_id: null,
      usuario_id: Number(actor.id),
      evento: 'RESPONSABILIDADE_OBRA_CADASTRADA',
      descricao: `${papel === 'RESPONSAVEL' ? 'Responsavel' : 'Substituto'} cadastrado na obra.`,
      payload_json: {
        responsabilidade_id: Number(record.id),
        user_id: userId,
        papel,
        competencia_inicial: competenciaInicial,
        vigencia_inicio: vigenciaInicio,
        vinculos_encerrados: replacedIds,
        idempotency_key: key
      },
      origem: 'web'
    }, { transaction });

    const serialized = {
      ...plain(record),
      usuario: plain(target)
    };
    return { idempotente: false, responsabilidade: serializeResponsibility(serialized) };
  });
}

async function resolverObraIdPorResponsabilidade(idValue, overrides = {}) {
  const deps = dependencies(overrides);
  const id = positiveId(idValue, 'Responsabilidade');
  const record = await deps.CrResponsavelObra.findByPk(id, { attributes: ['obra_id'] });
  if (!record) {
    throw businessError(404, 'CR_RESPONSIBILITY_NOT_FOUND', 'Responsabilidade nao encontrada.');
  }
  return Number(record.obra_id);
}

async function encerrarResponsabilidade(
  actor,
  idValue,
  payload = {},
  idempotencyKey = null,
  overrides = {}
) {
  const deps = dependencies(overrides);
  const id = positiveId(idValue, 'Responsabilidade');
  const key = normalizeText(idempotencyKey, 180);
  const vigenciaFim = normalizeText(payload.vigencia_fim || today(), 10);
  const reason = normalizeText(payload.motivo);
  if (!key) {
    throw businessError(
      400,
      'CR_IDEMPOTENCY_REQUIRED',
      'Idempotency-Key e obrigatoria para encerrar uma responsabilidade.'
    );
  }
  if (!isCalendarDate(vigenciaFim)) {
    throw businessError(422, 'CR_RESPONSIBILITY_DATE_INVALID', 'Data final invalida.');
  }
  if (reason.length < 10) {
    throw businessError(
      422,
      'CR_RESPONSIBILITY_REASON_REQUIRED',
      'Informe uma justificativa com pelo menos 10 caracteres.'
    );
  }

  return deps.sequelize.transaction(async (transaction) => {
    const record = await deps.CrResponsavelObra.findByPk(id, {
      include: [{
        model: deps.User,
        as: 'usuario',
        attributes: ['id', 'nome', 'email'],
        required: false
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!record) {
      throw businessError(404, 'CR_RESPONSIBILITY_NOT_FOUND', 'Responsabilidade nao encontrada.');
    }
    if (!record.ativo) {
      return { idempotente: true, responsabilidade: serializeResponsibility(record) };
    }
    if (vigenciaFim < record.vigencia_inicio) {
      throw businessError(
        422,
        'CR_RESPONSIBILITY_END_BEFORE_START',
        'A data final nao pode ser anterior a data inicial.'
      );
    }

    await record.update({
      ativo: false,
      vigencia_fim: vigenciaFim
    }, { transaction });
    await deps.CrAuditoria.create({
      obra_id: Number(record.obra_id),
      competencia_id: null,
      usuario_id: Number(actor.id),
      evento: 'RESPONSABILIDADE_OBRA_ENCERRADA',
      descricao: 'Responsabilidade da obra encerrada.',
      payload_json: {
        responsabilidade_id: Number(record.id),
        user_id: Number(record.user_id),
        papel: record.papel,
        vigencia_fim: vigenciaFim,
        motivo: reason,
        idempotency_key: key
      },
      origem: 'web'
    }, { transaction });
    return { idempotente: false, responsabilidade: serializeResponsibility(record) };
  });
}

function serializeAudit(record) {
  const item = plain(record);
  return {
    id: Number(item.id),
    obra_id: item.obra_id ? Number(item.obra_id) : null,
    competencia_id: item.competencia_id ? Number(item.competencia_id) : null,
    usuario_id: item.usuario_id ? Number(item.usuario_id) : null,
    usuario: item.usuario ? {
      id: Number(item.usuario.id),
      nome: item.usuario.nome
    } : null,
    evento: item.evento,
    descricao: item.descricao || null,
    payload: item.payload_json || null,
    origem: item.origem,
    criado_em: item.criado_em
  };
}

async function listarAuditoriaObra(obraIdValue, query = {}, overrides = {}) {
  const deps = dependencies(overrides);
  const obraId = positiveId(obraIdValue, 'Obra');
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 200);
  const eventSearch = normalizeText(query.evento || query.q, 120);
  const where = { obra_id: obraId };
  if (eventSearch) where.evento = { [Op.like]: `%${eventSearch}%` };
  const records = await deps.CrAuditoria.findAll({
    where,
    include: [{
      model: deps.User,
      as: 'usuario',
      attributes: ['id', 'nome'],
      required: false
    }],
    order: [['criado_em', 'DESC'], ['id', 'DESC']],
    limit
  });
  return { items: records.map(serializeAudit), total: records.length, limit };
}

module.exports = {
  cadastrarResponsavelObra,
  encerrarResponsabilidade,
  listarAuditoriaObra,
  listarResponsaveisObra,
  resolverObraIdPorResponsabilidade
};
