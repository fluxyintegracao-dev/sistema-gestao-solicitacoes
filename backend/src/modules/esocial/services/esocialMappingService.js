'use strict';

const s13 = require('../mappings/s1_3');

const MAPPERS_BY_LAYOUT = {
  'S-1.3': s13
};

function getMapper(layoutVersion = 'S-1.3') {
  const mapper = MAPPERS_BY_LAYOUT[layoutVersion];
  if (!mapper) {
    throw new Error(`Layout eSocial nao suportado para mapeamento: ${layoutVersion}`);
  }
  return mapper;
}

module.exports = {
  getMapper
};
