'use strict';

const { Op } = require('sequelize');
const {
  SstPendenciaOperacional,
  SstRecomendacaoOperacional
} = require('../../../models');
const { SST_EVENT_TYPES } = require('../constants/sstConstants');
const { gerarHeatmapSst } = require('../analytics/sstExecutiveAnalyticsService');
const { registrarEventoSst } = require('../services/sstEventService');

async function upsertRecomendacao(payload, usuario_id = null) {
  const [registro, created] = await SstRecomendacaoOperacional.findOrCreate({
    where: {
      tipo_recomendacao: payload.tipo_recomendacao,
      origem_tipo: payload.origem_tipo || null,
      origem_id: payload.origem_id || null,
      status: { [Op.in]: ['ABERTA', 'EM_ANALISE'] }
    },
    defaults: {
      ...payload,
      criado_por: usuario_id,
      atualizado_por: usuario_id
    }
  });

  if (!created) {
    await registro.update({
      ...payload,
      atualizado_por: usuario_id
    });
  } else {
    await registrarEventoSst({
      empresa_id: registro.empresa_id,
      obra_id: registro.obra_id,
      colaborador_id: registro.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.RECOMENDACAO_GERADA,
      severidade: registro.criticidade === 'CRITICA' || registro.criticidade === 'EMERGENCIAL' ? 'CRITICA' : 'ALERTA',
      origem_tipo: 'sst_recomendacoes_operacionais',
      origem_id: registro.id,
      mensagem: `Recomendacao SST gerada: ${registro.titulo}`,
      payload: payload.payload_json ? JSON.parse(payload.payload_json) : null,
      usuario_id
    });
  }

  return registro;
}

async function gerarRecomendacoesSst(query = {}, usuario_id = null) {
  const heatmap = await gerarHeatmapSst(query);
  const recomendacoes = [];

  for (const item of heatmap.heatmap || []) {
    if (item.criticidade === 'CRITICA' || item.criticidade === 'ALTA') {
      recomendacoes.push(await upsertRecomendacao({
        empresa_id: query.empresa_id || null,
        obra_id: item.obra_id || null,
        tipo_recomendacao: 'OBRA_CRITICA',
        criticidade: item.criticidade,
        titulo: `Revisar plano SST da obra ${item.obra}`,
        descricao: `A obra concentra ${item.pendencias} pendencia(s), ${item.bloqueios} bloqueio(s), ${item.acidentes} acidente(s) e ${item.riscos} risco(s) critico(s).`,
        acao_sugerida: 'Priorizar revisao de ASO, treinamentos, EPIs e riscos ativos antes de liberar novas frentes operacionais.',
        status: 'ABERTA',
        origem_tipo: 'sst_heatmap',
        origem_id: item.obra_id || 0,
        payload_json: JSON.stringify(item)
      }, usuario_id));
    }
  }

  const pendenciasCriticas = await SstPendenciaOperacional.findAll({
    where: {
      ...(query.empresa_id ? { empresa_id: Number(query.empresa_id) } : {}),
      ...(query.obra_id ? { obra_id: Number(query.obra_id) } : {}),
      status: { [Op.in]: ['ABERTA', 'EM_TRATAMENTO'] },
      criticidade: { [Op.in]: ['CRITICA', 'EMERGENCIAL'] }
    },
    limit: 100
  });

  for (const pendencia of pendenciasCriticas) {
    recomendacoes.push(await upsertRecomendacao({
      empresa_id: pendencia.empresa_id,
      obra_id: pendencia.obra_id,
      colaborador_id: pendencia.colaborador_id,
      tipo_recomendacao: 'PENDENCIA_CRITICA',
      criticidade: pendencia.criticidade,
      titulo: `Resolver pendencia SST critica: ${pendencia.titulo}`,
      descricao: pendencia.descricao || 'Pendencia critica sem descricao detalhada.',
      acao_sugerida: 'Acionar responsavel SST e registrar evidencias de resolucao antes de encerrar a pendencia.',
      status: 'ABERTA',
      origem_tipo: 'sst_pendencias_operacionais',
      origem_id: pendencia.id,
      payload_json: JSON.stringify(pendencia.toJSON())
    }, usuario_id));
  }

  return {
    recomendacoes,
    total: recomendacoes.length,
    heatmap
  };
}

module.exports = {
  gerarRecomendacoesSst
};
