'use strict';

const s13Layout = require('../../layouts/s1_3');
const { ESOCIAL_SST_EVENTS } = require('../../constants/esocialLayoutConstants');

function mapS2220FromDomain({ aso = {}, exames = [], colaborador = {}, empresa = {} } = {}) {
  return {
    layout: {
      layoutVersion: s13Layout.layoutVersion,
      schemaVersion: s13Layout.schemaVersion,
      sourcePackage: s13Layout.sourcePackage
    },
    event: ESOCIAL_SST_EVENTS.S_2220,
    source: {
      aso_id: aso.id ?? null,
      colaborador_id: colaborador.id ?? aso.colaborador_id ?? null,
      empresa_id: empresa.id ?? aso.empresa_id ?? null,
      exame_ids: exames.map((exame) => exame.id).filter(Boolean)
    },
    domainContract: {
      colaborador: {
        cpf: colaborador.cpf ?? null,
        matricula: colaborador.matricula ?? null,
        vinculo: colaborador.tipo_vinculo ?? null
      },
      aso: {
        tipo_exame: aso.tipo_exame ?? null,
        data_aso: aso.data_exame ?? null,
        apto: aso.apto ?? null,
        restricoes: aso.restricoes ?? null,
        validade: aso.validade ?? null,
        medico: aso.medico ?? null,
        crm: aso.crm ?? null,
        documento_url: aso.documento_url ?? null
      },
      exames: exames.map((exame) => ({
        id: exame.id ?? null,
        nome_exame: exame.nome_exame ?? null,
        data_exame: exame.data_exame ?? null,
        resultado: exame.resultado ?? null,
        validade: exame.validade ?? null
      }))
    },
    xsdMapping: {
      ideEmpregador: 'empresa.cnpj',
      ideVinculo: 'colaborador.cpf + colaborador.matricula',
      exMedOcup: {
        tpExameOcup: 'aso.tipo_exame',
        aso: {
          dtAso: 'aso.data_aso',
          resAso: 'aso.apto'
        },
        exame: 'exames[]'
      }
    },
    pendingOfficialFields: [
      'codigo do procedimento realizado',
      'ordem do exame',
      'indicador de resultado',
      'UF do CRM',
      'responsavel pelo monitoramento quando diferente do medico',
      'validacao de tabelas oficiais do eSocial'
    ],
    transmission: {
      enabled: false,
      reason: 'Mapper tecnico preparado. Geracao XML, assinatura e envio permanecem bloqueados nesta fase.'
    }
  };
}

module.exports = {
  mapS2220FromDomain
};
