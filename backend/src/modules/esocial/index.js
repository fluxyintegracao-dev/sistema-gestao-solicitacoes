'use strict';

module.exports = {
  constants: require('./constants/esocialLayoutConstants'),
  layouts: {
    s1_3: require('./layouts/s1_3'),
    s1_4: require('./layouts/s1_4')
  },
  mappings: {
    s1_3: require('./mappings/s1_3')
  },
  services: {
    mapping: require('./services/esocialMappingService'),
    controlled: require('./services/EsocialSstControlledService'),
    loteBuilder: require('./services/EsocialLoteBuilderService'),
    certificate: require('./certificates/EsocialCertificateService'),
    signer: require('./signers/EsocialXmlSignerService'),
    soap: require('./soap/EsocialSoapClient'),
    validation: require('./validators/EsocialXmlValidationService'),
    restritaTransmission: require('./transmitters/EsocialRestritaTransmissionService')
  }
};
