'use strict';

const { mapS2210FromDomain } = require('./s2210.mapper');
const { mapS2220FromDomain } = require('./s2220.mapper');
const { mapS2240FromDomain } = require('./s2240.mapper');

module.exports = {
  mapS2210FromDomain,
  mapS2220FromDomain,
  mapS2240FromDomain
};
