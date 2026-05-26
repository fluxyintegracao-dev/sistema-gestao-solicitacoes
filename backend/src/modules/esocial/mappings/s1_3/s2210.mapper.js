'use strict';

const s13Layout = require('../../layouts/s1_3');
const { ESOCIAL_SST_EVENTS } = require('../../constants/esocialLayoutConstants');

function mapS2210FromDomain({ acidente = {}, colaborador = {}, empresa = {}, obra = {} } = {}) {
  return {
    layout: {
      layoutVersion: s13Layout.layoutVersion,
      schemaVersion: s13Layout.schemaVersion,
      sourcePackage: s13Layout.sourcePackage
    },
    event: ESOCIAL_SST_EVENTS.S_2210,
    source: {
      acidente_id: acidente.id ?? null,
      colaborador_id: colaborador.id ?? acidente.colaborador_id ?? null,
      empresa_id: empresa.id ?? acidente.empresa_id ?? null,
      obra_id: obra.id ?? acidente.obra_id ?? null
    },
    domainContract: {
      colaborador: {
        cpf: colaborador.cpf ?? null,
        matricula: colaborador.matricula ?? null,
        vinculo: colaborador.tipo_vinculo ?? null
      },
      acidente: {
        data_acidente: acidente.data_ocorrencia ?? null,
        tipo_acidente: acidente.tipo ?? null,
        local: acidente.local ?? null,
        descricao: acidente.descricao ?? null,
        gravidade: acidente.gravidade ?? null,
        afastamento: acidente.afastamento ?? null,
        dias_afastamento: acidente.dias_afastamento ?? null,
        cat_emitida: acidente.cat_emitida ?? null
      },
      empresa: {
        cnpj: empresa.cnpj ?? null,
        razao_social: empresa.razao_social ?? empresa.nome ?? null
      },
      obra: {
        cno: obra.cno ?? null,
        codigo: obra.codigo ?? null,
        nome: obra.nome ?? null
      }
    },
    xsdMapping: {
      ideEmpregador: 'empresa.cnpj',
      ideVinculo: 'colaborador.cpf + colaborador.matricula',
      cat: {
        dtAcid: 'acidente.data_acidente',
        tpAcid: 'acidente.tipo_acidente',
        localAcidente: 'acidente.local',
        obsCAT: 'acidente.descricao',
        houveAfast: 'acidente.afastamento'
      }
    },
    pendingOfficialFields: [
      'codSitGeradora',
      'codAgntCausador',
      'codParteAting',
      'lateralidade',
      'codCID',
      'dados completos do atestado medico',
      'validacao de tabelas oficiais do eSocial'
    ],
    transmission: {
      enabled: false,
      reason: 'Mapper tecnico preparado. Geracao XML, assinatura e envio permanecem bloqueados nesta fase.'
    }
  };
}

module.exports = {
  mapS2210FromDomain
};
