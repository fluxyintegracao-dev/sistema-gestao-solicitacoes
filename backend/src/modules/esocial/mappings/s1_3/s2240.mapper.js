'use strict';

const s13Layout = require('../../layouts/s1_3');
const { ESOCIAL_SST_EVENTS } = require('../../constants/esocialLayoutConstants');

function mapS2240FromDomain({
  exposicao = {},
  ambiente = {},
  agenteNocivo = {},
  colaborador = {},
  empresa = {},
  obra = {}
} = {}) {
  return {
    layout: {
      layoutVersion: s13Layout.layoutVersion,
      schemaVersion: s13Layout.schemaVersion,
      sourcePackage: s13Layout.sourcePackage
    },
    event: ESOCIAL_SST_EVENTS.S_2240,
    source: {
      exposicao_id: exposicao.id ?? null,
      ambiente_id: ambiente.id ?? exposicao.ambiente_id ?? null,
      agente_nocivo_id: agenteNocivo.id ?? exposicao.agente_nocivo_id ?? null,
      colaborador_id: colaborador.id ?? exposicao.colaborador_id ?? null,
      empresa_id: empresa.id ?? exposicao.empresa_id ?? null,
      obra_id: obra.id ?? exposicao.obra_id ?? null
    },
    domainContract: {
      colaborador: {
        cpf: colaborador.cpf ?? null,
        matricula: colaborador.matricula ?? null,
        cargo: colaborador.cargo ?? null,
        setor_id: colaborador.setor_id ?? null
      },
      ambiente: {
        nome: ambiente.nome ?? null,
        tipo_ambiente: ambiente.tipo_ambiente ?? null,
        descricao: ambiente.descricao ?? null,
        local_amb: ambiente.local_amb ?? null,
        esocial_tp_insc: ambiente.esocial_tp_insc ?? null,
        esocial_nr_insc: ambiente.esocial_nr_insc ?? null
      },
      exposicao: {
        data_inicio: exposicao.data_inicio ?? null,
        data_fim: exposicao.data_fim ?? null,
        atividade_desempenhada: exposicao.atividade_desempenhada ?? null,
        utiliza_epc: exposicao.utiliza_epc ?? null,
        epc_eficaz: exposicao.epc_eficaz ?? null,
        utiliza_epi: exposicao.utiliza_epi ?? null,
        epi_eficaz: exposicao.epi_eficaz ?? null,
        epi_ca: exposicao.epi_ca ?? null
      },
      agente: {
        codigo_agente_nocivo: exposicao.codigo_agente_nocivo ?? agenteNocivo.codigo_esocial ?? null,
        descricao_agente_nocivo: exposicao.descricao_agente_nocivo ?? agenteNocivo.nome ?? null,
        intensidade: exposicao.intensidade ?? agenteNocivo.intensidade ?? null,
        unidade_medida: exposicao.unidade_medida ?? agenteNocivo.unidade ?? null,
        tecnica_medicao: exposicao.tecnica_medicao ?? agenteNocivo.tecnica_avaliacao ?? null,
        limite_tolerancia: exposicao.limite_tolerancia ?? agenteNocivo.limite_tolerancia ?? null
      }
    },
    xsdMapping: {
      ideEmpregador: 'empresa.cnpj',
      ideVinculo: 'colaborador.cpf + colaborador.matricula',
      infoExpRisco: {
        dtIniCondicao: 'exposicao.data_inicio',
        dtFimCondicao: 'exposicao.data_fim',
        infoAmb: 'ambiente',
        infoAtiv: 'exposicao.atividade_desempenhada',
        agNoc: 'agente',
        epcEpi: 'exposicao.epc/epi',
        respReg: 'exposicao.responsavel_tecnico'
      }
    },
    pendingOfficialFields: [
      'codAgNoc oficial',
      'tpAval',
      'docAval',
      'dados completos de EPC/EPI conforme tabela oficial',
      'responsavel tecnico com conselho profissional',
      'validacao de tabelas oficiais do eSocial'
    ],
    transmission: {
      enabled: false,
      reason: 'Mapper tecnico preparado. Geracao XML, assinatura e envio permanecem bloqueados nesta fase.'
    }
  };
}

module.exports = {
  mapS2240FromDomain
};
