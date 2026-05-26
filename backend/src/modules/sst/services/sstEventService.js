'use strict';

const { Op } = require('sequelize');
const {
  SstAso,
  SstDocumento,
  SstEpiEntrega,
  SstEventoOperacional,
  SstExame,
  SstRisco,
  SstTreinamento
} = require('../../../models');
const { SST_EVENT_TYPES, SST_VALIDITY_ALERT_DAYS } = require('../constants/sstConstants');
const { getSstConfig } = require('./sstConfigService');

async function registrarEventoSst({
  empresa_id = null,
  obra_id = null,
  colaborador_id = null,
  tipo_evento,
  severidade = 'INFO',
  origem_tipo = null,
  origem_id = null,
  mensagem,
  payload = null,
  usuario_id = null,
  transaction = null
}) {
  if (!tipo_evento || !mensagem) return null;

  return SstEventoOperacional.create({
    empresa_id,
    obra_id,
    colaborador_id,
    tipo_evento,
    severidade,
    origem_tipo,
    origem_id,
    status: 'ABERTO',
    mensagem,
    payload: payload ? JSON.stringify(payload) : null,
    criado_por: usuario_id,
    atualizado_por: usuario_id
  }, { transaction });
}

async function registrarEventoSstUmaVez(evento, transaction = null) {
  if (!evento?.tipo_evento || !evento?.mensagem || !evento?.origem_tipo || !evento?.origem_id) return null;

  const [registro, created] = await SstEventoOperacional.findOrCreate({
    where: {
      tipo_evento: evento.tipo_evento,
      origem_tipo: evento.origem_tipo,
      origem_id: evento.origem_id,
      status: 'ABERTO'
    },
    defaults: {
      empresa_id: evento.empresa_id || null,
      obra_id: evento.obra_id || null,
      colaborador_id: evento.colaborador_id || null,
      severidade: evento.severidade || 'INFO',
      mensagem: evento.mensagem,
      payload: evento.payload ? JSON.stringify(evento.payload) : null,
      criado_por: evento.usuario_id || null,
      atualizado_por: evento.usuario_id || null
    },
    transaction
  });

  return created ? registro : null;
}

function hojeIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function limiteIso(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || SST_VALIDITY_ALERT_DAYS));
  return date.toISOString().slice(0, 10);
}

async function gerarEventosVencimentoSst({ usuario_id = null } = {}) {
  const config = await getSstConfig();
  const dias = Number(config?.dias_alerta_validade || SST_VALIDITY_ALERT_DAYS);
  const inicio = hojeIso();
  const fim = limiteIso(dias);
  const payloadBase = { inicio, fim, dias_alerta_validade: dias };

  const [asos, asosVencidos, exames, examesVencidos, epis, episVencidos, treinamentos, treinamentosVencidos, documentosVencendo, documentosExpirados, riscosCriticos] = await Promise.all([
    SstAso.findAll({ where: { validade: { [Op.between]: [inicio, fim] } }, limit: 500 }),
    SstAso.findAll({ where: { validade: { [Op.lt]: inicio } }, limit: 500 }),
    SstExame.findAll({ where: { validade: { [Op.between]: [inicio, fim] } }, limit: 500 }),
    SstExame.findAll({ where: { validade: { [Op.lt]: inicio } }, limit: 500 }),
    SstEpiEntrega.findAll({ where: { validade: { [Op.between]: [inicio, fim] } }, limit: 500 }),
    SstEpiEntrega.findAll({ where: { validade: { [Op.lt]: inicio } }, limit: 500 }),
    SstTreinamento.findAll({ where: { validade: { [Op.between]: [inicio, fim] } }, limit: 500 }),
    SstTreinamento.findAll({ where: { validade: { [Op.lt]: inicio } }, limit: 500 }),
    SstDocumento.findAll({ where: { validade: { [Op.between]: [inicio, fim] } }, limit: 500 }),
    SstDocumento.findAll({ where: { validade: { [Op.lt]: inicio } }, limit: 500 }),
    SstRisco.findAll({ where: { severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true }, limit: 500 })
  ]);

  const eventos = [
    ...asos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.ASO_VENCENDO,
      severidade: 'ALERTA',
      origem_tipo: 'sst_aso',
      origem_id: item.id,
      mensagem: `ASO vencendo em ${item.validade}.`,
      payload: { ...payloadBase, validade: item.validade },
      usuario_id
    })),
    ...asosVencidos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.ASO_VENCIDO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_aso',
      origem_id: item.id,
      mensagem: `ASO vencido em ${item.validade}.`,
      payload: { ...payloadBase, validade: item.validade },
      usuario_id
    })),
    ...exames.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.EXAME_VENCENDO,
      severidade: 'ALERTA',
      origem_tipo: 'sst_exames',
      origem_id: item.id,
      mensagem: `Exame ocupacional vencendo em ${item.validade}.`,
      payload: { ...payloadBase, validade: item.validade, tipo_exame: item.tipo_exame, nome_exame: item.nome_exame },
      usuario_id
    })),
    ...examesVencidos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.EXAME_VENCIDO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_exames',
      origem_id: item.id,
      mensagem: `Exame ocupacional vencido em ${item.validade}.`,
      payload: { ...payloadBase, validade: item.validade, tipo_exame: item.tipo_exame, nome_exame: item.nome_exame },
      usuario_id
    })),
    ...epis.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.EPI_VENCENDO,
      severidade: 'ALERTA',
      origem_tipo: 'sst_epi_entregas',
      origem_id: item.id,
      mensagem: `EPI vencendo em ${item.validade}: ${item.epi_nome || 'EPI sem nome informado'}.`,
      payload: { ...payloadBase, validade: item.validade, epi_nome: item.epi_nome, ca: item.ca },
      usuario_id
    })),
    ...episVencidos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.EPI_VENCIDO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_epi_entregas',
      origem_id: item.id,
      mensagem: `EPI vencido em ${item.validade}: ${item.epi_nome || 'EPI sem nome informado'}.`,
      payload: { ...payloadBase, validade: item.validade, epi_nome: item.epi_nome, ca: item.ca },
      usuario_id
    })),
    ...treinamentos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.TREINAMENTO_VENCENDO,
      severidade: 'ALERTA',
      origem_tipo: 'sst_treinamentos',
      origem_id: item.id,
      mensagem: `Treinamento vencendo em ${item.validade}: ${item.nome || item.codigo || 'treinamento sem nome informado'}.`,
      payload: { ...payloadBase, validade: item.validade, codigo: item.codigo, nome: item.nome },
      usuario_id
    })),
    ...treinamentosVencidos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.TREINAMENTO_VENCIDO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_treinamentos',
      origem_id: item.id,
      mensagem: `Treinamento vencido em ${item.validade}: ${item.nome || item.codigo || 'treinamento sem nome informado'}.`,
      payload: { ...payloadBase, validade: item.validade, codigo: item.codigo, nome: item.nome },
      usuario_id
    })),
    ...documentosVencendo.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.DOCUMENTO_VENCENDO,
      severidade: 'ALERTA',
      origem_tipo: 'sst_documentos',
      origem_id: item.id,
      mensagem: `Documento SST vencendo em ${item.validade}: ${item.titulo}.`,
      payload: { ...payloadBase, validade: item.validade, tipo_documento: item.tipo_documento },
      usuario_id
    })),
    ...documentosExpirados.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      colaborador_id: item.colaborador_id,
      tipo_evento: SST_EVENT_TYPES.DOCUMENTO_EXPIRADO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_documentos',
      origem_id: item.id,
      mensagem: `Documento SST expirado em ${item.validade}: ${item.titulo}.`,
      payload: { ...payloadBase, validade: item.validade, tipo_documento: item.tipo_documento },
      usuario_id
    })),
    ...riscosCriticos.map((item) => ({
      empresa_id: item.empresa_id,
      obra_id: item.obra_id,
      tipo_evento: SST_EVENT_TYPES.RISCO_CRITICO_IDENTIFICADO,
      severidade: 'CRITICA',
      origem_tipo: 'sst_riscos',
      origem_id: item.id,
      mensagem: `Risco critico identificado: ${item.nome}.`,
      payload: { severidade: item.severidade, categoria: item.categoria },
      usuario_id
    }))
  ];

  let criados = 0;
  for (const evento of eventos) {
    const registro = await registrarEventoSstUmaVez(evento);
    if (registro) criados += 1;
  }

  return {
    dias_alerta_validade: dias,
    analisados: {
      aso: asos.length,
      aso_vencidos: asosVencidos.length,
      exames: exames.length,
      exames_vencidos: examesVencidos.length,
      epi: epis.length,
      epi_vencidos: episVencidos.length,
      treinamentos: treinamentos.length,
      treinamentos_vencidos: treinamentosVencidos.length,
      documentos_vencendo: documentosVencendo.length,
      documentos_expirados: documentosExpirados.length,
      riscos_criticos: riscosCriticos.length
    },
    eventos_criados: criados,
    eventos_existentes: Math.max(0, eventos.length - criados)
  };
}

module.exports = {
  gerarEventosVencimentoSst,
  registrarEventoSst
};
