'use strict';

const CORE_GATEWAY_EVENTS = Object.freeze({
  UNIDADE_STATUS_CHANGED: {
    key: 'UNIDADE_STATUS_CHANGED',
    source: 'CORE',
    target: 'EXPERIENCE',
    description: 'Status publicavel de uma unidade comercial foi alterado.'
  },
  BOLETO_GERADO: {
    key: 'BOLETO_GERADO',
    source: 'CORE',
    target: 'EXPERIENCE',
    description: 'Boleto oficial gerado no Core para um cliente autenticado.'
  },
  CONTRATO_ASSINADO: {
    key: 'CONTRATO_ASSINADO',
    source: 'CORE',
    target: 'EXPERIENCE',
    description: 'Contrato comercial oficial foi assinado.'
  },
  PARCELA_VENCIDA: {
    key: 'PARCELA_VENCIDA',
    source: 'CORE',
    target: 'EXPERIENCE',
    description: 'Parcela oficial entrou em atraso.'
  },
  OBRA_EVOLUIDA: {
    key: 'OBRA_EVOLUIDA',
    source: 'CORE',
    target: 'EXPERIENCE',
    description: 'Evolucao publicavel de obra foi atualizada.'
  },
  LEAD_CONVERTIDO: {
    key: 'LEAD_CONVERTIDO',
    source: 'CORE',
    target: 'EXPERIENCE',
    description: 'Lead do Experience foi convertido em entidade oficial no Core.'
  }
});

function listarEventosCoreGateway() {
  return Object.values(CORE_GATEWAY_EVENTS);
}

module.exports = {
  CORE_GATEWAY_EVENTS,
  listarEventosCoreGateway
};
