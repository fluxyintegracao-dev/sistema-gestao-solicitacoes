'use strict';

const { ESOCIAL_LAYOUTS, ESOCIAL_SST_EVENTS } = require('../../constants/esocialLayoutConstants');

const layout = {
  ...ESOCIAL_LAYOUTS.S_1_3,
  events: [
    ESOCIAL_SST_EVENTS.S_2210,
    ESOCIAL_SST_EVENTS.S_2220,
    ESOCIAL_SST_EVENTS.S_2240
  ],
  auxiliarySchemas: [
    'evtTabEstab.xsd',
    'evtTabLotacao.xsd',
    'evtAdmissao.xsd',
    'evtTSVInicio.xsd',
    'tipos.xsd',
    'xmldsig-core-schema.xsd'
  ]
};

module.exports = layout;
