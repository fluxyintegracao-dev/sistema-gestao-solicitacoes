'use strict';

const { SstEventoOperacional } = require('../../../models');
const { SST_EVENT_TYPES } = require('../constants/sstConstants');
const { registrarEventoSst } = require('../services/sstEventService');
const { avaliarBloqueiosColaborador } = require('../blocking/sstBlockingService');
const { sincronizarNotificacoesSst } = require('../notifications/sstNotificationService');
const { gerarRecomendacoesSst } = require('../recommendations/sstRecommendationService');
const { recalcularScoreSst } = require('../scoring/sstScoringService');
const { revisarConformidadeColaborador } = require('../workflows/sstWorkflowService');

async function automatizarMudancaFuncao({ colaborador_id, motivo = 'MUDANCA_FUNCAO', alteracao = null, usuario_id = null } = {}) {
  const revisao = await revisarConformidadeColaborador({ colaborador_id, motivo, alteracao, usuario_id });
  const score = await recalcularScoreSst({ colaborador_id });
  const recomendacoes = await gerarRecomendacoesSst({ colaborador_id }, usuario_id);
  const notificacoes = await sincronizarNotificacoesSst({ usuario_id });

  await registrarEventoSst({
    empresa_id: revisao.colaborador?.empresa_grupo_id || null,
    obra_id: revisao.colaborador?.obra_id || null,
    colaborador_id,
    tipo_evento: SST_EVENT_TYPES.AUTOMACAO_EXECUTADA,
    severidade: 'ALERTA',
    origem_tipo: 'sst_automation',
    origem_id: Number(colaborador_id),
    mensagem: `Automacao SST executada para ${motivo}.`,
    payload: { motivo, alteracao },
    usuario_id
  });

  return { revisao, score, recomendacoes, notificacoes };
}

async function automatizarAcidenteRegistrado({ evento_id = null, colaborador_id = null, empresa_id = null, obra_id = null, usuario_id = null } = {}) {
  const query = {
    ...(empresa_id ? { empresa_id } : {}),
    ...(obra_id ? { obra_id } : {}),
    ...(colaborador_id ? { colaborador_id } : {})
  };
  const [score, recomendacoes, notificacoes] = await Promise.all([
    recalcularScoreSst(query),
    gerarRecomendacoesSst(query, usuario_id),
    sincronizarNotificacoesSst({ usuario_id })
  ]);

  await registrarEventoSst({
    empresa_id,
    obra_id,
    colaborador_id,
    tipo_evento: SST_EVENT_TYPES.AUTOMACAO_EXECUTADA,
    severidade: 'ALERTA',
    origem_tipo: 'sst_eventos_operacionais',
    origem_id: evento_id,
    mensagem: 'Automacao SST executada apos acidente registrado.',
    payload: { evento_id },
    usuario_id
  });

  return { score, recomendacoes, notificacoes };
}

async function automatizarVencimentosProximos({ usuario_id = null } = {}) {
  const { gerarEventosVencimentoSst } = require('../services/sstEventService');
  const eventos = await gerarEventosVencimentoSst({ usuario_id });
  const recomendacoes = await gerarRecomendacoesSst({}, usuario_id);
  const notificacoes = await sincronizarNotificacoesSst({ usuario_id });
  const score = await recalcularScoreSst({});

  await registrarEventoSst({
    tipo_evento: SST_EVENT_TYPES.AUTOMACAO_EXECUTADA,
    severidade: 'INFO',
    origem_tipo: 'sst_automation',
    origem_id: null,
    mensagem: 'Automacao SST de vencimentos proximos executada.',
    payload: { eventos },
    usuario_id
  });

  return { eventos, recomendacoes, notificacoes, score };
}

async function orquestrarEventoSst(evento, usuario_id = null) {
  const plain = typeof evento?.toJSON === 'function' ? evento.toJSON() : evento;
  if (!plain?.tipo_evento) return { executado: false, motivo: 'EVENTO_INVALIDO' };

  if ([SST_EVENT_TYPES.FUNCAO_ALTERADA, SST_EVENT_TYPES.OBRA_ALTERADA].includes(plain.tipo_evento)) {
    return automatizarMudancaFuncao({
      colaborador_id: plain.colaborador_id,
      motivo: plain.tipo_evento,
      alteracao: plain.payload ? JSON.parse(plain.payload) : null,
      usuario_id
    });
  }

  if ([SST_EVENT_TYPES.ADMISSAO_DETECTADA].includes(plain.tipo_evento)) {
    return automatizarMudancaFuncao({
      colaborador_id: plain.colaborador_id,
      motivo: 'ADMISSAO',
      alteracao: plain.payload ? JSON.parse(plain.payload) : null,
      usuario_id
    });
  }

  if ([SST_EVENT_TYPES.DESLIGAMENTO_DETECTADO].includes(plain.tipo_evento)) {
    const recomendacoes = await gerarRecomendacoesSst({ colaborador_id: plain.colaborador_id }, usuario_id);
    const notificacoes = await sincronizarNotificacoesSst({ usuario_id });
    return { recomendacoes, notificacoes };
  }

  if ([SST_EVENT_TYPES.ACIDENTE_REGISTRADO, SST_EVENT_TYPES.ACIDENTE_GRAVE].includes(plain.tipo_evento)) {
    return automatizarAcidenteRegistrado({
      evento_id: plain.id,
      colaborador_id: plain.colaborador_id,
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      usuario_id
    });
  }

  if (String(plain.tipo_evento).includes('VENCENDO') || String(plain.tipo_evento).includes('VENCIDO')) {
    const bloqueios = plain.colaborador_id
      ? await avaliarBloqueiosColaborador({ colaborador_id: plain.colaborador_id, usuario_id })
      : null;
    const recomendacoes = await gerarRecomendacoesSst({
      empresa_id: plain.empresa_id,
      obra_id: plain.obra_id,
      colaborador_id: plain.colaborador_id
    }, usuario_id);
    const notificacoes = await sincronizarNotificacoesSst({ usuario_id });
    return { bloqueios, recomendacoes, notificacoes };
  }

  return { executado: false, motivo: 'SEM_AUTOMACAO_CONFIGURADA' };
}

async function processarEventosAbertosSst({ limit = 50, usuario_id = null } = {}) {
  const eventos = await SstEventoOperacional.findAll({
    where: { status: 'ABERTO' },
    order: [['createdAt', 'ASC']],
    limit: Math.min(Number(limit) || 50, 200)
  });
  const resultados = [];
  for (const evento of eventos) {
    resultados.push({
      evento_id: evento.id,
      tipo_evento: evento.tipo_evento,
      resultado: await orquestrarEventoSst(evento, usuario_id)
    });
  }
  return { eventos_processados: resultados.length, resultados };
}

module.exports = {
  automatizarAcidenteRegistrado,
  automatizarMudancaFuncao,
  automatizarVencimentosProximos,
  orquestrarEventoSst,
  processarEventosAbertosSst
};
