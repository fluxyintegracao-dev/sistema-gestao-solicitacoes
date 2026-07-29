import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import { COMPETENCIA_ESTADO_LABELS } from '../constants/custosRecebiveis';
import {
  consolidarMedicaoCompetencia,
  decidirReaberturaCompetencia,
  finalizarPlanejamentoCompetencia,
  obterPlanejamentoCompetencia,
  pesquisarItensPlanoCompetencia,
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
  { id: 1, label: 'Medição apresentada' },
  { id: 2, label: 'Custos planejados' },
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
  const [itemSearch, setItemSearch] = useState({ receipts: '', costs: '' });
  const [searchResults, setSearchResults] = useState({ receipts: [], costs: [] });
  const [searching, setSearching] = useState('');

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
          (response.medicoes || []).map((item) => [Number(item.plano_item_id), item])
        );
        setMeasurements((response.recebiveis || []).map((receipt) => (
          measurementsByItem.get(Number(receipt.plano_item_id)) || {
            plano_item_id: receipt.plano_item_id,
            item: receipt.item,
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
        next.valor_previsto = asNumber(value) * asNumber(item.item?.custo_unitario_orcado);
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
          asNumber(value) * asNumber(item.item?.custo_unitario_orcado)
        ).toFixed(2);
      }
      return next;
    }));
  }

  async function searchPlanItems(kind) {
    if (!obra?.id || searching) return;
    try {
      setSearching(kind);
      setError('');
      const response = await pesquisarItensPlanoCompetencia(
        obra.id,
        competencia,
        { q: itemSearch[kind], limit: 20 }
      );
      setSearchResults((current) => ({ ...current, [kind]: response.items || [] }));
    } catch (requestError) {
      setError(requestError.message || 'Erro ao pesquisar serviços.');
    } finally {
      setSearching('');
    }
  }

  function addReceipt(item) {
    if (receipts.some((row) => Number(row.plano_item_id) === Number(item.id))) return;
    const receipt = {
      plano_item_id: item.id,
      item,
      quantidade_prevista: 0,
      valor_previsto: 0,
      data_prevista: ''
    };
    setReceipts((current) => [...current, receipt]);
    setMeasurements((current) => [...current, {
      plano_item_id: item.id,
      item,
      quantidade_medida: 0,
      valor_medido: 0,
      valor_glosa: 0,
      justificativa_glosa: '',
      data_medicao: '',
      numero_medicao: ''
    }]);
    setSearchResults((current) => ({ ...current, receipts: [] }));
    setItemSearch((current) => ({ ...current, receipts: '' }));
  }

  function addCost(item) {
    if (costs.some((row) => Number(row.plano_item_id) === Number(item.id))) return;
    setCosts((current) => [...current, {
      plano_item_id: item.id,
      item,
      quantidade: 0,
      custo_unitario: item.custo_unitario_orcado || 0,
      valor_previsto: 0,
      parceiro_id: null
    }]);
    setSearchResults((current) => ({ ...current, costs: [] }));
    setItemSearch((current) => ({ ...current, costs: '' }));
  }

  function removeReceipt(itemId) {
    setReceipts((current) => current.filter(
      (item) => Number(item.plano_item_id) !== Number(itemId)
    ));
    setMeasurements((current) => current.filter(
      (item) => Number(item.plano_item_id) !== Number(itemId)
    ));
  }

  function removeCost(itemId) {
    setCosts((current) => current.filter(
      (item) => Number(item.plano_item_id) !== Number(itemId)
    ));
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
      'Medição apresentada salva.'
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
              <h3>{isPublic ? 'Medição apresentada no período' : 'Recebíveis contratuais da competência'}</h3>
              <p>
                {isPublic
                  ? 'A quantidade prevista usa o custo unitário congelado no plano publicado.'
                  : 'Parcela vinculada a título aparece uma única vez como título a receber.'}
              </p>
            </div>
          </div>
          {isPublic && !readonly && permissions.receipts ? (
            <div className="cr-item-picker">
              <label className="cr-field">
                <span>Adicionar serviço medido</span>
                <div className="cr-search-input">
                  <input
                    value={itemSearch.receipts}
                    placeholder="Pesquise por código, serviço ou etapa..."
                    onChange={(event) => setItemSearch((current) => ({
                      ...current,
                      receipts: event.target.value
                    }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        searchPlanItems('receipts');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={searching === 'receipts'}
                    onClick={() => searchPlanItems('receipts')}
                    aria-label="Pesquisar serviços"
                  >
                    <HiOutlineMagnifyingGlass className="h-4 w-4" />
                  </button>
                </div>
              </label>
              {searchResults.receipts.length ? (
                <div className="cr-item-picker-results">
                  {searchResults.receipts.map((item) => (
                    <button key={item.id} type="button" onClick={() => addReceipt(item)}>
                      <span><strong>{item.codigo}</strong> · {item.descricao}</span>
                      <small>
                        {item.etapa_macro_codigo || 'Sem macro'} · {item.unidade || 'un'} · saldo {
                          Math.max(
                            0,
                            asNumber(item.quantidade_orcada)
                              - asNumber(item.quantidade_apresentada_anterior)
                          )
                        }
                      </small>
                      <HiOutlinePlus className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="cr-table-shell cr-planning-table">
            <table>
              <thead>
                <tr>
                  <th>{isPublic ? 'Item micro' : 'Origem contratual'}</th>
                  {isPublic ? (
                    <>
                      <th>Qtd. orçada</th>
                      <th>Já apresentada</th>
                      <th>Nesta medição</th>
                      <th>Valor apresentado</th>
                      <th>Saldo após medição</th>
                      <th aria-label="Ações" />
                    </>
                  ) : (
                    <>
                      <th>Confirmar</th>
                      <th>Data prevista</th>
                      <th>Valor previsto</th>
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
                        <td>
                        <input
                          type="checkbox"
                          checked={Boolean(item.confirmado)}
                          disabled={readonly || !permissions.receipts}
                          onChange={(event) => updateReceipt(index, 'confirmado', event.target.checked)}
                        />
                        </td>
                        <td>{item.data_prevista}</td>
                        <td>{currency.format(item.valor_previsto || 0)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {!receipts.length ? (
                  <tr>
                    <td colSpan={isPublic ? 7 : 4} className="cr-table-empty">
                      {isPublic
                        ? 'Pesquise e adicione somente os serviços executados nesta medição.'
                        : 'Nenhum recebível contratual encontrado para a competência.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="cr-panel-actions">
            <strong>{isPublic ? 'Total apresentado' : 'Total previsto'}: {currency.format(totalReceipts)}</strong>
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
              <summary>Medição aprovada pelo órgão e glosas</summary>
              <div className="cr-table-shell cr-planning-table">
                <table>
                  <thead>
                    <tr>
                      <th>Item micro</th>
                      <th>Apresentado</th>
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
                        (row) => Number(row.plano_item_id) === Number(item.plano_item_id)
                      );
                      const rowGlosa = Math.max(
                        0,
                        asNumber(receipt?.valor_previsto) - asNumber(item.valor_medido)
                      );
                      return (
                        <tr key={item.plano_item_id}>
                          <td>
                            <strong>{item.item.codigo} · {item.item.descricao}</strong>
                            <span>{item.item.unidade || 'un'}</span>
                          </td>
                          <td>
                            {receipt?.quantidade_prevista || 0} {item.item.unidade || 'un'}
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
                  </tbody>
                </table>
              </div>
              {permissions.measurement ? (
                <div className="cr-panel-actions">
                  <span>
                    Aprovado: {currency.format(totalApproved)} · Glosa: {currency.format(totalGlosa)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={Boolean(saving)}
                    onClick={saveMeasurement}
                  >
                    {saving === 'measurement' ? 'Registrando...' : 'Registrar medição aprovada'}
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
              <h3>Custos planejados por item micro</h3>
              <p>Somente itens folha da versão publicada podem receber previsão mensal.</p>
            </div>
          </div>
          {!readonly && permissions.costs ? (
            <div className="cr-item-picker">
              <label className="cr-field">
                <span>Adicionar custo planejado</span>
                <div className="cr-search-input">
                  <input
                    value={itemSearch.costs}
                    placeholder="Pesquise por código, serviço ou etapa..."
                    onChange={(event) => setItemSearch((current) => ({
                      ...current,
                      costs: event.target.value
                    }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        searchPlanItems('costs');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={searching === 'costs'}
                    onClick={() => searchPlanItems('costs')}
                    aria-label="Pesquisar serviços"
                  >
                    <HiOutlineMagnifyingGlass className="h-4 w-4" />
                  </button>
                </div>
              </label>
              {searchResults.costs.length ? (
                <div className="cr-item-picker-results">
                  {searchResults.costs.map((item) => (
                    <button key={item.id} type="button" onClick={() => addCost(item)}>
                      <span><strong>{item.codigo}</strong> · {item.descricao}</span>
                      <small>
                        {item.etapa_macro_codigo || 'Sem macro'} · {item.unidade || 'un'} · {
                          currency.format(item.custo_unitario_orcado || 0)
                        }
                      </small>
                      <HiOutlinePlus className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="cr-table-shell cr-planning-table">
            <table>
              <thead>
                <tr>
                  <th>Macro / item micro</th>
                  <th>Qtd. prevista</th>
                  <th>Custo unitário</th>
                  <th>Valor previsto</th>
                  <th aria-label="Ações" />
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
                    <td>
                      {!readonly && permissions.costs ? (
                        <button
                          type="button"
                          className="cr-icon-action"
                          onClick={() => removeCost(item.plano_item_id)}
                          aria-label={`Remover ${item.item.descricao}`}
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!costs.length ? (
                  <tr>
                    <td colSpan="5" className="cr-table-empty">
                      Pesquise e adicione somente os custos planejados para esta competência.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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
                {saving === 'costs' ? 'Salvando...' : 'Salvar custos'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="cr-review-layout">
          <div className="cr-review-summary">
            <div><span>Medição apresentada</span><strong>{currency.format(totalReceipts)}</strong></div>
            <div><span>Custos planejados</span><strong>{currency.format(totalCosts)}</strong></div>
            {isPublic ? (
              <div data-tone={totalGlosa > 0 ? 'negative' : 'positive'}>
                <span>Glosa registrada</span>
                <strong>{currency.format(totalGlosa)}</strong>
              </div>
            ) : null}
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
