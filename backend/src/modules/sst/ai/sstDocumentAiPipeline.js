'use strict';

function getSstDocumentAiReadiness() {
  return {
    status: 'PIPELINE_DOCUMENTAL_PREPARADO',
    ia_ativa: false,
    providers_habilitados: [],
    pipelines: [
      {
        codigo: 'OCR_ASO',
        objetivo: 'Extrair data do exame, validade, aptidao, medico, CRM e restricoes de ASO.',
        status: 'CONTRATO_DEFINIDO'
      },
      {
        codigo: 'OCR_CERTIFICADO',
        objetivo: 'Extrair treinamento, carga horaria, instrutor, data e validade de certificados.',
        status: 'CONTRATO_DEFINIDO'
      },
      {
        codigo: 'CLASSIFICACAO_DOCUMENTO_SST',
        objetivo: 'Classificar automaticamente ASO, CAT, laudo, certificado e ficha de EPI.',
        status: 'CONTRATO_DEFINIDO'
      }
    ],
    requisitos_antes_de_ativar: [
      'Politica de privacidade documental aprovada.',
      'Controle de acesso por empresa/obra validado.',
      'Logs de auditoria documental ativos.',
      'Base de documentos reais revisada para amostragem.'
    ]
  };
}

module.exports = {
  getSstDocumentAiReadiness
};
