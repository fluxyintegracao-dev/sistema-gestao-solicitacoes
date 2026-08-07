import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  atualizarCobrancaTituloFinanceiro,
  baixarTituloFinanceiro,
  estornarMovimentoFinanceiro,
  getCartoesFinanceiros,
  getChequesTerceirosDisponiveis,
  getContasBancarias,
  getTituloFinanceiroAuditoria,
  getTituloFinanceiroById
} from '../services/financeiro';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { useAuth } from '../contexts/AuthContext';
import { hasPermissao } from '../utils/acessoProduto';
import { formatCurrencyInput, normalizeCurrencyTyping } from '../utils/formatters';

const FORMAS_RECEBIMENTO = ['DINHEIRO', 'PIX', 'CARTAO', 'TRANSFERENCIA', 'BOLETO', 'CHEQUE', 'PERMUTA', 'BENS', 'OUTROS'];
const CATEGORIAS_BEM = ['VEICULO', 'IMOVEL', 'TERRENO', 'SERVICO', 'MATERIAL', 'CREDITO', 'OUTROS'];
const FORMAS_COBRANCA = ['BOLETO', 'PIX', 'OUTROS'];
const STATUS_COBRANCA = ['PENDENTE_EMISSAO', 'EMITIDO', 'PAGO_BANCO', 'CONCILIADO', 'CANCELADO'];
const TIPOS_INTERCOMPANY_LABEL = {
  APORTE: 'Aporte',
  EMPRESTIMO: 'Emprestimo',
  REEMBOLSO: 'Reembolso',
  RATEIO: 'Rateio',
  COBERTURA_CAIXA: 'Cobertura de caixa',
  FOLHA: 'Folha',
  ADMINISTRATIVO: 'Administrativo',
  IMPOSTO: 'Imposto',
  TRANSFERENCIA_OPERACIONAL: 'Transferencia operacional'
};
const NATUREZAS_INTERCOMPANY_BAIXA = [
  {
    value: 'OPERACIONAL_TERCEIRO',
    label: 'Despesa/receita operacional paga por outra empresa',
    description: 'Entra nos relatorios operacionais, DRE e custo da obra. Registra que outra empresa fez a baixa.',
    tipo_intercompany: 'TRANSFERENCIA_OPERACIONAL',
    elimina_consolidado: false,
    transferencia_interna: false
  },
  {
    value: 'TRANSFERENCIA_INTERNA',
    label: 'Transferencia interna entre empresas',
    description: 'Use para cobertura de caixa ou envio de recurso entre empresas. Nao entra na DRE consolidada.',
    tipo_intercompany: 'COBERTURA_CAIXA',
    elimina_consolidado: true,
    transferencia_interna: true
  },
  {
    value: 'REEMBOLSO_COMPENSACAO',
    label: 'Reembolso ou compensacao entre empresas',
    description: 'Use para acerto/reembolso interno. Mantem o rastro sem tratar como despesa operacional da obra.',
    tipo_intercompany: 'REEMBOLSO',
    elimina_consolidado: true,
    transferencia_interna: false
  }
];

function getNaturezaBaixaIntercompany(value) {
  return NATUREZAS_INTERCOMPANY_BAIXA.find((item) => item.value === value) || NATUREZAS_INTERCOMPANY_BAIXA[0];
}

function inferNaturezaBaixaIntercompany(data = {}) {
  const tipo = String(data.tipo_intercompany || '').toUpperCase();
  if (tipo === 'REEMBOLSO') return 'REEMBOLSO_COMPENSACAO';
  if (data.transferencia_interna !== false && data.elimina_consolidado !== false) return 'TRANSFERENCIA_INTERNA';
  return 'OPERACIONAL_TERCEIRO';
}

function applyNaturezaBaixaIntercompany(form, naturezaValue) {
  const natureza = getNaturezaBaixaIntercompany(naturezaValue);
  return {
    ...form,
    natureza_intercompany_baixa: natureza.value,
    tipo_intercompany: natureza.tipo_intercompany,
    elimina_consolidado: natureza.elimina_consolidado,
    transferencia_interna: natureza.transferencia_interna
  };
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function labelTipoIntercompany(value) {
  return TIPOS_INTERCOMPANY_LABEL[String(value || '').toUpperCase()] || value || '-';
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PREVISAO') return 'bg-sky-100 text-sky-700';
  if (normalized === 'QUITADO') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADO' || normalized === 'ESTORNADO') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCodigoBancoInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 8);
}

function contaBancariaObrigatoria(formaRecebimento) {
  return !['DINHEIRO', 'CARTAO', 'PERMUTA', 'BENS', 'OUTROS'].includes(String(formaRecebimento || '').toUpperCase());
}

function isCartaoForma(formaRecebimento) {
  return String(formaRecebimento || '').toUpperCase() === 'CARTAO';
}

function isCartaoDebito(cartao) {
  return String(cartao?.tipo || '').toUpperCase() === 'DEBITO';
}

function getCartaoLabel(cartao) {
  const tipo = isCartaoDebito(cartao) ? 'Debito' : 'Credito';
  const bandeira = cartao?.bandeira ? `${cartao.bandeira} ` : '';
  const final = cartao?.ultimos_digitos ? ` final ${cartao.ultimos_digitos}` : '';
  return `${cartao?.nome || 'Cartao'} - ${tipo} - ${bandeira}${final}`.trim();
}

function isChequeForma(formaRecebimento) {
  return String(formaRecebimento || '').toUpperCase() === 'CHEQUE';
}

function formatChequeTerceiroLabel(cheque) {
  const numero = cheque?.numero_cheque || cheque?.codigo || 'Sem numero';
  const titular = cheque?.titular_nome || cheque?.cliente_nome || cheque?.parceiroEntregou?.nome || 'Titular nao informado';
  const vencimento = cheque?.data_vencimento ? ` - venc. ${formatDate(cheque.data_vencimento)}` : '';
  return `${numero} - ${titular} - ${formatCurrency(cheque?.valor)}${vencimento}`;
}

function normalizeFormaBaixaForm(formaRecebimento) {
  const normalized = String(formaRecebimento || '').toUpperCase();
  return normalized.startsWith('CARTAO_') ? 'CARTAO' : normalized;
}

function buildBaixaForm(titulo, contasBancarias, movimento = null) {
  if (movimento) {
    return {
      empresa_id: String(movimento.empresa_id || movimento.empresa?.id || ''),
      conta_bancaria_id: String(movimento.conta_bancaria_id || movimento.contaBancaria?.id || ''),
      cartao_id: String(movimento.cartao_id || movimento.cartao?.id || ''),
      usar_cheque_terceiro: Boolean(movimento.cheque_terceiro_id),
      cheque_terceiro_id: String(movimento.cheque_terceiro_id || ''),
      cheque_numero: movimento?.cheque_numero || '',
      cheque_emitente: movimento?.cheque_emitente || '',
      cheque_banco: movimento?.cheque_banco || '',
      cheque_agencia: movimento?.cheque_agencia || '',
      cheque_conta: movimento?.cheque_conta || '',
      titular_documento: movimento?.titular_documento || '',
      data_emissao: movimento?.data_emissao || '',
      data_vencimento: movimento?.data_vencimento || '',
      forma_recebimento: normalizeFormaBaixaForm(movimento?.forma_recebimento),
      tipo_permuta: movimento?.tipo_permuta || '',
      categoria_bem: movimento?.categoria_bem || '',
      descricao_bem: movimento?.descricao_bem || '',
      valor_referencia_bem: formatCurrencyInput(movimento?.valor_referencia_bem),
      documento_referencia: movimento?.documento_referencia || '',
      valor: formatCurrencyInput(movimento?.valor),
      juros: formatCurrencyInput(movimento?.juros, { emptyZero: false }),
      multa: formatCurrencyInput(movimento?.multa, { emptyZero: false }),
      desconto: formatCurrencyInput(movimento?.desconto, { emptyZero: false }),
      data_movimento: movimento?.data_movimento || today(),
      observacoes: movimento?.observacoes || '',
      intercompany: Boolean(movimento?.intercompany_group_id || movimento?.tipo_intercompany),
      natureza_intercompany_baixa: inferNaturezaBaixaIntercompany(movimento),
      tipo_intercompany: movimento?.tipo_intercompany || '',
      motivo_intercompany: movimento?.motivo_intercompany || '',
      elimina_consolidado: movimento?.elimina_consolidado !== false,
      transferencia_interna: movimento?.transferencia_interna !== false
    };
  }

  return {
    empresa_id: String(titulo?.empresa_id || ''),
    conta_bancaria_id: '',
    cartao_id: '',
    usar_cheque_terceiro: false,
    cheque_terceiro_id: '',
    cheque_numero: '',
    cheque_emitente: '',
    cheque_banco: '',
    cheque_agencia: '',
    cheque_conta: '',
    titular_documento: '',
    data_emissao: '',
    data_vencimento: '',
    forma_recebimento: '',
    tipo_permuta: '',
    categoria_bem: '',
    descricao_bem: '',
    valor_referencia_bem: '',
    documento_referencia: '',
    valor: formatCurrencyInput(titulo?.valor_saldo),
    juros: formatCurrencyInput(0, { emptyZero: false }),
    multa: formatCurrencyInput(0, { emptyZero: false }),
    desconto: formatCurrencyInput(0, { emptyZero: false }),
    data_movimento: today(),
    observacoes: '',
    intercompany: false,
    natureza_intercompany_baixa: 'OPERACIONAL_TERCEIRO',
    tipo_intercompany: '',
    motivo_intercompany: '',
    elimina_consolidado: false,
    transferencia_interna: false
  };
}

function buildCobrancaForm(titulo) {
  return {
    forma_cobranca: titulo?.forma_cobranca || '',
    status_cobranca: titulo?.status_cobranca && titulo.status_cobranca !== 'NAO_APLICAVEL'
      ? titulo.status_cobranca
      : 'PENDENTE_EMISSAO',
    banco_cobranca: titulo?.banco_cobranca || '',
    nosso_numero: titulo?.nosso_numero || '',
    linha_digitavel: titulo?.linha_digitavel || '',
    codigo_barras: titulo?.codigo_barras || '',
    identificador_externo: titulo?.identificador_externo || '',
    boleto_emitido_em: titulo?.boleto_emitido_em || ''
  };
}

function auditStatusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SUCCESS') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'DENIED') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function paymentStatusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (['APROVADO', 'CONFIRMADO_BANCO', 'BAIXADO'].includes(normalized)) return 'bg-emerald-100 text-emerald-700';
  if (['PENDENTE_APROVACAO', 'ENVIADO_AO_BANCO', 'AGUARDANDO_CONFIRMACAO_BAIXA'].includes(normalized)) return 'bg-amber-100 text-amber-700';
  if (['REJEITADO_BANCO', 'FALHA_INTEGRACAO', 'CANCELADO'].includes(normalized)) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function formatAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const labels = {
    solicitacao_id: 'Solicitacao',
    obra_id: 'Obra',
    parceiro_id: 'Parceiro',
    tipo: 'Tipo',
    valor_original: 'Valor original',
    movimento_id: 'Movimento',
    conta_bancaria_id: 'Conta bancaria',
    empresa_baixa_id: 'Empresa da baixa',
    intercompany_group_id: 'Grupo entre empresas',
    tipo_intercompany: 'Tipo',
    forma_recebimento: 'Forma de pagamento/recebimento',
    tipo_permuta: 'Tipo de permuta',
    categoria_bem: 'Categoria do bem',
    descricao_bem: 'Descricao do bem',
    valor_referencia_bem: 'Valor de referencia',
    documento_referencia: 'Documento',
    forma_cobranca: 'Forma de cobranca',
    status_cobranca: 'Status da cobranca',
    banco_cobranca: 'Codigo do banco da cobranca',
    nosso_numero: 'Nosso numero',
    identificador_externo: 'Identificador externo',
    boleto_emitido_em: 'Boleto emitido em',
    valor: 'Valor',
    juros: 'Juros',
    multa: 'Multa',
    desconto: 'Desconto',
    valor_quitacao: 'Quitacao',
    valor_estornado: 'Valor estornado'
  };

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 8)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key.replace(/_/g, ' '),
      value: ['valor_original', 'valor', 'juros', 'multa', 'desconto', 'valor_quitacao', 'valor_estornado', 'valor_referencia_bem'].includes(key)
        ? formatCurrency(value)
        : String(value)
    }));
}

export default function FinanceiroTituloDetalhe() {
  const { id } = useParams();
  const { user } = useAuth();
  const [titulo, setTitulo] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [chequesTerceiros, setChequesTerceiros] = useState([]);
  const [empresasGrupo, setEmpresasGrupo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auditoria, setAuditoria] = useState([]);
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
  const [baixaForm, setBaixaForm] = useState(() => buildBaixaForm(null, []));
  const [cobrancaForm, setCobrancaForm] = useState(() => buildCobrancaForm(null));
  const [savingCobranca, setSavingCobranca] = useState(false);
  const [savingBaixa, setSavingBaixa] = useState(false);
  const [estornandoId, setEstornandoId] = useState(null);
  const [corrigindoMovimentoId, setCorrigindoMovimentoId] = useState(null);
  const podeVerPagamentosBancarios = hasPermissao(user, 'financeiro.titulos.pagamentos_bancarios.visualizar');
  const podeVerMovimentosFinanceiros = hasPermissao(user, 'financeiro.titulos.movimentos.visualizar');
  const podeVerAuditoriaFinanceira = hasPermissao(user, 'financeiro.titulos.auditoria.visualizar');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [tituloData, contasData, cartoesData, chequesData, empresasData, auditoriaData] = await Promise.all([
        getTituloFinanceiroById(id),
        getContasBancarias(),
        getCartoesFinanceiros(),
        getChequesTerceirosDisponiveis().catch(() => []),
        getEmpresasGrupo({ ativo: true }),
        podeVerAuditoriaFinanceira ? getTituloFinanceiroAuditoria(id) : Promise.resolve([])
      ]);
      setTitulo(tituloData);
      setContasBancarias(Array.isArray(contasData) ? contasData : []);
      setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
      setChequesTerceiros(Array.isArray(chequesData) ? chequesData : []);
      setEmpresasGrupo(Array.isArray(empresasData) ? empresasData : []);
      setAuditoria(Array.isArray(auditoriaData) ? auditoriaData : []);
      setCobrancaForm(buildCobrancaForm(tituloData));
      setBaixaForm((current) => ({
        ...buildBaixaForm(tituloData, Array.isArray(contasData) ? contasData : []),
        conta_bancaria_id: current.conta_bancaria_id || '',
        cartao_id: current.cartao_id || '',
        cheque_terceiro_id: current.cheque_terceiro_id || ''
      }));
    } catch (err) {
      setError(err?.message || 'Erro ao carregar titulo financeiro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id, podeVerAuditoriaFinanceira]);

  const movimentosAtivos = useMemo(() => {
    return Array.isArray(titulo?.movimentos)
      ? titulo.movimentos.filter((item) => String(item.status || '').toUpperCase() === 'ATIVO')
      : [];
  }, [titulo]);
  const pagamentosAtivos = useMemo(() => {
    return Array.isArray(titulo?.paymentIntents)
      ? titulo.paymentIntents.filter((item) => !['CANCELADO', 'REJEITADO', 'REJEITADO_BANCO'].includes(String(item.status || '').toUpperCase()))
      : [];
  }, [titulo]);
  const movimentosAtivosCount = Array.isArray(titulo?.movimentos)
    ? movimentosAtivos.length
    : Number(titulo?.movimentos_ativos_count || 0);
  const cartoesUtilizados = useMemo(() => {
    const cartoesPorId = new Map();
    const movimentosValidos = Array.isArray(titulo?.movimentos)
      ? titulo.movimentos.filter((movimento) => String(movimento?.status || '').toUpperCase() !== 'ESTORNADO')
      : [];

    movimentosValidos.forEach((movimento) => {
      if (movimento?.cartao?.id) {
        cartoesPorId.set(String(movimento.cartao.id), movimento.cartao);
      }
    });

    if (cartoesPorId.size === 0 && titulo?.cartao?.id) {
      cartoesPorId.set(String(titulo.cartao.id), titulo.cartao);
    }

    return Array.from(cartoesPorId.values());
  }, [titulo]);
  const tituloRelacionadoACartao = useMemo(() => {
    const formaPagamento = titulo?.formaPagamento || {};
    const identificacaoForma = [formaPagamento.codigo, formaPagamento.nome, formaPagamento.tipo]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();

    return cartoesUtilizados.length > 0
      || Boolean(formaPagamento.exige_cartao)
      || identificacaoForma.includes('CARTAO');
  }, [cartoesUtilizados, titulo]);
  const pagamentosAtivosCount = Array.isArray(titulo?.paymentIntents)
    ? pagamentosAtivos.length
    : Number(titulo?.payment_intents_ativos_count || 0);
  const podeEditarTitulo = ['PREVISAO', 'ABERTO'].includes(String(titulo?.status || '').toUpperCase())
    && Number(titulo?.valor_baixado || 0) === 0
    && movimentosAtivosCount === 0
    && pagamentosAtivosCount === 0;

  const contasBancariasBaixa = useMemo(() => {
    if (!baixaForm.empresa_id) return [];
    return contasBancarias.filter((conta) => String(conta.empresa_id || '') === String(baixaForm.empresa_id));
  }, [baixaForm.empresa_id, contasBancarias]);
  const selectedCartaoBaixa = useMemo(
    () => cartoes.find((cartao) => String(cartao.id) === String(baixaForm.cartao_id)) || null,
    [cartoes, baixaForm.cartao_id]
  );
  const cartoesBaixa = useMemo(() => cartoes.filter((cartao) => {
    if (cartao.ativo === false) return false;
    if (!baixaForm.empresa_id) return true;
    if (!isCartaoDebito(cartao)) return true;
    const contaCartao = contasBancarias.find((conta) => String(conta.id) === String(cartao.conta_bancaria_id));
    return String(contaCartao?.empresa_id || '') === String(baixaForm.empresa_id);
  }), [baixaForm.empresa_id, cartoes, contasBancarias]);
  const baixaUsaCartao = isCartaoForma(baixaForm.forma_recebimento);
  const baixaCartaoDebito = baixaUsaCartao && isCartaoDebito(selectedCartaoBaixa);
  const baixaUsaCheque = isChequeForma(baixaForm.forma_recebimento);
  const tituloTipo = String(titulo?.tipo || '').toUpperCase();
  const baixaFormaLabel = tituloTipo === 'PAGAR' ? 'Forma de pagamento' : 'Forma de recebimento';
  const baixaRecebeChequeTerceiro = baixaUsaCheque && tituloTipo === 'RECEBER';
  const baixaPagaComChequeTerceiro = baixaUsaCheque && tituloTipo === 'PAGAR' && Boolean(baixaForm.usar_cheque_terceiro);
  const chequesTerceirosDisponiveis = useMemo(
    () => chequesTerceiros.filter((cheque) => String(cheque?.status || '').toUpperCase() === 'EM_CARTEIRA'),
    [chequesTerceiros]
  );

  const empresaTituloId = String(titulo?.empresa_id || '');
  const baixaEmpresaDiferente = Boolean(
    empresaTituloId &&
    baixaForm.empresa_id &&
    String(baixaForm.empresa_id) !== empresaTituloId
  );
  const mostrarIntercompanyBaixa = baixaEmpresaDiferente || baixaForm.intercompany;

  async function handleSalvarCobranca(event) {
    event.preventDefault();
    try {
      setSavingCobranca(true);
      setError('');
      const payload = {
        forma_cobranca: cobrancaForm.forma_cobranca || null,
        status_cobranca: cobrancaForm.forma_cobranca ? cobrancaForm.status_cobranca : null,
        banco_cobranca: cobrancaForm.banco_cobranca || null,
        nosso_numero: cobrancaForm.nosso_numero || null,
        linha_digitavel: cobrancaForm.linha_digitavel || null,
        codigo_barras: cobrancaForm.codigo_barras || null,
        identificador_externo: cobrancaForm.identificador_externo || null,
        boleto_emitido_em: cobrancaForm.boleto_emitido_em || null
      };
      await atualizarCobrancaTituloFinanceiro(id, payload);
      await carregar();
      alert('Dados de cobranca atualizados com sucesso.');
    } catch (err) {
      setError(err?.message || 'Erro ao atualizar cobranca do titulo');
    } finally {
      setSavingCobranca(false);
    }
  }

  async function handleBaixaSubmit(event) {
    event.preventDefault();
    if (!baixaForm.empresa_id) {
      setError('Informe a empresa pagadora da baixa.');
      return;
    }
    if (!baixaForm.forma_recebimento) {
      setError(`Informe a ${baixaFormaLabel.toLowerCase()} da baixa.`);
      return;
    }
    if (baixaUsaCartao && !baixaForm.cartao_id) {
      setError('Informe o cartao utilizado na baixa.');
      return;
    }
    if (baixaCartaoDebito && !baixaForm.conta_bancaria_id) {
      setError('Cartao de debito precisa ter conta bancaria vinculada.');
      return;
    }
    if (contaBancariaObrigatoria(baixaForm.forma_recebimento) && !baixaForm.conta_bancaria_id) {
      setError('Informe a conta bancaria da empresa pagadora.');
      return;
    }
    if (baixaEmpresaDiferente && !baixaForm.intercompany) {
      setError('A empresa da baixa e diferente da empresa do titulo. A baixa precisa ser marcada como Entre Empresas.');
      return;
    }
    if (baixaForm.intercompany && !baixaForm.tipo_intercompany) {
      setError('Informe a natureza da baixa Entre Empresas.');
      return;
    }
    if (baixaPagaComChequeTerceiro && !baixaForm.cheque_terceiro_id) {
      setError('Selecione o cheque de terceiro que sera usado no pagamento.');
      return;
    }
    if (baixaRecebeChequeTerceiro && (!String(baixaForm.cheque_numero || '').trim() || !String(baixaForm.cheque_emitente || '').trim())) {
      setError('Informe numero e emitente do cheque recebido.');
      return;
    }
    try {
      setSavingBaixa(true);
      setError('');
      await baixarTituloFinanceiro(id, baixaForm);
      setModalBaixaOpen(false);
      setCorrigindoMovimentoId(null);
      setBaixaForm(buildBaixaForm(titulo, contasBancarias));
      await carregar();
      alert(corrigindoMovimentoId ? 'Baixa corrigida com sucesso.' : 'Baixa registrada com sucesso.');
    } catch (err) {
      setError(err?.message || 'Erro ao registrar baixa');
    } finally {
      setSavingBaixa(false);
    }
  }

  async function handleEstornar(movimentoId) {
    const confirmar = window.confirm('Confirmar estorno desta baixa?');
    if (!confirmar) return;

    try {
      setEstornandoId(movimentoId);
      setError('');
      await estornarMovimentoFinanceiro(id, movimentoId, {});
      await carregar();
      alert('Baixa estornada com sucesso.');
    } catch (err) {
      setError(err?.message || 'Erro ao estornar baixa');
    } finally {
      setEstornandoId(null);
    }
  }

  async function handleCorrigirBaixa(movimento) {
    const confirmar = window.confirm(
      'Confirmar estorno desta baixa e abrir a correcao para alterar conta bancaria e data?'
    );
    if (!confirmar) return;

    try {
      setCorrigindoMovimentoId(movimento.id);
      setEstornandoId(movimento.id);
      setError('');
      const tituloAtualizado = await estornarMovimentoFinanceiro(id, movimento.id, {
        observacoes: 'Baixa estornada para correcao de conta bancaria/data.'
      });
      setTitulo(tituloAtualizado);
      setBaixaForm(buildBaixaForm(tituloAtualizado, contasBancarias, movimento));
      setModalBaixaOpen(true);
      const auditoriaData = await getTituloFinanceiroAuditoria(id);
      setAuditoria(Array.isArray(auditoriaData) ? auditoriaData : []);
    } catch (err) {
      setCorrigindoMovimentoId(null);
      setError(err?.message || 'Erro ao preparar correcao da baixa');
    } finally {
      setEstornandoId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--c-muted)]">Carregando titulo financeiro...</p>;
  }

  if (!titulo) {
    return <p className="text-sm text-[var(--c-muted)]">Titulo financeiro nao encontrado.</p>;
  }

  const tituloListPath = titulo.tipo === 'PAGAR' ? '/financeiro/contas-a-pagar' : '/financeiro/contas-a-receber';
  const tituloListLabel = titulo.tipo === 'PAGAR' ? 'contas a pagar' : 'contas a receber';

  return (
    <>
      <div className="page solicitacoes-page">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link className="btn btn-outline mb-3" to={tituloListPath}>
              Voltar para {tituloListLabel}
            </Link>
            <h1 className="page-title">Titulo {titulo.codigo || `#${titulo.id}`}</h1>
            <p className="text-sm text-[var(--c-muted)]">{titulo.descricao || 'Sem descricao'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {titulo.solicitacao?.id && (
              <Link className="btn btn-outline" to={`/solicitacoes/${titulo.solicitacao.id}`}>
                Abrir solicitacao
              </Link>
            )}
            {podeEditarTitulo && (
              <Link className="btn btn-outline" to={`/financeiro/titulos/${titulo.id}/editar`}>
                Editar titulo
              </Link>
            )}
            {!podeEditarTitulo && (
              <button
                type="button"
                className="btn btn-outline opacity-60"
                disabled
                title="Somente titulos em aberto, sem baixa e sem pagamento em massa vinculado podem ser editados"
              >
                Editar titulo
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setError('');
                setCorrigindoMovimentoId(null);
                setBaixaForm(buildBaixaForm(titulo, contasBancarias));
                setModalBaixaOpen(true);
              }}
              disabled={!['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())}
            >
              Registrar baixa
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Tipo</div>
            <div className="mt-2 text-lg font-semibold text-[var(--c-text)]">{titulo.tipo}</div>
          </div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Status</div>
            <div className="mt-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(titulo.status)}`}>
                {titulo.status}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor original</div>
            <div className="mt-2 text-lg font-semibold text-[var(--c-text)]">{formatCurrency(titulo.valor_original)}</div>
          </div>
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Saldo</div>
            <div className="mt-2 text-lg font-semibold text-[var(--c-text)]">{formatCurrency(titulo.valor_saldo)}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Dados do titulo</h2>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-[var(--c-muted)]">Codigo</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.codigo || `#${titulo.id}`}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Parceiro</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.parceiro?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Obra</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.obra?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Vencimento</div>
                <div className="font-medium text-[var(--c-text)]">{formatDate(titulo.data_vencimento)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Emissao</div>
                <div className="font-medium text-[var(--c-text)]">{formatDate(titulo.data_emissao)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Valor baixado</div>
                <div className="font-medium text-[var(--c-text)]">{formatCurrency(titulo.valor_baixado)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Categoria</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.categoriaFinanceira?.nome || '-'}</div>
              </div>
              {tituloRelacionadoACartao && (
                <div>
                  <div className="text-[var(--c-muted)]">
                    {cartoesUtilizados.length > 1 ? 'Cartoes utilizados' : 'Cartao utilizado'}
                  </div>
                  {cartoesUtilizados.length > 0 ? (
                    <div className="space-y-1 font-medium text-[var(--c-text)]">
                      {cartoesUtilizados.map((cartao) => (
                        <div key={cartao.id}>{getCartaoLabel(cartao)}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="font-medium text-amber-700">Nao informado</div>
                  )}
                </div>
              )}
              <div>
                <div className="text-[var(--c-muted)]">Entre Empresas</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.intercompany ? 'Sim' : 'Nao'}</div>
              </div>
              {titulo.intercompany && (
                <>
                  <div>
                    <div className="text-[var(--c-muted)]">Origem</div>
                    <div className="font-medium text-[var(--c-text)]">{titulo.empresaOrigem?.nome || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Destino</div>
                    <div className="font-medium text-[var(--c-text)]">{titulo.empresaDestino?.nome || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Tipo</div>
                    <div className="font-medium text-[var(--c-text)]">{labelTipoIntercompany(titulo.tipo_intercompany)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--c-muted)]">Consolidado</div>
                    <div className="font-medium text-[var(--c-text)]">
                      {titulo.elimina_consolidado ? 'Elimina no consolidado' : 'Mantem no consolidado'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-3">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Resumo operacional</h2>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-[var(--c-muted)]">Solicitacao</div>
                <div className="font-medium text-[var(--c-text)]">
                  {titulo.solicitacao?.id ? (
                    <Link className="text-blue-600 hover:underline" to={`/solicitacoes/${titulo.solicitacao.id}`}>
                      {titulo.solicitacao.codigo || `#${titulo.solicitacao.id}`}
                    </Link>
                  ) : '-'}
                </div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Criado por</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.criadoPor?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Baixas ativas</div>
                <div className="font-medium text-[var(--c-text)]">{movimentosAtivosCount}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Quitacao</div>
                <div className="font-medium text-[var(--c-text)]">{formatDate(titulo.data_quitacao)}</div>
              </div>
            </div>
          </div>
        </div>

        {titulo.tipo === 'RECEBER' && (
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Cobranca externa</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Use esta area para complementar o titulo com os dados do boleto emitido diretamente no banco.
                </p>
              </div>
              {titulo.forma_cobranca && (
                <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {titulo.forma_cobranca} {titulo.status_cobranca && titulo.status_cobranca !== 'NAO_APLICAVEL' ? `- ${titulo.status_cobranca}` : ''}
                </span>
              )}
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div>
                <div className="text-[var(--c-muted)]">Forma</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.forma_cobranca || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Status da cobranca</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.status_cobranca || 'NAO_APLICAVEL'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Codigo do banco</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.banco_cobranca || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Emitido em</div>
                <div className="font-medium text-[var(--c-text)]">{formatDate(titulo.boleto_emitido_em)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Nosso numero</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.nosso_numero || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Identificador externo</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.identificador_externo || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[var(--c-muted)]">Linha digitavel</div>
                <div className="font-medium break-all text-[var(--c-text)]">{titulo.linha_digitavel || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[var(--c-muted)]">Codigo de barras</div>
                <div className="font-medium break-all text-[var(--c-text)]">{titulo.codigo_barras || '-'}</div>
              </div>
            </div>

            <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSalvarCobranca}>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Forma de cobranca</span>
                <select
                  className="input w-full"
                  value={cobrancaForm.forma_cobranca}
                  onChange={(event) => setCobrancaForm((current) => ({
                    ...current,
                    forma_cobranca: event.target.value,
                    status_cobranca: event.target.value ? current.status_cobranca : 'PENDENTE_EMISSAO'
                  }))}
                >
                  <option value="">Nao controlar</option>
                  {FORMAS_COBRANCA.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Status da cobranca</span>
                <select
                  className="input w-full"
                  value={cobrancaForm.status_cobranca}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, status_cobranca: event.target.value }))}
                  disabled={!cobrancaForm.forma_cobranca}
                >
                  {STATUS_COBRANCA.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Codigo do banco</span>
                <input
                  className="input w-full"
                  inputMode="numeric"
                  maxLength={8}
                  pattern="[0-9]*"
                  value={cobrancaForm.banco_cobranca}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, banco_cobranca: normalizeCodigoBancoInput(event.target.value) }))}
                  placeholder="Ex.: 001, 104, 237"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Emitido em</span>
                <input
                  type="date"
                  className="input w-full"
                  value={cobrancaForm.boleto_emitido_em}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, boleto_emitido_em: event.target.value }))}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Nosso numero</span>
                <input
                  className="input w-full"
                  value={cobrancaForm.nosso_numero}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, nosso_numero: event.target.value }))}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Identificador externo</span>
                <input
                  className="input w-full"
                  value={cobrancaForm.identificador_externo}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, identificador_externo: event.target.value }))}
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-slate-500">Linha digitavel</span>
                <input
                  className="input w-full"
                  value={cobrancaForm.linha_digitavel}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, linha_digitavel: event.target.value }))}
                />
              </label>

              <label className="text-sm md:col-span-4">
                <span className="mb-1 block text-slate-500">Codigo de barras</span>
                <input
                  className="input w-full"
                  value={cobrancaForm.codigo_barras}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, codigo_barras: event.target.value }))}
                />
              </label>

              <div className="md:col-span-4 flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={savingCobranca}>
                  {savingCobranca ? 'Salvando...' : 'Salvar dados de cobranca'}
                </button>
              </div>
            </form>
          </div>
        )}

        {String(titulo.tipo || '').toUpperCase() === 'PAGAR' && (
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Boleto para pagamento</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  A linha digitavel ou codigo de barras habilita este titulo para remessa Caixa CNAB240 em Bancos Enterprise.
                </p>
              </div>
              {(titulo.linha_digitavel || titulo.codigo_barras) && (
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Pronto para remessa
                </span>
              )}
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div>
                <div className="text-[var(--c-muted)]">Codigo do banco</div>
                <div className="font-medium text-[var(--c-text)]">{titulo.banco_cobranca || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[var(--c-muted)]">Linha digitavel</div>
                <div className="font-medium break-all text-[var(--c-text)]">{titulo.linha_digitavel || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Codigo de barras</div>
                <div className="font-medium break-all text-[var(--c-text)]">{titulo.codigo_barras || '-'}</div>
              </div>
            </div>

            <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSalvarCobranca}>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Codigo do banco</span>
                <input
                  className="input w-full"
                  inputMode="numeric"
                  maxLength={8}
                  pattern="[0-9]*"
                  value={cobrancaForm.banco_cobranca}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, banco_cobranca: normalizeCodigoBancoInput(event.target.value) }))}
                  placeholder="Ex.: 001, 104, 237"
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-slate-500">Linha digitavel</span>
                <input
                  className="input w-full"
                  value={cobrancaForm.linha_digitavel}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, linha_digitavel: event.target.value }))}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Codigo de barras</span>
                <input
                  className="input w-full"
                  value={cobrancaForm.codigo_barras}
                  onChange={(event) => setCobrancaForm((current) => ({ ...current, codigo_barras: event.target.value }))}
                />
              </label>

              <div className="md:col-span-4 flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={savingCobranca}>
                  {savingCobranca ? 'Salvando...' : 'Salvar dados do boleto'}
                </button>
              </div>
            </form>
          </div>
        )}

        {String(titulo.tipo || '').toUpperCase() === 'PAGAR' && podeVerPagamentosBancarios && (
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Pagamentos bancarios</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Status bancario separado do status financeiro do titulo.
                </p>
              </div>
              <Link to="/financeiro/pagamentos" className="btn btn-outline">Abrir pagamentos</Link>
            </div>

            {!Array.isArray(titulo.paymentIntents) || titulo.paymentIntents.length === 0 ? (
              <div className="rounded-xl bg-[var(--c-bg)] px-3 py-4 text-sm text-[var(--c-muted)]">
                Nenhuma intencao de pagamento criada para este titulo.
              </div>
            ) : (
              <div className="space-y-3">
                {titulo.paymentIntents.map((intent) => {
                  const batchItem = Array.isArray(intent.batchItems) ? intent.batchItems[0] : null;
                  const batch = batchItem?.batch;
                  return (
                    <div key={intent.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1 text-sm">
                          <div className="font-medium text-[var(--c-text)]">
                            Intent #{intent.id} - {formatCurrency(intent.valor)}
                          </div>
                          <div className="text-[var(--c-muted)]">
                            Lote: {batch?.codigo || 'Nao vinculado'}
                          </div>
                          <div className="text-[var(--c-muted)]">
                            Favorecido: {intent.beneficiary?.nome || '-'} - {intent.beneficiary?.pix_chave || '-'}
                          </div>
                          <div className="text-[var(--c-muted)]">
                            Envio: {formatDateTime(intent.enviado_em)} | Banco: {formatDateTime(intent.confirmado_banco_em)}
                          </div>
                          <div className="text-[var(--c-muted)]">
                            Baixa: {formatDateTime(intent.baixa_confirmada_em)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`app-status-pill ${paymentStatusClass(intent.status)}`}>
                            {intent.status}
                          </span>
                          {batch?.status && (
                            <span className={`app-status-pill ${paymentStatusClass(batch.status)}`}>
                              Lote {batch.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {podeVerMovimentosFinanceiros && (
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Movimentos financeiros</h2>

          {!Array.isArray(titulo.movimentos) || titulo.movimentos.length === 0 ? (
            <div className="rounded-xl bg-[var(--c-bg)] px-3 py-4 text-sm text-[var(--c-muted)]">
              Nenhum movimento registrado neste titulo.
            </div>
          ) : (
            <div className="space-y-3">
              {titulo.movimentos.map((movimento) => (
                <div key={movimento.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1 text-sm">
                      <div className="font-medium text-[var(--c-text)]">
                        {movimento.tipo_movimento} #{movimento.id}
                      </div>
                      <div className="text-[var(--c-muted)]">
                        {formatDate(movimento.data_movimento)} - {movimento.contaBancaria?.nome || 'Sem conta'}
                      </div>
                      <div className="text-[var(--c-muted)]">
                        Empresa pagadora: {movimento.empresa?.nome || movimento.empresa?.razao_social || 'Nao informada'}
                      </div>
                      <div className="text-[var(--c-muted)]">
                        {baixaFormaLabel}: {movimento.formaPagamento?.nome || movimento.forma_recebimento || 'Nao informada'}
                        {movimento.formaPagamento?.codigo ? ` · ${movimento.formaPagamento.codigo}` : ''}
                      </div>
                      <div className="text-[var(--c-muted)]">
                        Valor base {formatCurrency(movimento.valor)} - Juros {formatCurrency(movimento.juros)} - Multa {formatCurrency(movimento.multa)} - Desconto {formatCurrency(movimento.desconto)}
                      </div>
                      <div className="text-[var(--c-muted)]">
                        Quitacao {formatCurrency(movimento.valor_quitacao)}
                      </div>
                      {(movimento.intercompany_group_id || movimento.tipo_intercompany) && (
                        <div className="text-[var(--c-muted)]">
                          Entre Empresas: {labelTipoIntercompany(movimento.tipo_intercompany)}
                          {movimento.empresaOrigem?.nome || movimento.empresaDestino?.nome
                            ? ` - ${movimento.empresaOrigem?.nome || 'Origem'} -> ${movimento.empresaDestino?.nome || 'Destino'}`
                            : ''}
                        </div>
                      )}
                      {(movimento.tipo_permuta || movimento.categoria_bem || movimento.descricao_bem || movimento.valor_referencia_bem) && (
                        <div className="text-[var(--c-muted)]">
                          {movimento.tipo_permuta ? `Permuta: ${movimento.tipo_permuta}. ` : ''}
                          {movimento.categoria_bem ? `Categoria do bem: ${movimento.categoria_bem}. ` : ''}
                          {movimento.descricao_bem ? `Bem: ${movimento.descricao_bem}. ` : ''}
                          {movimento.valor_referencia_bem ? `Referencia ${formatCurrency(movimento.valor_referencia_bem)}.` : ''}
                        </div>
                      )}
                      {movimento.observacoes && (
                        <div className="text-[var(--c-muted)] whitespace-pre-wrap">{movimento.observacoes}</div>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(movimento.status)}`}>
                        {movimento.status}
                      </span>
                      {String(movimento.status || '').toUpperCase() === 'ATIVO' && (
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={estornandoId === movimento.id || savingBaixa}
                            onClick={() => handleCorrigirBaixa(movimento)}
                          >
                            {corrigindoMovimentoId === movimento.id && estornandoId === movimento.id
                              ? 'Preparando...'
                              : 'Corrigir baixa'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={estornandoId === movimento.id || savingBaixa}
                            onClick={() => handleEstornar(movimento.id)}
                          >
                            {estornandoId === movimento.id && corrigindoMovimentoId !== movimento.id
                              ? 'Estornando...'
                              : 'Estornar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {podeVerAuditoriaFinanceira && (
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 space-y-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Auditoria financeira</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Criacao, baixas e estornos ficam rastreados no backend.
            </p>
          </div>

          {auditoria.length === 0 ? (
            <div className="rounded-xl bg-[var(--c-bg)] px-3 py-4 text-sm text-[var(--c-muted)]">
              Nenhum evento auditavel encontrado para este titulo.
            </div>
          ) : (
            <div className="space-y-3">
              {auditoria.map((evento) => {
                const metadata = formatAuditMetadata(evento.metadata);

                return (
                  <div key={evento.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-[var(--c-text)]">{evento.label}</div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${auditStatusClass(evento.status)}`}>
                            {evento.status}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--c-muted)]">
                          {evento.descricao || 'Evento financeiro registrado'}
                        </div>
                        <div className="text-xs text-[var(--c-muted)]">
                          {evento.usuario?.nome || evento.usuario?.email || 'Sistema'} - {formatDateTime(evento.criado_em)}
                        </div>
                        {metadata.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {metadata.map((item) => (
                              <span
                                key={`${evento.id}-${item.key}`}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                              >
                                {item.label}: {item.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>

      {modalBaixaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
          <div className="card flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden p-0">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--c-border)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--c-text)' }}>
                  {corrigindoMovimentoId ? 'Corrigir baixa' : 'Registrar baixa'}
                </h3>
                <p className="text-sm text-[var(--c-muted)]">
                  {corrigindoMovimentoId
                    ? 'A baixa anterior ja foi estornada. Ajuste conta bancaria, data e demais campos antes de salvar.'
                    : 'Use baixa parcial ou total. O saldo do titulo sera atualizado no backend.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setModalBaixaOpen(false);
                  setCorrigindoMovimentoId(null);
                  setBaixaForm(buildBaixaForm(titulo, contasBancarias));
                }}
              >
                Fechar
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleBaixaSubmit}>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">{baixaFormaLabel}</span>
                  <select
                    className="input w-full"
                    value={baixaForm.forma_recebimento}
                    onChange={(event) => setBaixaForm((current) => ({
                      ...current,
                      forma_recebimento: event.target.value,
                      cartao_id: '',
                      usar_cheque_terceiro: false,
                      cheque_terceiro_id: '',
                      cheque_numero: '',
                      cheque_emitente: '',
                      cheque_banco: '',
                      cheque_agencia: '',
                      cheque_conta: '',
                      titular_documento: '',
                      data_emissao: '',
                      data_vencimento: '',
                      conta_bancaria_id: isCartaoForma(event.target.value) ? '' : current.conta_bancaria_id
                    }))}
                  >
                    <option value="">Nao informar</option>
                    {FORMAS_RECEBIMENTO.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Empresa pagadora/recebedora</span>
                  <select
                    className="input w-full"
                    value={baixaForm.empresa_id}
                    onChange={(event) => {
                      const empresaSelecionada = event.target.value;
                      setBaixaForm((current) => {
                        const empresaDiferente = Boolean(empresaTituloId && empresaSelecionada && empresaSelecionada !== empresaTituloId);
                        const base = {
                          ...current,
                          empresa_id: empresaSelecionada,
                          conta_bancaria_id: '',
                          cartao_id: '',
                          intercompany: empresaDiferente || current.intercompany
                        };
                        return empresaDiferente
                          ? applyNaturezaBaixaIntercompany(base, current.natureza_intercompany_baixa || 'OPERACIONAL_TERCEIRO')
                          : base;
                      });
                    }}
                    required
                  >
                    <option value="">Selecione</option>
                    {empresasGrupo.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nome || empresa.razao_social || `Empresa #${empresa.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                {baixaUsaCartao ? (
                  <label className="text-sm md:col-span-2">
                    <span className="mb-1 block text-slate-500">Cartao utilizado</span>
                    <select
                      className="input w-full"
                      value={baixaForm.cartao_id}
                      onChange={(event) => {
                        const cartaoSelecionado = cartoes.find((cartao) => String(cartao.id) === String(event.target.value));
                        const contaCartao = isCartaoDebito(cartaoSelecionado) ? String(cartaoSelecionado?.conta_bancaria_id || '') : '';
                        setBaixaForm((current) => ({
                          ...current,
                          cartao_id: event.target.value,
                          conta_bancaria_id: contaCartao
                        }));
                      }}
                      required
                    >
                      <option value="">Selecione o cartao</option>
                      {cartoesBaixa.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {getCartaoLabel(cartao)}
                        </option>
                      ))}
                    </select>
                    {baixaCartaoDebito ? (
                      <span className="mt-1 block text-xs text-[var(--c-muted)]">
                        Cartao de debito baixa pela conta bancaria vinculada ao cartao.
                      </span>
                    ) : null}
                  </label>
                ) : null}

                {baixaUsaCheque && tituloTipo === 'PAGAR' ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(baixaForm.usar_cheque_terceiro)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setBaixaForm((current) => ({
                            ...current,
                            usar_cheque_terceiro: checked,
                            cheque_terceiro_id: checked ? current.cheque_terceiro_id : '',
                            cheque_numero: checked ? '' : current.cheque_numero,
                            cheque_emitente: checked ? '' : current.cheque_emitente
                          }));
                        }}
                      />
                      <span>
                        <span className="block font-semibold">Usar cheque de terceiro em carteira</span>
                        <span className="block text-xs text-amber-700">
                          Use quando o pagamento for feito com um cheque recebido anteriormente de cliente ou parceiro.
                        </span>
                      </span>
                    </label>
                    {baixaPagaComChequeTerceiro ? (
                      <label className="mt-3 block text-sm">
                        <span className="mb-1 block text-amber-800">Cheque disponivel</span>
                        <select
                          className="input w-full bg-white"
                          value={baixaForm.cheque_terceiro_id || ''}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, cheque_terceiro_id: event.target.value }))}
                          required
                        >
                          <option value="">Selecione o cheque</option>
                          {chequesTerceirosDisponiveis.map((cheque) => (
                            <option key={cheque.id} value={cheque.id}>
                              {formatChequeTerceiroLabel(cheque)}
                            </option>
                          ))}
                        </select>
                        {!chequesTerceirosDisponiveis.length ? (
                          <span className="mt-1 block text-xs text-amber-700">
                            Nenhum cheque de terceiro em carteira foi encontrado.
                          </span>
                        ) : null}
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {baixaRecebeChequeTerceiro ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 md:col-span-2">
                    <div className="mb-3 text-xs text-emerald-700">
                      Ao confirmar uma baixa de recebimento por cheque, o sistema registra automaticamente o cheque em carteira como cheque de terceiro.
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-emerald-800">Numero do cheque</span>
                        <input
                          className="input w-full bg-white"
                          value={baixaForm.cheque_numero}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, cheque_numero: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">Emitente / titular</span>
                        <input
                          className="input w-full bg-white"
                          value={baixaForm.cheque_emitente}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, cheque_emitente: event.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">CPF/CNPJ do titular</span>
                        <input
                          className="input w-full bg-white"
                          value={baixaForm.titular_documento}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, titular_documento: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">Banco</span>
                        <input
                          className="input w-full bg-white"
                          value={baixaForm.cheque_banco}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, cheque_banco: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">Agencia</span>
                        <input
                          className="input w-full bg-white"
                          value={baixaForm.cheque_agencia}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, cheque_agencia: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">Conta</span>
                        <input
                          className="input w-full bg-white"
                          value={baixaForm.cheque_conta}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, cheque_conta: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">Emissao</span>
                        <input
                          className="input w-full bg-white"
                          type="date"
                          value={baixaForm.data_emissao}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, data_emissao: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-emerald-800">Vencimento</span>
                        <input
                          className="input w-full bg-white"
                          type="date"
                          value={baixaForm.data_vencimento}
                          onChange={(event) => setBaixaForm((current) => ({ ...current, data_vencimento: event.target.value }))}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Conta bancaria</span>
                  <select
                    className="input w-full"
                    value={baixaForm.conta_bancaria_id}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, conta_bancaria_id: event.target.value }))}
                    required={contaBancariaObrigatoria(baixaForm.forma_recebimento) || baixaCartaoDebito}
                    disabled={!baixaForm.empresa_id || baixaUsaCartao}
                  >
                    <option value="">
                      {baixaUsaCartao
                        ? (baixaCartaoDebito ? 'Conta vinculada ao cartao' : 'Cartao de credito sem baixa bancaria imediata')
                        : (baixaForm.empresa_id ? 'Selecione' : 'Selecione a empresa da baixa')}
                    </option>
                    {contasBancariasBaixa.map((conta) => (
                      <option key={conta.id} value={conta.id}>
                        {conta.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Data do movimento</span>
                  <input
                    className="input w-full"
                    type="date"
                    value={baixaForm.data_movimento}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, data_movimento: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
                <label className="flex items-start gap-2 text-sm text-[var(--c-text)]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(baixaForm.intercompany)}
                    disabled={baixaEmpresaDiferente}
                    onChange={(event) => setBaixaForm((current) => {
                      if (event.target.checked) {
                        return applyNaturezaBaixaIntercompany(
                          { ...current, intercompany: true },
                          current.natureza_intercompany_baixa || 'OPERACIONAL_TERCEIRO'
                        );
                      }
                      return {
                        ...current,
                        intercompany: false,
                        natureza_intercompany_baixa: 'OPERACIONAL_TERCEIRO',
                        tipo_intercompany: '',
                        motivo_intercompany: '',
                        elimina_consolidado: false,
                        transferencia_interna: false
                      };
                    })}
                  />
                  <span>
                    <span className="block font-semibold">Baixa Entre Empresas</span>
                    <span className="block text-xs text-[var(--c-muted)]">
                      Use quando uma empresa paga ou recebe um titulo que pertence a outra empresa do grupo.
                    </span>
                  </span>
                </label>

                {mostrarIntercompanyBaixa && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block text-slate-500">Natureza da baixa</span>
                      <select
                        className="input w-full"
                        value={baixaForm.natureza_intercompany_baixa || 'OPERACIONAL_TERCEIRO'}
                        onChange={(event) => setBaixaForm((current) => applyNaturezaBaixaIntercompany(current, event.target.value))}
                        required={Boolean(baixaForm.intercompany)}
                      >
                        {NATUREZAS_INTERCOMPANY_BAIXA.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-[var(--c-muted)]">
                        {getNaturezaBaixaIntercompany(baixaForm.natureza_intercompany_baixa).description}
                      </span>
                    </label>
                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block text-slate-500">Motivo</span>
                      <input
                        className="input w-full"
                        value={baixaForm.motivo_intercompany}
                        onChange={(event) => setBaixaForm((current) => ({ ...current, motivo_intercompany: event.target.value }))}
                        placeholder="Ex.: pagamento feito pela tesouraria"
                      />
                    </label>
                    <div className="md:col-span-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-[var(--c-muted)]">
                      <div className="font-semibold text-[var(--c-text)]">Impacto financeiro</div>
                      <div>
                        Tipo interno: {labelTipoIntercompany(baixaForm.tipo_intercompany)}.
                        {baixaForm.elimina_consolidado === false
                          ? ' Mantem o valor nos relatorios operacionais e na DRE.'
                          : ' Elimina a relacao interna no consolidado.'}
                        {baixaForm.transferencia_interna === true
                          ? ' Sera tratado como transferencia interna.'
                          : ' Nao sera tratado como transferencia interna.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Tipo de permuta</span>
                  <input
                    className="input w-full"
                    value={baixaForm.tipo_permuta}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, tipo_permuta: event.target.value }))}
                    placeholder="Ex.: carro + dinheiro"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Categoria do bem</span>
                  <select
                    className="input w-full"
                    value={baixaForm.categoria_bem}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, categoria_bem: event.target.value }))}
                  >
                    <option value="">Nao informar</option>
                    {CATEGORIAS_BEM.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Bem / descricao</span>
                  <input
                    className="input w-full"
                    value={baixaForm.descricao_bem}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, descricao_bem: event.target.value }))}
                    placeholder="Veiculo, imovel, terreno..."
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Valor referencia</span>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    value={baixaForm.valor_referencia_bem}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, valor_referencia_bem: normalizeCurrencyTyping(event.target.value) }))}
                    onBlur={(event) => setBaixaForm((current) => ({ ...current, valor_referencia_bem: formatCurrencyInput(event.target.value) }))}
                  />
                </label>
              </div>

              <label className="text-sm block">
                <span className="mb-1 block text-slate-500">Documento de referencia</span>
                <input
                  className="input w-full"
                  value={baixaForm.documento_referencia}
                  onChange={(event) => setBaixaForm((current) => ({ ...current, documento_referencia: event.target.value }))}
                  placeholder="Numero de contrato, recibo, placa, matricula..."
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Valor base</span>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    value={baixaForm.valor}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, valor: normalizeCurrencyTyping(event.target.value) }))}
                    onBlur={(event) => setBaixaForm((current) => ({ ...current, valor: formatCurrencyInput(event.target.value) }))}
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Juros</span>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    value={baixaForm.juros}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, juros: normalizeCurrencyTyping(event.target.value) }))}
                    onBlur={(event) => setBaixaForm((current) => ({ ...current, juros: formatCurrencyInput(event.target.value, { emptyZero: false }) }))}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Multa</span>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    value={baixaForm.multa}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, multa: normalizeCurrencyTyping(event.target.value) }))}
                    onBlur={(event) => setBaixaForm((current) => ({ ...current, multa: formatCurrencyInput(event.target.value, { emptyZero: false }) }))}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Desconto</span>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    value={baixaForm.desconto}
                    onChange={(event) => setBaixaForm((current) => ({ ...current, desconto: normalizeCurrencyTyping(event.target.value) }))}
                    onBlur={(event) => setBaixaForm((current) => ({ ...current, desconto: formatCurrencyInput(event.target.value, { emptyZero: false }) }))}
                  />
                </label>
              </div>

              <label className="text-sm block">
                <span className="mb-1 block text-slate-500">Observacoes</span>
                <textarea
                  className="input min-h-[96px] w-full"
                  value={baixaForm.observacoes}
                  onChange={(event) => setBaixaForm((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </label>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-4">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setModalBaixaOpen(false);
                    setCorrigindoMovimentoId(null);
                    setBaixaForm(buildBaixaForm(titulo, contasBancarias));
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    savingBaixa ||
                    !baixaForm.empresa_id ||
                    !baixaForm.forma_recebimento ||
                    (baixaUsaCartao && !baixaForm.cartao_id) ||
                    (baixaCartaoDebito && !baixaForm.conta_bancaria_id) ||
                    (contaBancariaObrigatoria(baixaForm.forma_recebimento) && !baixaForm.conta_bancaria_id) ||
                    (baixaPagaComChequeTerceiro && !baixaForm.cheque_terceiro_id) ||
                    (baixaRecebeChequeTerceiro && (!baixaForm.cheque_numero || !baixaForm.cheque_emitente)) ||
                    !baixaForm.valor ||
                    (Boolean(baixaForm.intercompany) && !baixaForm.tipo_intercompany)
                  }
                >
                  {savingBaixa ? 'Salvando...' : corrigindoMovimentoId ? 'Salvar correcao' : 'Confirmar baixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
