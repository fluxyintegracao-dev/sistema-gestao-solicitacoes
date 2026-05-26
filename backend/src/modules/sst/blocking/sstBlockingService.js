'use strict';

const { Op } = require('sequelize');
const {
  RhColaborador,
  SstBloqueioOperacional,
  SstPoliticaBloqueio
} = require('../../../models');
const { ValidationError } = require('../../../middlewares/validation');
const { SST_EVENT_TYPES } = require('../constants/sstConstants');
const { analisarConformidadeSst } = require('../compliance/sstComplianceEngine');
const { registrarEventoSst } = require('../services/sstEventService');

function mapCriticidade(severidade) {
  const normalized = String(severidade || '').toUpperCase();
  if (normalized === 'CRITICA') return 'CRITICA';
  if (normalized === 'ALTA') return 'ALTA';
  if (normalized === 'INFO') return 'BAIXA';
  return 'MEDIA';
}

function mapTipoRegra(tipo) {
  const normalized = String(tipo || '').toUpperCase();
  if (normalized.includes('ASO') || normalized.includes('INAPTO')) return 'ASO_VALIDO';
  if (normalized.includes('NR') || normalized.includes('TREINAMENTO')) return 'TREINAMENTO_OBRIGATORIO';
  if (normalized.includes('EPI')) return 'EPI_OBRIGATORIO';
  if (normalized.includes('EXPOSICAO')) return 'EXPOSICAO_COMPATIVEL';
  if (normalized.includes('DOCUMENTO')) return 'DOCUMENTO_VALIDO';
  return 'CONFORMIDADE_GERAL';
}

function defaultTipoBloqueio(pendencia) {
  if (String(pendencia.severidade || '').toUpperCase() === 'CRITICA') return 'BLOQUEIO_CRITICO';
  return 'ALERTA';
}

async function findPolicyForPendencia(pendencia, colaborador) {
  const tipoRegra = mapTipoRegra(pendencia.tipo);
  const where = {
    tipo_regra: tipoRegra,
    ativo: true,
    [Op.or]: [
      { empresa_id: pendencia.empresa_id || colaborador?.empresa_grupo_id || 0 },
      { empresa_id: colaborador?.empresa_grupo_id || pendencia.empresa_id || 0 }
    ]
  };
  const policies = await SstPoliticaBloqueio.findAll({
    where,
    order: [['obra_id', 'DESC'], ['funcao_alvo', 'DESC'], ['updatedAt', 'DESC']],
    limit: 20
  });

  return policies.find((policy) => {
    if (policy.obra_id && Number(policy.obra_id) !== Number(pendencia.obra_id || colaborador?.obra_id || 0)) return false;
    if (policy.funcao_alvo && String(policy.funcao_alvo).trim().toUpperCase() !== String(colaborador?.cargo || '').trim().toUpperCase()) return false;
    return true;
  }) || null;
}

async function avaliarBloqueiosColaborador({ colaborador_id, usuario_id = null } = {}) {
  if (!colaborador_id) throw new ValidationError('Colaborador e obrigatorio para avaliar bloqueios SST.');

  const colaborador = await RhColaborador.findByPk(colaborador_id, {
    attributes: ['id', 'nome', 'cargo', 'empresa_grupo_id', 'obra_id', 'status']
  });
  if (!colaborador) throw new ValidationError('Colaborador nao encontrado para avaliar bloqueios SST.', 404);

  const conformidade = await analisarConformidadeSst({
    colaborador_id,
    empresa_id: colaborador.empresa_grupo_id || undefined,
    obra_id: colaborador.obra_id || undefined
  });

  const bloqueios = [];
  for (const pendencia of conformidade.pendencias || []) {
    const policy = await findPolicyForPendencia(pendencia, colaborador);
    const tipoBloqueio = policy?.tipo_bloqueio || defaultTipoBloqueio(pendencia);
    const criticidade = policy?.criticidade || mapCriticidade(pendencia.severidade);
    const origemTipo = pendencia.origem_tipo || 'sst_conformidade';
    const origemId = pendencia.origem_id || colaborador_id;

    const [bloqueio, created] = await SstBloqueioOperacional.findOrCreate({
      where: {
        colaborador_id,
        origem_tipo: origemTipo,
        origem_id: origemId,
        status: 'ABERTO'
      },
      defaults: {
        empresa_id: pendencia.empresa_id || colaborador.empresa_grupo_id || null,
        obra_id: pendencia.obra_id || colaborador.obra_id || null,
        colaborador_id,
        politica_id: policy?.id || null,
        tipo_bloqueio: tipoBloqueio,
        criticidade,
        motivo: pendencia.mensagem || 'Pendencia SST exige bloqueio operacional.',
        origem_tipo: origemTipo,
        origem_id: origemId,
        status: 'ABERTO',
        payload_json: JSON.stringify({ pendencia, policy_id: policy?.id || null }),
        criado_por: usuario_id,
        atualizado_por: usuario_id
      }
    });

    if (created) {
      await registrarEventoSst({
        empresa_id: bloqueio.empresa_id,
        obra_id: bloqueio.obra_id,
        colaborador_id,
        tipo_evento: SST_EVENT_TYPES.BLOQUEIO_OPERACIONAL_GERADO,
        severidade: tipoBloqueio === 'BLOQUEIO_CRITICO' ? 'CRITICA' : 'ALERTA',
        origem_tipo: 'sst_bloqueios_operacionais',
        origem_id: bloqueio.id,
        mensagem: `Bloqueio SST gerado: ${bloqueio.motivo}`,
        payload: { tipo_bloqueio: tipoBloqueio, criticidade },
        usuario_id
      });
    }

    bloqueios.push(bloqueio);
  }

  return {
    colaborador_id: Number(colaborador_id),
    conformidade,
    bloqueios
  };
}

module.exports = {
  avaliarBloqueiosColaborador
};
