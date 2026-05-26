'use strict';

const {
  SstEventoOperacional,
  SstNotificacao,
  SstPendenciaOperacional
} = require('../../../models');
const { ValidationError } = require('../../../middlewares/validation');
const { SST_EVENT_TYPES } = require('../constants/sstConstants');
const { registrarEventoSst } = require('../services/sstEventService');

function prioridadeFromCriticidade(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'CRITICA') return 'URGENTE';
  if (normalized === 'ALTA') return 'ALTA';
  return 'NORMAL';
}

async function criarNotificacaoUmaVez(payload, usuario_id = null) {
  const [notificacao, created] = await SstNotificacao.findOrCreate({
    where: {
      origem_tipo: payload.origem_tipo,
      origem_id: payload.origem_id,
      tipo_notificacao: payload.tipo_notificacao,
      status: 'NAO_LIDA'
    },
    defaults: {
      ...payload,
      criado_por: usuario_id,
      atualizado_por: usuario_id
    }
  });
  if (created) {
    await registrarEventoSst({
      empresa_id: notificacao.empresa_id,
      obra_id: notificacao.obra_id,
      colaborador_id: notificacao.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.NOTIFICACAO_GERADA,
      severidade: notificacao.criticidade === 'CRITICA' ? 'CRITICA' : 'INFO',
      origem_tipo: 'sst_notificacoes',
      origem_id: notificacao.id,
      mensagem: `Notificacao SST gerada: ${notificacao.titulo}`,
      payload: { tipo_notificacao: notificacao.tipo_notificacao },
      usuario_id
    });
  }
  return { notificacao, created };
}

async function sincronizarNotificacoesSst({ usuario_id = null } = {}) {
  const [eventos, pendencias] = await Promise.all([
    SstEventoOperacional.findAll({ where: { status: 'ABERTO' }, order: [['createdAt', 'DESC']], limit: 300 }),
    SstPendenciaOperacional.findAll({ where: { status: 'ABERTA' }, order: [['createdAt', 'DESC']], limit: 300 })
  ]);

  let criadas = 0;
  for (const evento of eventos) {
    const result = await criarNotificacaoUmaVez({
      empresa_id: evento.empresa_id,
      obra_id: evento.obra_id,
      colaborador_id: evento.colaborador_id,
      tipo_notificacao: evento.tipo_evento,
      prioridade: prioridadeFromCriticidade(evento.severidade),
      criticidade: evento.severidade === 'CRITICA' ? 'CRITICA' : 'MEDIA',
      titulo: evento.tipo_evento,
      mensagem: evento.mensagem,
      status: 'NAO_LIDA',
      agrupador: evento.tipo_evento,
      origem_tipo: 'sst_eventos_operacionais',
      origem_id: evento.id,
      payload_json: evento.payload || null
    }, usuario_id);
    if (result.created) criadas += 1;
  }

  for (const pendencia of pendencias) {
    const result = await criarNotificacaoUmaVez({
      empresa_id: pendencia.empresa_id,
      obra_id: pendencia.obra_id,
      colaborador_id: pendencia.colaborador_id,
      tipo_notificacao: pendencia.tipo_pendencia,
      prioridade: prioridadeFromCriticidade(pendencia.criticidade),
      criticidade: pendencia.criticidade || 'MEDIA',
      titulo: pendencia.titulo,
      mensagem: pendencia.descricao || pendencia.titulo,
      status: 'NAO_LIDA',
      agrupador: pendencia.tipo_pendencia,
      origem_tipo: 'sst_pendencias_operacionais',
      origem_id: pendencia.id,
      payload_json: pendencia.payload_json || null
    }, usuario_id);
    if (result.created) criadas += 1;
  }

  return {
    eventos_analisados: eventos.length,
    pendencias_analisadas: pendencias.length,
    notificacoes_criadas: criadas
  };
}

async function marcarNotificacaoLida(id, user = null) {
  const notificacao = await SstNotificacao.findByPk(id);
  if (!notificacao) throw new ValidationError('Notificacao SST nao encontrada.', 404);
  await notificacao.update({
    status: 'LIDA',
    lida_em: new Date(),
    atualizado_por: user?.id || null
  });
  return notificacao;
}

module.exports = {
  marcarNotificacaoLida,
  sincronizarNotificacoesSst
};
