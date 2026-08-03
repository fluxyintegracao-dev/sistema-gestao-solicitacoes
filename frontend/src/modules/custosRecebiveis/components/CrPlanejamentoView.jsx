import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import { COMPETENCIA_ESTADO_LABELS } from '../constants/custosRecebiveis';
import {
  consolidarMedicaoCompetencia,
  decidirReaberturaCompetencia,
  finalizarPlanejamentoCompetencia,
  obterPlanejamentoCompetencia,
  salvarCustosCompetencia,
  salvarRecebiveisCompetencia,
  solicitarReaberturaCompetencia,
  solicitarReaberturaObraCompetencia
} from '../services/custosRecebiveis';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const PUBLIC_STEPS = [
  { id: 1, label: 'Custos planejados' },
  { id: 2, label: 'Medição prevista' },
  { id: 3, label: 'Medição aprovada' },
  { id: 4, label: 'Revisão e envio' }
];

const PRIVATE_STEPS = [
  { id: 1, label: 'Custos planejados' },
  { id: 2, label: 'Recebíveis do período' }
];

function asNumber(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function newLocalKey(prefix = 'cr-subitem') {
  return globalThis.crypto?.randomUUID?.()
    || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function planningRowKey(value = {}) {
  if (value.previsao_custo_id) return `custo:${Number(value.previsao_custo_id)}`;
  if (value.plano_item_id) return `plano:${Number(value.plano_item_id)}`;
  if (value.id) return `id:${Number(value.id)}`;
  return `local:${value.chave_local || ''}`;
}

function localExpiryDefault() {
  const date = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().slice(0, 16);
}

function privateReceiptStatusLabel(status) {
  const normalized = String(status || '').toUpperCase();
  const labels = {
    PREVISTO_CONTRATO: 'Previsto em contrato',
    ABERTO: 'Em aberto',
    EM_ABERTO: 'Em aberto',
    PENDENTE: 'Pendente',
    VENCIDO: 'Vencido',
    PAGO: 'Recebido',
    RECEBIDO: 'Recebido',
    QUITADO: 'Recebido',
    CANCELADO: 'Cancelado'
  };
  return labels[normalized] || normalized.replaceAll('_', ' ') || 'Não informado';
}

export default function CrPlanejamentoView({
  obra,
  competencia,
  permissions,
  onChanged
}) {
  const [data, setData] = useState(null);
  const [step, setStep] = useState(1);
  const [costs, setCosts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [decisionExpiry, setDecisionExpiry] = useState(localExpiryDefault);
  const [measurementPickerMacro, setMeasurementPickerMacro] = useState('');

  const load = useCallback(async () => {
    if (!obra?.id) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await obterPlanejamentoCompetencia(obra.id, competencia);
      setData(response);
      setCosts(response.custos || []);
      setReceipts(response.recebiveis || []);
      if (response.obra?.classificacao === 'PUBLICA') {
        const measurementsByItem = new Map(
          (response.medicoes || []).map((item) => [planningRowKey(item), item])
        );
        setMeasurements((response.recebiveis || []).map((receipt) => (
          measurementsByItem.get(planningRowKey(receipt)) || {
            previsao_custo_id: receipt.previsao_custo_id,
            plano_item_id: receipt.plano_item_id,
            item: receipt.item,
            etapa_macro_codigo: receipt.etapa_macro_codigo,
            descricao: receipt.descricao,
            unidade: receipt.unidade,
            quantidade_base: receipt.quantidade_base,
            custo_unitario: receipt.custo_unitario,
            valor_base: receipt.valor_base,
            quantidade_medida: 0,
            valor_medido: 0,
            valor_glosa: receipt.valor_previsto || 0,
            justificativa_glosa: '',
            data_medicao: '',
            numero_medicao: ''
          }
        )));
      } else {
        setMeasurements([]);
      }
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Erro ao carregar planejamento.');
    } finally {
      setLoading(false);
    }
  }, [obra?.id, competencia]);

  useEffect(() => {
    setStep(1);
    setFeedback('');
    setMeasurementPickerMacro('');
    load();
  }, [load]);

  const isPublic = (data?.obra?.classificacao || obra?.classificacao) === 'PUBLICA';
  const steps = isPublic ? PUBLIC_STEPS : PRIVATE_STEPS;
  const readonly = data?.regras?.editavel === false;
  const totalCosts = useMemo(
    () => costs.reduce((sum, item) => sum + (asNumber(item.quantidade) * asNumber(item.custo_unitario)), 0),
    [costs]
  );
  const totalReceipts = useMemo(() => (
    isPublic
      ? receipts.reduce((sum, item) => sum + asNumber(item.valor_previsto), 0)
      : receipts.reduce((sum, item) => sum + asNumber(item.valor_previsto), 0)
  ), [isPublic, receipts]);
  const totalApproved = useMemo(
    () => measurements.reduce((sum, item) => sum + asNumber(item.valor_medido), 0),
    [measurements]
  );
  const totalGlosa = useMemo(
    () => Math.max(0, totalReceipts - totalApproved),
    [totalApproved, totalReceipts]
  );

  function updateCost(index, field, value) {
    setCosts((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      next.valor_previsto = asNumber(next.quantidade) * asNumber(next.custo_unitario);
      return next;
    }));
  }

  function updateReceipt(index, field, value) {
    setReceipts((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (isPublic && field === 'quantidade_prevista') {
        next.valor_previsto = asNumber(value) * asNumber(item.custo_unitario);
      }
      return next;
    }));
  }

  function updateMeasurement(index, field, value) {
    setMeasurements((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === 'quantidade_medida') {
        next.valor_medido = (
          asNumber(value) * asNumber(item.custo_unitario)
        ).toFixed(2);
      }
      return next;
    }));
  }

  function addReceipt(cost) {
    if (!cost?.id || receipts.some((row) => Number(row.previsao_custo_id) === Number(cost.id))) return;
    const receipt = {
      previsao_custo_id: cost.id,
      plano_item_id: null,
      etapa_macro_codigo: cost.etapa_macro_codigo,
      descricao: cost.descricao,
      unidade: cost.unidade,
      quantidade_base: cost.quantidade,
      custo_unitario: cost.custo_unitario,
      valor_base: cost.valor_previsto,
      item: null,
      quantidade_prevista: 0,
      valor_previsto: 0,
      data_prevista: ''
    };
    setReceipts((current) => [...current, receipt]);
    setMeasurements((current) => [...current, {
      previsao_custo_id: cost.id,
      plano_item_id: null,
      etapa_macro_codigo: cost.etapa_macro_codigo,
      descricao: cost.descricao,
      unidade: cost.unidade,
      quantidade_base: cost.quantidade,
      custo_unitario: cost.custo_unitario,
      valor_base: cost.valor_previsto,
      item: null,
      quantidade_medida: 0,
      valor_medido: 0,
      valor_glosa: 0,
      justificativa_glosa: '',
      data_medicao: '',
      numero_medicao: ''
    }]);
    setMeasurementPickerMacro('');
  }

  function addCost(macro) {
    setCosts((current) => [...current, {
      id: null,
      chave_local: newLocalKey(),
      plano_item_id: null,
      etapa_macro_codigo: macro.codigo,
      descricao: '',
      unidade: '',
      ordem: current.filter((item) => item.etapa_macro_codigo === macro.codigo).length + 1,
      item: null,
      quantidade: '',
      custo_unitario: '',
      valor_previsto: 0,
      parceiro_id: null
    }]);
  }

  function removeReceipt(reference) {
    setReceipts((current) => current.filter(
      (item) => planningRowKey(item) !== reference
    ));
    setMeasurements((current) => current.filter(
      (item) => planningRowKey(item) !== reference
    ));
  }

  function removeCost(reference) {
    setCosts((current) => current.filter(
      (item) => planningRowKey(item) !== reference
    ));
  }

  function costsForMacro(macroCode) {
    return costs.filter((item) => item.etapa_macro_codigo === macroCode);
  }

  function receiptsForMacro(macroCode) {
    return receipts.filter((item) => item.etapa_macro_codigo === macroCode);
  }

  function availableMeasurementCosts(macroCode) {
    const selectedIds = new Set(receipts.map((item) => Number(item.previsao_custo_id)).filter(Boolean));
    return costsForMacro(macroCode).filter((item) => item.id && !selectedIds.has(Number(item.id)));
  }

  function renderCostMacro(macro, macroIndex) {
    const rows = costsForMacro(macro.codigo);
    const total = rows.reduce((sum, item) => sum + asNumber(item.valor_previsto), 0);
    return (
      <article key={macro.codigo} className="cr-macro-planning-block">
        <header className="cr-macro-planning-heading">
          <div>
            <b>{macroIndex + 1}</b>
            <div>
              <strong>{macro.codigo} · {macro.descricao}</strong>
              <span>Orçado na macro: {currency.format(macro.valor_orcado || 0)}</span>
            </div>
          </div>
          {!readonly && permissions.costs ? (
            <button type="button" className="btn btn-outline" onClick={() => addCost(macro)}>
              <HiOutlinePlus className="h-4 w-4" />
              Adicionar subitem
            </button>
          ) : null}
        </header>
        <div className="cr-table-shell cr-planning-table cr-macro-subitems-table">
          <table>
            <thead>
              <tr>
                <th>Descrição do serviço</th>
                <th>Unidade</th>
                <th>Quantidade</th>
                <th>Valor unitário</th>
                <th>Valor total</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const index = costs.findIndex((row) => planningRowKey(row) === planningRowKey(item));
                return (
                  <tr key={planningRowKey(item)}>
                    <td>
                      <input
                        value={item.descricao || ''}
                        placeholder="Descreva o serviço planejado"
                        maxLength="500"
                        disabled={readonly || !permissions.costs}
                        onChange={(event) => updateCost(index, 'descricao', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={item.unidade || ''}
                        placeholder="un, m², mês..."
                        maxLength="30"
                        disabled={readonly || !permissions.costs}
                        onChange={(event) => updateCost(index, 'unidade', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={item.quantidade}
                        disabled={readonly || !permissions.costs}
                        onChange={(event) => updateCost(index, 'quantidade', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={item.custo_unitario}
                        disabled={readonly || !permissions.costs}
                        onChange={(event) => updateCost(index, 'custo_unitario', event.target.value)}
                      />
                    </td>
                    <td><strong>{currency.format(item.valor_previsto || 0)}</strong></td>
                    <td>
                      {!readonly && permissions.costs ? (
                        <button
                          type="button"
                          className="cr-icon-action"
                          onClick={() => removeCost(planningRowKey(item))}
                          aria-label={`Remover ${item.descricao || 'subitem'}`}
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan="6" className="cr-table-empty">Nenhum subitem planejado nesta etapa.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <footer className="cr-macro-total">
          <span>Total da etapa</span>
          <strong>{currency.format(total)}</strong>
        </footer>
      </article>
    );
  }

  function renderForecastMeasurementMacro(macro, macroIndex) {
    const rows = receiptsForMacro(macro.codigo);
    const available = availableMeasurementCosts(macro.codigo);
    const total = rows.reduce((sum, item) => sum + asNumber(item.valor_previsto), 0);
    const pickerOpen = measurementPickerMacro === macro.codigo;
    return (
      <article key={macro.codigo} className="cr-macro-planning-block">
        <header className="cr-macro-planning-heading">
          <div>
            <b>{macroIndex + 1}</b>
            <div>
              <strong>{macro.codigo} · {macro.descricao}</strong>
              <span>{rows.length} subitem(ns) na medição prevista</span>
            </div>
          </div>
          {!readonly && permissions.receipts ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setMeasurementPickerMacro(pickerOpen ? '' : macro.codigo)}
            >
              <HiOutlinePlus className="h-4 w-4" />
              Adicionar subitem
            </button>
          ) : null}
        </header>
        {pickerOpen ? (
          <div className="cr-macro-subitem-picker">
            <strong>Selecione um custo planejado desta etapa</strong>
            {available.map((cost) => (
              <button key={cost.id} type="button" onClick={() => addReceipt(cost)}>
                <span>{cost.descricao}</span>
                <small>{cost.unidade} · {cost.quantidade} × {currency.format(cost.custo_unitario)}</small>
                <HiOutlinePlus className="h-4 w-4" />
              </button>
            ))}
            {!available.length ? (
              <span className="cr-macro-picker-empty">
                Salve os custos planejados ou todos os subitens desta etapa já foram adicionados.
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="cr-table-shell cr-planning-table cr-forecast-measurement-table">
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Unid.</th>
                <th>Qtd. planejada</th>
                <th>Valor unitário</th>
                <th>Total planejado</th>
                <th>Qtd. já medida</th>
                <th>Qtd. medida</th>
                <th>Nesta medição</th>
                <th>Saldo a medir</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const index = receipts.findIndex((row) => planningRowKey(row) === planningRowKey(item));
                const previousQuantity = asNumber(item.item?.quantidade_apresentada_anterior);
                const remainingQuantity = Math.max(
                  0,
                  asNumber(item.quantidade_base) - previousQuantity - asNumber(item.quantidade_prevista)
                );
                return (
                  <tr key={planningRowKey(item)}>
                    <td><strong>{item.descricao}</strong></td>
                    <td>{item.unidade || 'un'}</td>
                    <td>{item.quantidade_base}</td>
                    <td>{currency.format(item.custo_unitario || 0)}</td>
                    <td>{currency.format(item.valor_base || 0)}</td>
                    <td>{previousQuantity}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={Math.max(0, asNumber(item.quantidade_base) - previousQuantity)}
                        step="0.0001"
                        value={item.quantidade_prevista}
                        disabled={readonly || !permissions.receipts}
                        onChange={(event) => updateReceipt(index, 'quantidade_prevista', event.target.value)}
                      />
                    </td>
                    <td><strong>{currency.format(item.valor_previsto || 0)}</strong></td>
                    <td>{remainingQuantity} {item.unidade || 'un'}</td>
                    <td>
                      {!readonly && permissions.receipts ? (
                        <button
                          type="button"
                          className="cr-icon-action"
                          onClick={() => removeReceipt(planningRowKey(item))}
                          aria-label={`Remover ${item.descricao}`}
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan="10" className="cr-table-empty">Adicione os subitens que terão medição prevista.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <footer className="cr-macro-total">
          <span>Total previsto da etapa</span>
          <strong>{currency.format(total)}</strong>
        </footer>
      </article>
    );
  }

  async function runMutation(kind, action, successMessage) {
    if (saving) return null;
    try {
      setSaving(kind);
      setError('');
      setFeedback('');
      const result = await action();
      setFeedback(successMessage);
      await load();
      onChanged?.();
      return result;
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível concluir a operação.');
      return null;
    } finally {
      setSaving('');
    }
  }

  async function saveReceipts() {
    if (!isPublic) return;
    const rows = receipts.map((item) => ({
      previsao_custo_id: item.previsao_custo_id || null,
      plano_item_id: item.plano_item_id,
      quantidade_prevista: asNumber(item.quantidade_prevista),
      data_prevista: item.data_prevista || null
    }));
    await runMutation(
      'receipts',
      () => salvarRecebiveisCompetencia(obra.id, competencia, rows),
      'Medição prevista salva.'
    );
  }

  async function saveCosts() {
    await runMutation(
      'costs',
      () => salvarCustosCompetencia(
        obra.id,
        competencia,
        costs.map((item) => ({
          id: item.id || null,
          chave_local: item.chave_local || null,
          plano_item_id: item.plano_item_id,
          etapa_macro_codigo: item.etapa_macro_codigo,
          descricao: item.descricao,
          unidade: item.unidade,
          ordem: item.ordem,
          quantidade: asNumber(item.quantidade),
          custo_unitario: asNumber(item.custo_unitario),
          parceiro_id: item.parceiro_id || null
        }))
      ),
      'Custos planejados salvos.'
    );
  }

  async function saveMeasurement() {
    await runMutation(
      'measurement',
      () => consolidarMedicaoCompetencia(
        obra.id,
        competencia,
        measurements.map((item) => ({
          previsao_custo_id: item.previsao_custo_id || null,
          plano_item_id: item.plano_item_id,
          quantidade_medida: asNumber(item.quantidade_medida),
          valor_medido: asNumber(item.valor_medido),
          justificativa_glosa: item.justificativa_glosa || null,
          data_medicao: item.data_medicao || null,
          numero_medicao: item.numero_medicao || null
        }))
      ),
      'Medição consolidada com rastreabilidade.'
    );
  }

  async function finish() {
    if (!window.confirm(
      'Finalizar congela os valores da competência. Depois disso, qualquer ajuste exigirá reabertura aprovada. Continuar?'
    )) return;
    const justifications = {};
    if (totalCosts === 0) {
      const value = window.prompt('Justifique a finalização sem custos previstos:');
      if (!value) return;
      justifications.justificativa_sem_custos = value;
    }
    if (totalReceipts === 0) {
      const value = window.prompt('Justifique a finalização sem recebíveis previstos:');
      if (!value) return;
      justifications.justificativa_sem_receitas = value;
    }
    await runMutation(
      'finish',
      () => finalizarPlanejamentoCompetencia(obra.id, competencia, justifications),
      'Competência finalizada e protegida contra alterações.'
    );
  }

  async function requestReopening() {
    await runMutation(
      'reopen',
      () => (
        data.competencia.id
          ? solicitarReaberturaCompetencia(data.competencia.id, reopenReason)
          : solicitarReaberturaObraCompetencia(obra.id, competencia, reopenReason)
      ),
      'Solicitação de reabertura registrada para decisão.'
    );
    setReopenReason('');
  }

  async function decideReopening(reopeningId, decision) {
    await runMutation(
      `decision-${reopeningId}`,
      () => decidirReaberturaCompetencia(reopeningId, {
        decisao: decision,
        expira_em: decision === 'APROVADA'
          ? new Date(decisionExpiry).toISOString()
          : null
      }),
      decision === 'APROVADA'
        ? 'Reabertura aprovada com prazo temporário.'
        : 'Solicitação de reabertura negada.'
    );
  }

  function renderClosureControls() {
    return (
      <>
        {permissions.finish && data?.competencia?.estado !== 'FINALIZADA' ? (
          <div className="cr-panel-actions cr-closure-actions">
            <span>
              {isPublic
                ? 'Finalize depois de salvar custos e medição prevista. A aprovação pode ser registrada quando o órgão responder.'
                : 'Ao finalizar, os recebíveis exibidos são sincronizados automaticamente com as fontes oficiais.'}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(saving)}
              onClick={finish}
            >
              <HiOutlineCheckCircle className="h-4 w-4" />
              {saving === 'finish' ? 'Finalizando...' : 'Finalizar competência'}
            </button>
          </div>
        ) : null}

        {data?.regras?.exige_reabertura && permissions.reopenRequest ? (
          <div className="cr-reopen-box">
            <label className="cr-field">
              <span>Motivo da reabertura</span>
              <textarea
                value={reopenReason}
                onChange={(event) => setReopenReason(event.target.value)}
                placeholder="Explique o ajuste necessário para auditoria."
              />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              disabled={reopenReason.trim().length < 10 || Boolean(saving)}
              onClick={requestReopening}
            >
              Solicitar reabertura
            </button>
          </div>
        ) : null}

        {data?.reaberturas?.length ? (
          <div className="cr-reopening-list">
            <div className="cr-block-heading">
              <div>
                <h3>Histórico de reaberturas</h3>
                <p>Decisão e prazo ficam vinculados à competência, com auditoria.</p>
              </div>
            </div>
            {permissions.reopenApprove
              && data.reaberturas.some((item) => item.situacao === 'SOLICITADA') ? (
                <label className="cr-field cr-expiry-field">
                  <span>Janela de edição até</span>
                  <input
                    type="datetime-local"
                    value={decisionExpiry}
                    onChange={(event) => setDecisionExpiry(event.target.value)}
                  />
                </label>
              ) : null}
            {data.reaberturas.map((item) => (
              <article key={item.id} className="cr-reopening-row">
                <div>
                  <strong>{item.solicitante?.nome || `Usuário #${item.solicitado_por}`}</strong>
                  <span>{item.motivo}</span>
                </div>
                <span className="cr-status-pill" data-status={item.situacao}>{item.situacao}</span>
                {permissions.reopenApprove && item.situacao === 'SOLICITADA' ? (
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={Boolean(saving)}
                      onClick={() => decideReopening(item.id, 'NEGADA')}
                    >
                      Negar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={Boolean(saving)}
                      onClick={() => decideReopening(item.id, 'APROVADA')}
                    >
                      Aprovar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  if (!obra?.id) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <strong>Selecione uma obra</strong>
        <span>Escolha a obra no contexto para abrir o planejamento mensal.</span>
      </section>
    );
  }
  if (loading && !data) {
    return <section className="cr-section cr-empty-state">Carregando planejamento...</section>;
  }
  if (error && !data) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineExclamationTriangle className="h-6 w-6" />
        <strong>Planejamento indisponível</strong>
        <span>{error}</span>
        <button type="button" className="btn btn-outline" onClick={load}>Tentar novamente</button>
      </section>
    );
  }

  return (
    <section className="cr-workspace cr-planning-workspace">
      <header className="cr-workspace-heading">
        <div>
          <span>Competência {competencia}</span>
          <h2>Planejamento · {obra.codigo || obra.id} · {obra.nome}</h2>
          <p>
            Plano micro v{data?.plano?.versao} · {isPublic ? 'Obra pública com medição' : 'Obra privada com recebíveis contratuais'}
          </p>
        </div>
        <span className="cr-status-pill" data-status={data?.competencia?.estado}>
          {COMPETENCIA_ESTADO_LABELS[data?.competencia?.estado] || data?.competencia?.estado}
        </span>
      </header>

      {readonly ? (
        <div className="cr-lock-banner">
          <HiOutlineLockClosed className="h-5 w-5" />
          <div>
            <strong>Competência finalizada</strong>
            <span>
              {isPublic
                ? 'Custos e medição prevista estão congelados. A medição aprovada permanece disponível para registro quando o órgão responder.'
                : 'Custos e recebíveis do período permanecem disponíveis para consulta. A edição dos custos exige reabertura aprovada.'}
            </span>
          </div>
        </div>
      ) : null}

      {error ? <div className="cr-feedback" data-tone="error">{error}</div> : null}
      {feedback ? <div className="cr-feedback" data-tone="success">{feedback}</div> : null}

      <nav className="cr-stepper" aria-label="Etapas do planejamento">
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            className={step === item.id ? 'is-active' : ''}
            onClick={() => setStep(item.id)}
          >
            <b>{item.id}</b>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {step === 2 && isPublic ? (
        <div className="cr-planning-panel cr-macro-planning-panel">
          <div className="cr-block-heading">
            <div>
              <h3>Medição prevista no período</h3>
              <p>
                Adicione os subitens salvos nos custos planejados. As informações do serviço são carregadas automaticamente; informe somente a quantidade medida.
              </p>
            </div>
          </div>
          <div className="cr-macro-planning-list">
            {(data?.macros || []).map(renderForecastMeasurementMacro)}
            {!data?.macros?.length ? (
              <div className="cr-empty-state">Nenhuma etapa macro disponível no plano publicado.</div>
            ) : null}
          </div>
          <div className="cr-panel-actions">
            <strong>Total da medição prevista: {currency.format(totalReceipts)}</strong>
            {permissions.receipts ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={readonly || Boolean(saving)}
                onClick={saveReceipts}
              >
                {saving === 'receipts' ? 'Salvando...' : 'Salvar medição prevista'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 2 && !isPublic ? (
        <div className="cr-planning-panel">
          <div className="cr-block-heading">
            <div>
              <h3>{isPublic ? 'Medição prevista no período' : 'Recebíveis cadastrados para o período'}</h3>
              <p>
                {isPublic
                  ? 'A quantidade prevista usa o custo unitário congelado no plano publicado.'
                  : 'Consulta automática de parcelas e títulos a receber. O acompanhamento de vencimento e cobrança permanece no Financeiro.'}
              </p>
            </div>
          </div>
          <div className="cr-table-shell cr-planning-table">
            <table>
              <thead>
                <tr>
                  <th>{isPublic ? 'Item micro' : 'Origem contratual'}</th>
                  {isPublic ? (
                    <>
                      <th>Qtd. orçada</th>
                      <th>Já medida</th>
                      <th>Nesta medição</th>
                      <th>Valor previsto</th>
                      <th>Saldo após medição</th>
                      <th aria-label="Ações" />
                    </>
                  ) : (
                    <>
                      <th>Documento</th>
                      <th>Status financeiro</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {receipts.map((item, index) => (
                  <tr key={item.key || item.plano_item_id}>
                    <td>
                      <strong>
                        {isPublic
                          ? `${item.item.codigo} · ${item.item.descricao}`
                          : item.descricao}
                      </strong>
                      <span>
                        {isPublic
                          ? `${item.item.unidade || 'un'} · ${item.item.etapa_macro_codigo || 'Sem macro'}`
                          : `${item.origem_exibicao === 'TITULO' ? 'Título a receber' : 'Parcela contratual'} · contrato ${item.contrato.numero}`}
                      </span>
                    </td>
                    {isPublic ? (
                      <>
                        <td>{item.item.quantidade_orcada} {item.item.unidade || 'un'}</td>
                        <td>{item.item.quantidade_apresentada_anterior || 0}</td>
                        <td>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={item.quantidade_prevista}
                          disabled={readonly || !permissions.receipts}
                          onChange={(event) => updateReceipt(index, 'quantidade_prevista', event.target.value)}
                        />
                        </td>
                        <td>{currency.format(item.valor_previsto || 0)}</td>
                        <td>
                          {Math.max(
                            0,
                            asNumber(item.item.quantidade_orcada)
                              - asNumber(item.item.quantidade_apresentada_anterior)
                              - asNumber(item.quantidade_prevista)
                          )} {item.item.unidade || 'un'}
                        </td>
                        <td>
                          {!readonly && permissions.receipts ? (
                            <button
                              type="button"
                              className="cr-icon-action"
                              onClick={() => removeReceipt(item.plano_item_id)}
                              aria-label={`Remover ${item.item.descricao}`}
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </button>
                          ) : null}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{item.documento || 'Parcela contratual'}</td>
                        <td>
                          <span className="cr-status-pill" data-status={item.status_financeiro}>
                            {privateReceiptStatusLabel(item.status_financeiro)}
                          </span>
                        </td>
                        <td>{item.data_prevista}</td>
                        <td>{currency.format(item.valor_previsto || 0)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {!receipts.length ? (
                  <tr>
                    <td colSpan={isPublic ? 7 : 5} className="cr-table-empty">
                      {isPublic
                        ? 'Pesquise e adicione somente os serviços executados nesta medição.'
                        : 'Nenhuma parcela ou título a receber encontrado para a competência.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="cr-panel-actions">
            <strong>{isPublic ? 'Total previsto' : 'Total cadastrado'}: {currency.format(totalReceipts)}</strong>
            {isPublic && permissions.receipts ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={readonly || Boolean(saving)}
                onClick={saveReceipts}
              >
                {saving === 'receipts' ? 'Salvando...' : 'Salvar medição prevista'}
              </button>
            ) : (
              !isPublic ? (
                <span className="cr-automatic-source">
                  Fonte automática: contratos e títulos do Financeiro
                </span>
              ) : null
            )}
          </div>
          {!isPublic ? (
            <div className="cr-private-closeout">
              <div className="cr-review-summary">
                <div><span>Custos planejados</span><strong>{currency.format(totalCosts)}</strong></div>
                <div><span>Recebíveis do período</span><strong>{currency.format(totalReceipts)}</strong></div>
                <div data-tone={totalReceipts - totalCosts >= 0 ? 'positive' : 'negative'}>
                  <span>Margem prevista</span>
                  <strong>{currency.format(totalReceipts - totalCosts)}</strong>
                </div>
              </div>
              {renderClosureControls()}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 && isPublic ? (
        <div className="cr-planning-panel cr-measurement-panel">
          <div className="cr-block-heading">
            <div>
              <h3>Medição aprovada pelo órgão</h3>
              <p>
                Registre o valor reconhecido pelo órgão. A diferença para o previsto
                será tratada como glosa e exigirá justificativa.
              </p>
            </div>
          </div>
          {permissions.measurementView ? (
            <>
              <div className="cr-table-shell cr-planning-table">
                <table>
                  <thead>
                    <tr>
                      <th>Subitem planejado</th>
                      <th>Previsto</th>
                      <th>Qtd. aprovada</th>
                      <th>Valor aprovado</th>
                      <th>Glosa</th>
                      <th>Justificativa</th>
                      <th>Data / número</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((item, index) => {
                      const receipt = receipts.find(
                        (row) => planningRowKey(row) === planningRowKey(item)
                      );
                      const rowGlosa = Math.max(
                        0,
                        asNumber(receipt?.valor_previsto) - asNumber(item.valor_medido)
                      );
                      return (
                        <tr key={planningRowKey(item)}>
                          <td>
                            <strong>{item.descricao || item.item?.descricao}</strong>
                            <span>{item.etapa_macro_codigo || 'Sem macro'} · {item.unidade || item.item?.unidade || 'un'}</span>
                          </td>
                          <td>
                            {receipt?.quantidade_prevista || 0} {item.unidade || item.item?.unidade || 'un'}
                            <span>{currency.format(receipt?.valor_previsto || 0)}</span>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={item.quantidade_medida}
                              disabled={!permissions.measurement}
                              onChange={(event) => updateMeasurement(index, 'quantidade_medida', event.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.valor_medido}
                              disabled={!permissions.measurement}
                              onChange={(event) => updateMeasurement(index, 'valor_medido', event.target.value)}
                            />
                          </td>
                          <td data-tone={rowGlosa > 0 ? 'negative' : 'neutral'}>
                            {currency.format(rowGlosa)}
                          </td>
                          <td>
                            <input
                              value={item.justificativa_glosa || ''}
                              placeholder={rowGlosa > 0 ? 'Motivo da glosa' : 'Sem glosa'}
                              disabled={!permissions.measurement}
                              onChange={(event) => updateMeasurement(index, 'justificativa_glosa', event.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={item.data_medicao || ''}
                              disabled={!permissions.measurement}
                              onChange={(event) => updateMeasurement(index, 'data_medicao', event.target.value)}
                            />
                            <input
                              value={item.numero_medicao || ''}
                              placeholder="Boletim"
                              disabled={!permissions.measurement}
                              onChange={(event) => updateMeasurement(index, 'numero_medicao', event.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {!measurements.length ? (
                      <tr>
                        <td colSpan="7" className="cr-table-empty">
                          Salve primeiro a medição prevista para registrar a aprovação do órgão.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="cr-panel-actions">
                <span>
                  Aprovado: {currency.format(totalApproved)} · Glosa: {currency.format(totalGlosa)}
                </span>
                {permissions.measurement ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!measurements.length || Boolean(saving)}
                    onClick={saveMeasurement}
                  >
                    {saving === 'measurement' ? 'Registrando...' : 'Registrar medição aprovada'}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="cr-empty-state">
              Você não possui permissão para visualizar a medição aprovada.
            </div>
          )}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="cr-planning-panel cr-macro-planning-panel">
          <div className="cr-block-heading">
            <div>
              <h3>Custos planejados por etapa macro</h3>
              <p>
                Cadastre livremente os serviços previstos para o mês. Cada subitem permanece vinculado à etapa macro para comparação, auditoria e medição.
              </p>
            </div>
          </div>
          <div className="cr-planning-total-banner">
            <span>Custo previsto no mês</span>
            <strong>{currency.format(totalCosts)}</strong>
            <small>Quantidade × valor unitário compõe o total operacional.</small>
          </div>
          <div className="cr-macro-planning-list">
            {(data?.macros || []).map(renderCostMacro)}
            {!data?.macros?.length ? (
              <div className="cr-empty-state">Nenhuma etapa macro disponível no plano publicado.</div>
            ) : null}
          </div>
          <div className="cr-panel-actions">
            <strong>Total planejado: {currency.format(totalCosts)}</strong>
            {permissions.costs ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={readonly || Boolean(saving)}
                onClick={saveCosts}
              >
                {saving === 'costs' ? 'Salvando...' : 'Salvar custos planejados'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 4 && isPublic ? (
        <div className="cr-review-layout">
          <div className="cr-review-summary">
            <div><span>Custos planejados</span><strong>{currency.format(totalCosts)}</strong></div>
            <div><span>Medição prevista</span><strong>{currency.format(totalReceipts)}</strong></div>
            <div><span>Medição aprovada</span><strong>{currency.format(totalApproved)}</strong></div>
            <div data-tone={totalGlosa > 0 ? 'negative' : 'positive'}>
              <span>Glosa registrada</span>
              <strong>{currency.format(totalGlosa)}</strong>
            </div>
            <div data-tone={totalReceipts - totalCosts >= 0 ? 'positive' : 'negative'}>
              <span>Margem prevista</span>
              <strong>{currency.format(totalReceipts - totalCosts)}</strong>
            </div>
          </div>
          <div className="cr-review-checklist">
            <HiOutlineClipboardDocumentCheck className="h-6 w-6" />
            <div>
              <strong>Revisão operacional</strong>
              <span>
                Ao finalizar, a versão v{data?.plano?.versao} será registrada como snapshot.
                Duplo clique não cria uma segunda finalização.
              </span>
            </div>
          </div>
          {renderClosureControls()}
        </div>
      ) : null}

      <footer className="cr-step-actions">
        <button
          type="button"
          className="btn btn-outline"
          disabled={step === 1}
          onClick={() => setStep((current) => Math.max(1, current - 1))}
        >
          <HiOutlineChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span>Etapa {step} de {steps.length}</span>
        <button
          type="button"
          className="btn btn-outline"
          disabled={step === steps.length}
          onClick={() => setStep((current) => Math.min(steps.length, current + 1))}
        >
          Próxima
          <HiOutlineChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </section>
  );
}
