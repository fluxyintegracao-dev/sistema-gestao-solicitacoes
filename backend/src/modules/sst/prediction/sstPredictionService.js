'use strict';

function getSstPredictionReadiness() {
  return {
    status: 'PREPARADO_ARQUITETURALMENTE',
    ia_ativa: false,
    transmissao_esocial_ativa: false,
    contratos: [
      {
        codigo: 'RISCO_ACIDENTE',
        objetivo: 'Estimar risco futuro de acidente por obra, funcao e historico SST.',
        entradas: ['acidentes', 'riscos', 'exposicoes', 'pendencias', 'bloqueios', 'treinamentos'],
        saida_esperada: ['probabilidade', 'criticidade', 'fatores_de_risco']
      },
      {
        codigo: 'RISCO_NAO_CONFORMIDADE',
        objetivo: 'Identificar tendencia de nao conformidade antes do vencimento real.',
        entradas: ['validade_aso', 'validade_treinamento', 'validade_epi', 'documentos', 'pendencias'],
        saida_esperada: ['score', 'pendencias_previstas', 'prazo_acao']
      },
      {
        codigo: 'RISCO_AFASTAMENTO',
        objetivo: 'Preparar leitura futura de afastamentos e recorrencia por colaborador/obra.',
        entradas: ['acidentes', 'cid', 'afastamentos', 'funcao', 'exposicao'],
        saida_esperada: ['probabilidade', 'fatores_de_risco']
      }
    ],
    proximos_passos: [
      'Definir base historica minima para treinamento.',
      'Garantir qualidade dos dados de ASO, EPI, treinamentos e acidentes.',
      'Criar job offline para snapshots anonimizados.',
      'Selecionar provider de IA somente apos governanca de dados aprovada.'
    ]
  };
}

module.exports = {
  getSstPredictionReadiness
};
