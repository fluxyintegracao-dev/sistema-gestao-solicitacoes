import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineArrowsRightLeft,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineLink,
  HiOutlineMagnifyingGlass
} from 'react-icons/hi2';
import {
  obterCustosRealizados,
  reconciliarCustoRealizado,
  reprocessarCustosRealizados
} from '../services/custosRecebiveis';
import CrStatusPill from './CrStatusPill';

const STATUS_LABELS = {
  ABERTO: 'Aberto',
  ABERTA: 'Aberto',
  PARCIAL: 'Parcialmente pago',
  QUITADO: 'Quitado',
  QUITADA: 'Quitado',
  BAIXADO: 'Quitado',
  PAGO: 'Quitado',
  PAGA: 'Quitado',
  CONCILIADO: 'Quitado',
  PREVISAO: 'Previsão',
  CANCELADO: 'Cancelado',
  CANCELADA: 'Cancelado',
  ESTORNADO: 'Estornado',
  ESTORNADA: 'Estornado',
  BAIXA_ATIVA: 'Baixa ativa',
  NAO_MAPEADO: 'Não mapeado'
};

const GROUP_LABELS = {
  TODOS: 'Todos',
  ABERTO: 'Abertos',
  PARCIAL: 'Parciais',
  QUITADO: 'Quitados',
  PREVISAO: 'Previsões',
  OUTRO: 'Outros',
  INATIVO: 'Inativos'
};

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatMonth(value) {
  if (!value) return '-';
  const [year, month] = String(value).split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1));
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function titleReference(item) {
  return item.codigo || item.numero_documento || `Título #${item.id}`;
}

function appropriationLabel(item) {
  const values = (item.apropriacoes || []).map((appropriation) => (
    [appropriation.codigo, appropriation.nome].filter(Boolean).join(' · ')
  ));
  return values.length ? values.join(', ') : 'Sem apropriação';
}

function reconciliationTitle(item) {
  return item.titulo?.codigo || `Título #${item.titulo?.id || item.id}`;
}

export default function CrRealizadoView({
  obra,
  competencia,
  permissions = {}
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [scopeFilter, setScopeFilter] = useState('COMPETENCIA');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [reconciliation, setReconciliation] = useState(null);
  const [selectedPlanItem, setSelectedPlanItem] = useState('');
  const [reason, setReason] = useState('');

  async function load() {
    if (!obra?.id) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setData(await obterCustosRealizados(obra.id, competencia));
    } catch (requestError) {
      setError(requestError.message || 'Erro ao consultar os custos financeiros.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setScopeFilter('COMPETENCIA');
    setStatusFilter('TODOS');
    setSearch('');
    load();
  }, [obra?.id, competencia]);

  const sortedPlanItems = useMemo(() => (
    [...(data?.itens_plano || [])].sort((a, b) => (
      String(a.etapa_macro_codigo || '').localeCompare(String(b.etapa_macro_codigo || ''))
      || String(a.codigo || '').localeCompare(String(b.codigo || ''))
    ))
  ), [data?.itens_plano]);

  const titles = useMemo(() => data?.titulos || [], [data?.titulos]);
  const mappingQueue = useMemo(() => (
    (data?.items || []).filter((item) => (
      item.ativo && item.estado === 'NAO_MAPEADO' && Number(item.valor || 0) !== 0
    ))
  ), [data?.items]);
  const normalizedSearch = normalizeSearch(search);
  const filteredTitles = useMemo(() => titles.filter((item) => {
    if (scopeFilter === 'COMPETENCIA' && !item.em_competencia) return false;
    if (statusFilter !== 'TODOS' && item.grupo_status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return normalizeSearch([
      item.codigo,
      item.numero_documento,
      item.descricao,
      item.parceiro?.nome,
      item.parceiro?.cpf_cnpj,
      item.categoria?.nome,
      ...(item.apropriacoes || []).flatMap((entry) => [entry.codigo, entry.nome])
    ].filter(Boolean).join(' ')).includes(normalizedSearch);
  }), [normalizedSearch, scopeFilter, statusFilter, titles]);
  const groupedTitles = useMemo(() => {
    const groups = new Map();
    filteredTitles.forEach((item) => {
      const macros = item.etapas_macro || [];
      const macro = macros.length === 1 ? macros[0] : null;
      const key = macros.length > 1 ? 'MULTIPLAS' : (macro?.codigo || 'SEM_ETAPA');
      const current = groups.get(key) || {
        key,
        codigo: macro?.codigo || null,
        descricao: macros.length > 1
          ? 'Rateado em mais de uma etapa macro'
          : (macro?.descricao || 'Sem etapa macro identificada'),
        items: [],
        total: 0
      };
      current.items.push(item);
      current.total += item.ativo_no_custo ? Number(item.valor_alocado || 0) : 0;
      groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => {
      if (a.key === 'SEM_ETAPA') return 1;
      if (b.key === 'SEM_ETAPA') return -1;
      if (a.key === 'MULTIPLAS') return 1;
      if (b.key === 'MULTIPLAS') return -1;
      return String(a.codigo).localeCompare(String(b.codigo));
    });
  }, [filteredTitles]);

  const statusCounts = useMemo(() => titles.reduce((accumulator, item) => {
    const group = item.grupo_status || 'OUTRO';
    accumulator[group] = (accumulator[group] || 0) + 1;
    return accumulator;
  }, {}), [titles]);

  const statusOptions = useMemo(() => (
    ['TODOS', 'ABERTO', 'PARCIAL', 'QUITADO', 'PREVISAO', 'OUTRO', 'INATIVO']
      .filter((group) => group === 'TODOS' || Number(statusCounts[group] || 0) > 0)
  ), [statusCounts]);

  async function handleReprocess() {
    if (!obra?.id || processing) return;
    try {
      setProcessing(true);
      setError('');
      setFeedback('');
      const result = await reprocessarCustosRealizados(obra.id, competencia);
      setFeedback(result.idempotente
        ? 'O mapeamento das baixas já estava atualizado.'
        : `${result.criados} inclusão(ões), ${result.atualizados} atualização(ões) e ${result.correcoes} correção(ões) processadas.`);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Erro ao atualizar o mapeamento das baixas.');
    } finally {
      setProcessing(false);
    }
  }

  function openReconciliation(item) {
    setReconciliation(item);
    setSelectedPlanItem('');
    setReason('');
    setFeedback('');
  }

  async function handleReconcile(event) {
    event.preventDefault();
    if (!reconciliation || !selectedPlanItem || reason.trim().length < 5) return;
    try {
      setProcessing(true);
      setError('');
      await reconciliarCustoRealizado(reconciliation.id, {
        plano_item_id: Number(selectedPlanItem),
        motivo: reason.trim()
      });
      setReconciliation(null);
      setFeedback('Baixa reconciliada com o item micro e registrada na auditoria.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Erro ao reconciliar a baixa.');
    } finally {
      setProcessing(false);
    }
  }

  if (!obra?.id) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineBanknotes className="h-7 w-7" />
        <strong>Selecione uma obra para consultar os custos</strong>
        <span>A lista considera somente títulos financeiros a pagar alocados à obra.</span>
      </section>
    );
  }

  const summary = data?.resumo || {};

  return (
    <>
      <section className="cr-section cr-cost-ledger">
        <header className="cr-section-header">
          <div>
            <span>Razão de custos financeiros</span>
            <h2>Custos alocados · {obra.nome}</h2>
            <p>
              Fonte exclusiva: títulos financeiros a pagar. Pedidos e solicitações não
              compõem esta lista.
            </p>
          </div>
        </header>

        {error ? <div className="cr-feedback" data-tone="error">{error}</div> : null}
        {feedback ? <div className="cr-feedback" data-tone="success">{feedback}</div> : null}

        <div className="cr-cost-ledger__summary" aria-label="Resumo dos custos da obra">
          <article>
            <span>Total alocado</span>
            <strong>{currency(summary.total_alocado)}</strong>
            <small>{Number(summary.titulos_ativos || 0)} título(s) ativo(s)</small>
          </article>
          <article data-tone={Number(summary.saldo_aberto) > 0 ? 'warning' : 'neutral'}>
            <span>Saldo em aberto</span>
            <strong>{currency(summary.saldo_aberto)}</strong>
            <small>Aberto, parcial, previsão e outros estados ativos</small>
          </article>
          <article data-tone="success">
            <span>Valor pago</span>
            <strong>{currency(summary.total_pago)}</strong>
            <small>Baixas acumuladas dos títulos</small>
          </article>
          <article data-tone="context">
            <span>Emitido em {formatMonth(competencia)}</span>
            <strong>{currency(summary.valor_emitido_competencia)}</strong>
            <small>
              {Number(summary.titulos_emitidos_competencia || 0)} título(s), pagos ou em aberto
            </small>
          </article>
        </div>

        <div className="cr-cost-ledger__toolbar">
          <div className="cr-cost-ledger__scope" aria-label="Escopo dos títulos">
            <button
              type="button"
              data-active={scopeFilter === 'TODOS'}
              onClick={() => setScopeFilter('TODOS')}
            >
              Todos da obra
              <strong>{titles.length}</strong>
            </button>
            <button
              type="button"
              data-active={scopeFilter === 'COMPETENCIA'}
              onClick={() => setScopeFilter('COMPETENCIA')}
            >
              Emitidos na competência
              <strong>{Number(summary.titulos_emitidos_competencia || 0)}</strong>
            </button>
          </div>
          <label className="cr-cost-ledger__search">
            <HiOutlineMagnifyingGlass className="h-4 w-4" />
            <span className="sr-only">Pesquisar títulos</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Título, credor, categoria ou apropriação"
            />
          </label>
        </div>

        <div className="cr-cost-ledger__statuses" aria-label="Filtrar por situação financeira">
          {statusOptions.map((group) => (
            <button
              type="button"
              key={group}
              data-active={statusFilter === group}
              onClick={() => setStatusFilter(group)}
            >
              {GROUP_LABELS[group]}
              <strong>{group === 'TODOS' ? titles.length : Number(statusCounts[group] || 0)}</strong>
            </button>
          ))}
        </div>

        <div className="cr-cost-ledger__result">
          <span>
            {filteredTitles.length} de {titles.length} título(s)
          </span>
          {scopeFilter === 'COMPETENCIA' ? (
            <small>Emissão entre o primeiro e o último dia da competência.</small>
          ) : (
            <small>Histórico completo dos custos financeiros alocados à obra.</small>
          )}
        </div>

        <div className="cr-table-wrap">
          <table className="cr-table cr-table--cost-ledger">
            <thead>
              <tr>
                <th>Emissão / vencimento</th>
                <th>Título / descrição</th>
                <th>Credor</th>
                <th>Categoria / apropriação</th>
                <th className="is-number">Alocado</th>
                <th className="is-number">Pago</th>
                <th className="is-number">Saldo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">Carregando títulos financeiros...</td></tr>
              ) : null}
              {!loading && !filteredTitles.length ? (
                <tr>
                  <td colSpan="8">
                    {titles.length
                      ? 'Nenhum título corresponde aos filtros selecionados.'
                      : 'Nenhum título a pagar está alocado a esta obra.'}
                  </td>
                </tr>
              ) : null}
              {!loading && groupedTitles.map((group) => (
                <Fragment key={group.key}>
                  <tr className="cr-cost-ledger__macro-row">
                    <td colSpan="8">
                      <span>
                        {group.codigo ? <strong>{group.codigo}</strong> : null}
                        <strong>{group.descricao}</strong>
                      </span>
                      <small>
                        {group.items.length} título(s) · {currency(group.total)} alocado
                      </small>
                    </td>
                  </tr>
                  {group.items.map((item) => (
                    <tr
                      key={item.id}
                      data-in-competence={item.em_competencia ? 'true' : 'false'}
                      data-inactive={item.ativo_no_custo ? 'false' : 'true'}
                    >
                  <td data-label="Emissão / vencimento">
                    <strong>{formatDate(item.data_referencia_custo || item.data_emissao)}</strong>
                    <small>Vence em {formatDate(item.data_vencimento)}</small>
                    {item.em_competencia ? <small>Emitido na competência</small> : null}
                  </td>
                  <td data-label="Título">
                    <strong>{titleReference(item)}</strong>
                    <small>{item.descricao || 'Sem descrição'}</small>
                  </td>
                  <td data-label="Credor">
                    <strong>{item.parceiro?.nome || '-'}</strong>
                    <small>{item.parceiro?.cpf_cnpj || ''}</small>
                  </td>
                  <td data-label="Classificação">
                    <strong>{item.categoria?.nome || 'Sem categoria'}</strong>
                    <small>{appropriationLabel(item)}</small>
                  </td>
                  <td data-label="Alocado" className="is-number">
                    {currency(item.valor_alocado)}
                  </td>
                  <td data-label="Pago" className="is-number">
                    {currency(item.valor_pago)}
                  </td>
                  <td data-label="Saldo" className="is-number">
                    <strong>{currency(item.valor_saldo)}</strong>
                  </td>
                  <td data-label="Situação">
                    <CrStatusPill
                      status={item.status}
                      label={STATUS_LABELS[item.status] || item.status}
                    />
                  </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {(permissions.update || mappingQueue.length > 0) ? (
          <details className="cr-cost-ledger__technical">
            <summary>
              <span>
                Mapeamento contábil do realizado
                <small>
                  {mappingQueue.length
                    ? `${mappingQueue.length} baixa(s) aguardando item micro`
                    : 'Baixas financeiras conciliadas com o plano micro'}
                </small>
              </span>
              {mappingQueue.length ? (
                <strong>{mappingQueue.length} pendente(s)</strong>
              ) : null}
            </summary>
            <div className="cr-cost-ledger__technical-body">
              <div className="cr-cost-ledger__technical-actions">
                <p>
                  Atualiza o vínculo de análise sem alterar títulos ou movimentos financeiros.
                </p>
                {permissions.update ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={processing}
                    onClick={handleReprocess}
                  >
                    <HiOutlineArrowPath className={processing ? 'h-4 w-4 cr-spin' : 'h-4 w-4'} />
                    {processing ? 'Atualizando...' : 'Atualizar mapeamento'}
                  </button>
                ) : null}
              </div>
              {mappingQueue.length ? (
                <div className="cr-cost-ledger__mapping-list">
                  {mappingQueue.map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>{reconciliationTitle(item)}</strong>
                        <small>{item.titulo?.descricao || 'Baixa sem item micro'}</small>
                      </span>
                      <strong>{currency(item.valor)}</strong>
                      {permissions.reconcile ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openReconciliation(item)}
                        >
                          <HiOutlineLink className="h-4 w-4" />
                          Reconciliar
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cr-cost-ledger__technical-empty">
                  Nenhuma baixa ativa está aguardando reconciliação.
                </div>
              )}
            </div>
          </details>
        ) : null}
      </section>

      {reconciliation ? (
        <div className="cr-modal-backdrop" role="presentation">
          <section
            className="cr-modal cr-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cr-reconcile-title"
          >
            <header>
              <div>
                <span>Fila de não mapeados</span>
                <h2 id="cr-reconcile-title">Reconciliar baixa</h2>
                <p>{reconciliationTitle(reconciliation)} · {currency(reconciliation.valor)}</p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setReconciliation(null)}
              >
                Fechar
              </button>
            </header>
            <form onSubmit={handleReconcile}>
              <label className="cr-field">
                <span>Item micro correto</span>
                <select
                  required
                  value={selectedPlanItem}
                  onChange={(event) => setSelectedPlanItem(event.target.value)}
                >
                  <option value="">Selecione o item micro</option>
                  {sortedPlanItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.etapa_macro_codigo || 'Sem macro'} · {item.codigo} · {item.descricao}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cr-field">
                <span>Motivo para auditoria</span>
                <textarea
                  required
                  minLength="5"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explique por que esta baixa pertence ao item selecionado."
                />
              </label>
              <footer>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReconciliation(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={processing || !selectedPlanItem || reason.trim().length < 5}
                >
                  <HiOutlineArrowsRightLeft className="h-4 w-4" />
                  {processing ? 'Salvando...' : 'Confirmar reconciliação'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
