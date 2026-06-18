const { Op } = require('sequelize');
const { TIPO_CENTRO_CUSTO_OBRA } = require('../constants/centroCusto');
const {
  Obra,
  Apropriacao,
  Solicitacao,
  SolicitacaoCompra,
  TituloFinanceiro,
  MovimentoFinanceiro,
  Parceiro,
  TipoSolicitacao,
  Anexo,
  Comprovante,
  Contrato,
  ContratoAnexo
} = require('../models');

const STATUS_TITULO_ABERTO = new Set(['ABERTO', 'PARCIAL']);
const STATUS_MOVIMENTO_ATIVO = 'ATIVO';
const TIPO_TITULO_PAGAR = 'PAGAR';
const APROPRIACAO_SEM_VINCULO_ID = 'SEM_APROPRIACAO';

function asNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Number(asNumber(value).toFixed(2));
}

function createBucketFromApropriacao(apropriacao) {
  return {
    id: Number(apropriacao.id),
    codigo: String(apropriacao.codigo || '').trim() || `APR-${apropriacao.id}`,
    descricao: String(apropriacao.descricao || '').trim() || 'Sem descricao',
    valor_orcado: roundCurrency(apropriacao.valor_orcado),
    pedidos: 0,
    a_pagar: 0,
    pago: 0
  };
}

function createFallbackBucket() {
  return {
    id: APROPRIACAO_SEM_VINCULO_ID,
    codigo: 'SEM_APROPRIACAO',
    descricao: 'Sem apropriacao vinculada',
    valor_orcado: 0,
    pedidos: 0,
    a_pagar: 0,
    pago: 0
  };
}

function ensureBucket(map, apropriacaoId, apropriacoesById) {
  if (apropriacaoId && apropriacoesById.has(Number(apropriacaoId))) {
    return apropriacoesById.get(Number(apropriacaoId));
  }

  if (!map.has(APROPRIACAO_SEM_VINCULO_ID)) {
    map.set(APROPRIACAO_SEM_VINCULO_ID, createFallbackBucket());
  }

  return map.get(APROPRIACAO_SEM_VINCULO_ID);
}

function buildBuckets(apropriacoes) {
  const buckets = new Map();

  apropriacoes.forEach((apropriacao) => {
    buckets.set(Number(apropriacao.id), createBucketFromApropriacao(apropriacao));
  });

  return buckets;
}

function finalizeBuckets(bucketMap) {
  return Array.from(bucketMap.values())
    .map((bucket) => {
      const pedidos = roundCurrency(bucket.pedidos);
      const aPagar = roundCurrency(bucket.a_pagar);
      const pago = roundCurrency(bucket.pago);
      const custoTotal = roundCurrency(pedidos + aPagar + pago);
      const percentualExecucao = bucket.valor_orcado > 0
        ? roundCurrency((pago / bucket.valor_orcado) * 100)
        : 0;

      return {
        ...bucket,
        pedidos,
        a_pagar: aPagar,
        pago,
        custo_total: custoTotal,
        percentual_execucao: percentualExecucao
      };
    })
    .filter((bucket) => bucket.valor_orcado > 0 || bucket.pedidos > 0 || bucket.a_pagar > 0 || bucket.pago > 0 || bucket.id !== APROPRIACAO_SEM_VINCULO_ID)
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'pt-BR'));
}

function buildSolicitacaoIndex(solicitacoes) {
  const map = new Map();
  solicitacoes.forEach((solicitacao) => {
    map.set(Number(solicitacao.id), solicitacao);
  });
  return map;
}

function sumMovimentosAtivos(titulo) {
  return roundCurrency(
    (titulo.movimentos || [])
      .filter((movimento) => String(movimento.status || '').toUpperCase() === STATUS_MOVIMENTO_ATIVO)
      .reduce((total, movimento) => total + asNumber(movimento.valor_quitacao || movimento.valor), 0)
  );
}

function summarizeTitulosByBuckets({ titulos, solicitacoesMap, bucketMap }) {
  const custosExecutados = [];
  const parcelas = [];

  titulos.forEach((titulo) => {
    const solicitacao = titulo.solicitacao_id ? solicitacoesMap.get(Number(titulo.solicitacao_id)) : null;
    const bucket = ensureBucket(bucketMap, solicitacao?.apropriacao_id, bucketMap);
    const pagoAtivo = sumMovimentosAtivos(titulo);
    const saldo = roundCurrency(titulo.valor_saldo);
    const status = String(titulo.status || '').toUpperCase();
    const parceiroNome = titulo.parceiro?.nome || 'Parceiro nao informado';

    if (String(titulo.tipo || '').toUpperCase() === TIPO_TITULO_PAGAR) {
      if (pagoAtivo > 0) {
        bucket.pago += pagoAtivo;
      }

      if (STATUS_TITULO_ABERTO.has(status) && saldo > 0) {
        bucket.a_pagar += saldo;
      }

      if (pagoAtivo > 0) {
        custosExecutados.push({
          id: titulo.id,
          titulo_id: titulo.id,
          data_movimento: titulo.movimentos?.[0]?.data_movimento || titulo.data_quitacao || titulo.updatedAt,
          data_vencimento: titulo.data_vencimento,
          parceiro_nome: parceiroNome,
          origem: titulo.solicitacao_id ? 'TITULO DA SOLICITACAO' : 'TITULO MANUAL',
          codigo_referencia: titulo.numero_documento || solicitacao?.codigo || `TIT-${titulo.id}`,
          descricao: titulo.descricao || '-',
          total: pagoAtivo,
          apropriacao_codigo: bucket.codigo,
          apropriacao_descricao: bucket.descricao
        });
      }

      if (STATUS_TITULO_ABERTO.has(status)) {
        parcelas.push({
          id: titulo.id,
          tipo: titulo.tipo,
          status,
          descricao: titulo.descricao,
          parceiro_nome: parceiroNome,
          data_vencimento: titulo.data_vencimento,
          valor_original: roundCurrency(titulo.valor_original),
          valor_saldo: saldo,
          valor_baixado: roundCurrency(titulo.valor_baixado),
          codigo_referencia: titulo.numero_documento || solicitacao?.codigo || `TIT-${titulo.id}`,
          solicitacao_id: titulo.solicitacao_id || null
        });
      }
    }
  });

  custosExecutados.sort((a, b) => new Date(b.data_movimento || 0) - new Date(a.data_movimento || 0));
  parcelas.sort((a, b) => new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0));

  return {
    custosExecutados,
    parcelas
  };
}

function summarizePedidos({ solicitacoes, titulosBySolicitacaoId, bucketMap }) {
  const pedidos = [];

  solicitacoes.forEach((solicitacao) => {
    const valor = roundCurrency(solicitacao.valor);
    if (!solicitacao.numero_pedido || valor <= 0) {
      return;
    }

    if (titulosBySolicitacaoId.has(Number(solicitacao.id))) {
      return;
    }

    const bucket = ensureBucket(bucketMap, solicitacao.apropriacao_id, bucketMap);
    bucket.pedidos += valor;

    pedidos.push({
      id: solicitacao.id,
      codigo: solicitacao.codigo || `SOL-${solicitacao.id}`,
      numero_pedido: solicitacao.numero_pedido,
      status: solicitacao.status_global,
      descricao: solicitacao.descricao,
      valor,
      createdAt: solicitacao.createdAt,
      apropriacao_codigo: bucket.codigo,
      apropriacao_descricao: bucket.descricao,
      tipo: solicitacao.tipo?.nome || 'Solicitacao'
    });
  });

  pedidos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return pedidos;
}

function summarizeArquivos({ anexos, comprovantes, contratoAnexos }) {
  const arquivos = [
    ...anexos.map((item) => ({
      id: `anexo-${item.id}`,
      tipo: 'ANEXO',
      origem: item.solicitacao?.codigo || 'Solicitacao',
      nome_original: item.nome_original,
      caminho_arquivo: item.caminho_arquivo,
      createdAt: item.createdAt
    })),
    ...comprovantes.map((item) => ({
      id: `comprovante-${item.id}`,
      tipo: 'COMPROVANTE',
      origem: item.solicitacao?.codigo || 'Comprovante',
      nome_original: item.nome_original,
      caminho_arquivo: item.caminho_arquivo,
      createdAt: item.createdAt
    })),
    ...contratoAnexos.map((item) => ({
      id: `contrato-${item.id}`,
      tipo: 'CONTRATO',
      origem: item.contrato?.codigo || item.contrato?.ref_contrato || 'Contrato',
      nome_original: item.nome_original,
      caminho_arquivo: item.caminho_arquivo,
      createdAt: item.createdAt
    }))
  ];

  return arquivos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function buildKpis({ buckets, custosExecutados, pedidos }) {
  const investimentoTotal = roundCurrency(
    buckets.reduce((total, bucket) => total + asNumber(bucket.valor_orcado), 0)
  );
  const custoExecutado = roundCurrency(
    custosExecutados.reduce((total, item) => total + asNumber(item.total), 0)
  );
  const totalPedidos = roundCurrency(
    pedidos.reduce((total, item) => total + asNumber(item.valor), 0)
  );
  const totalAPagar = roundCurrency(
    buckets.reduce((total, bucket) => total + asNumber(bucket.a_pagar), 0)
  );
  const saldoProjetado = roundCurrency(investimentoTotal - custoExecutado);
  const eficiencia = investimentoTotal > 0
    ? roundCurrency((custoExecutado / investimentoTotal) * 100)
    : 0;

  return {
    investimento_total: investimentoTotal,
    custo_executado: custoExecutado,
    diferenca_saldo: roundCurrency(investimentoTotal - custoExecutado),
    eficiencia,
    custo_pago: custoExecutado,
    saldo_projetado: saldoProjetado,
    pedidos_total: totalPedidos,
    a_pagar_total: totalAPagar,
    custo_total: roundCurrency(totalPedidos + totalAPagar + custoExecutado)
  };
}

async function carregarDadosObra(obraId) {
  const obra = await Obra.findByPk(obraId);
  if (!obra || String(obra.tipo_centro_custo || TIPO_CENTRO_CUSTO_OBRA).toUpperCase() !== TIPO_CENTRO_CUSTO_OBRA) {
    return null;
  }

  const [
    apropriacoes,
    solicitacoes,
    solicitacoesCompra,
    titulos,
    contratos
  ] = await Promise.all([
    Apropriacao.findAll({
      where: { obra_id: obraId, ativo: true },
      order: [['codigo', 'ASC']]
    }),
    Solicitacao.findAll({
      where: { obra_id: obraId },
      include: [{ model: TipoSolicitacao, as: 'tipo', attributes: ['id', 'nome'] }],
      order: [['createdAt', 'DESC']]
    }),
    SolicitacaoCompra.findAll({
      where: { obra_id: obraId },
      order: [['createdAt', 'DESC']]
    }),
    TituloFinanceiro.findAll({
      where: { obra_id: obraId },
      include: [
        { model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'cpf_cnpj'] },
        {
          model: MovimentoFinanceiro,
          as: 'movimentos',
          required: false,
          where: { status: STATUS_MOVIMENTO_ATIVO },
          attributes: ['id', 'status', 'valor', 'valor_quitacao', 'data_movimento']
        }
      ],
      order: [['data_vencimento', 'ASC'], ['createdAt', 'DESC']]
    }),
    Contrato.findAll({
      where: { obra_id: obraId },
      include: [
        {
          model: ContratoAnexo,
          as: 'anexos',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    })
  ]);

  const solicitacaoIds = solicitacoes.map((item) => item.id);
  const [anexos, comprovantes] = await Promise.all([
    Anexo.findAll({
      where: { deleted_at: null },
      include: [
        {
          model: Solicitacao,
          as: 'solicitacao',
          where: { obra_id: obraId },
          attributes: ['id', 'codigo'],
          required: true
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    }),
    Comprovante.findAll({
      where: {
        deleted_at: null,
        [Op.or]: [
          { obra_id: obraId },
          solicitacaoIds.length
            ? { solicitacao_id: { [Op.in]: solicitacaoIds } }
            : { solicitacao_id: null }
        ]
      },
      include: [
        {
          model: Solicitacao,
          as: 'solicitacao',
          required: false,
          attributes: ['id', 'codigo']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    })
  ]);

  return {
    obra,
    apropriacoes,
    solicitacoes,
    solicitacoesCompra,
    titulos,
    anexos,
    comprovantes,
    contratos
  };
}

async function obterGestaoObra(obraId) {
  const dados = await carregarDadosObra(obraId);
  if (!dados) {
    return null;
  }

  const { obra, apropriacoes, solicitacoes, solicitacoesCompra, titulos, anexos, comprovantes, contratos } = dados;
  const bucketMap = buildBuckets(apropriacoes);
  const solicitacoesMap = buildSolicitacaoIndex(solicitacoes);
  const titulosBySolicitacaoId = new Set(
    titulos
      .map((titulo) => Number(titulo.solicitacao_id || 0))
      .filter((id) => id > 0)
  );

  const { custosExecutados, parcelas } = summarizeTitulosByBuckets({
    titulos,
    solicitacoesMap,
    bucketMap
  });
  const pedidos = summarizePedidos({
    solicitacoes,
    titulosBySolicitacaoId,
    bucketMap
  });
  const buckets = finalizeBuckets(bucketMap);
  const kpis = buildKpis({ buckets, custosExecutados, pedidos });
  const contratoAnexos = contratos.flatMap((contrato) =>
    (contrato.anexos || []).map((anexo) => ({
      ...anexo.get({ plain: true }),
      contrato: {
        id: contrato.id,
        codigo: contrato.codigo,
        ref_contrato: contrato.ref_contrato
      }
    }))
  );
  const arquivos = summarizeArquivos({ anexos, comprovantes, contratoAnexos });

  return {
    obra,
    kpis,
    dashboard: {
      categorias: buckets,
      status_macro: buckets.map((bucket) => ({
        id: bucket.id,
        codigo: bucket.codigo,
        descricao: bucket.descricao,
        percentual_execucao: bucket.percentual_execucao,
        valor_orcado: bucket.valor_orcado,
        valor_pago: bucket.pago
      }))
    },
    orcamento: {
      itens: apropriacoes.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao || '',
        valor_orcado: roundCurrency(item.valor_orcado),
        ativo: Boolean(item.ativo)
      })),
      total_orcado: kpis.investimento_total
    },
    custos: {
      total_pago: kpis.custo_pago,
      itens: custosExecutados
    },
    parcelas: {
      total: parcelas.length,
      itens: parcelas
    },
    pedidos: {
      total: pedidos.length,
      itens: pedidos,
      compras: solicitacoesCompra.map((item) => ({
        id: item.id,
        codigo: `SC-${item.id}`,
        status: item.status,
        numero_sienge: item.numero_sienge || null,
        necessario_para: item.necessario_para,
        createdAt: item.createdAt
      }))
    },
    arquivos: {
      total: arquivos.length,
      itens: arquivos
    },
    relatorio_final: {
      resumo: {
        pedidos: kpis.pedidos_total,
        a_pagar: kpis.a_pagar_total,
        pago: kpis.custo_pago,
        custo_total: kpis.custo_total
      },
      itens: buckets
    }
  };
}

async function listarObrasGestao() {
  const obras = await Obra.findAll({
    where: { tipo_centro_custo: TIPO_CENTRO_CUSTO_OBRA },
    order: [['nome', 'ASC']]
  });

  if (!obras.length) {
    return [];
  }

  const apropriacoes = await Apropriacao.findAll({
    where: {
      obra_id: { [Op.in]: obras.map((obra) => obra.id) },
      ativo: true
    }
  });

  const titulos = await TituloFinanceiro.findAll({
    where: {
      obra_id: { [Op.in]: obras.map((obra) => obra.id) },
      tipo: TIPO_TITULO_PAGAR
    },
    include: [
      {
        model: MovimentoFinanceiro,
        as: 'movimentos',
        required: false,
        where: { status: STATUS_MOVIMENTO_ATIVO },
        attributes: ['id', 'status', 'valor', 'valor_quitacao']
      }
    ]
  });

  const appropriationsByObra = new Map();
  apropriacoes.forEach((item) => {
    const obraId = Number(item.obra_id);
    if (!appropriationsByObra.has(obraId)) {
      appropriationsByObra.set(obraId, []);
    }
    appropriationsByObra.get(obraId).push(item);
  });

  const titulosByObra = new Map();
  titulos.forEach((item) => {
    const obraId = Number(item.obra_id);
    if (!titulosByObra.has(obraId)) {
      titulosByObra.set(obraId, []);
    }
    titulosByObra.get(obraId).push(item);
  });

  return obras.map((obra) => {
    const apropriacoesObra = appropriationsByObra.get(Number(obra.id)) || [];
    const titulosObra = titulosByObra.get(Number(obra.id)) || [];
    const orcado = roundCurrency(
      apropriacoesObra.reduce((total, item) => total + asNumber(item.valor_orcado), 0)
    );
    const executado = roundCurrency(
      titulosObra.reduce((total, titulo) => total + sumMovimentosAtivos(titulo), 0)
    );

    return {
      id: obra.id,
      codigo: obra.codigo || '',
      nome: obra.nome,
      cidade: obra.cidade || '',
      ativo: Boolean(obra.ativo),
      tipo_centro_custo: obra.tipo_centro_custo || TIPO_CENTRO_CUSTO_OBRA,
      classificacao: obra.classificacao || null,
      vgv: obra.vgv != null ? Number(obra.vgv) : null,
      planilha_geral: obra.planilha_geral != null ? Number(obra.planilha_geral) : null,
      margem_custo_esperada: obra.margem_custo_esperada != null ? Number(obra.margem_custo_esperada) : null,
      resumo: {
        orcado,
        executado,
        saldo: roundCurrency(orcado - executado)
      }
    };
  });
}

module.exports = {
  listarObrasGestao,
  obterGestaoObra
};
