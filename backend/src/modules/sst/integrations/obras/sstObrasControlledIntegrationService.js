'use strict';

const { ValidationError } = require('../../../../middlewares/validation');
const { SST_FEATURE_FLAGS } = require('../../constants/sstConstants');
const { isSstFeatureEnabled } = require('../../feature-flags/sstFeatureFlagsService');
const { logIntegration } = require('../../logs/sstOperationalLogService');
const { gerarVisaoOperacionalObraSst } = require('./sstObraIntegrationService');

async function processarIntegracaoObraSst({ obra_id, usuario_id = null } = {}) {
  if (!obra_id) throw new ValidationError('Obra e obrigatoria para integracao controlada SST/Obras.');

  const baseLog = {
    integracao: 'OBRAS',
    tipo_evento: 'SINCRONIZAR_VISAO_OPERACIONAL_OBRA',
    obra_id,
    origem_tipo: 'obras',
    origem_id: obra_id,
    criado_por: usuario_id
  };

  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.INTEGRACAO_OBRAS);
  if (!enabled) {
    await logIntegration({
      ...baseLog,
      status: 'IGNORADO_FLAG_DESATIVADA',
      mensagem: 'Integracao SST/Obras bloqueada por feature flag.'
    });
    return { executado: false, status: 'IGNORADO_FLAG_DESATIVADA', flag: SST_FEATURE_FLAGS.INTEGRACAO_OBRAS };
  }

  try {
    const resultado = await gerarVisaoOperacionalObraSst(obra_id);
    await logIntegration({
      ...baseLog,
      status: 'CONCLUIDO',
      mensagem: 'Integracao SST/Obras processada com sucesso.',
      payload_json: { resumo: resultado }
    });
    return { executado: true, status: 'CONCLUIDO', resultado };
  } catch (error) {
    await logIntegration({
      ...baseLog,
      status: 'ERRO',
      mensagem: 'Erro ao processar integracao SST/Obras.',
      erro: error.message
    });
    throw error;
  }
}

module.exports = {
  processarIntegracaoObraSst
};
