'use strict';

const SST_AI_READINESS = {
  status: 'PREPARADO_ARQUITETURALMENTE',
  enabled: false,
  futureUseCases: [
    'OCR de ASO e certificados',
    'classificacao automatica de documentos SST',
    'deteccao de pendencias por colaborador',
    'previsao de risco por obra',
    'analise de reincidencia de acidentes',
    'recomendacao de treinamentos por funcao'
  ],
  requiredBeforeEnable: [
    'politica de dados sensiveis',
    'base documental classificada',
    'permissoes revisadas para dados medicos',
    'logs de auditoria',
    'homologacao com dados reais controlados'
  ]
};

module.exports = {
  SST_AI_READINESS
};
