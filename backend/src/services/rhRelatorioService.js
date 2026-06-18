const { Op } = require('sequelize');
const {
  Obra,
  RhApuracao,
  RhColaborador,
  RhDocumento,
  RhDocumentoTipo,
  RhEmpresaGrupo,
  RhFechamento,
  Setor
} = require('../models');

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function resolvePeriodo(query = {}) {
  const hoje = new Date();
  const today = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  let dataInicial = query.data_inicial;
  let dataFinal = query.data_final;

  if (!dataInicial || !dataFinal) {
    const periodo = String(query.periodo || 'MES_ATUAL').toUpperCase();
    if (periodo === '30_DIAS') {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 29);
      dataInicial = dataInicial || toDateOnly(start);
      dataFinal = dataFinal || toDateOnly(today);
    } else if (periodo === '90_DIAS') {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 89);
      dataInicial = dataInicial || toDateOnly(start);
      dataFinal = dataFinal || toDateOnly(today);
    } else if (periodo === 'ANO_ATUAL') {
      dataInicial = dataInicial || `${today.getUTCFullYear()}-01-01`;
      dataFinal = dataFinal || toDateOnly(today);
    } else {
      dataInicial = dataInicial || toDateOnly(startOfMonth(today));
      dataFinal = dataFinal || toDateOnly(endOfMonth(today));
    }
  }

  return {
    periodo: query.periodo || 'MES_ATUAL',
    data_inicial: dataInicial,
    data_final: dataFinal,
    competencia_inicial: String(dataInicial).slice(0, 7),
    competencia_final: String(dataFinal).slice(0, 7)
  };
}

function incrementMap(map, key, amount = 1) {
  const normalized = key || 'Nao informado';
  map.set(normalized, (map.get(normalized) || 0) + amount);
}

function sumMap(map, key, amount = 0) {
  const normalized = key || 'Nao informado';
  map.set(normalized, toNumber(map.get(normalized)) + toNumber(amount));
}

function mapToRows(map, valueKey = 'total') {
  return Array.from(map.entries())
    .map(([nome, value]) => ({ nome, [valueKey]: value }))
    .sort((a, b) => toNumber(b[valueKey]) - toNumber(a[valueKey]));
}

function documentoValidadeStatus(validade, hoje = new Date()) {
  if (!validade) return 'SEM_VALIDADE';
  const vencimento = new Date(`${validade}T00:00:00Z`);
  const hojeUtc = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  if (Number.isNaN(vencimento.getTime())) return 'SEM_VALIDADE';
  const diffDays = Math.ceil((vencimento.getTime() - hojeUtc.getTime()) / 86400000);
  if (diffDays < 0) return 'VENCIDO';
  if (diffDays <= 30) return 'A_VENCER';
  return 'VALIDO';
}

function formatColaborador(colaborador) {
  return {
    id: colaborador.id,
    nome: colaborador.nome,
    matricula: colaborador.matricula,
    cpf: colaborador.cpf,
    cargo: colaborador.cargo,
    tipo_vinculo: colaborador.tipo_vinculo,
    status: colaborador.status,
    empresa_nome: colaborador.empresaGrupo?.nome || null,
    obra_nome: colaborador.obra?.nome || null,
    setor_nome: colaborador.setor?.nome || null,
    salario_base: toNumber(colaborador.salario_base),
    valor_contratual: toNumber(colaborador.valor_contratual),
    data_admissao: colaborador.data_admissao,
    data_demissao: colaborador.data_demissao,
    data_inicio: colaborador.data_inicio
  };
}

async function gerarRelatorioRhDpOperacional(query = {}) {
  const periodo = resolvePeriodo(query);
  const colaboradorWhere = {};

  if (query.empresa_grupo_id) colaboradorWhere.empresa_grupo_id = query.empresa_grupo_id;
  if (query.obra_id) colaboradorWhere.obra_id = query.obra_id;
  if (query.tipo_vinculo) colaboradorWhere.tipo_vinculo = query.tipo_vinculo;
  if (query.status) colaboradorWhere.status = query.status;

  const [colaboradores, documentos, apuracoes, fechamentos] = await Promise.all([
    RhColaborador.findAll({
      where: colaboradorWhere,
      include: [
        { model: RhEmpresaGrupo, as: 'empresaGrupo', attributes: ['id', 'nome', 'tipo_gerencial'] },
        { model: Obra, as: 'obra', attributes: ['id', 'nome', 'tipo_centro_custo'] },
        { model: Setor, as: 'setor', attributes: ['id', 'nome'] }
      ],
      order: [['nome', 'ASC']]
    }),
    RhDocumento.findAll({
      where: { ativo: true },
      include: [
        { model: RhDocumentoTipo, as: 'tipoDocumento', attributes: ['id', 'nome', 'tipo_vinculo'] },
        {
          model: RhColaborador,
          as: 'colaborador',
          attributes: ['id', 'nome', 'empresa_grupo_id', 'obra_id', 'tipo_vinculo', 'status'],
          include: [
            { model: RhEmpresaGrupo, as: 'empresaGrupo', attributes: ['id', 'nome'] },
            { model: Obra, as: 'obra', attributes: ['id', 'nome'] }
          ]
        }
      ]
    }),
    RhApuracao.findAll({
      where: {
        competencia: { [Op.between]: [periodo.competencia_inicial, periodo.competencia_final] },
        ...(query.empresa_grupo_id ? { empresa_grupo_id: query.empresa_grupo_id } : {}),
        ...(query.obra_id ? { obra_id: query.obra_id } : {}),
        ...(query.tipo_vinculo ? { tipo_vinculo: query.tipo_vinculo } : {})
      },
      include: [
        { model: RhEmpresaGrupo, as: 'empresaGrupo', attributes: ['id', 'nome'] },
        { model: Obra, as: 'obra', attributes: ['id', 'nome'] }
      ],
      order: [['competencia', 'ASC']]
    }),
    RhFechamento.findAll({
      where: {
        data_vencimento: { [Op.between]: [periodo.data_inicial, periodo.data_final] }
      },
      include: [
        {
          model: RhApuracao,
          as: 'apuracao',
          attributes: ['id', 'competencia', 'empresa_grupo_id', 'obra_id', 'tipo_vinculo'],
          where: {
            ...(query.empresa_grupo_id ? { empresa_grupo_id: query.empresa_grupo_id } : {}),
            ...(query.obra_id ? { obra_id: query.obra_id } : {}),
            ...(query.tipo_vinculo ? { tipo_vinculo: query.tipo_vinculo } : {})
          },
          include: [
            { model: RhEmpresaGrupo, as: 'empresaGrupo', attributes: ['id', 'nome'] },
            { model: Obra, as: 'obra', attributes: ['id', 'nome'] }
          ]
        }
      ],
      order: [['data_vencimento', 'ASC']]
    })
  ]);

  const docsFiltrados = documentos.filter((documento) => {
    const colaborador = documento.colaborador;
    if (!colaborador) return false;
    if (query.empresa_grupo_id && Number(colaborador.empresa_grupo_id) !== Number(query.empresa_grupo_id)) return false;
    if (query.obra_id && Number(colaborador.obra_id) !== Number(query.obra_id)) return false;
    if (query.tipo_vinculo && colaborador.tipo_vinculo !== query.tipo_vinculo) return false;
    if (query.status && colaborador.status !== query.status) return false;
    return true;
  });

  const porEmpresa = new Map();
  const porObra = new Map();
  const porTipoVinculo = new Map();
  const porStatus = new Map();
  const baseCadastralPorEmpresa = new Map();
  let colaboradoresAtivos = 0;
  let colaboradoresInativos = 0;
  let colaboradoresAfastados = 0;
  let baseMensalCadastrada = 0;

  colaboradores.forEach((colaborador) => {
    const empresaNome = colaborador.empresaGrupo?.nome || 'Sem empresa';
    const obraNome = colaborador.obra?.nome || 'Sem obra/centro';
    const base = toNumber(colaborador.salario_base) || toNumber(colaborador.valor_contratual);

    incrementMap(porEmpresa, empresaNome);
    incrementMap(porObra, obraNome);
    incrementMap(porTipoVinculo, colaborador.tipo_vinculo || 'Nao informado');
    incrementMap(porStatus, colaborador.status || 'Nao informado');
    sumMap(baseCadastralPorEmpresa, empresaNome, base);
    baseMensalCadastrada += base;

    if (colaborador.status === 'ATIVO') colaboradoresAtivos += 1;
    if (colaborador.status === 'INATIVO') colaboradoresInativos += 1;
    if (colaborador.status === 'AFASTADO') colaboradoresAfastados += 1;
  });

  const documentosPorStatus = new Map();
  const documentosPorValidade = new Map();
  docsFiltrados.forEach((documento) => {
    incrementMap(documentosPorStatus, documento.status || 'Nao informado');
    incrementMap(documentosPorValidade, documentoValidadeStatus(documento.validade));
  });

  const docsCriticos = docsFiltrados
    .map((documento) => ({
      id: documento.id,
      nome_original: documento.nome_original,
      status: documento.status,
      validade: documento.validade,
      validade_status: documentoValidadeStatus(documento.validade),
      tipo_documento: documento.tipoDocumento?.nome || null,
      colaborador_nome: documento.colaborador?.nome || null,
      empresa_nome: documento.colaborador?.empresaGrupo?.nome || null,
      obra_nome: documento.colaborador?.obra?.nome || null
    }))
    .filter((documento) => ['VENCIDO', 'A_VENCER'].includes(documento.validade_status) || documento.status === 'REJEITADO')
    .sort((a, b) => String(a.validade || '9999-12-31').localeCompare(String(b.validade || '9999-12-31')))
    .slice(0, 50);

  const apuracoesPorCompetencia = new Map();
  const apuracoesPorEmpresa = new Map();
  let totalBrutoApurado = 0;
  let totalLiquidoApurado = 0;
  apuracoes.forEach((apuracao) => {
    incrementMap(apuracoesPorCompetencia, apuracao.competencia);
    sumMap(apuracoesPorEmpresa, apuracao.empresaGrupo?.nome || 'Sem empresa', apuracao.total_liquido);
    totalBrutoApurado += toNumber(apuracao.total_bruto);
    totalLiquidoApurado += toNumber(apuracao.total_liquido);
  });

  const fechamentosPorStatus = new Map();
  let totalFechado = 0;
  let totalTitulosFechados = 0;
  fechamentos.forEach((fechamento) => {
    incrementMap(fechamentosPorStatus, fechamento.status || 'Nao informado');
    totalFechado += toNumber(fechamento.total_valor);
    totalTitulosFechados += toNumber(fechamento.total_titulos);
  });

  return {
    filtro: periodo,
    resumo: {
      colaboradores_total: colaboradores.length,
      colaboradores_ativos: colaboradoresAtivos,
      colaboradores_inativos: colaboradoresInativos,
      colaboradores_afastados: colaboradoresAfastados,
      documentos_ativos: docsFiltrados.length,
      documentos_vencidos: documentosPorValidade.get('VENCIDO') || 0,
      documentos_a_vencer: documentosPorValidade.get('A_VENCER') || 0,
      documentos_rejeitados: documentosPorStatus.get('REJEITADO') || 0,
      apuracoes_periodo: apuracoes.length,
      total_bruto_apurado: totalBrutoApurado,
      total_liquido_apurado: totalLiquidoApurado,
      fechamentos_periodo: fechamentos.length,
      total_fechado: totalFechado,
      total_titulos_fechados: totalTitulosFechados,
      base_mensal_cadastrada: baseMensalCadastrada
    },
    colaboradores: {
      por_empresa: mapToRows(porEmpresa),
      por_obra: mapToRows(porObra),
      por_tipo_vinculo: mapToRows(porTipoVinculo),
      por_status: mapToRows(porStatus),
      base_cadastrada_por_empresa: mapToRows(baseCadastralPorEmpresa, 'valor'),
      analitico: colaboradores.slice(0, 250).map(formatColaborador)
    },
    documentos: {
      por_status: mapToRows(documentosPorStatus),
      por_validade: mapToRows(documentosPorValidade),
      criticos: docsCriticos
    },
    apuracoes: {
      por_competencia: mapToRows(apuracoesPorCompetencia),
      por_empresa: mapToRows(apuracoesPorEmpresa, 'valor'),
      analitico: apuracoes.slice(0, 100).map((apuracao) => ({
        id: apuracao.id,
        competencia: apuracao.competencia,
        empresa_nome: apuracao.empresaGrupo?.nome || null,
        obra_nome: apuracao.obra?.nome || null,
        tipo_vinculo: apuracao.tipo_vinculo,
        status: apuracao.status,
        total_colaboradores: apuracao.total_colaboradores,
        total_bruto: toNumber(apuracao.total_bruto),
        total_descontos: toNumber(apuracao.total_descontos),
        total_liquido: toNumber(apuracao.total_liquido)
      }))
    },
    fechamentos: {
      por_status: mapToRows(fechamentosPorStatus),
      analitico: fechamentos.slice(0, 100).map((fechamento) => ({
        id: fechamento.id,
        competencia: fechamento.apuracao?.competencia || null,
        empresa_nome: fechamento.apuracao?.empresaGrupo?.nome || null,
        obra_nome: fechamento.apuracao?.obra?.nome || null,
        status: fechamento.status,
        data_vencimento: fechamento.data_vencimento,
        total_titulos: fechamento.total_titulos,
        total_valor: toNumber(fechamento.total_valor)
      }))
    }
  };
}

module.exports = {
  gerarRelatorioRhDpOperacional
};
