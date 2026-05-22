const { Op } = require('sequelize');
const {
  FornecedorCompra,
  Insumo,
  PedidoCompra,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraRespostaItem,
  Unidade
} = require('../models');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffHours(start, end) {
  const startedAt = toDate(start);
  const endedAt = toDate(end);
  if (!startedAt || !endedAt || endedAt < startedAt) {
    return null;
  }
  return Number(((endedAt.getTime() - startedAt.getTime()) / 36e5).toFixed(2));
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(Number(value)));
  if (!validValues.length) {
    return null;
  }
  return Number((validValues.reduce((sum, value) => sum + Number(value), 0) / validValues.length).toFixed(2));
}

function minDate(values) {
  const dates = values.map(toDate).filter(Boolean);
  if (!dates.length) {
    return null;
  }
  return dates.reduce((min, date) => (date < min ? date : min), dates[0]);
}

function maxDate(values) {
  const dates = values.map(toDate).filter(Boolean);
  if (!dates.length) {
    return null;
  }
  return dates.reduce((max, date) => (date > max ? date : max), dates[0]);
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

function buildSolicitacaoPeriodoWhere({ obraId, obraIds, dataInicio, dataFim }) {
  const where = buildSolicitacaoWhere({ obraId, obraIds });

  if (dataInicio || dataFim) {
    where.encerrado_em = {};
    if (dataInicio) {
      where.encerrado_em[Op.gte] = new Date(`${dataInicio}T00:00:00.000`);
    }
    if (dataFim) {
      where.encerrado_em[Op.lte] = new Date(`${dataFim}T23:59:59.999`);
    }
  }

  return where;
}

function buildSolicitacaoCriacaoWhere({ obraId, obraIds, dataInicio, dataFim }) {
  const where = buildSolicitacaoWhere({ obraId, obraIds });

  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) {
      where.createdAt[Op.gte] = new Date(`${dataInicio}T00:00:00.000`);
    }
    if (dataFim) {
      where.createdAt[Op.lte] = new Date(`${dataFim}T23:59:59.999`);
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

function buildItemKey(tipo, id) {
  return `${String(tipo || '').toUpperCase()}:${Number(id || 0)}`;
}

function getItemDescricao(item) {
  if (!item) {
    return '-';
  }
  return item.insumo?.nome || item.nome_manual || item.especificacao || '-';
}

function getItemUnidade(item) {
  if (!item) {
    return '-';
  }
  return item.unidade_sigla_manual || item.unidade?.sigla || '-';
}

function mapItensSolicitacao(solicitacao) {
  const mapa = new Map();

  (solicitacao.itens || []).forEach((item) => {
    mapa.set(buildItemKey('CADASTRADO', item.id), {
      item_tipo: 'CADASTRADO',
      item_referencia_id: item.id,
      descricao: getItemDescricao(item),
      unidade: getItemUnidade(item),
      quantidade: toNumber(item.quantidade)
    });
  });

  (solicitacao.itensManuais || []).forEach((item) => {
    mapa.set(buildItemKey('MANUAL', item.id), {
      item_tipo: 'MANUAL',
      item_referencia_id: item.id,
      descricao: getItemDescricao(item),
      unidade: getItemUnidade(item),
      quantidade: toNumber(item.quantidade)
    });
  });

  return mapa;
}

function getRespostaItemKey(resposta) {
  const itemReferenciaId = resposta.solicitacao_compra_item_id || resposta.solicitacao_compra_item_manual_id;
  return buildItemKey(resposta.item_tipo, itemReferenciaId);
}

function buildEconomiaLinha({ solicitacao, itemBase, respostas }) {
  const respostasValidas = respostas
    .filter((resposta) => resposta.disponivel && resposta.preco != null && toNumber(resposta.preco) > 0)
    .map((resposta) => {
      const precoUnitario = roundMoney(resposta.preco);
      return {
        resposta_item_id: resposta.id,
        fornecedor_id: resposta.fornecedor_info?.id || null,
        fornecedor_nome: resposta.fornecedor_info?.nome || 'Fornecedor sem cadastro',
        preco_unitario: precoUnitario,
        valor_total: roundMoney(precoUnitario * itemBase.quantidade),
        vencedor: Boolean(resposta.vencedor)
      };
    });

  if (!respostasValidas.length) {
    return null;
  }

  const menor = respostasValidas.reduce((acc, atual) => {
    if (!acc) {
      return atual;
    }
    return atual.preco_unitario < acc.preco_unitario ? atual : acc;
  }, null);
  const vencedor = respostasValidas.find((resposta) => resposta.vencedor) || null;
  if (!vencedor) {
    return null;
  }

  const diferencaVencedorMenor = roundMoney(vencedor.valor_total - menor.valor_total);
  const sobrepreco = diferencaVencedorMenor > 0 ? diferencaVencedorMenor : 0;
  const economia = diferencaVencedorMenor < 0 ? Math.abs(diferencaVencedorMenor) : 0;
  const selecionouMenorPreco = sobrepreco === 0;

  return {
    solicitacao: {
      id: solicitacao.id,
      titulo: solicitacao.titulo || null,
      obra_id: solicitacao.obra_id || null,
      encerrado_em: solicitacao.encerrado_em || null
    },
    item: itemBase,
    respostas_validas: respostasValidas.length,
    menor_preco: menor,
    vencedor,
    economia,
    sobrepreco,
    selecionou_menor_preco: selecionouMenorPreco
  };
}

async function relatorioEconomiaCotacoes({ obraId, dataInicio, dataFim, obraIds } = {}) {
  const solicitacoes = await SolicitacaoCompra.findAll({
    where: {
      ...buildSolicitacaoPeriodoWhere({ obraId, obraIds, dataInicio, dataFim }),
      status: 'ENCERRADO'
    },
    attributes: ['id', 'titulo', 'obra_id', 'status', 'encerrado_em'],
    include: [
      {
        model: SolicitacaoCompraItem,
        as: 'itens',
        attributes: ['id', 'quantidade', 'especificacao', 'unidade_sigla_manual'],
        include: [
          { model: Insumo, as: 'insumo', attributes: ['id', 'nome'] },
          { model: Unidade, as: 'unidade', attributes: ['id', 'sigla'] }
        ]
      },
      {
        model: SolicitacaoCompraItemManual,
        as: 'itensManuais',
        attributes: ['id', 'nome_manual', 'quantidade', 'especificacao', 'unidade_sigla_manual']
      },
      {
        model: SolicitacaoCompraFornecedor,
        as: 'fornecedores',
        attributes: ['id', 'fornecedor_compra_id'],
        include: [
          {
            model: FornecedorCompra,
            as: 'fornecedor',
            attributes: ['id', 'nome']
          },
          {
            model: SolicitacaoCompraRespostaItem,
            as: 'respostas',
            attributes: [
              'id',
              'item_tipo',
              'solicitacao_compra_item_id',
              'solicitacao_compra_item_manual_id',
              'disponivel',
              'preco',
              'vencedor'
            ]
          }
        ]
      }
    ],
    order: [['encerrado_em', 'DESC'], ['id', 'DESC']]
  });

  const linhas = [];
  const resumo = {
    cotacoes_encerradas: solicitacoes.length,
    itens_com_vencedor: 0,
    itens_menor_preco: 0,
    itens_acima_menor_preco: 0,
    valor_menor_preco: 0,
    valor_vencedor: 0,
    economia_total: 0,
    sobrepreco_total: 0
  };

  solicitacoes.forEach((solicitacao) => {
    const itensMap = mapItensSolicitacao(solicitacao);
    const respostasPorItem = new Map();

    (solicitacao.fornecedores || []).forEach((fornecedorCotacao) => {
      (fornecedorCotacao.respostas || []).forEach((resposta) => {
        const key = getRespostaItemKey(resposta);
        if (!respostasPorItem.has(key)) {
          respostasPorItem.set(key, []);
        }
        const respostaJson = resposta.toJSON ? resposta.toJSON() : resposta;
        respostasPorItem.get(key).push({
          ...respostaJson,
          fornecedor_info: {
            id: fornecedorCotacao.fornecedor?.id || fornecedorCotacao.fornecedor_compra_id || null,
            nome: fornecedorCotacao.fornecedor?.nome || 'Fornecedor sem cadastro'
          }
        });
      });
    });

    itensMap.forEach((itemBase, key) => {
      const linha = buildEconomiaLinha({
        solicitacao,
        itemBase,
        respostas: respostasPorItem.get(key) || []
      });
      if (!linha) {
        return;
      }

      linhas.push(linha);
      resumo.itens_com_vencedor += 1;
      resumo.valor_menor_preco = roundMoney(resumo.valor_menor_preco + linha.menor_preco.valor_total);
      resumo.valor_vencedor = roundMoney(resumo.valor_vencedor + linha.vencedor.valor_total);

      if (linha.selecionou_menor_preco) {
        resumo.itens_menor_preco += 1;
      } else {
        resumo.itens_acima_menor_preco += 1;
        resumo.sobrepreco_total = roundMoney(resumo.sobrepreco_total + linha.sobrepreco);
      }

      resumo.economia_total = roundMoney(resumo.economia_total + linha.economia);
    });
  });

  resumo.percentual_menor_preco = resumo.itens_com_vencedor > 0
    ? Number(((resumo.itens_menor_preco / resumo.itens_com_vencedor) * 100).toFixed(2))
    : 0;

  return {
    filtros: {
      obra_id: obraId || null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null
    },
    resumo,
    itens: linhas
  };
}

function buildCicloLinha(solicitacao) {
  const criadoEm = toDate(solicitacao.createdAt);
  const liberadoEm = toDate(solicitacao.liberado_para_compra_em);
  const encerradoEm = toDate(solicitacao.encerrado_em);
  const fornecedores = solicitacao.fornecedores || [];
  const pedidos = solicitacao.pedidos || [];
  const primeiroEnvio = minDate(fornecedores.map((fornecedor) => fornecedor.enviado_em));
  const primeiraResposta = minDate(fornecedores.map((fornecedor) => fornecedor.respondido_em));
  const ultimaResposta = maxDate(fornecedores.map((fornecedor) => fornecedor.respondido_em));
  const primeiroPedido = minDate(pedidos.map((pedido) => pedido.createdAt));

  const tempos = {
    criacao_para_liberacao_horas: diffHours(criadoEm, liberadoEm),
    liberacao_para_envio_horas: diffHours(liberadoEm, primeiroEnvio),
    envio_para_primeira_resposta_horas: diffHours(primeiroEnvio, primeiraResposta),
    envio_para_ultima_resposta_horas: diffHours(primeiroEnvio, ultimaResposta),
    criacao_para_encerramento_horas: diffHours(criadoEm, encerradoEm),
    encerramento_para_pedido_horas: diffHours(encerradoEm, primeiroPedido),
    ciclo_total_ate_pedido_horas: diffHours(criadoEm, primeiroPedido)
  };

  return {
    solicitacao: {
      id: solicitacao.id,
      titulo: solicitacao.titulo || null,
      obra_id: solicitacao.obra_id || null,
      status: solicitacao.status,
      criado_em: solicitacao.createdAt || null,
      liberado_em: solicitacao.liberado_para_compra_em || null,
      primeiro_envio: primeiroEnvio,
      primeira_resposta: primeiraResposta,
      ultima_resposta: ultimaResposta,
      encerrado_em: solicitacao.encerrado_em || null,
      primeiro_pedido: primeiroPedido
    },
    contadores: {
      fornecedores_enviados: fornecedores.filter((fornecedor) => fornecedor.enviado_em).length,
      fornecedores_respondidos: fornecedores.filter((fornecedor) => fornecedor.respondido_em).length,
      pedidos_gerados: pedidos.length
    },
    tempos
  };
}

async function relatorioCicloCompras({ obraId, dataInicio, dataFim, obraIds } = {}) {
  const solicitacoes = await SolicitacaoCompra.findAll({
    where: buildSolicitacaoCriacaoWhere({ obraId, obraIds, dataInicio, dataFim }),
    attributes: [
      'id',
      'titulo',
      'obra_id',
      'status',
      'liberado_para_compra_em',
      'encerrado_em',
      'createdAt'
    ],
    include: [
      {
        model: SolicitacaoCompraFornecedor,
        as: 'fornecedores',
        attributes: ['id', 'enviado_em', 'respondido_em']
      },
      {
        model: PedidoCompra,
        as: 'pedidos',
        attributes: ['id', 'createdAt']
      }
    ],
    order: [['createdAt', 'DESC'], ['id', 'DESC']]
  });

  const linhas = solicitacoes.map(buildCicloLinha);
  const resumo = {
    solicitacoes: linhas.length,
    solicitacoes_liberadas: linhas.filter((linha) => linha.solicitacao.liberado_em).length,
    cotacoes_enviadas: linhas.filter((linha) => linha.solicitacao.primeiro_envio).length,
    cotacoes_com_resposta: linhas.filter((linha) => linha.solicitacao.primeira_resposta).length,
    cotacoes_encerradas: linhas.filter((linha) => linha.solicitacao.encerrado_em).length,
    solicitacoes_com_pedido: linhas.filter((linha) => linha.solicitacao.primeiro_pedido).length,
    fornecedores_enviados: linhas.reduce((sum, linha) => sum + linha.contadores.fornecedores_enviados, 0),
    fornecedores_respondidos: linhas.reduce((sum, linha) => sum + linha.contadores.fornecedores_respondidos, 0),
    tempo_medio_criacao_liberacao_horas: average(linhas.map((linha) => linha.tempos.criacao_para_liberacao_horas)),
    tempo_medio_liberacao_envio_horas: average(linhas.map((linha) => linha.tempos.liberacao_para_envio_horas)),
    tempo_medio_envio_primeira_resposta_horas: average(linhas.map((linha) => linha.tempos.envio_para_primeira_resposta_horas)),
    tempo_medio_criacao_encerramento_horas: average(linhas.map((linha) => linha.tempos.criacao_para_encerramento_horas)),
    tempo_medio_encerramento_pedido_horas: average(linhas.map((linha) => linha.tempos.encerramento_para_pedido_horas)),
    tempo_medio_ciclo_total_ate_pedido_horas: average(linhas.map((linha) => linha.tempos.ciclo_total_ate_pedido_horas))
  };

  resumo.taxa_resposta_fornecedor = resumo.fornecedores_enviados > 0
    ? Number(((resumo.fornecedores_respondidos / resumo.fornecedores_enviados) * 100).toFixed(2))
    : 0;

  return {
    filtros: {
      obra_id: obraId || null,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null
    },
    resumo,
    solicitacoes: linhas
  };
}

module.exports = {
  relatorioCicloCompras,
  relatorioEconomiaCotacoes,
  relatorioFornecedoresCompras
};
