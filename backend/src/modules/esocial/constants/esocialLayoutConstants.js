'use strict';

const ESOCIAL_LAYOUTS = {
  S_1_3: {
    layoutVersion: 'S-1.3',
    schemaVersion: 'v_s_01_03_00',
    sourcePackage: '2026-04-27_esquemas_xsd_v_s_01_03_00',
    sourcePath: 'SST ARQUIVOS/2026-04-27_esquemas_xsd_v_s_01_03_00',
    status: 'ATIVO_PARA_MAPEAMENTO',
    transmissionEnabled: false
  },
  S_1_4: {
    layoutVersion: 'S-1.4',
    schemaVersion: null,
    sourcePackage: null,
    sourcePath: null,
    status: 'RESERVADO',
    transmissionEnabled: false
  }
};

const ESOCIAL_SST_EVENTS = {
  S_2210: {
    code: 'S-2210',
    name: 'Comunicacao de Acidente de Trabalho',
    domainSource: 'SstAcidente',
    xsdFile: 'evtCAT.xsd',
    eventNode: 'evtCAT',
    namespace: 'http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_03_00'
  },
  S_2220: {
    code: 'S-2220',
    name: 'Monitoramento da Saude do Trabalhador',
    domainSource: 'SstAso/SstExame',
    xsdFile: 'evtMonit.xsd',
    eventNode: 'evtMonit',
    namespace: 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00'
  },
  S_2240: {
    code: 'S-2240',
    name: 'Condicoes Ambientais do Trabalho - Agentes Nocivos',
    domainSource: 'SstExposicao',
    xsdFile: 'evtExpRisco.xsd',
    eventNode: 'evtExpRisco',
    namespace: 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00'
  }
};

const ESOCIAL_EVENT_STATUS = {
  DRAFT: 'RASCUNHO',
  PREPARED: 'PREPARADO',
  PENDING_DATA: 'PENDENTE_DADOS',
  VALIDATION_FAILED: 'VALIDACAO_FALHOU',
  READY_FOR_XML: 'PRONTO_PARA_XML',
  TRANSMISSION_BLOCKED: 'TRANSMISSAO_BLOQUEADA',
  SENT: 'ENVIADO',
  PROCESSED: 'PROCESSADO',
  REJECTED: 'REJEITADO'
};

module.exports = {
  ESOCIAL_EVENT_STATUS,
  ESOCIAL_LAYOUTS,
  ESOCIAL_SST_EVENTS
};
