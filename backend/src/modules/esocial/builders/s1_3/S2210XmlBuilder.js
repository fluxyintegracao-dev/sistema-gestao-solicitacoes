'use strict';

const { requiredFields, xmlEscape } = require('../../utils/xmlUtils');

function buildS2210Xml(dto = {}) {
  const contract = dto.domainContract || dto;
  const pendencias = requiredFields(contract, [
    'colaborador.cpf',
    'colaborador.matricula',
    'acidente.data_acidente',
    'acidente.tipo_acidente',
    'empresa.cnpj'
  ]);

  const xml = [
    '<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_03_00">',
    '  <evtCAT Id="">',
    '    <ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>FLUXY</verProc></ideEvento>',
    `    <ideEmpregador><tpInsc>${xmlEscape(process.env.ESOCIAL_EMPREGADOR_TP_INSC || '1')}</tpInsc><nrInsc>${xmlEscape(process.env.ESOCIAL_EMPREGADOR_NR_INSC || contract.empresa?.cnpj || '')}</nrInsc></ideEmpregador>`,
    `    <ideVinculo><cpfTrab>${xmlEscape(contract.colaborador?.cpf || '')}</cpfTrab><matricula>${xmlEscape(contract.colaborador?.matricula || '')}</matricula></ideVinculo>`,
    '    <cat>',
    `      <dtAcid>${xmlEscape(contract.acidente?.data_acidente || '')}</dtAcid>`,
    `      <tpAcid>${xmlEscape(contract.acidente?.tipo_acidente || '')}</tpAcid>`,
    `      <localAcidente>${xmlEscape(contract.acidente?.local || '')}</localAcidente>`,
    `      <obsCAT>${xmlEscape(contract.acidente?.descricao || '')}</obsCAT>`,
    `      <houveAfast>${contract.acidente?.afastamento ? 'S' : 'N'}</houveAfast>`,
    '    </cat>',
    '  </evtCAT>',
    '</eSocial>'
  ].join('\n');

  return { tipo_evento: 'S-2210', xml, pendencias };
}

module.exports = { buildS2210Xml };
