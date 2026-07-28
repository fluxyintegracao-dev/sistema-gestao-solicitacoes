import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed
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

const STEPS = [
  { id: 1, label: 'Medição e recebíveis' },
  { id: 2, label: 'Custos previstos' },
  { id: 3, label: 'Revisão e envio' }
];

function asNumber(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function localExpiryDefault() {
  const date = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().slice(0, 16);
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
      setMeasurements(response.medicoes || []);
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
    load();
  }, [load]);

  const isPublic = data?.obra?.classificacao === 'PUBLICA';
  const readonly = data?.regras?.editavel === false;
  const totalCosts = useMemo(
    () => costs.reduce((sum, item) => sum + (asNumber(item.quantidade) * asNumber(item.custo_unitario)), 0),
    [costs]
  );
  const totalReceipts = useMemo(() => (
    isPublic
      ? receipts.reduce((sum, item) => sum + asNumber(item.valor_previsto), 0)
      : receipts.filter((item) => item.confirmado)
        .reduce((sum, item) => sum + asNumber(item.valor_previsto), 0)
  ), [isPublic, receipts]);

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
        next.valor_previsto = asNumber(value) * asNumber(item.item?.custo_unitario_orcado);
      }
      return next;
    }));
  }

  function updateMeasurement(index, field, value) {
    setMeasurements((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
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
    const rows = isPublic
      ? receipts.map((item) => ({
        plano_item_id: item.plano_item_id,
        quantidade_prevista: asNumber(item.quantidade_prevista),
        data_prevista: item.data_prevista || null
      }))
      : receipts.filter((item) => item.confirmado).map((item) => ({ key: item.key }));
    await runMutation(
      'receipts',
      () => salvarRecebiveisCompetencia(obra.id, competencia, rows),
      'Recebíveis previstos salvos.'
    );
  }

  async function saveCosts() {
    await runMutation(
      'costs',
      () => salvarCustosCompetencia(
        obra.id,
        competencia,
        costs.map((item) => ({
          plano_item_id: item.plano_item_id,
          quantidade: asNumber(item.quantidade),
          custo_unitario: asNumber(item.custo_unitario),
          parceiro_id: item.parceiro_id || null
        }))
      ),
      'Custos previstos salvos.'
    );
  }

  async function saveMeasurement() {
    await runMutation(
      'measurement',
      () => consolidarMedicaoCompetencia(
        obra.id,
        competencia,
        measurements.map((item) => ({
          plano_item_id: item.plano_item_id,
          quantidade_medida: asNumber(item.quantidade_medida),
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
            <strong>Competência finalizada e imutável</strong>
            <span>Os dados permanecem disponíveis para consulta. A edição exige reabertura aprovada.</span>
          </div>
        </div>
      ) : null}

      {error ? <div className="cr-feedback" data-tone="error">{error}</div> : null}
      {feedback ? <div className="cr-feedback" data-tone="success">{feedback}</div> : null}

      <nav className="cr-stepper" aria-label="Etapas do planejamento">
        {STEPS.map((item) => (
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

      {step === 1 ? (
        <div className="cr-planning-panel">
          <div className="cr-block-heading">
            <div>
              <h3>{isPublic ? 'Medição e recebíveis previstos' : 'Recebíveis contratuais da competência'}</h3>
              <p>
                {isPublic
                  ? 'A quantidade prevista usa o custo unitário congelado no plano publicado.'
                  : 'Parcela vinculada a título aparece uma única vez como título a receber.'}
              </p>
            </div>
          </div>
          <div className="cr-table-shell cr-planning-table">
            <table>
              <thead>
                <tr>
                  <th>{isPublic ? 'Item micro' : 'Origem contratual'}</th>
                  {isPublic ? <th>Qtd. prevista</th> : <th>Confirmar</th>}
                  <th>Data prevista</th>
                  <th>Valor previsto</th>
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
                    <td>
                      {isPublic ? (
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={item.quantidade_prevista}
                          disabled={readonly || !permissions.receipts}
                          onChange={(event) => updateReceipt(index, 'quantidade_prevista', event.target.value)}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={Boolean(item.confirmado)}
                          disabled={readonly || !permissions.receipts}
                          onChange={(event) => updateReceipt(index, 'confirmado', event.target.checked)}
                        />
                      )}
                    </td>
                    <td>
                      {isPublic ? (
                        <input
                          type="date"
                          value={item.data_prevista || ''}
                          disabled={readonly || !permissions.receipts}
                          onChange={(event) => updateReceipt(index, 'data_prevista', event.target.value)}
                        />
                      ) : item.data_prevista}
                    </td>
                    <td>{currency.format(item.valor_previsto || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cr-panel-actions">
            <strong>Total previsto: {currency.format(totalReceipts)}</strong>
            {permissions.receipts ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={readonly || Boolean(saving)}
                onClick={saveReceipts}
              >
                {saving === 'receipts' ? 'Salvando...' : 'Salvar recebíveis'}
              </button>
            ) : null}
          </div>

          {isPublic && permissions.measurementView ? (
            <details className="cr-measurement-panel">
              <summary>Medição consolidada da competência</summary>
              <div className="cr-table-shell cr-planning-table">
                <table>
                  <thead>
                    <tr>
                      <th>Item micro</th>
                      <th>Qtd. medida</th>
                      <th>Data</th>
                      <th>Número</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((item, index) => (
                      <tr key={item.plano_item_id}>
                        <td>
                          <strong>{item.item.codigo} · {item.item.descricao}</strong>
                          <span>{item.item.unidade || 'un'}</span>
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
                            type="date"
                            value={item.data_medicao || ''}
                            disabled={!permissions.measurement}
                            onChange={(event) => updateMeasurement(index, 'data_medicao', event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            value={item.numero_medicao || ''}
                            disabled={!permissions.measurement}
                            onChange={(event) => updateMeasurement(index, 'numero_medicao', event.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {permissions.measurement ? (
                <div className="cr-panel-actions">
                  <span>A medição não altera a previsão finalizada.</span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={Boolean(saving)}
                    onClick={saveMeasurement}
                  >
                    {saving === 'measurement' ? 'Consolidando...' : 'Consolidar medição'}
                  </button>
                </div>
              ) : null}
            </details>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="cr-planning-panel">
          <div className="cr-block-heading">
            <div>
              <h3>Custos previstos por item micro</h3>
              <p>Somente itens folha da versão publicada podem receber previsão mensal.</p>
            </div>
          </div>
          <div className="cr-table-shell cr-planning-table">
            <table>
              <thead>
                <tr>
                  <th>Macro / item micro</th>
                  <th>Qtd. prevista</th>
                  <th>Custo unitário</th>
                  <th>Valor previsto</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((item, index) => (
                  <tr key={item.plano_item_id}>
                    <td>
                      <strong>{item.item.codigo} · {item.item.descricao}</strong>
                      <span>{item.item.etapa_macro_codigo || 'Sem macro'} · {item.item.unidade || 'un'}</span>
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
                    <td>{currency.format(item.valor_previsto || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cr-panel-actions">
            <strong>Total previsto: {currency.format(totalCosts)}</strong>
            {permissions.costs ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={readonly || Boolean(saving)}
                onClick={saveCosts}
              >
                {saving === 'costs' ? 'Salvando...' : 'Salvar custos'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="cr-review-layout">
          <div className="cr-review-summary">
            <div><span>Recebíveis previstos</span><strong>{currency.format(totalReceipts)}</strong></div>
            <div><span>Custos previstos</span><strong>{currency.format(totalCosts)}</strong></div>
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
          {permissions.finish && data?.competencia?.estado !== 'FINALIZADA' ? (
            <div className="cr-panel-actions">
              <span>Finalize somente depois de salvar as etapas 1 e 2.</span>
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
        <span>Etapa {step} de {STEPS.length}</span>
        <button
          type="button"
          className="btn btn-outline"
          disabled={step === STEPS.length}
          onClick={() => setStep((current) => Math.min(STEPS.length, current + 1))}
        >
          Próxima
          <HiOutlineChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </section>
  );
}
