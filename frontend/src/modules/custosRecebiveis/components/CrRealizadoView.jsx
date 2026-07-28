import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineArrowsRightLeft,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineLink
} from 'react-icons/hi2';
import {
  obterCustosRealizados,
  reconciliarCustoRealizado,
  reprocessarCustosRealizados
} from '../services/custosRecebiveis';
import CrStatusPill from './CrStatusPill';

const STATUS_LABELS = {
  BAIXA_ATIVA: 'Baixa ativa',
  NAO_MAPEADO: 'Não mapeado',
  ESTORNADO: 'Estornado',
  COMPROMETIDO: 'Comprometido',
  INCORRIDO: 'Incorrido'
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

function chainLabel(item) {
  return [
    item.solicitacao?.codigo,
    item.pedido?.codigo,
    item.titulo?.codigo
  ].filter(Boolean).join(' → ') || 'Título sem origem operacional';
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
      setError(requestError.message || 'Erro ao consultar realizações.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [obra?.id, competencia]);

  const sortedPlanItems = useMemo(() => (
    [...(data?.itens_plano || [])].sort((a, b) => (
      String(a.etapa_macro_codigo || '').localeCompare(String(b.etapa_macro_codigo || ''))
      || String(a.codigo || '').localeCompare(String(b.codigo || ''))
    ))
  ), [data?.itens_plano]);
  const displayItems = useMemo(() => ([
    ...(data?.contextos || []).map((item) => ({
      ...item,
      id: null,
      displayKey: item.key,
      data_movimento: item.data,
      item_micro: null,
      etapa_macro_codigo: null,
      ativo: false,
      contextual: true
    })),
    ...(data?.items || []).map((item) => ({
      ...item,
      displayKey: `realizado:${item.id}`,
      contextual: false
    }))
  ]), [data?.contextos, data?.items]);

  async function handleReprocess() {
    if (!obra?.id || processing) return;
    try {
      setProcessing(true);
      setError('');
      setFeedback('');
      const result = await reprocessarCustosRealizados(obra.id, competencia);
      setFeedback(result.idempotente
        ? 'As projeções já estavam atualizadas. Nenhum total foi alterado.'
        : `${result.criados} inclusão(ões), ${result.atualizados} atualização(ões) e ${result.correcoes} correção(ões) processadas.`);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Erro ao atualizar realizações.');
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
        <strong>Selecione uma obra para consultar o realizado</strong>
        <span>A competência do contexto define o mês das baixas financeiras.</span>
      </section>
    );
  }

  return (
    <>
      <section className="cr-section">
        <header className="cr-section-header cr-section-header--actions">
          <div>
            <span>Rastreabilidade financeira</span>
            <h2>Custo realizado · {obra.nome}</h2>
            <p>
              Somente baixas ativas entram no total. Solicitação, pedido e título são
              exibidos como contexto e nunca comprovam caixa sozinhos.
            </p>
          </div>
          {permissions.update ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={processing}
              onClick={handleReprocess}
            >
              <HiOutlineArrowPath className={processing ? 'h-4 w-4 cr-spin' : 'h-4 w-4'} />
              {processing ? 'Atualizando...' : 'Atualizar realizações'}
            </button>
          ) : null}
        </header>

        {error ? <div className="cr-feedback" data-tone="error">{error}</div> : null}
        {feedback ? <div className="cr-feedback" data-tone="success">{feedback}</div> : null}

        <div className="cr-summary-grid cr-summary-grid--realized">
          <article>
            <span>Realizado</span>
            <strong>{currency(data?.resumo?.realizado)}</strong>
            <small>Baixas ativas da competência</small>
          </article>
          <article data-tone={Number(data?.resumo?.nao_mapeado) > 0 ? 'warning' : 'neutral'}>
            <span>Não mapeado</span>
            <strong>{currency(data?.resumo?.nao_mapeado)}</strong>
            <small>Permanece no total até reconciliar</small>
          </article>
          <article>
            <span>Baixas ativas</span>
            <strong>{Number(data?.resumo?.baixas_ativas || 0)}</strong>
            <small>Movimentos que comprovam caixa</small>
          </article>
          <article>
            <span>Estornos preservados</span>
            <strong>{Number(data?.resumo?.estornos || 0)}</strong>
            <small>Histórico visível, valor neutralizado</small>
          </article>
        </div>

        <div className="cr-table-wrap">
          <table className="cr-table cr-table--realized">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cadeia operacional</th>
                <th>Parceiro</th>
                <th>Item micro</th>
                <th className="is-number">Valor</th>
                <th>Estado</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7">Carregando custo realizado...</td></tr>
              ) : null}
              {!loading && !displayItems.length ? (
                <tr>
                  <td colSpan="7">
                    Nenhuma projeção processada nesta competência. Use “Atualizar realizações”
                    quando houver baixas financeiras.
                  </td>
                </tr>
              ) : null}
              {!loading && displayItems.map((item) => (
                <tr
                  key={item.displayKey}
                  className={item.valor === 0 ? 'is-muted-row' : ''}
                  data-contextual={item.contextual ? 'true' : 'false'}
                >
                  <td data-label="Data">{formatDate(item.data_movimento)}</td>
                  <td data-label="Cadeia">
                    <strong>{chainLabel(item)}</strong>
                    <small>
                      {item.contextual
                        ? 'Camada informativa — não compõe o total realizado'
                        : item.titulo?.descricao || 'Sem descrição do título'}
                    </small>
                  </td>
                  <td data-label="Parceiro">{item.parceiro?.nome || '-'}</td>
                  <td data-label="Item micro">
                    {item.item_micro
                      ? `${item.item_micro.codigo} · ${item.item_micro.descricao}`
                      : item.etapa_macro_codigo || 'Aguardando reconciliação'}
                  </td>
                  <td data-label="Valor" className="is-number">{currency(item.valor)}</td>
                  <td data-label="Estado">
                    <CrStatusPill
                      status={item.estado}
                      label={STATUS_LABELS[item.estado] || item.estado}
                    />
                  </td>
                  <td data-label="Ação">
                    {permissions.reconcile
                      && item.ativo
                      && item.estado === 'NAO_MAPEADO'
                      && item.valor !== 0 ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openReconciliation(item)}
                        >
                          <HiOutlineLink className="h-4 w-4" />
                          Reconciliar
                        </button>
                      ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="cr-operational-note">
          <HiOutlineExclamationTriangle className="h-4 w-4" />
          <span>
            Reprocessar não cria baixa, não altera títulos e não muda pedidos. A operação
            apenas atualiza a projeção <code>cr_*</code>.
          </span>
        </footer>
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
                <p>{chainLabel(reconciliation)} · {currency(reconciliation.valor)}</p>
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
