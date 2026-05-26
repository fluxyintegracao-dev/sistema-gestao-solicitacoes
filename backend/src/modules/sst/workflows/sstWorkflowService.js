'use strict';

const {
  RhColaborador,
  SstPendenciaOperacional
} = require('../../../models');
const { ValidationError } = require('../../../middlewares/validation');
const { SST_EVENT_TYPES } = require('../constants/sstConstants');
const { analisarConformidadeSst } = require('../compliance/sstComplianceEngine');
const { registrarEventoSst } = require('../services/sstEventService');
const { avaliarBloqueiosColaborador } = require('../blocking/sstBlockingService');

function criticidadeFromPendencia(pendencia) {
  return String(pendencia.severidade || '').toUpperCase() === 'CRITICA' ? 'CRITICA' : 'MEDIA';
}

async function registrarPendenciasConformidade({ colaborador, conformidade, usuario_id = null }) {
  const criadas = [];
  for (const pendencia of conformidade.pendencias || []) {
    const [registro, created] = await SstPendenciaOperacional.findOrCreate({
      where: {
        colaborador_id: pendencia.colaborador_id || colaborador.id,
        tipo_pendencia: pendencia.tipo,
        origem_tipo: pendencia.origem_tipo || 'sst_conformidade',
        origem_id: pendencia.origem_id || colaborador.id,
        status: 'ABERTA'
      },
      defaults: {
        empresa_id: pendencia.empresa_id || colaborador.empresa_grupo_id || null,
        obra_id: pendencia.obra_id || colaborador.obra_id || null,
        colaborador_id: pendencia.colaborador_id || colaborador.id,
        tipo_pendencia: pendencia.tipo,
        criticidade: criticidadeFromPendencia(pendencia),
        status: 'ABERTA',
        titulo: pendencia.tipo,
        descricao: pendencia.mensagem,
        origem_tipo: pendencia.origem_tipo || 'sst_conformidade',
        origem_id: pendencia.origem_id || colaborador.id,
        payload_json: JSON.stringify(pendencia),
        criado_por: usuario_id,
        atualizado_por: usuario_id
      }
    });

    if (created) {
      criadas.push(registro);
      await registrarEventoSst({
        empresa_id: registro.empresa_id,
        obra_id: registro.obra_id,
        colaborador_id: registro.colaborador_id,
        tipo_evento: SST_EVENT_TYPES.PENDENCIA_OPERACIONAL_GERADA,
        severidade: registro.criticidade === 'CRITICA' ? 'CRITICA' : 'ALERTA',
        origem_tipo: 'sst_pendencias_operacionais',
        origem_id: registro.id,
        mensagem: `Pendencia operacional SST gerada: ${registro.titulo}`,
        payload: pendencia,
        usuario_id
      });
    }
  }
  return criadas;
}

async function revisarConformidadeColaborador({ colaborador_id, motivo = 'REVISAO_MANUAL', alteracao = null, usuario_id = null } = {}) {
  if (!colaborador_id) throw new ValidationError('Colaborador e obrigatorio para revisao SST.');
  const colaborador = await RhColaborador.findByPk(colaborador_id, {
    attributes: ['id', 'nome', 'cargo', 'empresa_grupo_id', 'obra_id', 'status']
  });
  if (!colaborador) throw new ValidationError('Colaborador nao encontrado para revisao SST.', 404);

  if (alteracao) {
    await registrarEventoSst({
      empresa_id: colaborador.empresa_grupo_id || null,
      obra_id: colaborador.obra_id || null,
      colaborador_id,
      tipo_evento: SST_EVENT_TYPES.FUNCAO_ALTERADA,
      severidade: 'ALERTA',
      origem_tipo: 'rh_colaboradores',
      origem_id: colaborador_id,
      mensagem: 'Mudanca cadastral do colaborador exige revisao SST.',
      payload: alteracao,
      usuario_id
    });
  }

  await registrarEventoSst({
    empresa_id: colaborador.empresa_grupo_id || null,
    obra_id: colaborador.obra_id || null,
    colaborador_id,
    tipo_evento: SST_EVENT_TYPES.REVISAO_CONFORMIDADE_OBRIGATORIA,
    severidade: 'ALERTA',
    origem_tipo: 'rh_colaboradores',
    origem_id: colaborador_id,
    mensagem: `Revisao de conformidade SST solicitada: ${motivo}.`,
    payload: { motivo, alteracao },
    usuario_id
  });

  const conformidade = await analisarConformidadeSst({
    colaborador_id,
    empresa_id: colaborador.empresa_grupo_id || undefined,
    obra_id: colaborador.obra_id || undefined
  });
  const pendencias_criadas = await registrarPendenciasConformidade({ colaborador, conformidade, usuario_id });
  const bloqueios = await avaliarBloqueiosColaborador({ colaborador_id, usuario_id });

  return {
    colaborador,
    conformidade,
    pendencias_criadas,
    bloqueios: bloqueios.bloqueios
  };
}

module.exports = {
  revisarConformidadeColaborador
};
