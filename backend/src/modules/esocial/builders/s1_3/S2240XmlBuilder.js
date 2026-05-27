'use strict';

const { requiredFields, xmlEscape } = require('../../utils/xmlUtils');

function buildS2240Xml(dto = {}) {
  const contract = dto.domainContract || dto;
  const pendencias = requiredFields(contract, [
    'colaborador.cpf',
    'colaborador.matricula',
    'exposicao.data_inicio',
    'ambiente.nome',
    'agente.codigo_agente_nocivo',
    'empresa.cnpj'
  ]);

  const xml = [
    '<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00">',
    '  <evtExpRisco Id="">',
    '    <ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>FLUXY</verProc></ideEvento>',
    `    <ideEmpregador><tpInsc>${xmlEscape(process.env.ESOCIAL_EMPREGADOR_TP_INSC || '1')}</tpInsc><nrInsc>${xmlEscape(process.env.ESOCIAL_EMPREGADOR_NR_INSC || contract.empresa?.cnpj || '')}</nrInsc></ideEmpregador>`,
    `    <ideVinculo><cpfTrab>${xmlEscape(contract.colaborador?.cpf || '')}</cpfTrab><matricula>${xmlEscape(contract.colaborador?.matricula || '')}</matricula></ideVinculo>`,
    '    <infoExpRisco>',
    `      <dtIniCondicao>${xmlEscape(contract.exposicao?.data_inicio || '')}</dtIniCondicao>`,
    `      <infoAmb><localAmb>${xmlEscape(contract.ambiente?.nome || '')}</localAmb><dscAmb>${xmlEscape(contract.ambiente?.descricao || '')}</dscAmb></infoAmb>`,
    `      <infoAtiv><dscAtivDes>${xmlEscape(contract.exposicao?.atividade_desempenhada || '')}</dscAtivDes></infoAtiv>`,
    `      <agNoc><codAgNoc>${xmlEscape(contract.agente?.codigo_agente_nocivo || '')}</codAgNoc><dscAgNoc>${xmlEscape(contract.agente?.descricao_agente_nocivo || '')}</dscAgNoc></agNoc>`,
    `      <epcEpi><utilizEPC>${contract.exposicao?.utiliza_epc ? '1' : '0'}</utilizEPC><utilizEPI>${contract.exposicao?.utiliza_epi ? '1' : '0'}</utilizEPI></epcEpi>`,
    '    </infoExpRisco>',
    '  </evtExpRisco>',
    '</eSocial>'
  ].join('\n');

  return { tipo_evento: 'S-2240', xml, pendencias };
}

module.exports = { buildS2240Xml };
