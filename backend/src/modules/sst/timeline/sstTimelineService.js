'use strict';

const {
  RhColaborador,
  SstAcidente,
  SstAso,
  SstBloqueioOperacional,
  SstComplianceScore,
  SstEpiEntrega,
  SstEventoOperacional,
  SstExame,
  SstExposicao,
  SstPendenciaOperacional,
  SstTreinamento
} = require('../../../models');
const { ValidationError } = require('../../../middlewares/validation');

function toPlain(row) {
  return typeof row?.toJSON === 'function' ? row.toJSON() : row;
}

function pushTimeline(list, type, row, dateField, title, description = null) {
  const plain = toPlain(row);
  list.push({
    tipo: type,
    data: plain?.[dateField] || plain?.createdAt || plain?.updatedAt || null,
    titulo: title,
    descricao: description,
    origem_id: plain?.id || null,
    origem: plain
  });
}

async function gerarTimelineColaborador(colaborador_id) {
  if (!colaborador_id) throw new ValidationError('Colaborador e obrigatorio para timeline SST.');

  const colaborador = await RhColaborador.findByPk(colaborador_id, {
    attributes: ['id', 'nome', 'cpf', 'matricula', 'cargo', 'status', 'empresa_grupo_id', 'obra_id', 'data_admissao', 'data_inicio']
  });
  if (!colaborador) throw new ValidationError('Colaborador nao encontrado para timeline SST.', 404);

  const where = { colaborador_id };
  const [
    asos,
    exames,
    treinamentos,
    epis,
    acidentes,
    exposicoes,
    eventos,
    bloqueios,
    pendencias,
    scores
  ] = await Promise.all([
    SstAso.findAll({ where, order: [['data_exame', 'DESC']], limit: 100 }),
    SstExame.findAll({ where, order: [['data_exame', 'DESC']], limit: 100 }),
    SstTreinamento.findAll({ where, order: [['data_inicio', 'DESC'], ['createdAt', 'DESC']], limit: 100 }),
    SstEpiEntrega.findAll({ where, order: [['entrega_em', 'DESC']], limit: 100 }),
    SstAcidente.findAll({ where, order: [['data_ocorrencia', 'DESC']], limit: 100 }),
    SstExposicao.findAll({ where, order: [['data_inicio', 'DESC']], limit: 100 }),
    SstEventoOperacional.findAll({ where, order: [['createdAt', 'DESC']], limit: 150 }),
    SstBloqueioOperacional.findAll({ where, order: [['createdAt', 'DESC']], limit: 100 }),
    SstPendenciaOperacional.findAll({ where, order: [['createdAt', 'DESC']], limit: 100 }),
    SstComplianceScore.findAll({ where, order: [['calculado_em', 'DESC']], limit: 20 })
  ]);

  const timeline = [];
  const dataAdmissao = colaborador.data_admissao || colaborador.data_inicio;
  if (dataAdmissao) {
    timeline.push({
      tipo: 'ADMISSAO',
      data: dataAdmissao,
      titulo: 'Admissao',
      descricao: `Colaborador admitido na funcao/cargo ${colaborador.cargo || 'nao informado'}.`,
      origem_id: colaborador.id,
      origem: toPlain(colaborador)
    });
  }

  asos.forEach((row) => pushTimeline(timeline, 'ASO', row, 'data_exame', `ASO ${row.tipo_exame}`, row.apto === false ? 'Inapto' : 'Apto'));
  exames.forEach((row) => pushTimeline(timeline, 'EXAME', row, 'data_exame', row.nome_exame || row.tipo_exame, row.resultado));
  treinamentos.forEach((row) => pushTimeline(timeline, 'TREINAMENTO', row, 'data_inicio', row.nome || row.codigo, row.validade ? `Validade ${row.validade}` : null));
  epis.forEach((row) => pushTimeline(timeline, 'EPI', row, 'entrega_em', row.epi_nome, row.ca ? `CA ${row.ca}` : null));
  acidentes.forEach((row) => pushTimeline(timeline, 'ACIDENTE', row, 'data_ocorrencia', `${row.tipo} - ${row.gravidade}`, row.descricao));
  exposicoes.forEach((row) => pushTimeline(timeline, 'EXPOSICAO', row, 'data_inicio', row.descricao_agente_nocivo || 'Exposicao ocupacional', row.atividade_desempenhada));
  eventos.forEach((row) => pushTimeline(timeline, 'EVENTO', row, 'createdAt', row.tipo_evento, row.mensagem));
  bloqueios.forEach((row) => pushTimeline(timeline, 'BLOQUEIO', row, 'createdAt', row.tipo_bloqueio, row.motivo));
  pendencias.forEach((row) => pushTimeline(timeline, 'PENDENCIA', row, 'createdAt', row.titulo, row.descricao));
  scores.forEach((row) => pushTimeline(timeline, 'SCORE', row, 'calculado_em', `Score ${Number(row.score).toFixed(0)}`, row.nivel));

  timeline.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));

  return {
    colaborador,
    resumo: {
      eventos_total: timeline.length,
      bloqueios_abertos: bloqueios.filter((item) => item.status === 'ABERTO').length,
      pendencias_abertas: pendencias.filter((item) => item.status === 'ABERTA').length,
      ultimo_score: scores[0] || null
    },
    timeline
  };
}

module.exports = {
  gerarTimelineColaborador
};
