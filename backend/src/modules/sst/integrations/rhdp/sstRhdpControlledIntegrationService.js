'use strict';

const { ValidationError } = require('../../../../middlewares/validation');
const { SST_FEATURE_FLAGS } = require('../../constants/sstConstants');
const { isSstFeatureEnabled } = require('../../feature-flags/sstFeatureFlagsService');
const { logIntegration } = require('../../logs/sstOperationalLogService');
const {
  registrarAdmissaoSst,
  registrarDesligamentoSst,
  registrarMudancaObraSst
} = require('../rh/sstRhIntegrationService');
const { automatizarMudancaFuncao } = require('../../automation/sstAutomationService');

const EVENTOS_RHDP = new Set(['ADMISSAO', 'MUDANCA_FUNCAO', 'MUDANCA_CARGO', 'MUDANCA_SETOR', 'MUDANCA_OBRA', 'DESLIGAMENTO']);

async function processarEventoRhdpSst({
  tipo_evento,
  colaborador_id,
  alteracao = {},
  usuario_id = null
} = {}) {
  const tipo = String(tipo_evento || '').trim().toUpperCase();
  if (!EVENTOS_RHDP.has(tipo)) {
    throw new ValidationError('Tipo de evento RH/DP invalido para integracao SST.');
  }
  if (!colaborador_id) throw new ValidationError('Colaborador e obrigatorio para integracao RH/DP SST.');

  const baseLog = {
    integracao: 'RHDP',
    tipo_evento: tipo,
    colaborador_id,
    origem_tipo: 'rh_colaboradores',
    origem_id: colaborador_id,
    criado_por: usuario_id,
    payload_json: { alteracao }
  };

  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.INTEGRACAO_RHDP);
  if (!enabled) {
    await logIntegration({
      ...baseLog,
      status: 'IGNORADO_FLAG_DESATIVADA',
      mensagem: 'Integracao SST/RHDP bloqueada por feature flag.'
    });
    return { executado: false, status: 'IGNORADO_FLAG_DESATIVADA', flag: SST_FEATURE_FLAGS.INTEGRACAO_RHDP };
  }

  try {
    let resultado;
    if (tipo === 'ADMISSAO') {
      resultado = await registrarAdmissaoSst({ colaborador_id, usuario_id });
    } else if (tipo === 'DESLIGAMENTO') {
      resultado = await registrarDesligamentoSst({ colaborador_id, usuario_id });
    } else if (tipo === 'MUDANCA_OBRA') {
      resultado = await registrarMudancaObraSst({
        colaborador_id,
        obra_anterior_id: alteracao.obra_anterior_id || null,
        obra_nova_id: alteracao.obra_nova_id || null,
        usuario_id
      });
    } else {
      resultado = await automatizarMudancaFuncao({
        colaborador_id,
        motivo: tipo,
        alteracao,
        usuario_id
      });
    }

    await logIntegration({
      ...baseLog,
      status: 'CONCLUIDO',
      mensagem: `Integracao SST/RHDP processada para ${tipo}.`,
      payload_json: { alteracao, resultado }
    });
    return { executado: true, status: 'CONCLUIDO', resultado };
  } catch (error) {
    await logIntegration({
      ...baseLog,
      status: 'ERRO',
      mensagem: `Erro ao processar integracao SST/RHDP para ${tipo}.`,
      erro: error.message
    });
    throw error;
  }
}

module.exports = {
  processarEventoRhdpSst
};
