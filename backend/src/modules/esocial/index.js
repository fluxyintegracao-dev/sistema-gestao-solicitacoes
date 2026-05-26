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
    mapping: require('./services/esocialMappingService')
  }
};
