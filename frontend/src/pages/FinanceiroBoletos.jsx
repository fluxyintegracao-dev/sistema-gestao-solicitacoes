import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  baixarPdfBoletoTitulo,
  gerarAmostraBoletoTitulo,
  gerarBoletoTitulo,
  getBoletoTitulo,
  getBoletosConfig,
  getTitulosParaBoleto
} from '../services/financeiro';
import { getEmpreendimentosComerciais } from '../services/comercial';
import { buscarParceiros } from '../services/parceiros';
import { useAuth } from '../contexts/AuthContext';
import { hasEnabledModule } from '../utils/acessoProduto';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos elegiveis' },
  { value: 'PENDENTE_EMISSAO', label: 'Pendente emissao' },
  { value: 'EMITIDO', label: 'Emitido' },
  { value: 'CANCELADO', label: 'Cancelado' }
];

const DEFAULT_FILTERS = {
  q: '',
  codigo: '',
  numero_documento: '',
  empreendimento_id: '',
  parceiro_id: '',
  status_cobranca: 'PENDENTE_EMISSAO',
  origem: 'TODOS',
  vencimento_inicial: '',
  vencimento_final: ''
};

const I25_PATTERNS = {
  0: 'nnwwn',
  1: 'wnnnw',
  2: 'nwnnw',
  3: 'wwnnn',
  4: 'nnwnw',
  5: 'wnwnn',
  6: 'nwwnn',
  7: 'nnnww',
  8: 'wnnwn',
  9: 'nwnwn'
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatCpfCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value || '-';
}

function getConfigIssues(config) {
  if (!config) return ['configuracao de boletos ainda nao carregada'];
  const pending = Array.isArray(config.configuracao_pendente) ? config.configuracao_pendente : [];
  if (pending.length) return pending;

  const issues = [];
  if (!config.agencia_configurada) issues.push('CAIXA_AGENCIA');
  if (!config.codigo_beneficiario_configurado) issues.push('CAIXA_CODIGO_BENEFICIARIO');
  if (!config.beneficiario_configurado) issues.push('CAIXA_BENEFICIARIO_NOME ou COMPANY_LEGAL_NAME');
  if (!config.beneficiario_cpf_cnpj_configurado) issues.push('CAIXA_BENEFICIARIO_CPF_CNPJ');
  if (config.emissao_real_bloqueada) issues.push('homologacao Caixa pendente para emissao real');
  return issues;
}

function getConfigIssueMessage(config, action = 'gerar boletos') {
  const issues = getConfigIssues(config);
  if (!issues.length) return '';
  return `Nao foi possivel ${action}: ${issues.join(', ')}.`;
}

function normalizeBarcode(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length % 2 === 0 ? digits : `0${digits}`;
}

function BarcodeSvg({ value }) {
  const digits = normalizeBarcode(value);
  const narrow = 1;
  const wide = 3;
  const height = 58;
  const quietZone = narrow * 10;
  const bars = [];
  let x = quietZone;

  function addBar(width) {
    bars.push({ x, width });
    x += width;
  }

  function addSpace(width) {
    x += width;
  }

  addBar(narrow);
  addSpace(narrow);
  addBar(narrow);
  addSpace(narrow);

  for (let index = 0; index < digits.length; index += 2) {
    const first = I25_PATTERNS[digits[index]];
    const second = I25_PATTERNS[digits[index + 1]];
    for (let pos = 0; pos < 5; pos += 1) {
      addBar(first[pos] === 'w' ? wide : narrow);
      addSpace(second[pos] === 'w' ? wide : narrow);
    }
  }

  addBar(wide);
  addSpace(narrow);
  addBar(narrow);
  x += quietZone;

  return (
    <svg
      viewBox={`0 0 ${x} ${height}`}
      preserveAspectRatio="xMinYMid meet"
      className="h-16 w-full bg-white"
      role="img"
      aria-label="Codigo de barras do boleto"
    >
      {bars.map((bar, index) => (
        <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height={height} fill="#000" />
      ))}
    </svg>
  );
}

function BoletoPrintView({ detalhe }) {
  const titulo = detalhe?.titulo || {};
  const boleto = detalhe?.boleto || {};
  const pagador = detalhe?.pagador || titulo.parceiro || {};
  const beneficiario = boleto.beneficiario || {};
  const enderecoPagador = [
    pagador.endereco,
    pagador.numero,
    pagador.bairro,
    pagador.municipio,
    pagador.estado,
    pagador.cep
  ].filter(Boolean).join(' - ');

  if (!boleto.codigo_barras) {
    return (
      <div className="app-empty-card">
        Gere o boleto para visualizar a ficha de compensacao.
      </div>
    );
  }

  return (
    <section className="boleto-print rounded-2xl border border-[var(--c-border)] bg-white p-5 text-slate-950 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
        <div>
          <div className="text-xl font-bold">CAIXA</div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Banco {boleto.codigo_banco || '104-0'}</div>
        </div>
        {boleto.modo_teste && (
          <div className="rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
            Boleto de teste - nao registrado
          </div>
        )}
        <div className="text-right font-mono text-lg font-semibold">{boleto.linha_digitavel}</div>
      </div>

      <div className="grid border-b border-slate-300 text-xs md:grid-cols-[2fr_1fr]">
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Local de pagamento</span>
          <strong>{boleto.local_pagamento || '-'}</strong>
        </div>
        <div className="p-2">
          <span className="block text-slate-500">Vencimento</span>
          <strong>{formatDate(titulo.data_vencimento)}</strong>
        </div>
      </div>

      <div className="grid border-b border-slate-300 text-xs md:grid-cols-[2fr_1fr]">
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Beneficiario</span>
          <strong>{beneficiario.nome || '-'}</strong>
          <div>{formatCpfCnpj(beneficiario.cpf_cnpj)}</div>
          <div>{beneficiario.endereco || '-'}</div>
        </div>
        <div className="p-2">
          <span className="block text-slate-500">Agencia / Codigo do beneficiario</span>
          <strong>{boleto.agencia_codigo_beneficiario || '-'}</strong>
        </div>
      </div>

      <div className="grid border-b border-slate-300 text-xs md:grid-cols-5">
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Data documento</span>
          <strong>{formatDate(titulo.data_emissao)}</strong>
        </div>
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Nr. documento</span>
          <strong>{titulo.numero_documento || titulo.id}</strong>
        </div>
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Especie doc</span>
          <strong>DS</strong>
        </div>
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Aceite</span>
          <strong>N</strong>
        </div>
        <div className="p-2">
          <span className="block text-slate-500">Nosso numero</span>
          <strong>{boleto.nosso_numero || titulo.nosso_numero || '-'}</strong>
        </div>
      </div>

      <div className="grid border-b border-slate-300 text-xs md:grid-cols-5">
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Uso do banco</span>
          <strong>-</strong>
        </div>
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Carteira</span>
          <strong>RG</strong>
        </div>
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Especie moeda</span>
          <strong>R$</strong>
        </div>
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Quantidade moeda</span>
          <strong>-</strong>
        </div>
        <div className="p-2">
          <span className="block text-slate-500">(=) Valor documento</span>
          <strong>{formatCurrency(titulo.valor_saldo || titulo.valor_original)}</strong>
        </div>
      </div>

      <div className="grid min-h-[120px] border-b border-slate-300 text-xs md:grid-cols-[2fr_1fr]">
        <div className="border-r border-slate-300 p-2">
          <span className="block text-slate-500">Instrucoes</span>
          <strong>Instrucoes (Texto de Responsabilidade do Beneficiario)</strong>
          {boleto.modo_teste && (
            <p className="mt-1 font-semibold text-amber-700">
              BOLETO DE TESTE. Nao usar para cobranca real e nao distribuir ao pagador.
            </p>
          )}
          <p className="mt-1">Nao receber apos o vencimento sem autorizacao do beneficiario.</p>
          <p>{titulo.descricao}</p>
        </div>
        <div className="grid grid-rows-4">
          <div className="border-b border-slate-300 p-2">
            <span className="block text-slate-500">(-) Desconto / Abatimento</span>
          </div>
          <div className="border-b border-slate-300 p-2">
            <span className="block text-slate-500">(+) Juros / Multa</span>
          </div>
          <div className="border-b border-slate-300 p-2">
            <span className="block text-slate-500">(=) Valor cobrado</span>
          </div>
          <div className="p-2">
            <span className="block text-slate-500">Autenticacao mecanica</span>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-300 p-2 text-xs">
        <span className="block text-slate-500">Pagador</span>
        <strong>{pagador.nome || '-'}</strong>
        <div>{formatCpfCnpj(pagador.cpf_cnpj)}</div>
        <div>{enderecoPagador || '-'}</div>
      </div>

      <div className="grid items-end gap-4 pt-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <BarcodeSvg value={boleto.codigo_barras} />
        <div className="text-right text-xs font-semibold">Autenticacao Mecanica - Ficha de Compensacao</div>
      </div>

      <div className="mt-2 break-all font-mono text-xs text-slate-600">
        Linha digitavel: {boleto.linha_digitavel}
      </div>
    </section>
  );
}

export default function FinanceiroBoletos() {
  const { user } = useAuth();
  const comercialHabilitado = hasEnabledModule(user, 'COMERCIAL', { allowSuperadminBypass: false });
  const [config, setConfig] = useState(null);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [gerandoId, setGerandoId] = useState(null);
  const [baixandoPdfId, setBaixandoPdfId] = useState(null);
  const [gerandoMassa, setGerandoMassa] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [resultadoMassa, setResultadoMassa] = useState(null);

  function prepararFiltrosBoleto(rawFilters = filters) {
    const boletoFilters = { ...rawFilters };

    if (!comercialHabilitado) {
      delete boletoFilters.empreendimento_id;
      boletoFilters.origem = 'MANUAL';
    }

    return boletoFilters;
  }

  async function carregarBase() {
    try {
      setLoadingOptions(true);
      setError('');
      const [configData, empreendimentosData, clientesData] = await Promise.all([
        getBoletosConfig(),
        comercialHabilitado ? getEmpreendimentosComerciais() : Promise.resolve([]),
        buscarParceiros({ cliente: 1, ativo: 1, limit: 500 })
      ]);
      setConfig(configData);
      setEmpreendimentos(Array.isArray(empreendimentosData) ? empreendimentosData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar configuracoes de boletos');
    } finally {
      setLoadingOptions(false);
    }
  }

  async function carregarTitulos(nextFilters = appliedFilters) {
    if (!nextFilters) {
      setTitulos([]);
      setSelecionados([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const titulosData = await getTitulosParaBoleto(prepararFiltrosBoleto(nextFilters));
      const listaTitulos = Array.isArray(titulosData) ? titulosData : [];
      setTitulos(listaTitulos);
      setSelecionados((current) => {
        const idsVisiveis = new Set(listaTitulos.map((item) => Number(item.id)));
        return current.filter((id) => idsVisiveis.has(Number(id)));
      });
    } catch (err) {
      setError(err?.message || 'Erro ao carregar boletos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (comercialHabilitado) return;

    setFilters((current) => {
      if (!current.empreendimento_id && current.origem !== 'COMERCIAL') {
        return current;
      }

      return {
        ...current,
        empreendimento_id: '',
        origem: current.origem === 'COMERCIAL' ? 'TODOS' : current.origem
      };
    });
    setAppliedFilters((current) => {
      if (!current) return current;
      return {
        ...current,
        empreendimento_id: '',
        origem: current.origem === 'COMERCIAL' ? 'TODOS' : current.origem
      };
    });
  }, [comercialHabilitado]);

  const resumo = useMemo(() => titulos.reduce((acc, item) => {
    acc.total += 1;
    acc.valor += Number(item.valor_saldo || item.valor_original || 0);
    if (item.codigo_barras) acc.emitidos += 1;
    return acc;
  }, { total: 0, valor: 0, emitidos: 0 }), [titulos]);
  const hasConsulted = Boolean(appliedFilters);
  const titulosSelecionados = useMemo(() => {
    const ids = new Set(selecionados.map(Number));
    return titulos.filter((item) => ids.has(Number(item.id)));
  }, [selecionados, titulos]);
  const todosSelecionados = titulos.length > 0 && titulos.every((item) => selecionados.map(Number).includes(Number(item.id)));

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    const nextFilters = { ...filters };
    setAppliedFilters(nextFilters);
    setSelecionados([]);
    setResultadoMassa(null);
    setFeedback('');
    carregarTitulos(nextFilters);
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(null);
    setTitulos([]);
    setSelecionados([]);
    setResultadoMassa(null);
    setFeedback('');
    setError('');
    setLoading(false);
  }

  function atualizarConsulta() {
    if (appliedFilters) {
      carregarTitulos(appliedFilters);
      return;
    }

    carregarBase();
  }

  function toggleSelecionado(tituloId, checked) {
    const id = Number(tituloId);
    setSelecionados((current) => {
      const currentSet = new Set(current.map(Number));
      if (checked) {
        currentSet.add(id);
      } else {
        currentSet.delete(id);
      }
      return Array.from(currentSet);
    });
  }

  function toggleTodos(checked) {
    setSelecionados(checked ? titulos.map((item) => Number(item.id)) : []);
  }

  async function selecionarTitulo(titulo) {
    try {
      setError('');
      setFeedback('');
      const data = await getBoletoTitulo(titulo.id);
      setDetalhe(data);
      setPreviewOpen(true);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar boleto');
    }
  }

  async function onGerar(titulo) {
    const configIssue = getConfigIssueMessage(config, 'gerar o boleto');
    if (configIssue) {
      setError(configIssue);
      setFeedback('');
      return;
    }

    try {
      setGerandoId(titulo.id);
      setError('');
      setFeedback('');
      setResultadoMassa(null);
      const data = await gerarBoletoTitulo(titulo.id);
      setDetalhe(data);
      setPreviewOpen(true);
      await carregarTitulos(appliedFilters);
      setFeedback(`Boleto do titulo #${titulo.id} gerado com sucesso.`);
    } catch (err) {
      setError(err?.message || 'Erro ao gerar boleto');
    } finally {
      setGerandoId(null);
    }
  }

  async function onGerarAmostra(titulo) {
    const configIssue = getConfigIssueMessage(config, 'gerar a amostra');
    if (configIssue) {
      setError(configIssue);
      setFeedback('');
      return;
    }

    try {
      setGerandoId(titulo.id);
      setError('');
      setFeedback('');
      const data = await gerarAmostraBoletoTitulo(titulo.id);
      setDetalhe(data);
      setPreviewOpen(true);
      setFeedback(`Amostra do titulo #${titulo.id} gerada com sucesso.`);
    } catch (err) {
      setError(err?.message || 'Erro ao gerar amostra de boleto');
    } finally {
      setGerandoId(null);
    }
  }

  async function onBaixarPdf(titulo, { amostra = false } = {}) {
    try {
      setBaixandoPdfId(titulo.id);
      setError('');
      setFeedback('');
      const data = await baixarPdfBoletoTitulo(titulo.id, { amostra });
      const url = URL.createObjectURL(data.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setFeedback(`PDF do titulo #${titulo.id} baixado com sucesso.`);
    } catch (err) {
      setError(err?.message || 'Erro ao baixar PDF do boleto');
    } finally {
      setBaixandoPdfId(null);
    }
  }

  async function onGerarMassa() {
    if (!titulosSelecionados.length) {
      setError('Selecione ao menos um titulo para gerar boletos em massa.');
      setFeedback('');
      return;
    }

    const configIssue = getConfigIssueMessage(config);
    if (configIssue) {
      setError(configIssue);
      setFeedback('');
      setResultadoMassa(null);
      return;
    }

    try {
      setGerandoMassa(true);
      setError('');
      setFeedback('');
      setResultadoMassa(null);
      let ultimoDetalhe = null;
      const sucessos = [];
      const falhas = [];

      for (const titulo of titulosSelecionados) {
        setGerandoId(titulo.id);
        try {
          ultimoDetalhe = await gerarBoletoTitulo(titulo.id);
          sucessos.push({
            id: titulo.id,
            documento: titulo.numero_documento || ''
          });
        } catch (err) {
          falhas.push({
            id: titulo.id,
            documento: titulo.numero_documento || '',
            motivo: err?.message || 'Erro ao gerar boleto'
          });
        }
      }

      if (ultimoDetalhe) setDetalhe(ultimoDetalhe);
      setSelecionados([]);
      await carregarTitulos(appliedFilters);
      setResultadoMassa({ sucessos, falhas });

      if (sucessos.length) {
        setFeedback(`${sucessos.length} boleto(s) gerado(s) com sucesso.`);
      }
      if (falhas.length) {
        setError(`${falhas.length} boleto(s) nao foram gerados. Veja os motivos no resumo abaixo.`);
      }
      if (!sucessos.length && !falhas.length) {
        setError('Nenhum boleto foi processado.');
      }
    } catch (err) {
      setError(err?.message || 'Erro ao gerar boletos em massa');
    } finally {
      setGerandoId(null);
      setGerandoMassa(false);
    }
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .boleto-print, .boleto-print * { visibility: visible; }
            .boleto-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
          }
        `}
      </style>

      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Geracao de boletos</h1>
            <p className="page-subtitle">
              {comercialHabilitado
                ? 'Emissao Caixa SIGCB a partir dos titulos a receber comerciais ou manuais.'
                : 'Emissao Caixa SIGCB a partir dos titulos a receber manuais.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={atualizarConsulta}>Atualizar</button>
            <Link to="/financeiro/titulos" className="btn btn-outline">Ver titulos</Link>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}
      {feedback && <div className="app-alert border-emerald-200 bg-emerald-50 text-emerald-700">{feedback}</div>}

      {config && !config.configurado && (
        <div className="app-alert app-alert--warning">
          Configure {getConfigIssues(config).join(', ')} no backend/.env antes de gerar boletos.
        </div>
      )}

      {config?.modo_teste && (
        <div className="app-alert app-alert--info">
          Ambiente de boletos em TESTE. A geracao e local, nao registra nem envia boletos para a Caixa.
        </div>
      )}

      {config?.emissao_real_bloqueada && (
        <div className="app-alert app-alert--warning">
          Emissao real bloqueada: defina CAIXA_BOLETO_HOMOLOGADO=true somente apos homologacao formal com a Caixa.
        </div>
      )}

      <form className="sol-surface-card rounded-2xl p-4 md:p-5" onSubmit={aplicarFiltros}>
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Filtros</p>
            <p className="sol-filtros-subtitle">A lista abaixo atualiza somente ao consultar.</p>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loadingOptions}>
            Consultar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <label className="sol-filter-field xl:col-span-2">
            <span className="sol-filter-label">Titulo</span>
            <input
              className="input w-full"
              value={filters.codigo}
              onChange={(event) => updateFilter('codigo', event.target.value)}
              placeholder="TIT-000001"
            />
          </label>
          <label className="sol-filter-field xl:col-span-4">
            <span className="sol-filter-label">Busca</span>
            <input
              className="input w-full"
              value={filters.q}
              onChange={(event) => updateFilter('q', event.target.value)}
              placeholder="Cliente, obra, documento, nosso numero ou linha digitavel"
            />
          </label>
          <label className="sol-filter-field xl:col-span-2">
            <span className="sol-filter-label">N. documento</span>
            <input
              className="input w-full"
              value={filters.numero_documento}
              onChange={(event) => updateFilter('numero_documento', event.target.value)}
              placeholder="Ex.: EPIE/01"
            />
          </label>
          <label className="sol-filter-field xl:col-span-2">
            <span className="sol-filter-label">Status cobranca</span>
            <select
              className="input w-full"
              value={filters.status_cobranca}
              onChange={(event) => updateFilter('status_cobranca', event.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value || 'todos'} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          {comercialHabilitado && (
            <label className="sol-filter-field xl:col-span-3">
              <span className="sol-filter-label">Empreendimento</span>
              <select
                className="input w-full"
                value={filters.empreendimento_id}
                onChange={(event) => updateFilter('empreendimento_id', event.target.value)}
                disabled={filters.origem === 'MANUAL' || loadingOptions}
              >
                <option value="">Todos</option>
                {empreendimentos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="sol-filter-field xl:col-span-3">
            <span className="sol-filter-label">Cliente</span>
            <select
              className="input w-full"
              value={filters.parceiro_id}
              onChange={(event) => updateFilter('parceiro_id', event.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Todos</option>
              {clientes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
          {comercialHabilitado && (
            <label className="sol-filter-field xl:col-span-2">
              <span className="sol-filter-label">Origem</span>
              <select
                className="input w-full"
                value={filters.origem}
                onChange={(event) => setFilters((current) => ({
                  ...current,
                  origem: event.target.value,
                  empreendimento_id: event.target.value === 'MANUAL' ? '' : current.empreendimento_id
                }))}
              >
                <option value="TODOS">Todos</option>
                <option value="COMERCIAL">Contratos de venda</option>
                <option value="MANUAL">Manual</option>
              </select>
            </label>
          )}
          <label className="sol-filter-field xl:col-span-2">
            <span className="sol-filter-label">Vencimento inicio</span>
            <input
              className="input w-full"
              type="date"
              value={filters.vencimento_inicial}
              onChange={(event) => updateFilter('vencimento_inicial', event.target.value)}
            />
          </label>
          <label className="sol-filter-field xl:col-span-2">
            <span className="sol-filter-label">Vencimento fim</span>
            <input
              className="input w-full"
              type="date"
              value={filters.vencimento_final}
              onChange={(event) => updateFilter('vencimento_final', event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--c-border)] pt-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-[var(--c-muted)]">
            {hasConsulted ? `${titulos.length} titulo(s) no resultado atual.` : 'A tabela fica vazia ate voce consultar.'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>
              Limpar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loadingOptions}>
              Consultar
            </button>
          </div>
        </div>
      </form>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Titulos elegiveis</p>
            <strong className="text-xl text-[var(--c-text)]">{resumo.total}</strong>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor em aberto</p>
            <strong className="text-xl text-[var(--c-text)]">{formatCurrency(resumo.valor)}</strong>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Ja emitidos</p>
            <strong className="text-xl text-[var(--c-text)]">{resumo.emitidos}</strong>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Ambiente</p>
            <strong className="text-xl text-[var(--c-text)]">{config?.ambiente || 'TESTE'}</strong>
          </div>
        </div>
      </section>

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Titulos para boleto</p>
            <p className="sol-filtros-subtitle">
              {!hasConsulted
                ? 'Aplique um filtro para carregar os boletos elegiveis.'
                : comercialHabilitado
                  ? 'Contas a receber comerciais ou manuais com saldo em aberto.'
                  : 'Contas a receber manuais com saldo em aberto.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="sol-filtros-meta">Selecionados {selecionados.length}</span>
            <span className="sol-filtros-meta">Total {titulos.length}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--c-text)]">
            <input
              type="checkbox"
              checked={todosSelecionados}
              onChange={(event) => toggleTodos(event.target.checked)}
              disabled={!titulos.length || gerandoMassa}
            />
            Selecionar todos
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelecionados([])} disabled={!selecionados.length || gerandoMassa}>
              Limpar selecao
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onGerarMassa} disabled={!selecionados.length || gerandoMassa}>
              {gerandoMassa ? 'Gerando boletos...' : `Gerar boletos selecionados (${selecionados.length})`}
            </button>
          </div>
        </div>

        {resultadoMassa && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="font-semibold">Gerados: {resultadoMassa.sucessos.length}</div>
              {resultadoMassa.sucessos.length ? (
                <ul className="mt-2 space-y-1">
                  {resultadoMassa.sucessos.slice(0, 8).map((item) => (
                    <li key={item.id}>Titulo #{item.id}{item.documento ? ` - ${item.documento}` : ''}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2">Nenhum boleto gerado neste lote.</p>
              )}
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <div className="font-semibold">Nao gerados: {resultadoMassa.falhas.length}</div>
              {resultadoMassa.falhas.length ? (
                <ul className="mt-2 space-y-1">
                  {resultadoMassa.falhas.map((item) => (
                    <li key={item.id}>Titulo #{item.id}{item.documento ? ` - ${item.documento}` : ''}: {item.motivo}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2">Sem falhas neste lote.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)]">
          {!hasConsulted ? (
            <div className="app-empty-card m-4">
              Nenhum filtro aplicado. Use os filtros acima e clique em Consultar para listar os boletos.
            </div>
          ) : loading ? (
            <div className="app-empty-card m-4">Carregando titulos...</div>
          ) : titulos.length === 0 ? (
            <div className="app-empty-card m-4">Nenhum titulo elegivel encontrado para os filtros aplicados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--c-border)] text-sm">
                <thead className="bg-[var(--c-bg)] text-left text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <span className="sr-only">Selecionar</span>
                    </th>
                    <th className="px-4 py-3">Titulo</th>
                    <th className="px-4 py-3">Cliente</th>
                    {comercialHabilitado && <th className="px-4 py-3">Origem</th>}
                    {comercialHabilitado && <th className="px-4 py-3">Empreendimento</th>}
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Boleto</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-border)]">
                  {titulos.map((titulo) => (
                    <tr key={titulo.id} className="align-top hover:bg-[var(--c-bg)]/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selecionados.map(Number).includes(Number(titulo.id))}
                          onChange={(event) => toggleSelecionado(titulo.id, event.target.checked)}
                          disabled={gerandoMassa}
                          aria-label={`Selecionar titulo ${titulo.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link className="font-semibold text-blue-700 hover:underline" to={`/financeiro/titulos/${titulo.id}`}>
                          {titulo.codigo || `#${titulo.id}`} {titulo.numero_documento ? `- ${titulo.numero_documento}` : ''}
                        </Link>
                        <p className="mt-1 max-w-[340px] text-xs text-[var(--c-muted)]">{titulo.descricao}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--c-text)]">{titulo.parceiro?.nome || '-'}</td>
                      {comercialHabilitado && (
                        <td className="px-4 py-3 text-[var(--c-muted)]">
                          {titulo.parcelasComerciais?.length ? 'Comercial' : 'Manual'}
                        </td>
                      )}
                      {comercialHabilitado && (
                        <td className="px-4 py-3 text-[var(--c-muted)]">
                          {titulo.parcelasComerciais?.[0]?.contrato?.empreendimento?.nome || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[var(--c-text)]">{formatDate(titulo.data_vencimento)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--c-text)]">{formatCurrency(titulo.valor_saldo)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {titulo.status_cobranca || 'NAO_APLICAVEL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--c-muted)]">
                        <div>{titulo.nosso_numero ? `Nosso numero: ${titulo.nosso_numero}` : 'Nao emitido'}</div>
                        {titulo.codigo_barras && <div className="mt-1 text-emerald-700">Codigo gerado</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => selecionarTitulo(titulo)}
                            title="Visualizar boleto"
                            aria-label={`Visualizar boleto do titulo ${titulo.id}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={gerandoId === titulo.id || gerandoMassa}
                            onClick={() => onGerarAmostra(titulo)}
                            title="Gerar amostra para homologacao"
                          >
                            Amostra
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={baixandoPdfId === titulo.id || gerandoMassa}
                            onClick={() => onBaixarPdf(titulo, { amostra: !titulo.codigo_barras })}
                            title={titulo.codigo_barras ? 'Baixar PDF do boleto' : 'Baixar PDF de amostra'}
                          >
                            {baixandoPdfId === titulo.id ? 'PDF...' : 'PDF'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={gerandoId === titulo.id || gerandoMassa}
                            onClick={() => onGerar(titulo)}
                          >
                            {gerandoId === titulo.id ? 'Gerando...' : (titulo.codigo_barras ? 'Regerar' : 'Gerar')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Pre-visualizacao do boleto</p>
                <p className="text-xs text-slate-500">A amostra deve ser homologada pela Caixa antes do uso em massa.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline btn-sm" disabled={!detalhe?.boleto?.codigo_barras} onClick={() => window.print()}>
                  Imprimir
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreviewOpen(false)}>
                  Fechar
                </button>
              </div>
            </div>
            <div className="max-h-[calc(92vh-76px)] overflow-auto bg-slate-50 p-4">
              {detalhe ? (
                <BoletoPrintView detalhe={detalhe} />
              ) : (
                <div className="app-empty-card">Selecione ou gere um boleto para visualizar.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
