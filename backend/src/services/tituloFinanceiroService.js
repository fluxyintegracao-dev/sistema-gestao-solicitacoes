const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  CartaoFinanceiro,
  ContaBancaria,
  EmpresaGrupo,
  Apropriacao,
  sequelize,
  CategoriaFinanceira,
  FaturaCartaoFinanceiro,
  FormaPagamentoFinanceira,
  Historico,
  IntegracaoSiengeFila,
  MovimentoFinanceiro,
  Obra,
  Parceiro,
  PaymentBatch,
  PaymentBatchItem,
  PaymentBeneficiary,
  PaymentIntent,
  SecurityEventLog,
  Solicitacao,
  TipoSolicitacao,
  TituloFinanceiro,
  User
} = require('../models');
const {
  canAccessFinanceiro,
  getFinanceiroObraScopeIds
} = require('./authorizationService');
const {
  obterOuCriarFaturaCartao,
  vincularTituloAFatura
} = require('./faturaCartaoFinanceiroService');
const { obterSessaoAbertaParaConta } = require('./financeiroCaixaSessionHelper');
const { registrarEventoSeguranca } = require('./securityLogService');
const { normalizeTipoIntercompany } = require('../constants/intercompany');

const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['NAO_APLICAVEL', 'PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function getHoje() {
  return new Date().toISOString().slice(0, 10);
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function addMonths(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = date.getDate();
  date.setMonth(date.getMonth() + Number(amount || 0), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function distribuirParcelas(valorTotal, quantidade) {
  const totalCentavos = Math.round(Number(valorTotal || 0) * 100);
  const base = Math.floor(totalCentavos / quantidade);
  let resto = totalCentavos - (base * quantidade);
  return Array.from({ length: quantidade }, () => {
    const centavos = base + (resto > 0 ? 1 : 0);
    if (resto > 0) resto -= 1;
    return roundCurrency(centavos / 100);
  });
}

function somarValores(values = []) {
  return roundCurrency(values.reduce((acc, value) => acc + Number(value || 0), 0));
}

function getValoresParcelas({ valorTotal, quantidade, parcelas = [], contexto = 'pagamento' }) {
  const quantidadeNormalizada = Math.max(Number(quantidade || 1), 1);
  const parcelasArray = Array.isArray(parcelas) ? parcelas : [];
  const temValoresInformados = parcelasArray.some((parcela) => parcela?.valor != null);

  if (temValoresInformados) {
    if (parcelasArray.length < quantidadeNormalizada) {
      throw createHttpError(400, `Informe o valor de todas as parcelas do ${contexto}.`);
    }

    const valores = Array.from({ length: quantidadeNormalizada }, (_, index) => {
      const valor = Number(parcelasArray[index]?.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        throw createHttpError(400, `Informe um valor valido para a parcela ${index + 1} do ${contexto}.`);
      }
      return roundCurrency(valor);
    });

    return valores;
  }

  const total = Number(valorTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw createHttpError(400, `Informe o valor do ${contexto}.`);
  }

  return distribuirParcelas(total, quantidadeNormalizada);
}

function assertValoresIguais({ atual, esperado, mensagem }) {
  if (Math.abs(roundCurrency(atual) - roundCurrency(esperado)) > 0.009) {
    throw createHttpError(400, mensagem);
  }
}

function normalizarTipoTitulo(value) {
  return String(value || 'PAGAR').trim().toUpperCase();
}

function normalizarFormaRecebimento(value) {
  return value ? String(value || '').trim().toUpperCase() : null;
}

function normalizarFormaCobranca(value) {
  if (!value) return null;
  const normalized = String(value || '').trim().toUpperCase();
  return FORMAS_COBRANCA.includes(normalized) ? normalized : null;
}

function normalizarStatusCobranca(value) {
  if (!value) return null;
  const normalized = String(value || '').trim().toUpperCase();
  return STATUS_COBRANCA.includes(normalized) ? normalized : null;
}

function getTipoFormaPagamento(formaPagamento) {
  return `${formaPagamento?.tipo || ''} ${formaPagamento?.codigo || ''}`.toUpperCase();
}

function isFormaCartao(formaPagamento) {
  return Boolean(formaPagamento?.exige_cartao) || getTipoFormaPagamento(formaPagamento).includes('CARTAO');
}

function isFormaCartaoComFatura(formaPagamento) {
  return Boolean(formaPagamento?.gera_fatura);
}

function isFormaBoleto(formaPagamento) {
  return getTipoFormaPagamento(formaPagamento).includes('BOLETO');
}

function isFormaCheque(formaPagamento) {
  return getTipoFormaPagamento(formaPagamento).includes('CHEQUE');
}

function getParcelaPayload(parcelas = [], index) {
  if (!Array.isArray(parcelas)) return {};
  return parcelas[index] || {};
}

function buildChequeFields(formaPagamento, parcela, index) {
  if (!isFormaCheque(formaPagamento)) {
    return {
      cheque_numero: null,
      cheque_banco: null,
      cheque_agencia: null,
      cheque_conta: null,
      cheque_emitente: null
    };
  }

  if (!String(parcela?.cheque_numero || '').trim()) {
    throw createHttpError(400, `Informe o numero do cheque da parcela ${index + 1}.`);
  }
  if (!String(parcela?.cheque_emitente || '').trim()) {
    throw createHttpError(400, `Informe o emitente do cheque da parcela ${index + 1}.`);
  }

  return {
    cheque_numero: String(parcela.cheque_numero || '').trim(),
    cheque_banco: parcela.cheque_banco || null,
    cheque_agencia: parcela.cheque_agencia || null,
    cheque_conta: parcela.cheque_conta || null,
    cheque_emitente: String(parcela.cheque_emitente || '').trim()
  };
}

function resolveVencimentoParcela({ formaPagamento, parcela, dataVencimentoBase, dataCompra, index }) {
  if (isFormaCartao(formaPagamento)) {
    return dataCompra;
  }

  if (isFormaBoleto(formaPagamento) || isFormaCheque(formaPagamento)) {
    if (!parcela?.data_vencimento) {
      const label = isFormaCheque(formaPagamento) ? 'cheque' : 'boleto';
      throw createHttpError(400, `Informe o vencimento do ${label} da parcela ${index + 1}.`);
    }
    return parcela.data_vencimento;
  }

  if (!dataVencimentoBase) {
    throw createHttpError(400, 'Data de vencimento e obrigatoria para gerar o titulo.');
  }

  return addMonths(dataVencimentoBase, index);
}

function getStatusCobrancaInicial(tipo, formaCobranca, statusCobranca = null) {
  if (String(tipo || '').toUpperCase() !== 'RECEBER') {
    return 'NAO_APLICAVEL';
  }

  if (statusCobranca) {
    return statusCobranca;
  }

  return formaCobranca ? 'PENDENTE_EMISSAO' : 'NAO_APLICAVEL';
}

function buildCobrancaFields(payload = {}, tipo) {
  if (String(tipo || '').toUpperCase() !== 'RECEBER') {
    return {
      forma_cobranca: null,
      status_cobranca: 'NAO_APLICAVEL',
      banco_cobranca: null,
      nosso_numero: null,
      linha_digitavel: null,
      codigo_barras: null,
      identificador_externo: null,
      boleto_emitido_em: null
    };
  }

  const formaCobranca = normalizarFormaCobranca(payload.forma_cobranca);
  const statusCobranca = getStatusCobrancaInicial(
    tipo,
    formaCobranca,
    normalizarStatusCobranca(payload.status_cobranca)
  );

  return {
    forma_cobranca: formaCobranca,
    status_cobranca: statusCobranca,
    banco_cobranca: payload.banco_cobranca || null,
    nosso_numero: payload.nosso_numero || null,
    linha_digitavel: payload.linha_digitavel || null,
    codigo_barras: payload.codigo_barras || null,
    identificador_externo: payload.identificador_externo || null,
    boleto_emitido_em: payload.boleto_emitido_em || null
  };
}

function buildUpdatedCobrancaFields(titulo, payload = {}) {
  if (String(titulo?.tipo || '').toUpperCase() !== 'RECEBER') {
    throw createHttpError(400, 'Somente titulos a receber podem receber dados de cobranca.');
  }

  const formaCobranca = payload.forma_cobranca !== undefined
    ? normalizarFormaCobranca(payload.forma_cobranca)
    : normalizarFormaCobranca(titulo.forma_cobranca);

  let statusCobranca = payload.status_cobranca !== undefined
    ? normalizarStatusCobranca(payload.status_cobranca)
    : normalizarStatusCobranca(titulo.status_cobranca);

  if (!statusCobranca) {
    statusCobranca = getStatusCobrancaInicial(titulo.tipo, formaCobranca);
  }

  if (statusCobranca !== 'NAO_APLICAVEL' && !formaCobranca) {
    throw createHttpError(400, 'Informe a forma de cobranca antes de definir o status da cobranca.');
  }

  return {
    forma_cobranca: formaCobranca,
    status_cobranca: statusCobranca,
    banco_cobranca: payload.banco_cobranca !== undefined ? payload.banco_cobranca : titulo.banco_cobranca,
    nosso_numero: payload.nosso_numero !== undefined ? payload.nosso_numero : titulo.nosso_numero,
    linha_digitavel: payload.linha_digitavel !== undefined ? payload.linha_digitavel : titulo.linha_digitavel,
    codigo_barras: payload.codigo_barras !== undefined ? payload.codigo_barras : titulo.codigo_barras,
    identificador_externo: payload.identificador_externo !== undefined ? payload.identificador_externo : titulo.identificador_externo,
    boleto_emitido_em: payload.boleto_emitido_em !== undefined ? payload.boleto_emitido_em : titulo.boleto_emitido_em
  };
}

function sugestaoTipoTitulo(solicitacao) {
  const tipoNome = String(solicitacao?.tipo?.nome || '').trim().toUpperCase();
  const areaResponsavel = String(solicitacao?.area_responsavel || '').trim().toUpperCase();

  if (tipoNome.includes('COMPRA') || areaResponsavel === 'COMPRAS') {
    return 'PAGAR';
  }

  return 'RECEBER';
}

function descricaoPadraoTitulo(solicitacao) {
  const codigo = String(solicitacao?.codigo || '').trim();
  const tipoNome = String(solicitacao?.tipo?.nome || '').trim();
  const descricao = String(solicitacao?.descricao || '').trim();
  const partes = [codigo, tipoNome].filter(Boolean);
  const prefixo = partes.join(' - ');

  if (!prefixo && !descricao) {
    return 'Titulo financeiro gerado por solicitacao';
  }

  if (!descricao) {
    return prefixo;
  }

  return `${prefixo}: ${descricao}`.slice(0, 255);
}

function descricaoPadraoTituloManual(tipo) {
  return tipo === 'RECEBER'
    ? 'Titulo financeiro manual de recebimento'
    : 'Titulo financeiro manual de pagamento';
}

function getSetorUsuario(req) {
  return req.user?.setor?.codigo || req.user?.area || req.user?.setor?.nome || 'FINANCEIRO';
}

async function assertFinanceAccess(req) {
  const allowed = await canAccessFinanceiro(req.user);
  if (allowed) {
    return;
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: 'FINANCEIRO',
    recursoId: req.originalUrl,
    status: 'DENIED',
    descricao: 'Usuario sem permissao para acessar rotas do modulo financeiro'
  });

  throw createHttpError(403, 'Acesso negado para o modulo financeiro');
}

async function assertObraScope(req, obraId, resourceType, resourceId, description) {
  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);
  if (obrasPermitidas === null) {
    return;
  }

  if (obrasPermitidas.length > 0 && obrasPermitidas.includes(Number(obraId))) {
    return;
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'AUTHZ_DENIED',
    recursoTipo: resourceType,
    recursoId: resourceId != null ? String(resourceId) : String(obraId),
    status: 'DENIED',
    descricao: description,
    metadata: {
      obra_id: Number(obraId) || null
    }
  });

  throw createHttpError(403, 'Acesso negado para esta obra');
}

function buildTituloInclude({ includeMovimentos = false } = {}) {
  const include = [
    {
      model: Obra,
      as: 'obra',
      attributes: ['id', 'nome', 'codigo', 'empresa_grupo_id']
    },
    {
      model: Parceiro,
      as: 'parceiro',
      attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email']
    },
    {
      model: Solicitacao,
      as: 'solicitacao',
      attributes: ['id', 'codigo', 'descricao', 'status_global', 'area_responsavel']
    },
    {
      model: CategoriaFinanceira,
      as: 'categoriaFinanceira',
      attributes: ['id', 'nome', 'tipo']
    },
    {
      model: EmpresaGrupo,
      as: 'empresa',
      attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
    },
    {
      model: EmpresaGrupo,
      as: 'empresaContraparte',
      attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
    },
    {
      model: EmpresaGrupo,
      as: 'empresaOrigem',
      attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
    },
    {
      model: EmpresaGrupo,
      as: 'empresaDestino',
      attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
    },
    {
      model: FormaPagamentoFinanceira,
      as: 'formaPagamento',
      attributes: ['id', 'nome', 'codigo', 'tipo', 'permite_parcelamento', 'gera_fatura', 'gera_boleto', 'exige_cartao']
    },
    {
      model: CartaoFinanceiro,
      as: 'cartao',
      attributes: ['id', 'nome', 'titular', 'tipo', 'bandeira', 'ultimos_digitos', 'dia_fechamento', 'dia_vencimento']
    },
    {
      model: FaturaCartaoFinanceiro,
      as: 'faturaCartao',
      attributes: ['id', 'competencia', 'data_fechamento', 'data_vencimento', 'valor_total', 'status']
    },
    {
      model: User,
      as: 'criadoPor',
      attributes: ['id', 'nome', 'email']
    },
    {
      model: IntegracaoSiengeFila,
      as: 'integracaoSienge',
      attributes: [
        'id',
        'origem_modulo',
        'status',
        'tentativas',
        'enviado_em',
        'ultimo_erro',
        'external_title_id',
        'updatedAt'
      ]
    }
  ];

  if (includeMovimentos) {
    include.push({
      model: MovimentoFinanceiro,
      as: 'movimentos',
      include: [
        {
          model: ContaBancaria,
          as: 'contaBancaria',
          attributes: ['id', 'nome', 'banco', 'agencia', 'conta', 'empresa_id']
        },
        {
          model: EmpresaGrupo,
          as: 'empresa',
          attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
        },
        {
          model: EmpresaGrupo,
          as: 'empresaOrigem',
          attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
        },
        {
          model: EmpresaGrupo,
          as: 'empresaDestino',
          attributes: ['id', 'codigo', 'nome', 'razao_social', 'cnpj']
        },
        {
          model: User,
          as: 'criadoPor',
          attributes: ['id', 'nome', 'email']
        },
        {
          model: User,
          as: 'estornadoPor',
          attributes: ['id', 'nome', 'email']
        }
      ],
      separate: true,
      order: [['data_movimento', 'DESC'], ['createdAt', 'DESC']]
    });
    include.push({
      model: PaymentIntent,
      as: 'paymentIntents',
      include: [
        {
          model: PaymentBeneficiary,
          as: 'beneficiary',
          attributes: ['id', 'nome', 'cpf_cnpj', 'pix_tipo_chave', 'pix_chave', 'ativo']
        },
        {
          model: PaymentBatchItem,
          as: 'batchItems',
          include: [{
            model: PaymentBatch,
            as: 'batch',
            attributes: ['id', 'codigo', 'status', 'valor_total', 'quantidade_itens', 'sent_at']
          }]
        }
      ],
      separate: true,
      order: [['createdAt', 'DESC']]
    });
  }

  return include;
}

async function carregarSolicitacaoFinanceira(req, solicitacaoId) {
  const solicitacao = await Solicitacao.findByPk(solicitacaoId, {
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'nome', 'codigo', 'empresa_grupo_id']
      },
      {
        model: Parceiro,
        as: 'parceiro',
        attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email', 'ativo']
      },
      {
        model: TipoSolicitacao,
        as: 'tipo',
        attributes: ['id', 'nome']
      }
    ]
  });

  if (!solicitacao) {
    throw createHttpError(404, 'Solicitacao nao encontrada');
  }

  await assertObraScope(
    req,
    solicitacao.obra_id,
    'SOLICITACAO',
    solicitacao.id,
    'Usuario tentou acessar titulo financeiro de solicitacao fora do seu escopo de obra'
  );

  return solicitacao;
}

async function validarCategoriaFinanceira(categoriaId, tipoTitulo) {
  if (!categoriaId) {
    return null;
  }

  const categoria = await CategoriaFinanceira.findByPk(categoriaId);
  if (!categoria || categoria.ativo === false) {
    throw createHttpError(400, 'Categoria financeira invalida.');
  }

  const tipoCategoria = String(categoria.tipo || '').trim().toUpperCase();
  if (tipoCategoria && tipoCategoria !== 'AMBOS' && tipoCategoria !== tipoTitulo) {
    throw createHttpError(400, 'Categoria financeira incompativel com o tipo do titulo.');
  }

  return categoria;
}

function validarCategoriaDreTitulo(categoria, payload = {}) {
  if (payload.considera_dre === false) {
    return;
  }

  if (!categoria) {
    throw createHttpError(
      400,
      'Categoria financeira e obrigatoria para titulos considerados na DRE. Informe uma categoria classificada ou desmarque Considerar na DRE.'
    );
  }

  if (categoria.considera_dre === false) {
    throw createHttpError(
      400,
      'A categoria financeira selecionada esta marcada fora da DRE. Escolha uma categoria de DRE ou desmarque Considerar na DRE.'
    );
  }

  if (!String(categoria.dre_grupo || '').trim()) {
    throw createHttpError(
      400,
      'A categoria financeira selecionada nao possui grupo DRE. Classifique a categoria antes de criar titulo considerado na DRE.'
    );
  }
}

async function validarFormaPagamentoFinanceira(formaPagamentoId, payload = {}) {
  if (!formaPagamentoId) {
    return null;
  }

  const forma = await FormaPagamentoFinanceira.findByPk(formaPagamentoId);
  if (!forma || forma.ativo === false) {
    throw createHttpError(400, 'Forma de pagamento invalida.');
  }

  const quantidadeParcelas = Math.max(Number(payload.quantidade_parcelas || 1), 1);
  if (quantidadeParcelas > 1 && forma.permite_parcelamento === false) {
    throw createHttpError(400, 'A forma de pagamento selecionada nao permite parcelamento.');
  }

  if (forma.exige_cartao && !payload.cartao_id) {
    throw createHttpError(400, 'Selecione o cartao para esta forma de pagamento.');
  }

  if (forma.exige_cartao && payload.cartao_id) {
    const cartao = await CartaoFinanceiro.findByPk(payload.cartao_id);
    if (!cartao || cartao.ativo === false) {
      throw createHttpError(400, 'Cartao financeiro invalido ou inativo.');
    }

    const tipoForma = `${forma.tipo || ''} ${forma.codigo || ''}`.toUpperCase();
    const tipoCartaoEsperado = tipoForma.includes('DEBITO')
      ? 'DEBITO'
      : tipoForma.includes('CREDITO')
        ? 'CREDITO'
        : null;
    const tipoCartao = String(cartao.tipo || 'CREDITO').trim().toUpperCase();

    if (tipoCartaoEsperado && tipoCartao !== tipoCartaoEsperado) {
      throw createHttpError(
        400,
        tipoCartaoEsperado === 'CREDITO'
          ? 'Selecione um cartao de credito para esta forma de pagamento.'
          : 'Selecione um cartao de debito para esta forma de pagamento.'
      );
    }

    if (forma.gera_fatura && tipoCartao !== 'CREDITO') {
      throw createHttpError(400, 'Somente cartoes de credito podem gerar fatura.');
    }
  }

  return forma;
}

async function baixarTituloCartaoDebitoNoAto({
  req,
  titulo,
  formaPagamento,
  pagamentoPayload = {},
  dataMovimento,
  transaction
}) {
  if (!formaPagamento?.exige_cartao || !pagamentoPayload.cartao_id) {
    return null;
  }

  const cartao = await CartaoFinanceiro.findByPk(pagamentoPayload.cartao_id, {
    include: [{ model: ContaBancaria, as: 'contaBancaria' }],
    transaction
  });

  if (!cartao || cartao.ativo === false) {
    throw createHttpError(400, 'Cartao financeiro invalido ou inativo.');
  }

  const tipoCartao = String(cartao.tipo || 'CREDITO').trim().toUpperCase();
  if (tipoCartao !== 'DEBITO') {
    return null;
  }

  const conta = cartao.contaBancaria;
  if (!conta || conta.ativo === false) {
    throw createHttpError(
      400,
      'Cartao de debito precisa ter uma conta bancaria ativa vinculada para baixar no ato do registro.'
    );
  }

  if (!titulo.empresa_id) {
    throw createHttpError(
      400,
      `Titulo ${titulo.codigo || titulo.id} sem empresa vinculada. Corrija a empresa antes de usar cartao de debito.`
    );
  }

  const empresaBaixaId = await validarEmpresaBaixa({
    empresaId: titulo.empresa_id,
    conta
  });
  const dataBaixa = dataMovimento || titulo.data_compra || titulo.data_vencimento || getHoje();
  const valorBaixa = roundCurrency(titulo.valor_saldo || titulo.valor_original);
  if (valorBaixa <= 0) {
    return null;
  }

  const caixaSessao = await obterSessaoAbertaParaConta(conta, dataBaixa, { transaction });
  const movimento = await MovimentoFinanceiro.create({
    titulo_financeiro_id: titulo.id,
    conta_bancaria_id: conta.id,
    empresa_id: empresaBaixaId,
    intercompany_group_id: titulo.intercompany_group_id || null,
    empresa_origem_id: titulo.empresa_origem_id || null,
    empresa_destino_id: titulo.empresa_destino_id || null,
    tipo_intercompany: titulo.tipo_intercompany || null,
    motivo_intercompany: titulo.motivo_intercompany || null,
    elimina_consolidado: Boolean(titulo.elimina_consolidado),
    transferencia_interna: Boolean(titulo.transferencia_interna),
    caixa_sessao_id: caixaSessao?.id || null,
    forma_recebimento: 'CARTAO_DEBITO',
    tipo_movimento: 'BAIXA',
    status: 'ATIVO',
    valor: valorBaixa,
    juros: 0,
    multa: 0,
    desconto: 0,
    valor_quitacao: valorBaixa,
    data_movimento: dataBaixa,
    observacoes: `Baixa automatica por cartao de debito ${cartao.nome || cartao.id}`,
    criado_por: req.user?.id || null
  }, { transaction });

  await titulo.update({
    valor_baixado: roundCurrency(Number(titulo.valor_baixado || 0) + valorBaixa),
    valor_saldo: 0,
    status: 'QUITADO',
    data_quitacao: dataBaixa,
    atualizado_por: req.user?.id || null
  }, { transaction });

  return { movimento, cartao, conta, valorBaixa, dataBaixa };
}

async function validarParceiro(parceiroId) {
  const parceiro = await Parceiro.findByPk(parceiroId);
  if (!parceiro || parceiro.ativo === false) {
    throw createHttpError(400, 'Parceiro invalido.');
  }
  return parceiro;
}

function validarCompatibilidadeParceiroTitulo(parceiro, tipoTitulo) {
  const tipo = normalizarTipoTitulo(tipoTitulo);
  if (tipo === 'PAGAR' && parceiro.fornecedor === false && parceiro.corretor === false) {
    throw createHttpError(400, 'O parceiro selecionado nao esta marcado como fornecedor ou corretor.');
  }

  if (tipo === 'RECEBER' && parceiro.cliente === false) {
    throw createHttpError(400, 'O parceiro selecionado nao esta marcado como cliente.');
  }
}

async function validarObraTitulo(req, obraId) {
  const obra = await Obra.findByPk(obraId, {
    attributes: ['id', 'nome', 'codigo', 'tipo_centro_custo', 'empresa_grupo_id']
  });

  if (!obra) {
    throw createHttpError(400, 'Obra invalida.');
  }

  await assertObraScope(
    req,
    obra.id,
    'TITULO_FINANCEIRO',
    obra.id,
    'Usuario tentou criar ou acessar titulo financeiro de obra fora do seu escopo'
  );

  return obra;
}

async function validarApropriacaoTitulo(apropriacaoId, obraId) {
  if (!apropriacaoId) {
    return null;
  }

  const apropriacao = await Apropriacao.findByPk(apropriacaoId);
  if (!apropriacao || apropriacao.ativo === false) {
    throw createHttpError(400, 'Apropriacao informada nao foi encontrada.');
  }

  if (Number(apropriacao.obra_id) !== Number(obraId)) {
    throw createHttpError(400, 'A apropriacao informada nao pertence a obra/centro de custo selecionado.');
  }

  return apropriacao;
}

async function validarContaBancaria(contaBancariaId) {
  if (!contaBancariaId) {
    return null;
  }
  const conta = await ContaBancaria.findByPk(contaBancariaId);
  if (!conta || conta.ativo === false) {
    throw createHttpError(400, 'Conta bancaria invalida.');
  }
  return conta;
}

async function validarEmpresaGrupo(empresaId) {
  if (!empresaId) {
    return null;
  }
  const id = Number(empresaId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'Empresa do grupo invalida.');
  }
  const empresa = await EmpresaGrupo.findByPk(id);
  if (!empresa || empresa.ativo === false) {
    throw createHttpError(400, 'Empresa do grupo invalida ou inativa.');
  }
  return empresa;
}

async function validarEmpresaBaixa({ empresaId, conta }) {
  const empresa = await validarEmpresaGrupo(empresaId);
  if (!empresa) {
    throw createHttpError(400, 'Empresa pagadora e obrigatoria para registrar a baixa.');
  }

  const empresaBaixaId = Number(empresa.id);
  if (conta && !conta.empresa_id) {
    throw createHttpError(400, 'A conta bancaria selecionada nao possui empresa vinculada.');
  }

  if (conta?.empresa_id && Number(conta.empresa_id) !== empresaBaixaId) {
    throw createHttpError(400, 'A empresa pagadora deve ser a mesma vinculada a conta bancaria selecionada.');
  }

  return empresaBaixaId;
}

function resolverEmpresaTitulo({ empresaIdInformada, obra }) {
  const empresaInformada = empresaIdInformada ? Number(empresaIdInformada) : null;
  const empresaDaObra = obra?.empresa_grupo_id ? Number(obra.empresa_grupo_id) : null;

  if (!Number.isInteger(empresaInformada) || empresaInformada <= 0) {
    throw createHttpError(
      400,
      'Empresa do titulo e obrigatoria. Informe a empresa real antes de salvar.'
    );
  }

  if (empresaInformada && empresaDaObra && empresaInformada !== empresaDaObra) {
    throw createHttpError(
      400,
      'A empresa do titulo deve ser a mesma vinculada a obra/centro de custo selecionado.'
    );
  }

  return empresaInformada;
}

function resolverCompetenciaTitulo(payload = {}) {
  const competenciaData = payload.competencia_data || null;
  if (payload.considera_dre !== false && !competenciaData) {
    throw createHttpError(
      400,
      'Competencia DRE e obrigatoria para titulos considerados na DRE. Informe a competencia economica real ou desmarque Considerar na DRE.'
    );
  }

  return competenciaData;
}

async function validarIntercompanyTitulo(payload = {}) {
  const isIntercompany = Boolean(payload.intercompany);

  if (!isIntercompany) {
    return {
      intercompany: false,
      empresa_contraparte_id: null,
      intercompany_group_id: null,
      empresa_origem_id: null,
      empresa_destino_id: null,
      tipo_intercompany: null,
      motivo_intercompany: null,
      elimina_consolidado: false,
      transferencia_interna: false
    };
  }

  const tipoIntercompany = normalizeTipoIntercompany(payload.tipo_intercompany);
  if (!tipoIntercompany) {
    throw createHttpError(400, 'Tipo intercompany e obrigatorio para movimentos entre empresas.');
  }

  const [empresaOrigem, empresaDestino, empresaContraparte] = await Promise.all([
    validarEmpresaGrupo(payload.empresa_origem_id),
    validarEmpresaGrupo(payload.empresa_destino_id),
    validarEmpresaGrupo(payload.empresa_contraparte_id)
  ]);

  if (!empresaOrigem || !empresaDestino) {
    throw createHttpError(400, 'Empresa origem e empresa destino sao obrigatorias para intercompany.');
  }
  if (Number(empresaOrigem.id) === Number(empresaDestino.id)) {
    throw createHttpError(400, 'Empresa origem e empresa destino nao podem ser iguais.');
  }
  if (!empresaContraparte) {
    throw createHttpError(400, 'Empresa contraparte e obrigatoria para intercompany.');
  }

  return {
    intercompany: true,
    empresa_contraparte_id: Number(empresaContraparte.id),
    intercompany_group_id: payload.intercompany_group_id || `IC-${crypto.randomUUID()}`,
    empresa_origem_id: Number(empresaOrigem.id),
    empresa_destino_id: Number(empresaDestino.id),
    tipo_intercompany: tipoIntercompany,
    motivo_intercompany: payload.motivo_intercompany || null,
    elimina_consolidado: payload.elimina_consolidado !== false,
    transferencia_interna: payload.transferencia_interna !== false
  };
}

function buildMovimentoIntercompanyFields(titulo = {}) {
  return {
    intercompany_group_id: titulo.intercompany_group_id || null,
    empresa_origem_id: titulo.empresa_origem_id || null,
    empresa_destino_id: titulo.empresa_destino_id || null,
    tipo_intercompany: titulo.tipo_intercompany || null,
    motivo_intercompany: titulo.motivo_intercompany || null,
    elimina_consolidado: Boolean(titulo.elimina_consolidado),
    transferencia_interna: Boolean(titulo.transferencia_interna)
  };
}

async function validarIntercompanyBaixa({ payload = {}, titulo = {}, empresaBaixaId }) {
  const empresaTituloId = titulo?.empresa_id ? Number(titulo.empresa_id) : null;
  if (!empresaTituloId) {
    throw createHttpError(
      400,
      'Titulo sem empresa vinculada. Corrija a empresa do titulo antes de registrar baixa.'
    );
  }

  const empresasDiferentes = Boolean(
    empresaTituloId &&
    empresaBaixaId &&
    Number(empresaTituloId) !== Number(empresaBaixaId)
  );

  if (!empresasDiferentes) {
    if (payload.intercompany && !titulo.intercompany) {
      throw createHttpError(
        400,
        'A baixa so deve ser marcada como intercompany quando a empresa da baixa for diferente da empresa do titulo.'
      );
    }
    return buildMovimentoIntercompanyFields(titulo);
  }

  if (!payload.intercompany) {
    throw createHttpError(
      400,
      'A empresa da baixa e diferente da empresa do titulo. Marque a baixa como intercompany e informe o tipo para manter rastreabilidade.'
    );
  }

  const tipoIntercompany = normalizeTipoIntercompany(payload.tipo_intercompany);
  if (!tipoIntercompany) {
    throw createHttpError(400, 'Tipo intercompany e obrigatorio quando outra empresa paga ou recebe a baixa.');
  }

  await validarEmpresaGrupo(empresaTituloId);

  const isPagar = String(titulo.tipo || '').toUpperCase() === 'PAGAR';
  return {
    intercompany_group_id: payload.intercompany_group_id || `IC-BAIXA-${crypto.randomUUID()}`,
    empresa_origem_id: isPagar ? Number(empresaBaixaId) : Number(empresaTituloId),
    empresa_destino_id: isPagar ? Number(empresaTituloId) : Number(empresaBaixaId),
    tipo_intercompany: tipoIntercompany,
    motivo_intercompany: payload.motivo_intercompany || null,
    elimina_consolidado: payload.elimina_consolidado !== false,
    transferencia_interna: payload.transferencia_interna !== false
  };
}

async function carregarTituloPorId(req, tituloId, { includeMovimentos = false } = {}) {
  await assertFinanceAccess(req);

  const titulo = await TituloFinanceiro.findByPk(tituloId, {
    include: buildTituloInclude({ includeMovimentos })
  });

  if (!titulo) {
    throw createHttpError(404, 'Titulo financeiro nao encontrado');
  }

  await assertObraScope(
    req,
    titulo.obra_id,
    'TITULO_FINANCEIRO',
    titulo.id,
    'Usuario tentou acessar titulo financeiro fora do seu escopo de obra'
  );

  return titulo;
}

function assertTituloEditavel(titulo) {
  const status = String(titulo?.status || '').trim().toUpperCase();
  const valorBaixado = Number(titulo?.valor_baixado || 0);
  const movimentosAtivos = Array.isArray(titulo?.movimentos)
    ? titulo.movimentos.filter((item) => String(item?.status || '').trim().toUpperCase() === 'ATIVO')
    : [];
  const paymentIntentsAtivos = Array.isArray(titulo?.paymentIntents)
    ? titulo.paymentIntents.filter((intent) => {
        const intentStatus = String(intent?.status || '').trim().toUpperCase();
        return !['CANCELADO', 'REJEITADO', 'REJEITADO_BANCO'].includes(intentStatus);
      })
    : [];

  if (status !== 'ABERTO') {
    throw createHttpError(400, 'Somente titulos em aberto podem ser editados.');
  }

  if (valorBaixado > 0 || movimentosAtivos.length > 0) {
    throw createHttpError(400, 'Titulo com baixa registrada nao pode ser editado. Estorne a baixa antes de corrigir o lancamento.');
  }

  if (paymentIntentsAtivos.length > 0) {
    throw createHttpError(400, 'Titulo com pagamento em massa vinculado nao pode ser editado. Cancele ou rejeite o pagamento antes de corrigir o lancamento.');
  }
}

async function atualizarTitulo(req, tituloId, payload = {}) {
  await assertFinanceAccess(req);

  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: true });
  assertTituloEditavel(titulo);

  const tipo = normalizarTipoTitulo(payload.tipo || titulo.tipo);
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const obraId = Number(payload.obra_id);
  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw createHttpError(400, 'Obra/Centro de custo e obrigatorio para editar o titulo.');
  }

  const parceiroId = Number(payload.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para editar o titulo.');
  }

  const valorOriginal = Number(payload.valor);
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createHttpError(400, 'Valor invalido para editar o titulo.');
  }

  const descricao = String(payload.descricao || '').trim();
  if (!descricao) {
    throw createHttpError(400, 'Descricao e obrigatoria para editar o titulo.');
  }

  if (titulo.fatura_cartao_id && roundCurrency(valorOriginal) !== roundCurrency(titulo.valor_original)) {
    throw createHttpError(
      400,
      'Titulo vinculado a fatura de cartao nao permite alterar valor por esta tela. Ajuste a fatura ou cancele o lancamento de origem.'
    );
  }

  const [obra, parceiro, categoria] = await Promise.all([
    validarObraTitulo(req, obraId),
    validarParceiro(parceiroId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo)
  ]);
  const empresaTituloId = resolverEmpresaTitulo({
    empresaIdInformada: payload.empresa_id,
    obra
  });
  await validarEmpresaGrupo(empresaTituloId);
  const apropriacao = await validarApropriacaoTitulo(payload.apropriacao_id, obra.id);

  validarCompatibilidadeParceiroTitulo(parceiro, tipo);
  validarCategoriaDreTitulo(categoria, payload);
  const intercompanyFields = await validarIntercompanyTitulo(payload);
  const competenciaData = resolverCompetenciaTitulo(payload);

  const antes = {
    tipo: titulo.tipo,
    empresa_id: titulo.empresa_id,
    obra_id: titulo.obra_id,
    apropriacao_id: titulo.apropriacao_id,
    parceiro_id: titulo.parceiro_id,
    categoria_financeira_id: titulo.categoria_financeira_id,
    valor_original: roundCurrency(titulo.valor_original),
    data_vencimento: titulo.data_vencimento,
    competencia_data: titulo.competencia_data,
    considera_dre: titulo.considera_dre,
    intercompany: titulo.intercompany
  };

  await titulo.update({
    obra_id: obra.id,
    apropriacao_id: apropriacao?.id || null,
    empresa_id: empresaTituloId,
    ...intercompanyFields,
    parceiro_id: parceiro.id,
    categoria_financeira_id: categoria?.id || null,
    tipo,
    descricao,
    numero_documento: payload.numero_documento || null,
    valor_original: roundCurrency(valorOriginal),
    valor_saldo: roundCurrency(valorOriginal),
    valor_baixado: 0,
    data_emissao: payload.data_emissao || null,
    data_vencimento: payload.data_vencimento,
    data_quitacao: null,
    competencia_data: competenciaData,
    considera_dre: payload.considera_dre !== false,
    observacoes: payload.observacoes || null,
    ...buildCobrancaFields(payload, tipo),
    atualizado_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_TITLE_UPDATED',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: titulo.id,
    status: 'SUCCESS',
    descricao: 'Titulo financeiro editado antes da baixa',
    metadata: {
      antes,
      depois: {
        tipo,
        empresa_id: empresaTituloId,
        obra_id: obra.id,
        apropriacao_id: apropriacao?.id || null,
        parceiro_id: parceiro.id,
        categoria_financeira_id: categoria?.id || null,
        valor_original: roundCurrency(valorOriginal),
        data_vencimento: payload.data_vencimento,
        competencia_data: competenciaData,
        considera_dre: payload.considera_dre !== false,
        intercompany: Boolean(intercompanyFields.intercompany)
      }
    }
  });

  return carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
}

async function listarTitulos(req, filters = {}) {
  await assertFinanceAccess(req);

  const where = {};
  const obraFiltro = Number(filters.obra_id);
  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);

  if (obrasPermitidas === null) {
    if (obraFiltro) {
      where.obra_id = obraFiltro;
    }
  } else if (obrasPermitidas.length > 0) {
    if (obraFiltro && !obrasPermitidas.includes(obraFiltro)) {
      await assertObraScope(
        req,
        obraFiltro,
        'TITULO_FINANCEIRO',
        null,
        'Usuario tentou listar titulos financeiros de obra fora do seu escopo'
      );
    }

    where.obra_id = obraFiltro || { [Op.in]: obrasPermitidas };
  } else {
    if (obraFiltro) {
      await assertObraScope(
        req,
        obraFiltro,
        'TITULO_FINANCEIRO',
        null,
        'Usuario tentou listar titulos financeiros sem vinculo de obra'
      );
    }
    return [];
  }

  if (filters.tipo) {
    where.tipo = filters.tipo;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.codigo) {
    where.codigo = { [Op.like]: `%${filters.codigo}%` };
  }
  if (filters.empresa_id) {
    where.empresa_id = Number(filters.empresa_id);
  }
  if (filters.numero_documento) {
    where.numero_documento = { [Op.like]: `%${filters.numero_documento}%` };
  }
  if (filters.descricao) {
    where.descricao = { [Op.like]: `%${filters.descricao}%` };
  }
  if (filters.parceiro_id) {
    where.parceiro_id = Number(filters.parceiro_id);
  }
  if (filters.categoria_financeira_id) {
    where.categoria_financeira_id = Number(filters.categoria_financeira_id);
  }
  if (filters.solicitacao_id) {
    where.solicitacao_id = Number(filters.solicitacao_id);
  }
  if (filters.data_emissao_inicial || filters.data_emissao_final) {
    where.data_emissao = {};
    if (filters.data_emissao_inicial) {
      where.data_emissao[Op.gte] = filters.data_emissao_inicial;
    }
    if (filters.data_emissao_final) {
      where.data_emissao[Op.lte] = filters.data_emissao_final;
    }
  }
  if (filters.vencimento_inicial || filters.vencimento_final) {
    where.data_vencimento = {};
    if (filters.vencimento_inicial) {
      where.data_vencimento[Op.gte] = filters.vencimento_inicial;
    }
    if (filters.vencimento_final) {
      where.data_vencimento[Op.lte] = filters.vencimento_final;
    }
  }
  if (filters.q) {
    const term = String(filters.q).trim();
    where[Op.or] = [
      { codigo: { [Op.like]: `%${term}%` } },
      { descricao: { [Op.like]: `%${term}%` } },
      { numero_documento: { [Op.like]: `%${term}%` } },
      { '$parceiro.nome$': { [Op.like]: `%${term}%` } },
      { '$parceiro.cpf_cnpj$': { [Op.like]: `%${term}%` } },
      { '$obra.nome$': { [Op.like]: `%${term}%` } },
      { '$obra.codigo$': { [Op.like]: `%${term}%` } },
      { '$solicitacao.codigo$': { [Op.like]: `%${term}%` } }
    ];
  }

  return TituloFinanceiro.findAll({
    where,
    include: buildTituloInclude(),
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'DESC']
    ]
  });
}

async function listarBaixasRealizadas(req, filters = {}) {
  await assertFinanceAccess(req);

  const obrasPermitidas = await getFinanceiroObraScopeIds(req.user);
  const obraFiltro = Number(filters.obra_id);
  const tituloWhere = {};
  const movimentoWhere = {
    tipo_movimento: 'BAIXA'
  };

  if (obrasPermitidas === null) {
    if (obraFiltro) {
      tituloWhere.obra_id = obraFiltro;
    }
  } else if (obrasPermitidas.length > 0) {
    if (obraFiltro && !obrasPermitidas.includes(obraFiltro)) {
      await assertObraScope(
        req,
        obraFiltro,
        'MOVIMENTO_FINANCEIRO',
        null,
        'Usuario tentou listar baixas financeiras de obra fora do seu escopo'
      );
    }

    tituloWhere.obra_id = obraFiltro || { [Op.in]: obrasPermitidas };
  } else {
    if (obraFiltro) {
      await assertObraScope(
        req,
        obraFiltro,
        'MOVIMENTO_FINANCEIRO',
        null,
        'Usuario tentou listar baixas financeiras sem vinculo de obra'
      );
    }
    return [];
  }

  if (filters.tipo) {
    tituloWhere.tipo = filters.tipo;
  }
  if (filters.parceiro_id) {
    tituloWhere.parceiro_id = Number(filters.parceiro_id);
  }
  if (filters.categoria_financeira_id) {
    tituloWhere.categoria_financeira_id = Number(filters.categoria_financeira_id);
  }
  if (filters.conta_bancaria_id) {
    movimentoWhere.conta_bancaria_id = Number(filters.conta_bancaria_id);
  }

  const statusMovimento = String(filters.status_movimento || 'ATIVO').toUpperCase();
  if (statusMovimento && statusMovimento !== 'TODOS') {
    movimentoWhere.status = statusMovimento;
  }

  if (filters.data_inicial || filters.data_final) {
    movimentoWhere.data_movimento = {};
    if (filters.data_inicial) {
      movimentoWhere.data_movimento[Op.gte] = filters.data_inicial;
    }
    if (filters.data_final) {
      movimentoWhere.data_movimento[Op.lte] = filters.data_final;
    }
  }

  if (filters.q) {
    const term = String(filters.q).trim();
    movimentoWhere[Op.or] = [
      { documento_referencia: { [Op.like]: `%${term}%` } },
      { observacoes: { [Op.like]: `%${term}%` } },
      { '$titulo.codigo$': { [Op.like]: `%${term}%` } },
      { '$titulo.descricao$': { [Op.like]: `%${term}%` } },
      { '$titulo.numero_documento$': { [Op.like]: `%${term}%` } },
      { '$titulo.parceiro.nome$': { [Op.like]: `%${term}%` } },
      { '$titulo.parceiro.cpf_cnpj$': { [Op.like]: `%${term}%` } },
      { '$titulo.obra.nome$': { [Op.like]: `%${term}%` } },
      { '$titulo.obra.codigo$': { [Op.like]: `%${term}%` } }
    ];
  }

  return MovimentoFinanceiro.findAll({
    where: movimentoWhere,
    include: [
      {
        model: TituloFinanceiro,
        as: 'titulo',
        required: true,
        where: tituloWhere,
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'nome', 'codigo', 'empresa_grupo_id']
          },
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome', 'cpf_cnpj']
          },
          {
            model: CategoriaFinanceira,
            as: 'categoriaFinanceira',
            attributes: ['id', 'nome', 'tipo']
          }
        ]
      },
      {
        model: ContaBancaria,
        as: 'contaBancaria',
        attributes: ['id', 'nome', 'banco', 'agencia', 'conta']
      },
      {
        model: User,
        as: 'criadoPor',
        attributes: ['id', 'nome', 'email']
      },
      {
        model: User,
        as: 'estornadoPor',
        attributes: ['id', 'nome', 'email']
      }
    ],
    order: [
      ['data_movimento', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: Number(filters.limit || 200),
    subQuery: false
  });
}

async function listarTitulosPorSolicitacao(req, solicitacaoId) {
  await assertFinanceAccess(req);
  const solicitacao = await carregarSolicitacaoFinanceira(req, solicitacaoId);

  return TituloFinanceiro.findAll({
    where: {
      solicitacao_id: solicitacao.id
    },
    include: buildTituloInclude(),
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'DESC']
    ]
  });
}

async function criarTituloPorSolicitacao(req, solicitacaoId, payload = {}) {
  await assertFinanceAccess(req);
  const solicitacao = await carregarSolicitacaoFinanceira(req, solicitacaoId);

  const tipo = normalizarTipoTitulo(payload.tipo || sugestaoTipoTitulo(solicitacao));
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const parceiroId = Number(payload.parceiro_id || solicitacao.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para gerar o titulo.');
  }

  const valorSolicitacao = Number(solicitacao.valor != null ? solicitacao.valor : payload.valor);
  if (!Number.isFinite(valorSolicitacao) || valorSolicitacao <= 0) {
    throw createHttpError(400, 'Valor invalido para gerar o titulo.');
  }

  const empresaTituloId = resolverEmpresaTitulo({
    empresaIdInformada: payload.empresa_id,
    obra: solicitacao.obra
  });

  const [parceiro,, categoria] = await Promise.all([
    validarParceiro(parceiroId),
    validarEmpresaGrupo(empresaTituloId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo)
  ]);
  validarCompatibilidadeParceiroTitulo(parceiro, tipo);
  validarCategoriaDreTitulo(categoria, payload);
  const intercompanyFields = await validarIntercompanyTitulo(payload);

  const pagamentosPayload = Array.isArray(payload.pagamentos) && payload.pagamentos.length > 0
    ? payload.pagamentos
    : [payload];

  const pagamentos = [];
  for (const [pagamentoIndex, pagamentoPayload] of pagamentosPayload.entries()) {
    const formaPagamento = await validarFormaPagamentoFinanceira(pagamentoPayload.forma_pagamento_id, pagamentoPayload);
    const quantidadeParcelas = Math.max(
      Number(pagamentoPayload.quantidade_parcelas || pagamentoPayload.parcelas?.length || 1),
      1
    );
    const dataCompra = pagamentoPayload.data_compra || payload.data_compra || payload.data_emissao || getHoje();
    const dataVencimento = pagamentoPayload.data_vencimento || payload.data_vencimento || solicitacao.data_vencimento;
    const parcelas = Array.isArray(pagamentoPayload.parcelas) ? pagamentoPayload.parcelas : [];
    const valorPagamentoInformado = pagamentoPayload.valor != null
      ? Number(pagamentoPayload.valor)
      : pagamentosPayload.length === 1
        ? valorSolicitacao
        : undefined;
    const valoresParcelas = getValoresParcelas({
      valorTotal: valorPagamentoInformado,
      quantidade: quantidadeParcelas,
      parcelas,
      contexto: `pagamento ${pagamentoIndex + 1}`
    });
    const totalPagamento = somarValores(valoresParcelas);

    if (valorPagamentoInformado != null) {
      assertValoresIguais({
        atual: totalPagamento,
        esperado: valorPagamentoInformado,
        mensagem: `A soma das parcelas do pagamento ${pagamentoIndex + 1} deve bater com o valor informado para ele.`
      });
    }

    pagamentos.push({
      formaPagamento,
      payload: pagamentoPayload,
      quantidadeParcelas,
      valoresParcelas,
      totalPagamento,
      dataCompra,
      dataVencimento,
      grupoParcelamentoId: quantidadeParcelas > 1 ? `PARC-${crypto.randomUUID()}` : null
    });
  }

  const valorOriginal = somarValores(pagamentos.map((pagamento) => pagamento.totalPagamento));
  assertValoresIguais({
    atual: valorOriginal,
    esperado: valorSolicitacao,
    mensagem: 'A soma dos titulos gerados precisa bater com o valor da solicitacao.'
  });

  const descricaoBase = String(payload.descricao || descricaoPadraoTitulo(solicitacao)).trim();

  const transaction = await sequelize.transaction();
  const titulosCriados = [];
  const baixasCartaoDebito = [];
  try {
    for (const [pagamentoIndex, pagamento] of pagamentos.entries()) {
      for (let index = 0; index < pagamento.quantidadeParcelas; index += 1) {
        const numeroParcela = index + 1;
        const valorParcela = pagamento.valoresParcelas[index];
        const parcelaPayload = getParcelaPayload(pagamento.payload.parcelas, index);
        const vencimentoParcela = resolveVencimentoParcela({
          formaPagamento: pagamento.formaPagamento,
          parcela: parcelaPayload,
          dataVencimentoBase: pagamento.dataVencimento,
          dataCompra: pagamento.dataCompra,
          index
        });
        const totalParcelasDoGrupo = pagamento.quantidadeParcelas;
        const prefixoForma = pagamentos.length > 1 ? `Forma ${pagamentoIndex + 1} - ` : '';
        const descricaoParcela = totalParcelasDoGrupo > 1
          ? `${prefixoForma}${descricaoBase}`.slice(0, 205) + ` - Parcela ${numeroParcela}/${totalParcelasDoGrupo}`
          : `${prefixoForma}${descricaoBase}`.slice(0, 255);
        const chequeFields = buildChequeFields(pagamento.formaPagamento, parcelaPayload, index);

        const titulo = await TituloFinanceiro.create({
          solicitacao_id: solicitacao.id,
          obra_id: solicitacao.obra_id,
          apropriacao_id: solicitacao.apropriacao_id || null,
          empresa_id: empresaTituloId,
          ...intercompanyFields,
          parceiro_id: parceiroId,
          categoria_financeira_id: categoria?.id || null,
          forma_pagamento_id: pagamento.formaPagamento?.id || null,
          cartao_id: pagamento.payload.cartao_id || null,
          grupo_parcelamento_id: pagamento.grupoParcelamentoId,
          numero_parcela: totalParcelasDoGrupo > 1 ? numeroParcela : null,
          total_parcelas: totalParcelasDoGrupo > 1 ? totalParcelasDoGrupo : null,
          data_compra: pagamento.dataCompra,
          competencia_data: resolverCompetenciaTitulo(payload),
          considera_dre: payload.considera_dre !== false,
          origem_titulo: 'SOLICITACAO',
          tipo,
          status: 'ABERTO',
          descricao: descricaoParcela || descricaoPadraoTitulo(solicitacao),
          numero_documento: parcelaPayload.numero_documento || pagamento.payload.numero_documento || payload.numero_documento || chequeFields.cheque_numero || null,
          ...chequeFields,
          valor_original: valorParcela,
          valor_saldo: valorParcela,
          valor_baixado: 0,
          data_emissao: payload.data_emissao || getHoje(),
          data_vencimento: vencimentoParcela,
          data_quitacao: null,
          observacoes: parcelaPayload.observacoes || pagamento.payload.observacoes || payload.observacoes || null,
          ...buildCobrancaFields(payload, tipo),
          criado_por: req.user?.id || null,
          atualizado_por: req.user?.id || null
        }, { transaction });

        if (pagamento.formaPagamento?.gera_fatura && pagamento.payload.cartao_id) {
          const { fatura } = await obterOuCriarFaturaCartao({
            cartaoId: pagamento.payload.cartao_id,
            dataCompra: pagamento.dataCompra,
            parcelaOffset: index,
            usuarioId: req.user?.id || null,
            transaction
          });
          await vincularTituloAFatura({ titulo, fatura, transaction });
        }

        const baixaCartaoDebito = await baixarTituloCartaoDebitoNoAto({
          req,
          titulo,
          formaPagamento: pagamento.formaPagamento,
          pagamentoPayload: pagamento.payload,
          dataMovimento: pagamento.dataCompra,
          transaction
        });
        if (baixaCartaoDebito) {
          baixasCartaoDebito.push(baixaCartaoDebito);
        }

        titulosCriados.push(titulo);
      }
    }

    await Historico.create({
      solicitacao_id: solicitacao.id,
      usuario_responsavel_id: req.user?.id || null,
      setor: getSetorUsuario(req),
      acao: 'TITULO_FINANCEIRO_CRIADO',
      observacao: `${titulosCriados.length} titulo(s) ${tipo} gerado(s) no valor de ${formatCurrency(valorOriginal)}`
    }, { transaction });

    await transaction.commit();

    const tituloCompleto = await carregarTituloPorId(req, titulosCriados[0].id);
    if (titulosCriados.length > 1) {
      tituloCompleto.setDataValue('parcelas_geradas', titulosCriados.map((titulo) => titulo.id));
    }

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_TITLE_CREATED',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulosCriados[0]?.id || null,
      status: 'SUCCESS',
      descricao: titulosCriados.length > 1 ? 'Titulos financeiros gerados a partir da solicitacao' : 'Titulo financeiro gerado a partir da solicitacao',
      metadata: {
        solicitacao_id: solicitacao.id,
        obra_id: solicitacao.obra_id,
        parceiro_id: parceiroId,
        tipo,
        valor_original: valorOriginal,
        quantidade_titulos: titulosCriados.length,
        pagamentos: pagamentos.map((pagamento) => ({
          valor: pagamento.totalPagamento,
          quantidade_parcelas: pagamento.quantidadeParcelas,
          grupo_parcelamento_id: pagamento.grupoParcelamentoId,
          forma_pagamento_id: pagamento.formaPagamento?.id || null,
          cartao_id: pagamento.payload.cartao_id || null
        }))
      }
    });

    if (baixasCartaoDebito.length > 0) {
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'FINANCIAL_DEBIT_CARD_SETTLED',
        recursoTipo: 'TITULO_FINANCEIRO',
        recursoId: titulosCriados[0]?.id || null,
        status: 'SUCCESS',
        descricao: 'Titulo financeiro baixado automaticamente por cartao de debito',
        metadata: {
          origem: 'SOLICITACAO',
          quantidade_movimentos: baixasCartaoDebito.length,
          movimentos: baixasCartaoDebito.map((baixa) => ({
            movimento_id: baixa.movimento.id,
            cartao_id: baixa.cartao.id,
            conta_bancaria_id: baixa.conta.id,
            valor: baixa.valorBaixa,
            data_movimento: baixa.dataBaixa
          }))
        }
      });
    }

    return tituloCompleto;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function criarTituloManual(req, payload = {}) {
  await assertFinanceAccess(req);

  const tipo = normalizarTipoTitulo(payload.tipo || 'PAGAR');
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const obraId = Number(payload.obra_id);
  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw createHttpError(400, 'Obra e obrigatoria para criar o titulo.');
  }

  const parceiroId = Number(payload.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para criar o titulo.');
  }

  const valorOriginal = Number(payload.valor);
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createHttpError(400, 'Valor invalido para criar o titulo.');
  }

  const descricao = String(payload.descricao || '').trim();
  if (!descricao) {
    throw createHttpError(400, 'Descricao e obrigatoria para criar o titulo manual.');
  }

  const [obra, parceiro, categoria] = await Promise.all([
    validarObraTitulo(req, obraId),
    validarParceiro(parceiroId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo)
  ]);
  const empresaTituloId = resolverEmpresaTitulo({
    empresaIdInformada: payload.empresa_id,
    obra
  });
  await validarEmpresaGrupo(empresaTituloId);
  const apropriacao = await validarApropriacaoTitulo(payload.apropriacao_id, obra.id);

  validarCompatibilidadeParceiroTitulo(parceiro, tipo);
  validarCategoriaDreTitulo(categoria, payload);
  const intercompanyFields = await validarIntercompanyTitulo(payload);

  const pagamentosPayload = Array.isArray(payload.pagamentos) && payload.pagamentos.length > 0
    ? payload.pagamentos
    : [payload];

  const pagamentos = [];
  for (const [pagamentoIndex, pagamentoPayload] of pagamentosPayload.entries()) {
    const formaPagamento = await validarFormaPagamentoFinanceira(pagamentoPayload.forma_pagamento_id, pagamentoPayload);
    const quantidadeParcelas = Math.max(
      Number(pagamentoPayload.quantidade_parcelas || pagamentoPayload.parcelas?.length || 1),
      1
    );
    const dataCompra = pagamentoPayload.data_compra || payload.data_compra || payload.data_emissao || getHoje();
    const dataVencimento = pagamentoPayload.data_vencimento || payload.data_vencimento;
    const parcelas = Array.isArray(pagamentoPayload.parcelas) ? pagamentoPayload.parcelas : [];
    const valorPagamentoInformado = pagamentoPayload.valor != null
      ? Number(pagamentoPayload.valor)
      : pagamentosPayload.length === 1
        ? valorOriginal
        : undefined;
    const valoresParcelas = getValoresParcelas({
      valorTotal: valorPagamentoInformado,
      quantidade: quantidadeParcelas,
      parcelas,
      contexto: `pagamento ${pagamentoIndex + 1}`
    });
    const totalPagamento = somarValores(valoresParcelas);

    if (valorPagamentoInformado != null) {
      assertValoresIguais({
        atual: totalPagamento,
        esperado: valorPagamentoInformado,
        mensagem: `A soma das parcelas do pagamento ${pagamentoIndex + 1} deve bater com o valor informado para ele.`
      });
    }

    pagamentos.push({
      formaPagamento,
      payload: pagamentoPayload,
      quantidadeParcelas,
      valoresParcelas,
      totalPagamento,
      dataCompra,
      dataVencimento,
      grupoParcelamentoId: quantidadeParcelas > 1 ? `PARC-${crypto.randomUUID()}` : null
    });
  }

  const valorTotalPagamentos = somarValores(pagamentos.map((pagamento) => pagamento.totalPagamento));
  assertValoresIguais({
    atual: valorTotalPagamentos,
    esperado: valorOriginal,
    mensagem: 'A soma das formas de pagamento precisa bater com o valor do titulo.'
  });

  const transaction = await sequelize.transaction();
  const titulosCriados = [];
  const baixasCartaoDebito = [];

  try {
    for (const [pagamentoIndex, pagamento] of pagamentos.entries()) {
      for (let index = 0; index < pagamento.quantidadeParcelas; index += 1) {
        const numeroParcela = index + 1;
        const valorParcela = pagamento.valoresParcelas[index];
        const parcelaPayload = getParcelaPayload(pagamento.payload.parcelas, index);
        const vencimentoParcela = resolveVencimentoParcela({
          formaPagamento: pagamento.formaPagamento,
          parcela: parcelaPayload,
          dataVencimentoBase: pagamento.dataVencimento,
          dataCompra: pagamento.dataCompra,
          index
        });
        const prefixoForma = pagamentos.length > 1 ? `Forma ${pagamentoIndex + 1} - ` : '';
        const descricaoParcela = pagamento.quantidadeParcelas > 1
          ? `${prefixoForma}${descricao}`.slice(0, 205) + ` - Parcela ${numeroParcela}/${pagamento.quantidadeParcelas}`
          : `${prefixoForma}${descricao}`.slice(0, 255);
        const chequeFields = buildChequeFields(pagamento.formaPagamento, parcelaPayload, index);

        const titulo = await TituloFinanceiro.create({
          solicitacao_id: null,
          obra_id: obra.id,
          apropriacao_id: apropriacao?.id || null,
          empresa_id: empresaTituloId,
          ...intercompanyFields,
          parceiro_id: parceiro.id,
          categoria_financeira_id: categoria?.id || null,
          forma_pagamento_id: pagamento.formaPagamento?.id || null,
          cartao_id: pagamento.payload.cartao_id || null,
          grupo_parcelamento_id: pagamento.grupoParcelamentoId,
          numero_parcela: pagamento.quantidadeParcelas > 1 ? numeroParcela : null,
          total_parcelas: pagamento.quantidadeParcelas > 1 ? pagamento.quantidadeParcelas : null,
          data_compra: pagamento.dataCompra,
          competencia_data: resolverCompetenciaTitulo(payload),
          considera_dre: payload.considera_dre !== false,
          origem_titulo: 'MANUAL',
          tipo,
          status: 'ABERTO',
          descricao: descricaoParcela || descricaoPadraoTituloManual(tipo),
          numero_documento: parcelaPayload.numero_documento || pagamento.payload.numero_documento || payload.numero_documento || chequeFields.cheque_numero || null,
          ...chequeFields,
          valor_original: valorParcela,
          valor_saldo: valorParcela,
          valor_baixado: 0,
          data_emissao: payload.data_emissao || getHoje(),
          data_vencimento: vencimentoParcela,
          data_quitacao: null,
          observacoes: parcelaPayload.observacoes || pagamento.payload.observacoes || payload.observacoes || null,
          ...buildCobrancaFields(payload, tipo),
          criado_por: req.user?.id || null,
          atualizado_por: req.user?.id || null
        }, { transaction });

        if (pagamento.formaPagamento?.gera_fatura && pagamento.payload.cartao_id) {
          const { fatura } = await obterOuCriarFaturaCartao({
            cartaoId: pagamento.payload.cartao_id,
            dataCompra: pagamento.dataCompra,
            parcelaOffset: index,
            usuarioId: req.user?.id || null,
            transaction
          });
          await vincularTituloAFatura({ titulo, fatura, transaction });
        }

        const baixaCartaoDebito = await baixarTituloCartaoDebitoNoAto({
          req,
          titulo,
          formaPagamento: pagamento.formaPagamento,
          pagamentoPayload: pagamento.payload,
          dataMovimento: pagamento.dataCompra,
          transaction
        });
        if (baixaCartaoDebito) {
          baixasCartaoDebito.push(baixaCartaoDebito);
        }

        titulosCriados.push(titulo);
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_TITLE_CREATED',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: titulosCriados[0]?.id || null,
    status: 'SUCCESS',
    descricao: titulosCriados.length > 1 ? 'Titulos financeiros criados manualmente' : 'Titulo financeiro criado manualmente',
    metadata: {
      origem: 'MANUAL',
      obra_id: obra.id,
      parceiro_id: parceiro.id,
      tipo,
      valor_original: roundCurrency(valorOriginal),
      quantidade_titulos: titulosCriados.length,
      pagamentos: pagamentos.map((pagamento) => ({
        valor: pagamento.totalPagamento,
        quantidade_parcelas: pagamento.quantidadeParcelas,
        grupo_parcelamento_id: pagamento.grupoParcelamentoId,
        forma_pagamento_id: pagamento.formaPagamento?.id || null,
        cartao_id: pagamento.payload.cartao_id || null
      }))
    }
  });

  if (baixasCartaoDebito.length > 0) {
    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_DEBIT_CARD_SETTLED',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulosCriados[0]?.id || null,
      status: 'SUCCESS',
      descricao: 'Titulo financeiro baixado automaticamente por cartao de debito',
      metadata: {
        origem: 'MANUAL',
        quantidade_movimentos: baixasCartaoDebito.length,
        movimentos: baixasCartaoDebito.map((baixa) => ({
          movimento_id: baixa.movimento.id,
          cartao_id: baixa.cartao.id,
          conta_bancaria_id: baixa.conta.id,
          valor: baixa.valorBaixa,
          data_movimento: baixa.dataBaixa
        }))
      }
    });
  }

  const tituloCompleto = await carregarTituloPorId(req, titulosCriados[0].id);
  if (titulosCriados.length > 1) {
    tituloCompleto.setDataValue('parcelas_geradas', titulosCriados.map((titulo) => titulo.id));
  }
  return tituloCompleto;
}

async function criarTituloManualComBaixaAtomica(req, payload = {}, { transaction: externalTransaction = null } = {}) {
  await assertFinanceAccess(req);

  const tipo = normalizarTipoTitulo(payload.tipo || 'PAGAR');
  if (!['PAGAR', 'RECEBER'].includes(tipo)) {
    throw createHttpError(400, 'Tipo de titulo invalido.');
  }

  const obraId = Number(payload.obra_id);
  if (!Number.isInteger(obraId) || obraId <= 0) {
    throw createHttpError(400, 'Obra e obrigatoria para criar o titulo.');
  }

  const parceiroId = Number(payload.parceiro_id);
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) {
    throw createHttpError(400, 'Parceiro e obrigatorio para criar o titulo.');
  }

  const valorOriginal = Number(payload.valor);
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createHttpError(400, 'Valor invalido para criar o titulo.');
  }

  const dataVencimento = payload.data_vencimento;
  if (!dataVencimento) {
    throw createHttpError(400, 'Data de vencimento e obrigatoria para criar o titulo.');
  }

  const dataMovimento = payload.data_movimento;
  if (!dataMovimento) {
    throw createHttpError(400, 'Data do movimento e obrigatoria para registrar a baixa.');
  }

  const descricao = String(payload.descricao || '').trim();
  if (!descricao) {
    throw createHttpError(400, 'Descricao e obrigatoria para criar o titulo manual.');
  }

  const contaBancariaId = Number(payload.conta_bancaria_id);
  if (!Number.isInteger(contaBancariaId) || contaBancariaId <= 0) {
    throw createHttpError(400, 'Conta bancaria e obrigatoria para registrar a baixa.');
  }

  const [obra, parceiro, categoria, conta] = await Promise.all([
    validarObraTitulo(req, obraId),
    validarParceiro(parceiroId),
    validarCategoriaFinanceira(payload.categoria_financeira_id, tipo),
    validarContaBancaria(contaBancariaId)
  ]);
  const empresaBaixaId = await validarEmpresaBaixa({
    empresaId: payload.empresa_id,
    conta
  });
  if (obra.empresa_grupo_id && Number(obra.empresa_grupo_id) !== empresaBaixaId) {
    throw createHttpError(400, 'A empresa pagadora deve ser a mesma vinculada a obra/centro de custo selecionado.');
  }
  const apropriacao = await validarApropriacaoTitulo(payload.apropriacao_id, obra.id);

  validarCompatibilidadeParceiroTitulo(parceiro, tipo);
  validarCategoriaDreTitulo(categoria, payload);
  const intercompanyFields = await validarIntercompanyTitulo(payload);

  const valorBaixa = roundCurrency(payload.valor);
  const juros = roundCurrency(payload.juros || 0);
  const multa = roundCurrency(payload.multa || 0);
  const desconto = roundCurrency(payload.desconto || 0);
  const valorQuitacao = roundCurrency(valorBaixa + juros + multa - desconto);

  if (valorBaixa <= 0) {
    throw createHttpError(400, 'Valor da baixa deve ser maior que zero.');
  }

  if (valorQuitacao <= 0) {
    throw createHttpError(400, 'Valor final da quitacao deve ser maior que zero.');
  }

  const formaRecebimento = normalizarFormaRecebimento(payload.forma_recebimento);
  const ownTransaction = !externalTransaction;
  const transaction = externalTransaction || await sequelize.transaction();

  try {
    const caixaSessao = await obterSessaoAbertaParaConta(conta, dataMovimento, { transaction });
    const titulo = await TituloFinanceiro.create({
      solicitacao_id: null,
      obra_id: obra.id,
      apropriacao_id: apropriacao?.id || null,
      empresa_id: empresaBaixaId,
      ...intercompanyFields,
      parceiro_id: parceiro.id,
      categoria_financeira_id: categoria?.id || null,
      tipo,
      status: 'ABERTO',
      descricao: descricao.slice(0, 255) || descricaoPadraoTituloManual(tipo),
      numero_documento: payload.numero_documento || null,
      valor_original: roundCurrency(valorOriginal),
      valor_saldo: roundCurrency(valorOriginal),
      valor_baixado: 0,
      data_emissao: payload.data_emissao || getHoje(),
      data_compra: payload.data_compra || payload.data_movimento || null,
      competencia_data: resolverCompetenciaTitulo(payload),
      considera_dre: payload.considera_dre !== false,
      data_vencimento: dataVencimento,
      data_quitacao: null,
      observacoes: payload.observacoes || null,
      ...buildCobrancaFields(payload, tipo),
      criado_por: req.user?.id || null,
      atualizado_por: req.user?.id || null
    }, { transaction });

    const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) + valorBaixa);
    const novoEstado = calcularStatusTitulo({
      valorOriginal: Number(titulo.valor_original || 0),
      valorBaixado: novoValorBaixado
    });

    const movimento = await MovimentoFinanceiro.create({
      titulo_financeiro_id: titulo.id,
      conta_bancaria_id: conta.id,
      empresa_id: empresaBaixaId,
      ...intercompanyFields,
      caixa_sessao_id: caixaSessao?.id || null,
      forma_recebimento: formaRecebimento,
      tipo_permuta: payload.tipo_permuta || null,
      categoria_bem: payload.categoria_bem || null,
      descricao_bem: payload.descricao_bem || null,
      valor_referencia_bem: payload.valor_referencia_bem ?? null,
      documento_referencia: payload.documento_referencia || null,
      tipo_movimento: 'BAIXA',
      status: 'ATIVO',
      valor: valorBaixa,
      juros,
      multa,
      desconto,
      valor_quitacao: valorQuitacao,
      data_movimento: dataMovimento,
      observacoes: payload.observacoes || null,
      criado_por: req.user?.id || null
    }, { transaction });

    await titulo.update({
      valor_baixado: novoValorBaixado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? dataMovimento : null,
      status_cobranca: titulo.forma_cobranca ? 'CONCILIADO' : titulo.status_cobranca,
      atualizado_por: req.user?.id || null
    }, { transaction });

    const afterCommit = async () => {
      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'FINANCIAL_TITLE_CREATED',
        recursoTipo: 'TITULO_FINANCEIRO',
        recursoId: titulo.id,
        status: 'SUCCESS',
        descricao: 'Titulo financeiro criado manualmente',
        metadata: {
          origem: 'MANUAL_CONCILIACAO',
          obra_id: obra.id,
          parceiro_id: parceiro.id,
          tipo,
          valor_original: roundCurrency(valorOriginal)
        }
      });

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'FINANCIAL_TITLE_SETTLED',
        recursoTipo: 'TITULO_FINANCEIRO',
        recursoId: titulo.id,
        status: 'SUCCESS',
        descricao: 'Baixa financeira registrada no titulo',
        metadata: {
          movimento_id: movimento.id,
          conta_bancaria_id: conta.id,
          forma_recebimento: formaRecebimento,
          tipo_permuta: payload.tipo_permuta || null,
          categoria_bem: payload.categoria_bem || null,
          valor: valorBaixa,
          juros,
          multa,
          desconto,
          valor_quitacao: valorQuitacao
        }
      });
    };

    if (ownTransaction) {
      await transaction.commit();
      await afterCommit();
    }

    return {
      titulo,
      movimento,
      afterCommit: ownTransaction ? null : afterCommit
    };
  } catch (error) {
    if (ownTransaction) {
      await transaction.rollback();
    }
    throw error;
  }
}

function calcularStatusTitulo({ valorOriginal, valorBaixado }) {
  const saldo = roundCurrency(valorOriginal - valorBaixado);
  if (saldo <= 0) {
    return {
      status: 'QUITADO',
      valor_saldo: 0
    };
  }

  if (valorBaixado > 0) {
    return {
      status: 'PARCIAL',
      valor_saldo: saldo
    };
  }

  return {
    status: 'ABERTO',
    valor_saldo: saldo
  };
}

async function baixarTitulo(req, tituloId, payload = {}) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });
  const statusAtual = String(titulo.status || '').trim().toUpperCase();

  if (!['ABERTO', 'PARCIAL'].includes(statusAtual)) {
    throw createHttpError(400, 'Somente titulos em aberto ou parcial podem receber baixa.');
  }

  const valorBaixa = roundCurrency(payload.valor);
  const juros = roundCurrency(payload.juros || 0);
  const multa = roundCurrency(payload.multa || 0);
  const desconto = roundCurrency(payload.desconto || 0);
  const valorQuitacao = roundCurrency(valorBaixa + juros + multa - desconto);
  const saldoAtual = roundCurrency(titulo.valor_saldo);

  if (valorBaixa <= 0) {
    throw createHttpError(400, 'Valor da baixa deve ser maior que zero.');
  }

  if (valorBaixa > saldoAtual) {
    throw createHttpError(400, 'Valor da baixa nao pode ser maior que o saldo do titulo.');
  }

  if (valorQuitacao <= 0) {
    throw createHttpError(400, 'Valor final da quitacao deve ser maior que zero.');
  }

  const formaRecebimento = normalizarFormaRecebimento(payload.forma_recebimento);
  const conta = await validarContaBancaria(payload.conta_bancaria_id);
  const empresaBaixaId = await validarEmpresaBaixa({
    empresaId: payload.empresa_id,
    conta
  });
  const movimentoIntercompanyFields = await validarIntercompanyBaixa({
    payload,
    titulo,
    empresaBaixaId
  });
  const empresaTituloId = titulo.empresa_id ? Number(titulo.empresa_id) : null;
  if (!empresaTituloId) {
    throw createHttpError(
      400,
      'Titulo sem empresa vinculada. Corrija a empresa do titulo antes de registrar baixa.'
    );
  }

  const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) + valorBaixa);
  const novoEstado = calcularStatusTitulo({
    valorOriginal: Number(titulo.valor_original || 0),
    valorBaixado: novoValorBaixado
  });

  const transaction = await sequelize.transaction();
  try {
    const caixaSessao = conta
      ? await obterSessaoAbertaParaConta(conta, payload.data_movimento, { transaction })
      : null;
    const movimento = await MovimentoFinanceiro.create({
      titulo_financeiro_id: titulo.id,
      conta_bancaria_id: conta?.id || null,
      empresa_id: empresaBaixaId,
      ...movimentoIntercompanyFields,
      caixa_sessao_id: caixaSessao?.id || null,
      forma_recebimento: formaRecebimento,
      tipo_permuta: payload.tipo_permuta || null,
      categoria_bem: payload.categoria_bem || null,
      descricao_bem: payload.descricao_bem || null,
      valor_referencia_bem: payload.valor_referencia_bem ?? null,
      documento_referencia: payload.documento_referencia || null,
      tipo_movimento: 'BAIXA',
      status: 'ATIVO',
      valor: valorBaixa,
      juros,
      multa,
      desconto,
      valor_quitacao: valorQuitacao,
      data_movimento: payload.data_movimento,
      observacoes: payload.observacoes || null,
      criado_por: req.user?.id || null
    }, { transaction });

    await titulo.update({
      empresa_id: empresaTituloId,
      valor_baixado: novoValorBaixado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? payload.data_movimento : null,
      status_cobranca: titulo.forma_cobranca ? 'CONCILIADO' : titulo.status_cobranca,
      atualizado_por: req.user?.id || null
    }, { transaction });

    if (titulo.solicitacao_id) {
      await Historico.create({
        solicitacao_id: titulo.solicitacao_id,
        usuario_responsavel_id: req.user?.id || null,
        setor: getSetorUsuario(req),
        acao: 'TITULO_FINANCEIRO_BAIXADO',
        observacao: `Baixa de ${formatCurrency(valorBaixa)} registrada no titulo financeiro #${titulo.id}`
      }, { transaction });
    }

    await transaction.commit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_TITLE_SETTLED',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulo.id,
      status: 'SUCCESS',
      descricao: 'Baixa financeira registrada no titulo',
        metadata: {
          movimento_id: movimento.id,
          conta_bancaria_id: conta?.id || null,
          empresa_baixa_id: empresaBaixaId,
          intercompany_group_id: movimentoIntercompanyFields.intercompany_group_id || null,
          tipo_intercompany: movimentoIntercompanyFields.tipo_intercompany || null,
          forma_recebimento: formaRecebimento,
          tipo_permuta: payload.tipo_permuta || null,
          categoria_bem: payload.categoria_bem || null,
        valor: valorBaixa,
        juros,
        multa,
        desconto,
        valor_quitacao: valorQuitacao
      }
    });

    const tituloCompleto = await carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
    const tituloJson = typeof tituloCompleto?.toJSON === 'function'
      ? tituloCompleto.toJSON()
      : tituloCompleto;
    const movimentoGerado = Array.isArray(tituloJson?.movimentos)
      ? tituloJson.movimentos.find((item) => Number(item?.id) === Number(movimento.id))
      : null;

    return {
      ...tituloJson,
      movimento_financeiro_id: movimento.id,
      movimento: movimentoGerado || {
        id: movimento.id,
        tipo_movimento: movimento.tipo_movimento,
        status: movimento.status,
        conta_bancaria_id: movimento.conta_bancaria_id,
        valor: movimento.valor,
        valor_quitacao: movimento.valor_quitacao,
        data_movimento: movimento.data_movimento
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function estornarMovimentoTitulo(req, tituloId, movimentoId, payload = {}) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });
  const movimento = await MovimentoFinanceiro.findOne({
    where: {
      id: movimentoId,
      titulo_financeiro_id: titulo.id
    }
  });

  if (!movimento) {
    throw createHttpError(404, 'Movimento financeiro nao encontrado.');
  }

  if (String(movimento.tipo_movimento || '').toUpperCase() !== 'BAIXA') {
    throw createHttpError(400, 'Somente baixas podem ser estornadas.');
  }

  if (String(movimento.status || '').toUpperCase() !== 'ATIVO') {
    throw createHttpError(400, 'Esta baixa ja foi estornada.');
  }

  const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) - Number(movimento.valor || 0));
  const valorBaixadoNormalizado = novoValorBaixado < 0 ? 0 : novoValorBaixado;
  const novoEstado = calcularStatusTitulo({
    valorOriginal: Number(titulo.valor_original || 0),
    valorBaixado: valorBaixadoNormalizado
  });

  const transaction = await sequelize.transaction();
  try {
    await movimento.update({
      status: 'ESTORNADO',
      observacoes: payload.observacoes
        ? `${String(movimento.observacoes || '').trim()}\nEstorno: ${payload.observacoes}`.trim()
        : movimento.observacoes,
      estornado_por: req.user?.id || null,
      estornado_em: new Date()
    }, { transaction });

    await titulo.update({
      valor_baixado: valorBaixadoNormalizado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? titulo.data_quitacao : null,
      status_cobranca: titulo.forma_cobranca ? 'EMITIDO' : titulo.status_cobranca,
      atualizado_por: req.user?.id || null
    }, { transaction });

    if (titulo.solicitacao_id) {
      await Historico.create({
        solicitacao_id: titulo.solicitacao_id,
        usuario_responsavel_id: req.user?.id || null,
        setor: getSetorUsuario(req),
        acao: 'TITULO_FINANCEIRO_ESTORNADO',
        observacao: `Estorno da baixa ${movimento.id} registrado no titulo financeiro #${titulo.id}`
      }, { transaction });
    }

    await transaction.commit();

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'FINANCIAL_TITLE_REVERSAL',
      recursoTipo: 'TITULO_FINANCEIRO',
      recursoId: titulo.id,
      status: 'SUCCESS',
      descricao: 'Baixa financeira estornada',
      metadata: {
        movimento_id: movimento.id,
        valor_estornado: Number(movimento.valor || 0)
      }
    });

    return carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function atualizarCobrancaTitulo(req, tituloId, payload = {}) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });
  const cobranca = buildUpdatedCobrancaFields(titulo, payload);

  await titulo.update({
    ...cobranca,
    atualizado_por: req.user?.id || null
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FINANCIAL_COLLECTION_UPDATED',
    recursoTipo: 'TITULO_FINANCEIRO',
    recursoId: titulo.id,
    status: 'SUCCESS',
    descricao: 'Dados de cobranca atualizados no titulo financeiro',
    metadata: {
      forma_cobranca: cobranca.forma_cobranca,
      status_cobranca: cobranca.status_cobranca,
      banco_cobranca: cobranca.banco_cobranca,
      nosso_numero: cobranca.nosso_numero,
      identificador_externo: cobranca.identificador_externo,
      boleto_emitido_em: cobranca.boleto_emitido_em
    }
  });

  return carregarTituloPorId(req, titulo.id, { includeMovimentos: true });
}

function normalizarLabelEventoAuditoria(tipoEvento) {
  switch (String(tipoEvento || '').trim().toUpperCase()) {
    case 'FINANCIAL_TITLE_CREATED':
      return 'Titulo criado';
    case 'FINANCIAL_COLLECTION_UPDATED':
      return 'Cobranca atualizada';
    case 'FINANCIAL_TITLE_SETTLED':
      return 'Baixa registrada';
    case 'FINANCIAL_TITLE_REVERSAL':
      return 'Baixa estornada';
    default:
      return String(tipoEvento || 'Evento financeiro')
        .trim()
        .replace(/_/g, ' ')
        .toLowerCase();
  }
}

async function listarAuditoriaTitulo(req, tituloId) {
  const titulo = await carregarTituloPorId(req, tituloId, { includeMovimentos: false });

  const eventos = await SecurityEventLog.findAll({
    where: {
      recurso_tipo: 'TITULO_FINANCEIRO',
      recurso_id: String(titulo.id)
    },
    include: [
      {
        model: User,
        as: 'usuario',
        attributes: ['id', 'nome', 'email']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  return eventos.map((evento) => ({
    id: evento.id,
    tipo_evento: evento.tipo_evento,
    label: normalizarLabelEventoAuditoria(evento.tipo_evento),
    status: evento.status,
    descricao: evento.descricao,
    criado_em: evento.createdAt,
    usuario: evento.usuario
      ? {
          id: evento.usuario.id,
          nome: evento.usuario.nome,
          email: evento.usuario.email
        }
      : null,
    metadata: evento.metadata || null
  }));
}

module.exports = {
  atualizarCobrancaTitulo,
  atualizarTitulo,
  baixarTitulo,
  carregarTituloPorId,
  criarTituloManual,
  criarTituloManualComBaixaAtomica,
  criarTituloPorSolicitacao,
  estornarMovimentoTitulo,
  listarAuditoriaTitulo,
  listarBaixasRealizadas,
  listarTitulos,
  listarTitulosPorSolicitacao
};
