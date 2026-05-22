const { Op } = require('sequelize');
const {
  FornecedorCompra,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraRespostaItem
} = require('../models');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function calculateRespostaValor(resposta) {
  if (!resposta || !resposta.disponivel || resposta.preco == null) {
    return 0;
  }

  const item = resposta.itemCadastrado || resposta.itemManual;
  const quantidade = toNumber(item?.quantidade);
  return roundMoney(toNumber(resposta.preco) * quantidade);
}

function buildDateWhere({ dataInicio, dataFim }) {
  const where = {};

  if (dataInicio || dataFim) {
    where.enviado_em = {};
    if (dataInicio) {
      where.enviado_em[Op.gte] = new Date(`${dataInicio}T00:00:00.000`);
    }
    if (dataFim) {
      where.enviado_em[Op.lte] = new Date(`${dataFim}T23:59:59.999`);
    }
  }

  return where;
}

function buildSolicitacaoWhere({ obraId, obraIds }) {
  const where = {};

  if (obraId) {
    where.obra_id = Number(obraId);
  }

  if (Array.isArray(obraIds)) {
    if (obraIds.length === 0) {
      where.id = { [Op.in]: [] };
    } else if (!obraId) {
      where.obra_id = { [Op.in]: obraIds };
    }
  }

  return where;
}

function createFornecedorResumo(fornecedor) {
  return {
    fornecedor: {
      id: fornecedor?.id || null,
      nome: fornecedor?.nome || 'Fornecedor sem cadastro',
      cnpj: fornecedor?.cnpj || null,
      email: fornecedor?.email || null,
      whatsapp: fornecedor?.whatsapp || null,
      cidade: fornecedor?.cidade || null,
      estado: fornecedor?.estado || null,
      ativo: fornecedor?.ativo !== false
    },
    cotacoes_enviadas: 0,
    cotacoes_visualizadas: 0,
    cotacoes_respondidas: 0,
    itens_respondidos: 0,
    itens_vencedores: 0,
    valor_cotado: 0,
    valor_vencedor: 0,
    prazo_total_resposta_horas: 0,
    prazo_respostas_com_data: 0,
    ultima_cotacao: null,
    obras_map: new Map()
  };
}

function finalizeFornecedorResumo(resumo) {
  const taxaResposta = resumo.cotacoes_enviadas > 0
    ? (resumo.cotacoes_respondidas / resumo.cotacoes_enviadas) * 100
    : 0;
  const prazoMedio = resumo.prazo_respostas_com_data > 0
    ? resumo.prazo_total_resposta_horas / resumo.prazo_respostas_com_data
    : null;

  return {
    fornecedor: resumo.fornecedor,
    cotacoes_enviadas: resumo.cotacoes_enviadas,
    cotacoes_visualizadas: resumo.cotacoes_visualizadas,
    cotacoes_respondidas: resumo.cotacoes_respondidas,
    taxa_resposta: Number(taxaResposta.toFixed(2)),
    prazo_medio_resposta_horas: prazoMedio != null ? Number(prazoMedio.toFixed(2)) : null,
    itens_respondidos: resumo.itens_respondidos,
    itens_vencedores: resumo.itens_vencedores,
    valor_cotado: roundMoney(resumo.valor_cotado),
    valor_vencedor: roundMoney(resumo.valor_vencedor),
    ultima_cotacao: resumo.ultima_cotacao,
    obras: Array.from(resumo.obras_map.values())
  };
}

async function relatorioFornecedoresCompras({ obraId, dataInicio, dataFim, obraIds } = {}) {
  const participacoes = await SolicitacaoCompraFornecedor.findAll({
    where: buildDateWhere({ dataInicio, dataFim }),
    include: [
      {
        model: FornecedorCompra,
        as: 'fornecedor',
        attributes: ['id', 'nome', 'cnpj', 'email', 'whatsapp', 'cidade', 'estado', 'ativo']
      },
      {
        model: SolicitacaoCompra,
        as: 'solicitacao',
        attributes: ['id', 'obra_id', 'titulo'],
        required: true,
        where: buildSolicitacaoWhere({ obraId, obraIds })
      },
      {
        model: SolicitacaoCompraRespostaItem,
        as: 'respostas',
        attributes: ['id', 'disponivel', 'preco', 'vencedor'],
        include: [
          {
            model: SolicitacaoCompraItem,
            as: 'itemCadastrado',
            attributes: ['id', 'quantidade']
          },
          {
            model: SolicitacaoCompraItemManual,
            as: 'itemManual',
            attributes: ['id', 'quantidade']
          }
        ]
      }
    ],
    order: [['enviado_em', 'DESC'], ['id', 'DESC']]
  });

  const fornecedoresMap = new Map();
  const resumoGeral = {
    fornecedores: 0,
    cotacoes_enviadas: 0,
    cotacoes_visualizadas: 0,
    cotacoes_respondidas: 0,
    itens_respondidos: 0,
    itens_vencedores: 0,
    valor_cotado: 0,
    valor_vencedor: 0
  };

  participacoes.forEach((participacao) => {
    const fornecedorKey = participacao.fornecedor?.id || `sem-cadastro-${participacao.id}`;
    if (!fornecedoresMap.has(fornecedorKey)) {
      fornecedoresMap.set(fornecedorKey, createFornecedorResumo(participacao.fornecedor));
    }

    const resumo = fornecedoresMap.get(fornecedorKey);
    const enviadoEm = participacao.enviado_em ? new Date(participacao.enviado_em) : null;
    const respondidoEm = participacao.respondido_em ? new Date(participacao.respondido_em) : null;

    resumo.cotacoes_enviadas += 1;
    resumoGeral.cotacoes_enviadas += 1;

    if (participacao.visualizado_em) {
      resumo.cotacoes_visualizadas += 1;
      resumoGeral.cotacoes_visualizadas += 1;
    }

    if (participacao.respondido_em) {
      resumo.cotacoes_respondidas += 1;
      resumoGeral.cotacoes_respondidas += 1;

      if (enviadoEm && respondidoEm && respondidoEm >= enviadoEm) {
        resumo.prazo_total_resposta_horas += (respondidoEm.getTime() - enviadoEm.getTime()) / 36e5;
        resumo.prazo_respostas_com_data += 1;
      }
    }

    if (!resumo.ultima_cotacao || (enviadoEm && new Date(resumo.ultima_cotacao) < enviadoEm)) {
      resumo.ultima_cotacao = participacao.enviado_em || participacao.createdAt || null;
    }

    const obraIdParticipacao = participacao.solicitacao?.obra_id || null;
    if (obraIdParticipacao && !resumo.obras_map.has(obraIdParticipacao)) {
      resumo.obras_map.set(obraIdParticipacao, {
        id: obraIdParticipacao,
        cotacoes_enviadas: 0,
        cotacoes_respondidas: 0
      });
    }
    const obraResumo = obraIdParticipacao ? resumo.obras_map.get(obraIdParticipacao) : null;
    if (obraResumo) {
      obraResumo.cotacoes_enviadas += 1;
      if (participacao.respondido_em) {
        obraResumo.cotacoes_respondidas += 1;
      }
    }

    (participacao.respostas || []).forEach((resposta) => {
      if (!resposta.disponivel || resposta.preco == null) {
        return;
      }

      const valor = calculateRespostaValor(resposta);
      resumo.itens_respondidos += 1;
      resumo.valor_cotado = roundMoney(resumo.valor_cotado + valor);
      resumoGeral.itens_respondidos += 1;
      resumoGeral.valor_cotado = roundMoney(resumoGeral.valor_cotado + valor);

      if (resposta.vencedor) {
        resumo.itens_vencedores += 1;
        resumo.valor_vencedor = roundMoney(resumo.valor_vencedor + valor);
        resumoGeral.itens_vencedores += 1;
        resumoGeral.valor_vencedor = roundMoney(resumoGeral.valor_vencedor + valor);
      }
    });
  });

  const fornecedores = Array.from(fornecedoresMap.values())
    .map(finalizeFornecedorResumo)
    .sort((a, b) => {
      if (b.valor_vencedor !== a.valor_vencedor) {
        return b.valor_vencedor - a.valor_vencedor;
      }
      if (b.cotacoes_respondidas !== a.cotacoes_respondidas) {
        return b.cotacoes_respondidas - a.cotacoes_respondidas;
      }
      return String(a.fornecedor.nome).localeCompare(String(b.fornecedor.nome), 'pt-BR');
    });

  resumoGeral.fornecedores = fornecedores.length;
  resumoGeral.taxa_resposta = resumoGeral.cotacoes_enviadas > 0
    ? Number(((resumoGeral.cotacoes_respondidas / resumoGeral.cotacoes_enviadas) * 100).toFixed(2))
    : 0;

  return {
    filtros: {
      obra_id: obraId || null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null
    },
    resumo: resumoGeral,
    fornecedores
  };
}

module.exports = {
  relatorioFornecedoresCompras
};
