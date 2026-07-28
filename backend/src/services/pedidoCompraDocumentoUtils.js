function normalizeOptionalText(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function toPlainObject(value) {
  if (!value) return null;
  if (typeof value.get === 'function') {
    return value.get({ plain: true });
  }
  return value;
}

function resolverCondicaoPagamentoPedido(pedido) {
  const pedidoPlain = toPlainObject(pedido);
  if (!pedidoPlain) return null;

  const snapshot = normalizeOptionalText(pedidoPlain.condicao_pagamento);
  if (snapshot) return snapshot;

  const cotacaoDireta = toPlainObject(pedidoPlain.cotacaoFornecedor);
  const condicaoDireta = normalizeOptionalText(cotacaoDireta?.condicao_pagamento);
  if (condicaoDireta) return condicaoDireta;

  const itens = Array.isArray(pedidoPlain.itens) ? pedidoPlain.itens : [];
  for (const itemOriginal of itens) {
    const item = toPlainObject(itemOriginal);
    const respostaItem = toPlainObject(item?.respostaItem);
    const cotacaoFornecedor = toPlainObject(respostaItem?.cotacaoFornecedor);
    const condicaoItem = normalizeOptionalText(cotacaoFornecedor?.condicao_pagamento);
    if (condicaoItem) return condicaoItem;
  }

  return null;
}

module.exports = {
  resolverCondicaoPagamentoPedido
};
