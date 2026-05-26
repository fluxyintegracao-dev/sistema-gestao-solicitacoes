'use strict';

const { Op } = require('sequelize');
const {
  SstWorkflow,
  SstWorkflowAcao,
  SstWorkflowEvento,
  SstWorkflowExecucao,
  SstEventoOperacional
} = require('../../../models');
const { SST_EVENT_TYPES } = require('../constants/sstConstants');
const { registrarEventoSst } = require('../services/sstEventService');

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

async function executarAcaoWorkflow(acao, contexto = {}) {
  const automation = require('../automation/sstAutomationService');
  const scoring = require('../scoring/sstScoringService');
  const recommendations = require('../recommendations/sstRecommendationService');
  const notifications = require('../notifications/sstNotificationService');
  const blocking = require('../blocking/sstBlockingService');
  const params = parseJson(acao.parametros_json, {});
  const colaborador_id = contexto.evento?.colaborador_id || params.colaborador_id || contexto.payload?.colaborador_id;

  switch (acao.tipo_acao) {
    case 'REVISAR_CONFORMIDADE':
      if (!colaborador_id) return { ignorado: true, motivo: 'SEM_COLABORADOR' };
      return automation.automatizarMudancaFuncao({
        colaborador_id,
        motivo: contexto.evento?.tipo_evento || 'WORKFLOW',
        alteracao: contexto.payload,
        usuario_id: contexto.usuario_id
      });
    case 'AVALIAR_BLOQUEIOS':
      if (!colaborador_id) return { ignorado: true, motivo: 'SEM_COLABORADOR' };
      return blocking.avaliarBloqueiosColaborador({ colaborador_id, usuario_id: contexto.usuario_id });
    case 'RECALCULAR_SCORE':
      return scoring.recalcularScoreSst({
        empresa_id: contexto.evento?.empresa_id || params.empresa_id,
        obra_id: contexto.evento?.obra_id || params.obra_id,
        colaborador_id
      });
    case 'GERAR_RECOMENDACOES':
      return recommendations.gerarRecomendacoesSst({
        empresa_id: contexto.evento?.empresa_id || params.empresa_id,
        obra_id: contexto.evento?.obra_id || params.obra_id,
        colaborador_id
      }, contexto.usuario_id);
    case 'GERAR_NOTIFICACOES':
      return notifications.sincronizarNotificacoesSst({ usuario_id: contexto.usuario_id });
    default:
      return { ignorado: true, motivo: 'ACAO_NAO_SUPORTADA', tipo_acao: acao.tipo_acao };
  }
}

async function executarWorkflow(workflow, evento, { usuario_id = null } = {}) {
  const payload = parseJson(evento?.payload, {});
  const execucao = await SstWorkflowExecucao.create({
    workflow_id: workflow.id,
    evento_id: evento?.id || null,
    empresa_id: evento?.empresa_id || workflow.empresa_id || null,
    obra_id: evento?.obra_id || workflow.obra_id || null,
    colaborador_id: evento?.colaborador_id || null,
    status: 'EM_EXECUCAO',
    payload_json: JSON.stringify({ evento, payload }),
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });

  try {
    const acoes = await SstWorkflowAcao.findAll({
      where: { workflow_id: workflow.id, ativo: true },
      order: [['ordem', 'ASC'], ['id', 'ASC']]
    });
    const resultados = [];
    for (const acao of acoes) {
      const resultado = await executarAcaoWorkflow(acao, { evento, payload, usuario_id });
      resultados.push({ acao_id: acao.id, tipo_acao: acao.tipo_acao, resultado });
      await SstWorkflowEvento.create({
        execucao_id: execucao.id,
        workflow_id: workflow.id,
        evento_operacional_id: evento?.id || null,
        tipo_evento: SST_EVENT_TYPES.WORKFLOW_ACAO_EXECUTADA,
        status: 'CONCLUIDO',
        mensagem: `Acao de workflow executada: ${acao.tipo_acao}`,
        payload_json: JSON.stringify({ acao: acao.toJSON(), resultado }),
        criado_por: usuario_id,
        atualizado_por: usuario_id
      });
    }

    await execucao.update({
      status: 'CONCLUIDO',
      resultado: 'OK',
      finalizado_em: new Date(),
      payload_json: JSON.stringify({ evento, payload, resultados }),
      atualizado_por: usuario_id
    });

    await registrarEventoSst({
      empresa_id: execucao.empresa_id,
      obra_id: execucao.obra_id,
      colaborador_id: execucao.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.WORKFLOW_EXECUTADO,
      severidade: 'INFO',
      origem_tipo: 'sst_workflow_execucoes',
      origem_id: execucao.id,
      mensagem: `Workflow SST executado: ${workflow.nome}`,
      payload: { workflow_id: workflow.id, resultados: resultados.length },
      usuario_id
    });

    return execucao;
  } catch (error) {
    await execucao.update({
      status: 'ERRO',
      resultado: 'ERRO',
      erro: error.message,
      finalizado_em: new Date(),
      atualizado_por: usuario_id
    });
    throw error;
  }
}

async function processarEventoWorkflow(eventoId, { usuario_id = null } = {}) {
  const evento = await SstEventoOperacional.findByPk(eventoId);
  if (!evento) return { workflows_executados: 0, motivo: 'EVENTO_NAO_ENCONTRADO' };

  const workflows = await SstWorkflow.findAll({
    where: {
      ativo: true,
      gatilho_evento: { [Op.in]: [evento.tipo_evento, '*'] },
      [Op.and]: [
        { [Op.or]: [{ empresa_id: null }, { empresa_id: evento.empresa_id || 0 }] },
        { [Op.or]: [{ obra_id: null }, { obra_id: evento.obra_id || 0 }] }
      ]
    },
    order: [['prioridade', 'DESC'], ['id', 'ASC']]
  });

  const execucoes = [];
  for (const workflow of workflows) {
    execucoes.push(await executarWorkflow(workflow, evento, { usuario_id }));
  }

  return { workflows_executados: execucoes.length, execucoes };
}

async function processarFilaWorkflowSst({ limit = 50, usuario_id = null } = {}) {
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
      resultado: await processarEventoWorkflow(evento.id, { usuario_id })
    });
  }

  return { eventos_analisados: eventos.length, resultados };
}

module.exports = {
  executarWorkflow,
  processarEventoWorkflow,
  processarFilaWorkflowSst
};
