'use strict';

const { gerarStatusHardeningSst } = require('../hardening/sstHardeningService');
const { gerarChecklistHomologacaoSst } = require('../homologation/sstHomologationService');
const { gerarObservabilidadeSst } = require('../observability/sstObservabilityService');
const { gerarStatusRolloutSst } = require('../rollout/sstRolloutService');
const { gerarResumoTelemetriaSst } = require('../telemetry/sstTelemetryService');

function calcularReadiness({ rollout, telemetria, observabilidade, hardening, checklist }) {
  const pendencias = [];
  if (rollout?.readiness?.nivel !== 'PRONTO_PILOTO') pendencias.push('Rollout assistido ainda nao esta pronto para piloto.');
  if (telemetria?.saude?.nivel !== 'CONTROLADO') pendencias.push('Telemetria possui falhas ou alertas criticos.');
  if (observabilidade?.saude_operacional?.nivel !== 'CONTROLADO') pendencias.push('Observabilidade indica erros operacionais.');
  if (hardening?.status?.nivel !== 'CONTROLADO') pendencias.push('Hardening operacional possui pendencias.');
  if (checklist?.status_geral === 'BLOQUEADO') pendencias.push('Checklist de homologacao SST esta bloqueado.');

  return {
    nivel: pendencias.length ? 'ASSISTIDO_COM_PENDENCIAS' : 'PRONTO_OPERACAO_ASSISTIDA',
    pode_ir_para_producao_controlada: pendencias.length === 0,
    pendencias
  };
}

async function gerarMonitoramentoProducaoSst(query = {}) {
  const [rollout, telemetria, observabilidade, hardening, checklist] = await Promise.all([
    gerarStatusRolloutSst(query),
    gerarResumoTelemetriaSst(query),
    gerarObservabilidadeSst(query),
    gerarStatusHardeningSst(query),
    gerarChecklistHomologacaoSst()
  ]);

  return {
    filtros: {
      empresa_id: query.empresa_id || null,
      obra_id: query.obra_id || null,
      colaborador_id: query.colaborador_id || null
    },
    readiness: calcularReadiness({ rollout, telemetria, observabilidade, hardening, checklist }),
    rollout,
    telemetria,
    observabilidade: {
      cards: observabilidade.cards,
      status: observabilidade.status,
      saude_operacional: observabilidade.saude_operacional
    },
    hardening,
    checklist,
    bloqueios_produto: {
      esocial_transmissao_real: true,
      motivo: 'Transmissao real eSocial permanece bloqueada por decisao arquitetural desta fase.'
    }
  };
}

module.exports = {
  gerarMonitoramentoProducaoSst
};
