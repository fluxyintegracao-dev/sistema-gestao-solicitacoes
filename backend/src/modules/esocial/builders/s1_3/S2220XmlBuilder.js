'use strict';

const { requiredFields, xmlEscape } = require('../../utils/xmlUtils');

function buildS2220Xml(dto = {}) {
  const contract = dto.domainContract || dto;
  const pendencias = requiredFields(contract, [
    'colaborador.cpf',
    'colaborador.matricula',
    'aso.data_aso',
    'aso.tipo_exame',
    'empresa.cnpj'
  ]);

  const exames = Array.isArray(contract.exames) ? contract.exames : [];
  const examesXml = exames.map((exame) => [
    '      <exame>',
    `        <dtExm>${xmlEscape(exame.data_exame || '')}</dtExm>`,
    `        <procRealizado>${xmlEscape(exame.nome_exame || '')}</procRealizado>`,
    `        <obsProc>${xmlEscape(exame.resultado || '')}</obsProc>`,
    '      </exame>'
  ].join('\n')).join('\n');

  const xml = [
    '<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00">',
    '  <evtMonit Id="">',
    '    <ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>FLUXY</verProc></ideEvento>',
    `    <ideEmpregador><tpInsc>${xmlEscape(process.env.ESOCIAL_EMPREGADOR_TP_INSC || '1')}</tpInsc><nrInsc>${xmlEscape(process.env.ESOCIAL_EMPREGADOR_NR_INSC || contract.empresa?.cnpj || '')}</nrInsc></ideEmpregador>`,
    `    <ideVinculo><cpfTrab>${xmlEscape(contract.colaborador?.cpf || '')}</cpfTrab><matricula>${xmlEscape(contract.colaborador?.matricula || '')}</matricula></ideVinculo>`,
    '    <exMedOcup>',
    `      <tpExameOcup>${xmlEscape(contract.aso?.tipo_exame || '')}</tpExameOcup>`,
    `      <aso><dtAso>${xmlEscape(contract.aso?.data_aso || '')}</dtAso><resAso>${contract.aso?.apto === false ? '2' : '1'}</resAso></aso>`,
    examesXml,
    '    </exMedOcup>',
    '  </evtMonit>',
    '</eSocial>'
  ].filter(Boolean).join('\n');

  return { tipo_evento: 'S-2220', xml, pendencias };
}

module.exports = { buildS2220Xml };
