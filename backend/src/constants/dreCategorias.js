function normalizeText(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function extractCodigoCategoria(nome) {
  const match = String(nome || '').trim().match(/^(\d+(?:\.\d+)*)\s*-/);
  return match ? match[1] : null;
}

function startsWithAny(value, prefixes = []) {
  return prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}.`));
}

function isCategoriaRedutora(categoria = {}) {
  const nome = normalizeText(categoria.nome);
  const descricao = normalizeText(categoria.descricao);

  return (
    nome.includes('(-)') ||
    descricao.includes('REDUTORA: SIM') ||
    descricao.includes('REDUTORA SIM')
  );
}

function dreClassification(grupo, subgrupo, ordem, consideraDre = true) {
  return {
    dre_grupo: grupo,
    dre_subgrupo: subgrupo,
    dre_ordem: ordem,
    considera_dre: consideraDre
  };
}

function foraDaDre(subgrupo = 'Movimento patrimonial ou financeiro') {
  return dreClassification(null, subgrupo, null, false);
}

function classificarReceber(codigo, nome) {
  if (startsWithAny(codigo, ['1.01.01.99', '1.01.02', '1.09.02'])) {
    return dreClassification('Deducoes da receita bruta', 'Cancelamentos, retencoes e glosas', 120);
  }

  if (startsWithAny(codigo, ['1.01.01.01'])) {
    return dreClassification('Receita operacional bruta', 'Servicos', 100);
  }

  if (startsWithAny(codigo, ['1.01.01.02', '1.01.01.04'])) {
    return dreClassification('Receita operacional bruta', 'Venda de imoveis e lotes', 101);
  }

  if (startsWithAny(codigo, ['1.01.01.03'])) {
    return dreClassification('Receita operacional bruta', 'Projetos e desenvolvimento', 102);
  }

  if (startsWithAny(codigo, ['1.01.01.05'])) {
    return dreClassification('Receita operacional bruta', 'Administracao', 103);
  }

  if (startsWithAny(codigo, ['1.01.01.06'])) {
    return dreClassification('Receita operacional bruta', 'Alienacoes operacionais', 104);
  }

  if (startsWithAny(codigo, ['1.02.01', '1.02.02', '1.03.02'])) {
    return foraDaDre('Aportes, financiamentos, resgates ou desbloqueios');
  }

  if (startsWithAny(codigo, ['1.02.04'])) {
    return foraDaDre('Alienacao de ativos');
  }

  if (startsWithAny(codigo, ['1.03.01.05'])) {
    return foraDaDre('Transferencia entre empresas');
  }

  if (startsWithAny(codigo, ['1.03.01.02', '1.03.01.03', '1.03.01.04', '1.03.01.99', '1.03.03'])) {
    return dreClassification('Resultado financeiro', 'Receitas financeiras e variacoes ativas', 700);
  }

  if (startsWithAny(codigo, ['1.02.03'])) {
    return dreClassification('Outras receitas operacionais', 'Repasses e recuperacoes', 650);
  }

  if (nome.includes('RECEITA') || nome.includes('FATURAMENTO')) {
    return dreClassification('Receita operacional bruta', 'Outras receitas operacionais', 109);
  }

  return dreClassification('Receitas nao classificadas', null, 900);
}

function classificarPagar(codigo, nome) {
  if (startsWithAny(codigo, ['2.01.01.01'])) {
    return foraDaDre('Aquisicao de terrenos e bens imoveis');
  }

  if (startsWithAny(codigo, ['2.01.01'])) {
    return dreClassification('Custos das obras e servicos', 'Custos diretos de obra', 200);
  }

  if (startsWithAny(codigo, ['2.01.02', '2.01.03'])) {
    return dreClassification('Custos com pessoal', 'Mao de obra, beneficios e encargos operacionais', 250);
  }

  if (startsWithAny(codigo, ['2.01.04.01'])) {
    return foraDaDre('Aquisicao de equipamentos e veiculos');
  }

  if (startsWithAny(codigo, ['2.01.04'])) {
    return dreClassification('Custos com frota e equipamentos', 'Manutencao, abastecimento e locacoes', 300);
  }

  if (startsWithAny(codigo, ['2.01.05'])) {
    return dreClassification('Despesas administrativas', 'Viagens, hospedagens e deslocamentos', 410);
  }

  if (startsWithAny(codigo, ['2.01.06', '2.01.07', '2.01.08', '2.01.09', '2.01.11', '2.01.12', '2.10'])) {
    return dreClassification('Despesas administrativas', 'Estrutura administrativa e escritorio', 400);
  }

  if (startsWithAny(codigo, ['2.01.10'])) {
    return dreClassification('Despesas comerciais', 'Marketing, representacao e comissoes', 500);
  }

  if (startsWithAny(codigo, ['2.02.01.01', '2.02.01.02'])) {
    return dreClassification('Despesas administrativas', 'Pro-labore e gratificacoes', 420);
  }

  if (startsWithAny(codigo, ['2.02.01.99'])) {
    return dreClassification('Deducoes de custos e despesas', 'Reembolsos e recuperacoes', 740);
  }

  if (startsWithAny(codigo, ['2.02.01.03', '2.02.01.04', '2.02.02'])) {
    return foraDaDre('Distribuicao de resultado, aporte ou capital');
  }

  if (startsWithAny(codigo, ['2.03.01', '2.03.03', '2.03.04.03', '2.03.04.06', '2.03.04.07'])) {
    return dreClassification('Resultado financeiro', 'Despesas financeiras, juros e tarifas', 710);
  }

  if (startsWithAny(codigo, ['2.03.02', '2.03.04.01', '2.03.04.02', '2.03.04.04', '2.03.04.05'])) {
    return foraDaDre('Principal de financiamentos, emprestimos ou adiantamentos');
  }

  if (startsWithAny(codigo, ['2.03.05'])) {
    return dreClassification('Outras despesas', 'Acoes judiciais', 800);
  }

  if (startsWithAny(codigo, ['2.04.06'])) {
    return foraDaDre('Aplicacoes ou transferencias financeiras');
  }

  if (startsWithAny(codigo, ['2.04'])) {
    return dreClassification('Tributos e contribuicoes', 'Impostos, taxas e encargos', 600);
  }

  if (startsWithAny(codigo, ['2.09'])) {
    return dreClassification('Deducoes de custos e despesas', 'Retencoes e recuperacoes', 740);
  }

  if (nome.includes('DESPESA') || nome.includes('CUSTO')) {
    return dreClassification('Despesas administrativas', 'Outras despesas administrativas', 490);
  }

  return dreClassification('Custos e despesas nao classificados', null, 910);
}

function classificarCategoriaFinanceiraDre(categoria = {}) {
  const codigo = extractCodigoCategoria(categoria.nome);
  const nome = normalizeText(categoria.nome);
  const tipo = normalizeText(categoria.tipo || 'AMBOS');

  if (codigo) {
    if (codigo.startsWith('1.')) {
      return classificarReceber(codigo, nome);
    }
    if (codigo.startsWith('2.')) {
      return classificarPagar(codigo, nome);
    }
  }

  if (tipo === 'RECEBER') {
    return classificarReceber(codigo || '', nome);
  }

  if (tipo === 'PAGAR') {
    return classificarPagar(codigo || '', nome);
  }

  if (nome.includes('TARIFA') || nome.includes('JUROS') || nome.includes('IOF')) {
    return dreClassification('Resultado financeiro', 'Despesas financeiras, juros e tarifas', 710);
  }

  return {
    dre_grupo: null,
    dre_subgrupo: null,
    dre_ordem: null,
    considera_dre: true
  };
}

function isDreClassificationBlank(categoria = {}) {
  return (
    !String(categoria.dre_grupo || '').trim() &&
    !String(categoria.dre_subgrupo || '').trim() &&
    (categoria.dre_ordem === null || categoria.dre_ordem === undefined || categoria.dre_ordem === '')
  );
}

module.exports = {
  classificarCategoriaFinanceiraDre,
  extractCodigoCategoria,
  isCategoriaRedutora,
  isDreClassificationBlank
};
