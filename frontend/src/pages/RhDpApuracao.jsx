import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import { getCategoriasFinanceiras } from '../services/financeiro';
import {
  conferirRhApuracao,
  fecharRhApuracao,
  gerarRhApuracao,
  getRhApuracao,
  getRhApuracoes,
  getRhEmpresasGrupo,
  reabrirRhFechamento,
  atualizarRhApuracaoItem
} from '../services/rhDp';
import {
  canEditRhDpApuracao,
  canExecuteRhDpFechamento,
  canReopenRhDpFechamento,
  hasEnabledModule
} from '../utils/acessoProduto';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function formatNumber(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function getLastDayOfCompetencia(competencia) {
  const [year, month] = String(competencia || '').split('-').map(Number);
  if (!year || !month) {
    return new Date().toISOString().slice(0, 10);
  }
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function statusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'CONFERIDA' || normalized === 'CONFERIDO') {
    return 'app-status-pill bg-emerald-100 text-emerald-700';
  }
  return 'app-status-pill bg-amber-100 text-amber-700';
}

function initialForm() {
  return {
    competencia: '',
    obra_id: '',
    tipo_vinculo: '',
    observacoes: ''
  };
}

function getPixOptions(item) {
  const pagamento = item?.colaborador?.pagamento || {};
  return [
    { key: 'principal', label: 'Principal', value: pagamento.chave_pix },
    { key: 'secundaria', label: 'Fixa 2', value: pagamento.chave_pix_secundaria },
    { key: 'variavel', label: 'Variavel', value: pagamento.chave_pix_variavel }
  ]
    .map((option) => ({ ...option, value: String(option.value || '').trim() }))
    .filter((option) => option.value);
}

function getDefaultPixValue(item) {
  return getPixOptions(item)[0]?.value || '';
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getObraLabel(obra) {
  if (!obra) return '';
  return obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome;
}

function toEditState(item) {
  return {
    ajuste_credito_manual: item?.ajuste_credito_manual ?? '0',
    ajuste_debito_manual: item?.ajuste_debito_manual ?? '0',
    observacoes: item?.observacoes || '',
    status: item?.status || 'PENDENTE',
    chave_pix_titulo: item?.detalhes_json?.pagamento?.chave_pix_titulo || getDefaultPixValue(item)
  };
}

export default function RhDpApuracao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const podeEditar = canEditRhDpApuracao(user);
  const podeFechar = canExecuteRhDpFechamento(user);
  const podeReabrirFechamento = canReopenRhDpFechamento(user);
  const financeiroHabilitado = hasEnabledModule(user, 'FINANCEIRO');
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState([]);
  const [apuracoes, setApuracoes] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [edicoes, setEdicoes] = useState({});
  const [carregandoBase, setCarregandoBase] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoCategorias, setCarregandoCategorias] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [salvandoItemId, setSalvandoItemId] = useState(null);
  const [conferindo, setConferindo] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [filtros, setFiltros] = useState({
    competencia: '',
    empresa_grupo_id: '',
    obra_id: '',
    tipo_vinculo: '',
    status: ''
  });
  const [form, setForm] = useState(initialForm());
  const [formObraSearch, setFormObraSearch] = useState('');
  const [formObraSuggestionsOpen, setFormObraSuggestionsOpen] = useState(false);
  const [fechamentoForm, setFechamentoForm] = useState({
    data_fechamento: new Date().toISOString().slice(0, 10),
    data_vencimento: '',
    categoria_financeira_id: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    const next = {};
    (detalhe?.itens || []).forEach((item) => {
      next[item.id] = toEditState(item);
    });
    setEdicoes(next);
    setFechamentoForm({
      data_fechamento: new Date().toISOString().slice(0, 10),
      data_vencimento: getLastDayOfCompetencia(detalhe?.competencia),
      categoria_financeira_id: '',
      observacoes: ''
    });
  }, [detalhe]);

  useEffect(() => {
    if (!financeiroHabilitado) {
      setCategoriasFinanceiras([]);
      return;
    }
    carregarCategoriasFinanceiras();
  }, [financeiroHabilitado]);

  async function carregarBase() {
    try {
      setCarregandoBase(true);
      const [listaEmpresas, listaObras] = await Promise.all([
        getRhEmpresasGrupo({ ativo: true }),
        getObras()
      ]);

      setEmpresas(Array.isArray(listaEmpresas) ? listaEmpresas : []);
      setObras(Array.isArray(listaObras) ? listaObras : []);
      await carregarApuracoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar base da apuracao RH/DP');
    } finally {
      setCarregandoBase(false);
    }
  }

  async function carregarCategoriasFinanceiras() {
    try {
      setCarregandoCategorias(true);
      const data = await getCategoriasFinanceiras();
      setCategoriasFinanceiras(Array.isArray(data) ? data.filter((item) => {
        const tipo = String(item?.tipo || '').trim().toUpperCase();
        const hasDreGroup = String(item?.dre_grupo || '').trim();
        return (!tipo || tipo === 'PAGAR' || tipo === 'AMBOS') && item?.considera_dre !== false && hasDreGroup;
      }) : []);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar categorias financeiras');
    } finally {
      setCarregandoCategorias(false);
    }
  }

  async function carregarApuracoes() {
    try {
      setCarregandoLista(true);
      const data = await getRhApuracoes({
        competencia: filtros.competencia || undefined,
        empresa_grupo_id: filtros.empresa_grupo_id || undefined,
        obra_id: filtros.obra_id || undefined,
        tipo_vinculo: filtros.tipo_vinculo || undefined,
        status: filtros.status || undefined
      });
      setApuracoes(Array.isArray(data) ? data : []);
    } finally {
      setCarregandoLista(false);
    }
  }

  async function abrirApuracao(id) {
    try {
      const data = await getRhApuracao(id);
      setDetalhe(data);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar detalhe da apuracao RH/DP');
    }
  }

  async function onGerarApuracao(event) {
    event.preventDefault();
    if (!podeEditar) return;

    const obraId = Number(form.obra_id);
    if (!form.competencia || !Number.isInteger(obraId) || obraId <= 0) {
      alert('Informe a competencia e selecione a obra antes de gerar a apuracao.');
      return;
    }

    try {
      setGerando(true);
      const data = await gerarRhApuracao({
        competencia: form.competencia,
        obra_id: obraId,
        tipo_vinculo: form.tipo_vinculo || undefined,
        observacoes: form.observacoes || undefined
      });

      setDetalhe(data);
      await carregarApuracoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao gerar apuracao RH/DP');
    } finally {
      setGerando(false);
    }
  }

  async function salvarItem(itemId) {
    if (!detalhe?.id || !edicoes[itemId]) {
      return;
    }

    try {
      setSalvandoItemId(itemId);
      const atualizado = await atualizarRhApuracaoItem(detalhe.id, itemId, {
        ajuste_credito_manual: edicoes[itemId].ajuste_credito_manual || '0',
        ajuste_debito_manual: edicoes[itemId].ajuste_debito_manual || '0',
        observacoes: edicoes[itemId].observacoes || undefined,
        status: edicoes[itemId].status,
        chave_pix_titulo: edicoes[itemId].chave_pix_titulo || undefined
      });
      setDetalhe(atualizado);
      await carregarApuracoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar ajuste do item da apuracao');
    } finally {
      setSalvandoItemId(null);
    }
  }

  async function marcarComoConferida() {
    if (!detalhe?.id) return;
    if (!window.confirm('Concluir a conferencia desta apuracao? Todos os itens precisam estar marcados como conferidos.')) {
      return;
    }

    try {
      setConferindo(true);
      const atualizado = await conferirRhApuracao(detalhe.id);
      setDetalhe(atualizado);
      await carregarApuracoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao concluir a conferencia da apuracao');
    } finally {
      setConferindo(false);
    }
  }

  async function onFecharApuracao(event) {
    event.preventDefault();
    if (!detalhe?.id || !financeiroHabilitado || !podeEditar) {
      return;
    }

    if (!window.confirm('Fechar esta competencia e gerar os titulos a pagar no financeiro central?')) {
      return;
    }

    try {
      setFechando(true);
      const data = await fecharRhApuracao(detalhe.id, {
        data_fechamento: fechamentoForm.data_fechamento || undefined,
        data_vencimento: fechamentoForm.data_vencimento || undefined,
        categoria_financeira_id: fechamentoForm.categoria_financeira_id
          ? Number(fechamentoForm.categoria_financeira_id)
          : undefined,
        observacoes: fechamentoForm.observacoes || undefined
      });
      await carregarApuracoes();
      navigate(`/rh-dp/fechamentos?fechamento_id=${data.id}`);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao fechar a apuracao RH/DP');
    } finally {
      setFechando(false);
    }
  }

  async function reabrirFechamentoAtual() {
    if (!detalhe?.fechamentoRh?.id || !podeReabrirFechamento) {
      return;
    }

    const justificativa = window.prompt(
      'Informe a justificativa para estornar o fechamento e reabrir a apuracao. Esta acao so sera permitida se os titulos financeiros nao estiverem baixados.'
    );
    if (!justificativa || !justificativa.trim()) {
      return;
    }

    try {
      setFechando(true);
      await reabrirRhFechamento(detalhe.fechamentoRh.id, {
        justificativa: justificativa.trim()
      });
      const atualizado = await getRhApuracao(detalhe.id);
      setDetalhe(atualizado);
      await carregarApuracoes();
      alert('Fechamento estornado e apuracao reaberta. O financeiro foi notificado.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao reabrir fechamento RH/DP');
    } finally {
      setFechando(false);
    }
  }

  const resumoLista = useMemo(() => {
    return apuracoes.reduce(
      (acc, item) => {
        acc.quantidade += 1;
        acc.totalBruto += Number(item.total_bruto || 0);
        acc.totalLiquido += Number(item.total_liquido || 0);
        if (item.status === 'CONFERIDA') {
          acc.conferidas += 1;
        } else {
          acc.rascunhos += 1;
        }
        return acc;
      },
      {
        quantidade: 0,
        totalBruto: 0,
        totalLiquido: 0,
        conferidas: 0,
        rascunhos: 0
      }
    );
  }, [apuracoes]);

  const formObraSuggestions = useMemo(() => {
    const search = normalizeSearchText(formObraSearch);
    if (!search) return [];

    return obras
      .filter((obra) => normalizeSearchText(`${obra.codigo || ''} ${obra.nome || ''}`).includes(search))
      .slice(0, 12);
  }, [formObraSearch, obras]);

  return (
    <div className="page solicitacoes-page rhdp-page rhdp-apuracao-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP - Apuracao</h1>
            <p className="page-subtitle">
              Gere a pre-folha por competencia a partir de importacoes confirmadas, revise por colaborador e registre ajustes auditados.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">
              Voltar ao RH/DP
            </Link>
            <Link to="/rh-dp/importacoes" className="btn btn-outline">
              Importacoes
            </Link>
          </div>
        </div>
      </div>

      <form className="sol-surface-card rhdp-apuracao-create-card rounded-xl p-4 space-y-4" onSubmit={onGerarApuracao}>
        <div className="rhdp-apuracao-form-grid">
          <label className="rhdp-apuracao-field">
            <span>Competencia</span>
            <input
              type="month"
              className="form-control"
              value={form.competencia}
              onChange={(event) => setForm((current) => ({ ...current, competencia: event.target.value }))}
              disabled={!podeEditar}
            />
          </label>
          <label className="rhdp-apuracao-field rhdp-autocomplete-field">
            <span>Obra de prestacao do servico</span>
            <input
              type="text"
              className="form-control"
              value={formObraSearch}
              placeholder="Digite para buscar a obra obrigatoria"
              autoComplete="off"
              onFocus={() => setFormObraSuggestionsOpen(true)}
              onChange={(event) => {
                setFormObraSearch(event.target.value);
                setForm((current) => ({ ...current, obra_id: '' }));
                setFormObraSuggestionsOpen(true);
              }}
              onBlur={() => window.setTimeout(() => setFormObraSuggestionsOpen(false), 120)}
              disabled={!podeEditar}
            />
            {formObraSuggestionsOpen && formObraSuggestions.length > 0 ? (
              <div className="rhdp-autocomplete-list">
                {formObraSuggestions.map((obra) => (
                  <button
                    key={obra.id}
                    type="button"
                    className="rhdp-autocomplete-option"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setForm((current) => ({ ...current, obra_id: String(obra.id) }));
                      setFormObraSearch(getObraLabel(obra));
                      setFormObraSuggestionsOpen(false);
                    }}
                  >
                    <strong>{getObraLabel(obra)}</strong>
                    {obra.cidade || obra.uf ? (
                      <span>{[obra.cidade, obra.uf].filter(Boolean).join(' - ')}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </div>

        <div className="rhdp-apuracao-form-grid rhdp-apuracao-form-grid-secondary">
          <label className="rhdp-apuracao-field">
            <span>Tipo de vinculo</span>
            <select
              className="form-control"
              value={form.tipo_vinculo}
              onChange={(event) => setForm((current) => ({ ...current, tipo_vinculo: event.target.value }))}
              disabled={!podeEditar}
            >
              <option value="">Todos os vinculos</option>
              <option value="CLT">CLT</option>
              <option value="NAO_CLT">Nao CLT</option>
            </select>
          </label>
          <label className="rhdp-apuracao-field">
            <span>Observacoes do recorte</span>
            <textarea
              className="form-control min-h-[84px]"
              placeholder="Observacoes do recorte"
              value={form.observacoes}
              onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
              disabled={!podeEditar}
            />
          </label>
        </div>

        {podeEditar ? (
          <div className="app-page-actions">
            <button type="submit" className="btn btn-primary" disabled={gerando}>
              {gerando ? 'Gerando apuracao...' : 'Gerar apuracao'}
            </button>
          </div>
        ) : null}
      </form>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rhdp-apuracao-summary rounded-xl p-3 md:p-4">
        <div className="app-summary-grid">
          <div className="app-summary-card">
            <span className="app-summary-label">Apuracoes</span>
            <strong className="app-summary-value">{resumoLista.quantidade}</strong>
          </div>
          <div className="app-summary-card">
            <span className="app-summary-label">Bruto filtrado</span>
            <strong className="app-summary-value">{formatCurrency(resumoLista.totalBruto)}</strong>
          </div>
          <div className="app-summary-card">
            <span className="app-summary-label">Liquido filtrado</span>
            <strong className="app-summary-value">{formatCurrency(resumoLista.totalLiquido)}</strong>
          </div>
          <div className="app-summary-card">
            <span className="app-summary-label">Status</span>
            <strong className="app-summary-value">{resumoLista.rascunhos} rascunho(s)</strong>
            <span className="app-summary-subvalue">{resumoLista.conferidas} conferida(s)</span>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-filtros app-filters-card rhdp-apuracao-filters rounded-xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Filtros</p>
            <p className="sol-filtros-subtitle">
              Recarregue as apuracoes por competencia, empresa, obra, vinculo e status.
            </p>
          </div>
        </div>

        <div className="sol-filtros-grid rhdp-apuracao-filter-grid">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Competencia</span>
            <input
              type="month"
              className="input w-full"
              value={filtros.competencia}
              onChange={(event) => setFiltros((current) => ({ ...current, competencia: event.target.value }))}
            />
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Empresa do grupo</span>
            <select
              className="input w-full"
              value={filtros.empresa_grupo_id}
              onChange={(event) => setFiltros((current) => ({ ...current, empresa_grupo_id: event.target.value }))}
            >
              <option value="">Todas</option>
              {empresas.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Obra</span>
            <select
              className="input w-full"
              value={filtros.obra_id}
              onChange={(event) => setFiltros((current) => ({ ...current, obra_id: event.target.value }))}
            >
              <option value="">Todas</option>
              {obras.map((item) => (
                <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
              ))}
            </select>
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Vinculo</span>
            <select
              className="input w-full"
              value={filtros.tipo_vinculo}
              onChange={(event) => setFiltros((current) => ({ ...current, tipo_vinculo: event.target.value }))}
            >
              <option value="">Todos</option>
              <option value="CLT">CLT</option>
              <option value="NAO_CLT">Nao CLT</option>
            </select>
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Status</span>
            <select
              className="input w-full"
              value={filtros.status}
              onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="CONFERIDA">Conferida</option>
            </select>
          </label>
        </div>

        <div className="app-page-actions">
          <button type="button" className="btn btn-primary" onClick={carregarApuracoes} disabled={carregandoLista}>
            {carregandoLista ? 'Atualizando...' : 'Aplicar filtros'}
          </button>
        </div>
      </div>

      <div className="sol-surface-card rhdp-apuracao-list-card rounded-xl p-4">
        {carregandoBase || carregandoLista ? (
          <p className="text-sm text-slate-500">Carregando apuracoes...</p>
        ) : !apuracoes.length ? (
          <p className="text-sm text-slate-500">Nenhuma apuracao encontrada para os filtros atuais.</p>
        ) : (
          <div className="app-dense-table-wrapper rhdp-apuracao-table-wrapper">
            <table className="app-dense-data-table rhdp-apuracao-table">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Competencia</th>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Obra</th>
                  <th className="px-3 py-2 font-medium">Vinculo</th>
                  <th className="px-3 py-2 font-medium">Colaboradores</th>
                  <th className="px-3 py-2 font-medium">Liquido</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Gerada em</th>
                  <th className="px-3 py-2 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {apuracoes.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3">{item.competencia}</td>
                    <td className="px-3 py-3">{item.empresaGrupo?.nome || 'Por colaborador'}</td>
                    <td className="px-3 py-3">{item.obra?.nome || '-'}</td>
                    <td className="px-3 py-3">{item.tipo_vinculo || 'Misto'}</td>
                    <td className="px-3 py-3">{item.total_colaboradores || 0}</td>
                    <td className="px-3 py-3">{formatCurrency(item.total_liquido)}</td>
                    <td className="px-3 py-3">
                      <span className={statusClass(item.status)}>
                        {item.status === 'CONFERIDA' ? 'Conferida' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-3 py-3">{formatDateTime(item.createdAt)}</td>
                    <td className="px-3 py-3">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => abrirApuracao(item.id)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalhe ? (
        <div className="sol-surface-card rhdp-apuracao-detail-card rounded-xl p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Apuracao {detalhe.competencia} - {detalhe.obra?.nome || 'obra nao informada'}
              </h2>
              <p className="text-sm text-slate-500">
                Recorte: empresa do cadastro do colaborador | {detalhe.tipo_vinculo || 'todos os vinculos'} | {detalhe.total_colaboradores || 0} colaborador(es)
              </p>
              <p className="text-xs text-slate-400">
                Criada em {formatDateTime(detalhe.createdAt)} por {detalhe.criadoPor?.nome || 'sistema'}
              </p>
            </div>

            <div className="app-page-actions rhdp-apuracao-detail-actions">
              <span className={statusClass(detalhe.status)}>
                {detalhe.status === 'CONFERIDA' ? 'Conferida' : 'Rascunho'}
              </span>
              {detalhe.fechamentoRh ? (
                <>
                  <Link to={`/rh-dp/fechamentos?fechamento_id=${detalhe.fechamentoRh.id}`} className="btn btn-outline">
                    Ver fechamento
                  </Link>
                  {podeReabrirFechamento ? (
                    <button type="button" className="btn btn-outline" onClick={reabrirFechamentoAtual} disabled={fechando}>
                      {fechando ? 'Processando...' : 'Estornar e reabrir'}
                    </button>
                  ) : null}
                </>
              ) : null}
              {detalhe.status === 'RASCUNHO' && podeEditar ? (
                <button type="button" className="btn btn-primary" onClick={marcarComoConferida} disabled={conferindo}>
                  {conferindo ? 'Concluindo...' : 'Marcar apuracao como conferida'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="app-summary-grid">
            <div className="app-summary-card">
              <span className="app-summary-label">Total bruto</span>
              <strong className="app-summary-value">{formatCurrency(detalhe.total_bruto)}</strong>
            </div>
            <div className="app-summary-card">
              <span className="app-summary-label">Total descontos</span>
              <strong className="app-summary-value">{formatCurrency(detalhe.total_descontos)}</strong>
            </div>
            <div className="app-summary-card">
              <span className="app-summary-label">Total liquido</span>
              <strong className="app-summary-value">{formatCurrency(detalhe.total_liquido)}</strong>
            </div>
            <div className="app-summary-card">
              <span className="app-summary-label">Conferencia</span>
              <strong className="app-summary-value">{detalhe.resumo_operacional?.itens_conferidos || 0} item(ns)</strong>
              <span className="app-summary-subvalue">{detalhe.resumo_operacional?.itens_pendentes || 0} pendente(s)</span>
            </div>
          </div>

          {detalhe.observacoes ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <strong className="mr-2 text-slate-800">Observacoes:</strong>
              {detalhe.observacoes}
            </div>
          ) : null}

          {!financeiroHabilitado ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              O fechamento com geracao de titulos depende do modulo <strong>FINANCEIRO</strong> habilitado na instalacao.
            </div>
          ) : null}

          {detalhe.fechamentoRh ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <strong className="block text-emerald-900">Competencia fechada</strong>
                  <span>
                    Fechada em {new Date(`${detalhe.fechamentoRh.data_fechamento}T00:00:00`).toLocaleDateString('pt-BR')} com vencimento em{' '}
                    {new Date(`${detalhe.fechamentoRh.data_vencimento}T00:00:00`).toLocaleDateString('pt-BR')}.
                  </span>
                </div>
                <Link to={`/rh-dp/fechamentos?fechamento_id=${detalhe.fechamentoRh.id}`} className="btn btn-outline">
                  Abrir lote financeiro
                </Link>
              </div>
            </div>
          ) : null}

          {financeiroHabilitado && detalhe.status === 'CONFERIDA' && !detalhe.fechamentoRh && podeFechar ? (
            <form className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4" onSubmit={onFecharApuracao}>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900">Fechamento da competencia</h3>
                <p className="text-sm text-slate-600">
                  O fechamento gera titulos <strong>PAGAR</strong> no financeiro central e vincula cada item da apuracao ao respectivo titulo.
                  A categoria financeira deve estar marcada para DRE e com grupo DRE classificado.
                </p>
              </div>

              <div className="rhdp-apuracao-close-grid">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Data de fechamento</span>
                  <input
                    type="date"
                    className="form-control"
                    value={fechamentoForm.data_fechamento}
                    onChange={(event) => setFechamentoForm((current) => ({ ...current, data_fechamento: event.target.value }))}
                    disabled={fechando}
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">Data de vencimento</span>
                  <input
                    type="date"
                    className="form-control"
                    value={fechamentoForm.data_vencimento}
                    onChange={(event) => setFechamentoForm((current) => ({ ...current, data_vencimento: event.target.value }))}
                    disabled={fechando}
                  />
                </label>

                <label className="text-sm xl:col-span-2">
                  <span className="mb-1 block text-slate-500">Categoria financeira</span>
                  <select
                    className="form-control"
                    value={fechamentoForm.categoria_financeira_id}
                    onChange={(event) => setFechamentoForm((current) => ({ ...current, categoria_financeira_id: event.target.value }))}
                    disabled={fechando || carregandoCategorias}
                    required
                  >
                    <option value="">Selecione a categoria da folha</option>
                    {categoriasFinanceiras.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}{item.dre_grupo ? ` - ${item.dre_grupo}` : ''}
                      </option>
                    ))}
                  </select>
                  {!carregandoCategorias && !categoriasFinanceiras.length ? (
                    <span className="mt-1 block text-xs text-amber-700">
                      Cadastre uma categoria PAGAR/AMBOS marcada para DRE e com grupo DRE antes de fechar.
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="text-sm block">
                <span className="mb-1 block text-slate-500">Observacoes do fechamento</span>
                <textarea
                  className="form-control min-h-[96px]"
                  value={fechamentoForm.observacoes}
                  onChange={(event) => setFechamentoForm((current) => ({ ...current, observacoes: event.target.value }))}
                  disabled={fechando}
                />
              </label>

              <div className="app-page-actions">
                <button type="submit" className="btn btn-primary" disabled={fechando}>
                  {fechando ? 'Fechando competencia...' : 'Fechar competencia e gerar titulos'}
                </button>
              </div>
            </form>
          ) : null}

          {!detalhe.itens?.length ? (
            <p className="text-sm text-slate-500">A apuracao nao possui itens.</p>
          ) : (
            <div className="app-dense-table-wrapper rhdp-apuracao-items-wrapper">
              <table className="app-dense-data-table rhdp-apuracao-items-table">
                <colgroup>
                  <col className="rhdp-apuracao-colaborador-col" />
                  <col className="rhdp-apuracao-vinculo-col" />
                  <col className="rhdp-apuracao-numero-col" />
                  <col className="rhdp-apuracao-horas-col" />
                  <col className="rhdp-apuracao-moeda-col" />
                  <col className="rhdp-apuracao-moeda-col" />
                  <col className="rhdp-apuracao-liquido-col" />
                  <col className="rhdp-apuracao-pix-col" />
                  <col className="rhdp-apuracao-ajuste-col" />
                  <col className="rhdp-apuracao-ajuste-col" />
                  <col className="rhdp-apuracao-status-col" />
                  <col className="rhdp-apuracao-observacoes-col" />
                  <col className="rhdp-apuracao-acoes-col" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Colaborador</th>
                    <th className="px-3 py-2 font-medium">Vinculo</th>
                    <th className="px-3 py-2 font-medium">Dias</th>
                    <th className="px-3 py-2 font-medium">Horas extras</th>
                    <th className="px-3 py-2 font-medium">Bruto</th>
                    <th className="px-3 py-2 font-medium">Descontos</th>
                    <th className="px-3 py-2 font-medium">Liquido</th>
                    <th className="px-3 py-2 font-medium">PIX do titulo</th>
                    <th className="px-3 py-2 font-medium">Ajuste credito</th>
                    <th className="px-3 py-2 font-medium">Ajuste debito</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Observacoes</th>
                    <th className="px-3 py-2 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhe.itens.map((item) => {
                    const pixOptions = getPixOptions(item);
                    return (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{item.colaborador?.nome || '-'}</div>
                        <div className="text-xs text-slate-500">
                          {item.colaborador?.matricula || '-'} | {item.colaborador?.cargo || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3">{item.colaborador?.tipo_vinculo || '-'}</td>
                      <td className="px-3 py-3">{formatNumber(item.dias_trabalhados)}</td>
                      <td className="px-3 py-3">{formatNumber(item.horas_extras)}</td>
                      <td className="px-3 py-3">{formatCurrency(item.valor_bruto)}</td>
                      <td className="px-3 py-3">{formatCurrency(item.valor_descontos)}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{formatCurrency(item.valor_liquido)}</div>
                        <div className="text-xs text-slate-500">{item.regra_aplicada || '-'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="form-control min-w-[190px]"
                          value={edicoes[item.id]?.chave_pix_titulo ?? getDefaultPixValue(item)}
                          onChange={(event) =>
                            setEdicoes((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                chave_pix_titulo: event.target.value
                              }
                            }))
                          }
                          disabled={!podeEditar || detalhe.status !== 'RASCUNHO' || !pixOptions.length}
                        >
                          {!pixOptions.length ? (
                            <option value="">Sem chave PIX</option>
                          ) : (
                            pixOptions.map((option) => (
                              <option key={option.key} value={option.value}>
                                {option.label}: {option.value}
                              </option>
                            ))
                          )}
                        </select>
                        <div className="mt-1 text-xs text-slate-500">Principal usada por padrao.</div>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          className="form-control min-w-[120px]"
                          value={edicoes[item.id]?.ajuste_credito_manual ?? ''}
                          onChange={(event) =>
                            setEdicoes((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                ajuste_credito_manual: event.target.value
                              }
                            }))
                          }
                          disabled={!podeEditar || detalhe.status !== 'RASCUNHO'}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          className="form-control min-w-[120px]"
                          value={edicoes[item.id]?.ajuste_debito_manual ?? ''}
                          onChange={(event) =>
                            setEdicoes((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                ajuste_debito_manual: event.target.value
                              }
                            }))
                          }
                          disabled={!podeEditar || detalhe.status !== 'RASCUNHO'}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="form-control min-w-[140px]"
                          value={edicoes[item.id]?.status || 'PENDENTE'}
                          onChange={(event) =>
                            setEdicoes((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                status: event.target.value
                              }
                            }))
                          }
                          disabled={!podeEditar || detalhe.status !== 'RASCUNHO'}
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="CONFERIDO">Conferido</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          className="form-control min-h-[76px] min-w-[220px]"
                          value={edicoes[item.id]?.observacoes ?? ''}
                          onChange={(event) =>
                            setEdicoes((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                observacoes: event.target.value
                              }
                            }))
                          }
                          disabled={!podeEditar || detalhe.status !== 'RASCUNHO'}
                        />
                      </td>
                      <td className="px-3 py-3">
                        {podeEditar && detalhe.status === 'RASCUNHO' ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => salvarItem(item.id)}
                            disabled={salvandoItemId === item.id}
                          >
                            {salvandoItemId === item.id ? 'Salvando...' : 'Salvar ajuste'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
