'use strict';

const { Op } = require('sequelize');
const {
  Obra,
  RhColaborador,
  SstAso,
  SstDocumento,
  SstEpiEntrega,
  SstExposicao,
  SstRegraConformidade,
  SstRisco,
  SstTreinamento
} = require('../../../models');
const { SST_VALIDITY_ALERT_DAYS } = require('../constants/sstConstants');
const { getSstConfig } = require('../services/sstConfigService');

function todayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || SST_VALIDITY_ALERT_DAYS));
  return date.toISOString().slice(0, 10);
}

function matchFuncao(colaborador, funcaoAlvo) {
  if (!funcaoAlvo) return true;
  return String(colaborador?.cargo || '').trim().toUpperCase() === String(funcaoAlvo).trim().toUpperCase();
}

function baseSstWhere(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = Number(query.empresa_id);
  if (query.obra_id) where.obra_id = Number(query.obra_id);
  if (query.colaborador_id) where.colaborador_id = Number(query.colaborador_id);
  return where;
}

function colaboradorWhere(query = {}) {
  const where = { status: 'ATIVO' };
  if (query.empresa_id) where.empresa_grupo_id = Number(query.empresa_id);
  if (query.obra_id) where.obra_id = Number(query.obra_id);
  if (query.colaborador_id) where.id = Number(query.colaborador_id);
  return where;
}

function addPendencia(list, pendencia) {
  list.push({
    severidade: pendencia.severidade || 'ALERTA',
    tipo: pendencia.tipo,
    mensagem: pendencia.mensagem,
    empresa_id: pendencia.empresa_id || null,
    obra_id: pendencia.obra_id || null,
    colaborador_id: pendencia.colaborador_id || null,
    origem_tipo: pendencia.origem_tipo || null,
    origem_id: pendencia.origem_id || null
  });
}

async function analisarConformidadeSst(query = {}) {
  const config = await getSstConfig();
  const alertDays = Number(config?.dias_alerta_validade || SST_VALIDITY_ALERT_DAYS);
  const hoje = todayIso();
  const limite = addDaysIso(alertDays);
  const sstWhere = baseSstWhere(query);

  const [
    colaboradores,
    asos,
    treinamentos,
    epis,
    documentos,
    riscosCriticos,
    exposicoes,
    regras
  ] = await Promise.all([
    RhColaborador.findAll({
      where: colaboradorWhere(query),
      attributes: ['id', 'nome', 'cpf', 'matricula', 'cargo', 'empresa_grupo_id', 'obra_id', 'status'],
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstAso.findAll({ where: sstWhere, order: [['data_exame', 'DESC']], limit: 2000 }),
    SstTreinamento.findAll({ where: sstWhere, limit: 3000 }),
    SstEpiEntrega.findAll({ where: sstWhere, limit: 3000 }),
    SstDocumento.findAll({ where: sstWhere, limit: 3000 }),
    SstRisco.findAll({ where: { ...sstWhere, severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true }, limit: 1000 }),
    SstExposicao.findAll({ where: sstWhere, limit: 2000 }),
    SstRegraConformidade.findAll({
      where: {
        ...Object.fromEntries(Object.entries(sstWhere).filter(([key]) => key !== 'colaborador_id')),
        ativo: true
      },
      limit: 1000
    })
  ]);

  const pendencias = [];
  const asoByColaborador = new Map();
  const treinamentoByColaborador = new Map();
  const epiByColaborador = new Map();

  for (const aso of asos) {
    const current = asoByColaborador.get(aso.colaborador_id);
    if (!current || String(aso.data_exame || '') > String(current.data_exame || '')) {
      asoByColaborador.set(aso.colaborador_id, aso);
    }
    if (aso.apto === false) {
      addPendencia(pendencias, {
        severidade: 'CRITICA',
        tipo: 'COLABORADOR_INAPTO',
        mensagem: 'Colaborador marcado como inapto em ASO.',
        empresa_id: aso.empresa_id,
        obra_id: aso.obra_id,
        colaborador_id: aso.colaborador_id,
        origem_tipo: 'sst_aso',
        origem_id: aso.id
      });
    }
    if (aso.validade && aso.validade < hoje) {
      addPendencia(pendencias, {
        severidade: 'CRITICA',
        tipo: 'ASO_VENCIDO',
        mensagem: `ASO vencido em ${aso.validade}.`,
        empresa_id: aso.empresa_id,
        obra_id: aso.obra_id,
        colaborador_id: aso.colaborador_id,
        origem_tipo: 'sst_aso',
        origem_id: aso.id
      });
    } else if (aso.validade && aso.validade <= limite) {
      addPendencia(pendencias, {
        severidade: 'ALERTA',
        tipo: 'ASO_VENCENDO',
        mensagem: `ASO vencendo em ${aso.validade}.`,
        empresa_id: aso.empresa_id,
        obra_id: aso.obra_id,
        colaborador_id: aso.colaborador_id,
        origem_tipo: 'sst_aso',
        origem_id: aso.id
      });
    }
  }

  for (const treinamento of treinamentos) {
    if (!treinamentoByColaborador.has(treinamento.colaborador_id)) treinamentoByColaborador.set(treinamento.colaborador_id, []);
    treinamentoByColaborador.get(treinamento.colaborador_id).push(treinamento);
    if (treinamento.validade && treinamento.validade < hoje) {
      addPendencia(pendencias, {
        severidade: 'CRITICA',
        tipo: 'TREINAMENTO_VENCIDO',
        mensagem: `Treinamento vencido: ${treinamento.nome || treinamento.codigo || 'sem nome'}.`,
        empresa_id: treinamento.empresa_id,
        obra_id: treinamento.obra_id,
        colaborador_id: treinamento.colaborador_id,
        origem_tipo: 'sst_treinamentos',
        origem_id: treinamento.id
      });
    }
  }

  for (const epi of epis) {
    if (!epiByColaborador.has(epi.colaborador_id)) epiByColaborador.set(epi.colaborador_id, []);
    epiByColaborador.get(epi.colaborador_id).push(epi);
    if (epi.validade && epi.validade < hoje) {
      addPendencia(pendencias, {
        severidade: 'CRITICA',
        tipo: 'EPI_VENCIDO',
        mensagem: `EPI vencido: ${epi.epi_nome || 'sem nome'}.`,
        empresa_id: epi.empresa_id,
        obra_id: epi.obra_id,
        colaborador_id: epi.colaborador_id,
        origem_tipo: 'sst_epi_entregas',
        origem_id: epi.id
      });
    }
  }

  for (const documento of documentos) {
    if (documento.validade && documento.validade < hoje) {
      addPendencia(pendencias, {
        severidade: 'CRITICA',
        tipo: 'DOCUMENTO_EXPIRADO',
        mensagem: `Documento expirado: ${documento.titulo}.`,
        empresa_id: documento.empresa_id,
        obra_id: documento.obra_id,
        colaborador_id: documento.colaborador_id,
        origem_tipo: 'sst_documentos',
        origem_id: documento.id
      });
    }
  }

  for (const risco of riscosCriticos) {
    addPendencia(pendencias, {
      severidade: 'CRITICA',
      tipo: 'RISCO_CRITICO',
      mensagem: `Risco critico identificado: ${risco.nome}.`,
      empresa_id: risco.empresa_id,
      obra_id: risco.obra_id,
      origem_tipo: 'sst_riscos',
      origem_id: risco.id
    });
  }

  for (const exposicao of exposicoes) {
    if (!exposicao.ambiente_id || !exposicao.agente_nocivo_id) {
      addPendencia(pendencias, {
        severidade: 'ALERTA',
        tipo: 'EXPOSICAO_INCOMPLETA',
        mensagem: 'Exposicao ocupacional sem ambiente ou agente nocivo vinculado.',
        empresa_id: exposicao.empresa_id,
        obra_id: exposicao.obra_id,
        colaborador_id: exposicao.colaborador_id,
        origem_tipo: 'sst_exposicoes',
        origem_id: exposicao.id
      });
    }
  }

  for (const colaborador of colaboradores) {
    const ultimoAso = asoByColaborador.get(colaborador.id);
    if (!ultimoAso) {
      addPendencia(pendencias, {
        severidade: 'CRITICA',
        tipo: 'COLABORADOR_SEM_ASO',
        mensagem: 'Colaborador ativo sem ASO registrado.',
        empresa_id: colaborador.empresa_grupo_id,
        obra_id: colaborador.obra_id,
        colaborador_id: colaborador.id,
        origem_tipo: 'rh_colaboradores',
        origem_id: colaborador.id
      });
    }

    for (const regra of regras) {
      if (!matchFuncao(colaborador, regra.funcao_alvo)) continue;

      if (regra.tipo_regra === 'TREINAMENTO_OBRIGATORIO') {
        const registros = treinamentoByColaborador.get(colaborador.id) || [];
        const ok = registros.some((item) => (
          (!regra.treinamento_codigo || String(item.codigo || '').toUpperCase() === String(regra.treinamento_codigo).toUpperCase())
          && (!item.validade || item.validade >= hoje)
        ));
        if (!ok) {
          addPendencia(pendencias, {
            severidade: regra.severidade || 'CRITICA',
            tipo: 'COLABORADOR_SEM_NR',
            mensagem: `Treinamento obrigatorio ausente: ${regra.nome}.`,
            empresa_id: colaborador.empresa_grupo_id,
            obra_id: colaborador.obra_id,
            colaborador_id: colaborador.id,
            origem_tipo: 'sst_regras_conformidade',
            origem_id: regra.id
          });
        }
      }

      if (regra.tipo_regra === 'EPI_OBRIGATORIO') {
        const registros = epiByColaborador.get(colaborador.id) || [];
        const ok = registros.some((item) => (
          (!regra.epi_nome || String(item.epi_nome || '').toUpperCase().includes(String(regra.epi_nome).toUpperCase()))
          && (!item.validade || item.validade >= hoje)
        ));
        if (!ok) {
          addPendencia(pendencias, {
            severidade: regra.severidade || 'CRITICA',
            tipo: 'COLABORADOR_SEM_EPI',
            mensagem: `EPI obrigatorio ausente: ${regra.nome}.`,
            empresa_id: colaborador.empresa_grupo_id,
            obra_id: colaborador.obra_id,
            colaborador_id: colaborador.id,
            origem_tipo: 'sst_regras_conformidade',
            origem_id: regra.id
          });
        }
      }
    }
  }

  const totalBase = Math.max(1, colaboradores.length + asos.length + treinamentos.length + epis.length + documentos.length + exposicoes.length);
  const criticas = pendencias.filter((item) => item.severidade === 'CRITICA').length;
  const alertas = pendencias.filter((item) => item.severidade !== 'CRITICA').length;
  const score = Math.max(0, Math.round(((totalBase - (criticas * 2) - alertas) / totalBase) * 100));

  return {
    periodo_alerta_dias: alertDays,
    total_colaboradores_ativos: colaboradores.length,
    compliance_score: score,
    pendencias_total: pendencias.length,
    pendencias_criticas: criticas,
    pendencias_alerta: alertas,
    pendencias_por_tipo: pendencias.reduce((acc, item) => {
      acc[item.tipo] = (acc[item.tipo] || 0) + 1;
      return acc;
    }, {}),
    pendencias: pendencias.slice(0, 200)
  };
}

module.exports = {
  analisarConformidadeSst
};
