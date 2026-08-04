import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi2';
import CrPlanningImportModal from './CrPlanningImportModal';
import { COMPETENCIA_ESTADO_LABELS } from '../constants/custosRecebiveis';
import {
  consolidarMedicaoCompetencia,
  baixarModeloPlanilhaPlanejamento,
  decidirReaberturaCompetencia,
  finalizarPlanejamentoCompetencia,
  obterPlanejamentoCompetencia,
  pesquisarItensPlanoCompetencia,
  salvarCustosCompetencia,
  salvarRecebiveisCompetencia,
  solicitarReaberturaCompetencia,
  validarArquivoPlanilhaPlanejamento,
  solicitarReaberturaObraCompetencia
} from '../services/custosRecebiveis';
import {
  buildPlanningDraftKey,
  hasPlanningDraft,
  readPlanningDraft,
  removePlanningDraft,
  writePlanningDraft
} from '../utils/planningDraftStorage';

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

function draftSignature(value) {
  return JSON.stringify(value ?? null);
}

function localExpiryDefault() {
  const date = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().slice(0, 16);
}

function usePlanItemSearch(obraId, competencia, macroCode, query) {
  const [state, setState] = useState({ items: [], loading: false, error: '' });

  useEffect(() => {
    if (!obraId || !competencia || !macroCode) {
      setState({ items: [], loading: false, error: '' });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    const timer = window.setTimeout(async () => {
      try {
        const response = await pesquisarItensPlanoCompetencia(obraId, competencia, {
          q: query,
          page: 1,
          limit: 50,
          etapaMacroCodigo: macroCode
        });
        if (active) setState({ items: response.items || [], loading: false, error: '' });
      } catch (requestError) {
        if (active) {
          setState({
            items: [],
            loading: false,
            error: requestError.message || 'Não foi possível pesquisar a planilha.'
          });
        }
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [obraId, competencia, macroCode, query]);

  return state;
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
  userId,
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
  const [measurementSearch, setMeasurementSearch] = useState('');
  const [approvedPickerMacro, setApprovedPickerMacro] = useState('');
  const [approvedSearch, setApprovedSearch] = useState('');
  const [measurementJustification, setMeasurementJustification] = useState('');
  const [draftNotice, setDraftNotice] = useState('');
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [sheetType, setSheetType] = useState('');
  const [sheetPreview, setSheetPreview] = useState(null);
  const [sheetLoading, setSheetLoading] = useState('');
  const sheetFileRef = useRef(null);
  const sheetTypeRef = useRef('');
  const draftReadyRef = useRef(false);
  const latestDraftRef = useRef(null);
  const serverBaselineRef = useRef({
    costs: draftSignature([]),
    receipts: draftSignature([]),
    measurement: draftSignature({ items: [], justification: '' })
  });
  const draftKeys = useMemo(() => ({
    costs: buildPlanningDraftKey(userId, obra?.id, competencia, 'custos'),
    receipts: buildPlanningDraftKey(userId, obra?.id, competencia, 'medicao-prevista'),
    measurement: buildPlanningDraftKey(userId, obra?.id, competencia, 'medicao-aprovada')
  }), [competencia, obra?.id, userId]);
  const allDraftKeys = useMemo(() => Object.values(draftKeys).filter(Boolean), [draftKeys]);

  const load = useCallback(async () => {
    draftReadyRef.current = false;
    if (!obra?.id) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await obterPlanejamentoCompetencia(obra.id, competencia);
      const serverCosts = response.custos || [];
      const serverReceipts = response.recebiveis || [];
      const serverMeasurements = response.obra?.classificacao === 'PUBLICA'
        ? response.medicoes || []
        : [];
      const serverJustification = serverMeasurements
        .find((item) => item.justificativa_glosa)?.justificativa_glosa || '';
      const planVersion = response.plano?.versao;
      const costsDraft = readPlanningDraft(draftKeys.costs, planVersion);
      const receiptsDraft = readPlanningDraft(draftKeys.receipts, planVersion);
      const measurementDraft = readPlanningDraft(draftKeys.measurement, planVersion);
      const restoredDrafts = [costsDraft, receiptsDraft, measurementDraft].filter(Boolean);

      serverBaselineRef.current = {
        costs: draftSignature(serverCosts),
        receipts: draftSignature(serverReceipts),
        measurement: draftSignature({
          items: serverMeasurements,
          justification: serverJustification
        })
      };
      setData(response);
      setCosts(Array.isArray(costsDraft?.items) ? costsDraft.items : serverCosts);
      setReceipts(Array.isArray(receiptsDraft?.items) ? receiptsDraft.items : serverReceipts);
      if (response.obra?.classificacao === 'PUBLICA') {
        setMeasurements(
          Array.isArray(measurementDraft?.items) ? measurementDraft.items : serverMeasurements
        );
        setMeasurementJustification(
          measurementDraft?.justification ?? serverJustification
        );
      } else {
        setMeasurements([]);
        setMeasurementJustification('');
      }
      const latestRestoredDraft = [...restoredDrafts].sort(
        (left, right) => Number(right?.meta?.salvo_em || 0) - Number(left?.meta?.salvo_em || 0)
      )[0];
      const restoredStep = Number(latestRestoredDraft?.meta?.etapa);
      const maxStep = response.obra?.classificacao === 'PUBLICA' ? PUBLIC_STEPS.length : PRIVATE_STEPS.length;
      if (restoredStep >= 1 && restoredStep <= maxStep) setStep(restoredStep);
      setHasLocalDraft(restoredDrafts.length > 0);
      setDraftNotice(restoredDrafts.length ? 'Rascunho local restaurado' : '');
      draftReadyRef.current = true;
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Erro ao carregar planejamento.');
    } finally {
      setLoading(false);
    }
  }, [competencia, draftKeys, obra?.id]);

  useEffect(() => {
    setStep(1);
    setFeedback('');
    setMeasurementPickerMacro('');
    setMeasurementSearch('');
    setApprovedPickerMacro('');
    setApprovedSearch('');
    setMeasurementJustification('');
    setDraftNotice('');
    setHasLocalDraft(false);
    load();
  }, [load]);

  const isPublic = (data?.obra?.classificacao || obra?.classificacao) === 'PUBLICA';
  const steps = isPublic ? PUBLIC_STEPS : PRIVATE_STEPS;
  const readonly = data?.regras?.editavel === false;
  latestDraftRef.current = {
    costs,
    receipts,
    measurements,
    measurementJustification,
    isPublic,
    permissions,
    planVersion: data?.plano?.versao,
    step
  };
  const forecastSearch = usePlanItemSearch(
    obra?.id,
    competencia,
    measurementPickerMacro,
    measurementSearch
  );
  const approvedItemSearch = usePlanItemSearch(
    obra?.id,
    competencia,
    approvedPickerMacro,
    approvedSearch
  );
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
  const refreshDraftPresence = useCallback(() => {
    setHasLocalDraft(hasPlanningDraft(allDraftKeys));
  }, [allDraftKeys]);
  const flushPlanningDrafts = useCallback(() => {
    if (!draftReadyRef.current || !latestDraftRef.current) return;
    const latest = latestDraftRef.current;
    const metadata = {
      userId,
      obraId: obra?.id,
      competencia,
      planVersion: latest.planVersion,
      step: latest.step
    };
    if (
      draftKeys.costs
      && latest.permissions?.costs
      && draftSignature(latest.costs) !== serverBaselineRef.current.costs
    ) {
      writePlanningDraft(draftKeys.costs, { items: latest.costs }, metadata);
    }
    if (
      draftKeys.receipts
      && latest.isPublic
      && latest.permissions?.receipts
      && draftSignature(latest.receipts) !== serverBaselineRef.current.receipts
    ) {
      writePlanningDraft(draftKeys.receipts, { items: latest.receipts }, metadata);
    }
    const measurementPayload = {
      items: latest.measurements,
      justification: latest.measurementJustification
    };
    if (
      draftKeys.measurement
      && latest.isPublic
      && latest.permissions?.measurement
      && draftSignature(measurementPayload) !== serverBaselineRef.current.measurement
    ) {
      writePlanningDraft(draftKeys.measurement, measurementPayload, metadata);
    }
  }, [competencia, draftKeys, obra?.id, userId]);

  useEffect(() => {
    window.addEventListener('pagehide', flushPlanningDrafts);
    return () => {
      window.removeEventListener('pagehide', flushPlanningDrafts);
      flushPlanningDrafts();
    };
  }, [flushPlanningDrafts]);

  useEffect(() => {
    if (!draftReadyRef.current || !draftKeys.costs || !data || !permissions.costs) {
      return undefined;
    }
    const signature = draftSignature(costs);
    if (signature === serverBaselineRef.current.costs) {
      removePlanningDraft(draftKeys.costs);
      refreshDraftPresence();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (!draftReadyRef.current) return;
      const saved = writePlanningDraft(
        draftKeys.costs,
        { items: costs },
        {
          userId,
          obraId: obra.id,
          competencia,
          planVersion: data.plano?.versao,
          step
        }
      );
      setDraftNotice(saved ? 'Rascunho salvo neste dispositivo' : 'Não foi possível salvar o rascunho');
      refreshDraftPresence();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [competencia, costs, data, draftKeys.costs, obra?.id, permissions.costs, refreshDraftPresence, step, userId]);

  useEffect(() => {
    if (
      !draftReadyRef.current
      || !draftKeys.receipts
      || !data
      || !isPublic
      || !permissions.receipts
    ) return undefined;
    const signature = draftSignature(receipts);
    if (signature === serverBaselineRef.current.receipts) {
      removePlanningDraft(draftKeys.receipts);
      refreshDraftPresence();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (!draftReadyRef.current) return;
      const saved = writePlanningDraft(
        draftKeys.receipts,
        { items: receipts },
        {
          userId,
          obraId: obra.id,
          competencia,
          planVersion: data.plano?.versao,
          step
        }
      );
      setDraftNotice(saved ? 'Rascunho salvo neste dispositivo' : 'Não foi possível salvar o rascunho');
      refreshDraftPresence();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [competencia, data, draftKeys.receipts, isPublic, obra?.id, permissions.receipts, receipts, refreshDraftPresence, step, userId]);

  useEffect(() => {
    if (
      !draftReadyRef.current
      || !draftKeys.measurement
      || !data
      || !isPublic
      || !permissions.measurement
    ) return undefined;
    const payload = { items: measurements, justification: measurementJustification };
    const signature = draftSignature(payload);
    if (signature === serverBaselineRef.current.measurement) {
      removePlanningDraft(draftKeys.measurement);
      refreshDraftPresence();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (!draftReadyRef.current) return;
      const saved = writePlanningDraft(
        draftKeys.measurement,
        payload,
        {
          userId,
          obraId: obra.id,
          competencia,
          planVersion: data.plano?.versao,
          step
        }
      );
      setDraftNotice(saved ? 'Rascunho salvo neste dispositivo' : 'Não foi possível salvar o rascunho');
      refreshDraftPresence();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [competencia, data, draftKeys.measurement, isPublic, measurementJustification, measurements, obra?.id, permissions.measurement, refreshDraftPresence, step, userId]);

  async function discardLocalDraft() {
    if (!window.confirm('Descartar as alterações não salvas desta obra e competência?')) return;
    draftReadyRef.current = false;
    allDraftKeys.forEach(removePlanningDraft);
    setHasLocalDraft(false);
    await load();
    setDraftNotice('Rascunho descartado');
  }

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
        const previousQuantity = asNumber(item.item?.quantidade_apresentada_anterior);
        const availableQuantity = Math.max(
          0,
          asNumber(item.quantidade_base) - previousQuantity
        );
        next.quantidade_prevista = Math.min(
          availableQuantity,
          Math.max(0, asNumber(value))
        );
        next.valor_previsto = next.quantidade_prevista * asNumber(item.custo_unitario);
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

  function addReceipt(item) {
    if (!item?.id || receipts.some((row) => Number(row.plano_item_id) === Number(item.id))) return;
    const receipt = {
      previsao_custo_id: null,
      plano_item_id: item.id,
      etapa_macro_codigo: item.etapa_macro_codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade_base: item.quantidade_orcada,
      custo_unitario: item.custo_unitario_orcado,
      valor_base: item.valor_orcado,
      item,
      quantidade_prevista: 0,
      valor_previsto: 0,
      data_prevista: ''
    };
    setReceipts((current) => [...current, receipt]);
    setMeasurementPickerMacro('');
    setMeasurementSearch('');
  }

  function addApprovedMeasurement(item) {
    if (!item?.id || measurements.some((row) => Number(row.plano_item_id) === Number(item.id))) return;
    setMeasurements((current) => [...current, {
      previsao_custo_id: null,
      plano_item_id: item.id,
      etapa_macro_codigo: item.etapa_macro_codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade_base: item.quantidade_orcada,
      custo_unitario: item.custo_unitario_orcado,
      valor_base: item.valor_orcado,
      item,
      quantidade_medida: 0,
      valor_medido: 0,
      valor_glosa: 0,
      justificativa_glosa: '',
      data_medicao: '',
      numero_medicao: ''
    }]);
    setApprovedPickerMacro('');
    setApprovedSearch('');
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
  }

  function removeMeasurement(reference) {
    setMeasurements((current) => current.filter(
      (item) => planningRowKey(item) !== reference
    ));
  }

  function removeCost(reference) {
    setCosts((current) => current.filter(
      (item) => planningRowKey(item) !== reference
    ));
  }

  async function downloadPlanningModel(type) {
    if (sheetLoading) return;
    try {
      setSheetLoading(`download:${type}`);
      setError('');
      await baixarModeloPlanilhaPlanejamento(
        obra.id,
        competencia,
        type,
        obra.codigo || obra.id
      );
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível baixar o modelo.');
    } finally {
      setSheetLoading('');
    }
  }

  function choosePlanningFile(type) {
    if (sheetLoading) return;
    sheetTypeRef.current = type;
    setSheetType(type);
    sheetFileRef.current?.click();
  }

  async function handlePlanningFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const importType = sheetTypeRef.current;
    if (!file || !importType) return;
    try {
      setSheetLoading(`upload:${importType}`);
      setError('');
      const response = await validarArquivoPlanilhaPlanejamento(
        obra.id,
        competencia,
        importType,
        file
      );
      setSheetType(importType);
      setSheetPreview(response);
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível validar a planilha.');
      setSheetPreview(null);
    } finally {
      setSheetLoading('');
    }
  }

  function budgetItemFromImported(row, previousField) {
    return {
      id: Number(row.plano_item_id),
      codigo: row.item_codigo,
      descricao: row.descricao,
      unidade: row.unidade,
      quantidade_orcada: asNumber(row.quantidade_orcada),
      custo_unitario_orcado: asNumber(row.valor_unitario),
      valor_orcado: asNumber(row.quantidade_orcada) * asNumber(row.valor_unitario),
      etapa_macro_codigo: row.etapa_macro_codigo,
      [previousField]: Math.max(
        0,
        asNumber(row.quantidade_orcada) - asNumber(row.saldo_disponivel)
      )
    };
  }

  function applyPlanningImport(items) {
    if (sheetType === 'custos') {
      setCosts((current) => {
        const next = [...current];
        items.forEach((row) => {
          const identity = `${row.etapa_macro_codigo}|${String(row.descricao || '').trim().toLocaleLowerCase('pt-BR')}|${String(row.unidade || '').trim().toLocaleLowerCase('pt-BR')}`;
          const index = next.findIndex((item) => (
            `${item.etapa_macro_codigo}|${String(item.descricao || '').trim().toLocaleLowerCase('pt-BR')}|${String(item.unidade || '').trim().toLocaleLowerCase('pt-BR')}` === identity
          ));
          const imported = {
            ...(index >= 0 ? next[index] : {}),
            id: index >= 0 ? next[index].id : null,
            chave_local: index >= 0 ? next[index].chave_local : newLocalKey('cr-import-cost'),
            plano_item_id: null,
            etapa_macro_codigo: row.etapa_macro_codigo,
            descricao: row.descricao,
            unidade: row.unidade,
            ordem: index >= 0
              ? next[index].ordem
              : next.filter((item) => item.etapa_macro_codigo === row.etapa_macro_codigo).length + 1,
            item: null,
            quantidade: asNumber(row.quantidade),
            custo_unitario: asNumber(row.valor_unitario),
            valor_previsto: asNumber(row.valor_total),
            parceiro_id: null
          };
          if (index >= 0) next[index] = imported;
          else next.push(imported);
        });
        return next;
      });
      setStep(1);
    } else if (sheetType === 'medicao-prevista') {
      setReceipts((current) => {
        const next = [...current];
        items.forEach((row) => {
          const item = budgetItemFromImported(row, 'quantidade_apresentada_anterior');
          const imported = {
            previsao_custo_id: null,
            plano_item_id: item.id,
            etapa_macro_codigo: item.etapa_macro_codigo,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade_base: item.quantidade_orcada,
            custo_unitario: item.custo_unitario_orcado,
            valor_base: item.valor_orcado,
            item,
            quantidade_prevista: asNumber(row.quantidade),
            valor_previsto: asNumber(row.valor_total),
            data_prevista: ''
          };
          const index = next.findIndex((value) => Number(value.plano_item_id) === item.id);
          if (index >= 0) next[index] = { ...next[index], ...imported };
          else next.push(imported);
        });
        return next;
      });
      setStep(2);
    } else if (sheetType === 'medicao-aprovada') {
      setMeasurements((current) => {
        const next = [...current];
        items.forEach((row) => {
          const item = budgetItemFromImported(row, 'quantidade_aprovada_anterior');
          const imported = {
            previsao_custo_id: null,
            plano_item_id: item.id,
            etapa_macro_codigo: item.etapa_macro_codigo,
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade_base: item.quantidade_orcada,
            custo_unitario: item.custo_unitario_orcado,
            valor_base: item.valor_orcado,
            item,
            quantidade_medida: asNumber(row.quantidade),
            valor_medido: asNumber(row.valor_total),
            valor_glosa: 0,
            justificativa_glosa: '',
            data_medicao: '',
            numero_medicao: ''
          };
          const index = next.findIndex((value) => Number(value.plano_item_id) === item.id);
          if (index >= 0) next[index] = { ...next[index], ...imported };
          else next.push(imported);
        });
        return next;
      });
      setStep(3);
    }
    setSheetPreview(null);
    setFeedback('Importação aplicada ao rascunho. Revise e use o botão Salvar da etapa para gravar.');
  }

  function renderPlanningSheetActions(type, allowed = true) {
    if (!allowed) return null;
    const downloading = sheetLoading === `download:${type}`;
    const uploading = sheetLoading === `upload:${type}`;
    return (
      <div className="cr-planning-sheet-actions">
        <button
          type="button"
          className="btn btn-outline"
          disabled={Boolean(sheetLoading)}
          onClick={() => downloadPlanningModel(type)}
        >
          <HiOutlineArrowDownTray className="h-4 w-4" />
          {downloading ? 'Gerando...' : 'Baixar modelo'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={(type !== 'medicao-aprovada' && readonly) || Boolean(sheetLoading)}
          onClick={() => choosePlanningFile(type)}
        >
          <HiOutlineArrowUpTray className="h-4 w-4" />
          {uploading ? 'Validando...' : 'Importar planilha'}
        </button>
      </div>
    );
  }

  function costsForMacro(macroCode) {
    return costs.filter((item) => item.etapa_macro_codigo === macroCode);
  }

  function receiptsForMacro(macroCode) {
    return receipts.filter((item) => item.etapa_macro_codigo === macroCode);
  }

  function measurementsForMacro(macroCode) {
    return measurements.filter((item) => item.etapa_macro_codigo === macroCode);
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
    const selectedIds = new Set(receipts.map((item) => Number(item.plano_item_id)).filter(Boolean));
    const available = forecastSearch.items.filter((item) => !selectedIds.has(Number(item.id)));
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
              aria-expanded={pickerOpen}
              onClick={() => {
                setMeasurementPickerMacro(pickerOpen ? '' : macro.codigo);
                setMeasurementSearch('');
              }}
            >
              <HiOutlinePlus className="h-4 w-4" />
              Adicionar subitem
            </button>
          ) : null}
        </header>
        {pickerOpen ? (
          <div className="cr-macro-subitem-picker">
            <strong>Selecione um subitem da planilha nesta etapa</strong>
            <label className="cr-macro-picker-search">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
              <input
                autoFocus
                type="search"
                value={measurementSearch}
                placeholder="Pesquisar subitem desta etapa..."
                aria-label={`Pesquisar subitens de ${macro.descricao}`}
                onChange={(event) => setMeasurementSearch(event.target.value)}
              />
            </label>
            <div className="cr-macro-picker-results" role="listbox">
              {available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => addReceipt(item)}
                >
                  <span>{item.codigo} · {item.descricao}</span>
                  <small>
                    {item.unidade || 'un'} · orçado {item.quantidade_orcada} × {currency.format(item.custo_unitario_orcado)}
                  </small>
                  <HiOutlinePlus className="h-4 w-4" />
                </button>
              ))}
              {forecastSearch.loading ? (
                <span className="cr-macro-picker-empty">Pesquisando itens da planilha...</span>
              ) : null}
              {forecastSearch.error ? (
                <span className="cr-macro-picker-empty" data-tone="error">{forecastSearch.error}</span>
              ) : null}
              {!forecastSearch.loading && !forecastSearch.error && !available.length ? (
                <span className="cr-macro-picker-empty">
                  {measurementSearch.trim()
                    ? 'Nenhum subitem da planilha corresponde à pesquisa nesta etapa.'
                    : 'Nenhum subitem disponível na planilha para esta etapa.'}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="cr-table-shell cr-planning-table cr-forecast-measurement-table">
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Unid.</th>
                <th>Qtd. orçada</th>
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

  function renderApprovedMeasurementMacro(macro, macroIndex) {
    const rows = measurementsForMacro(macro.codigo);
    const selectedIds = new Set(measurements.map((item) => Number(item.plano_item_id)).filter(Boolean));
    const available = approvedItemSearch.items.filter((item) => !selectedIds.has(Number(item.id)));
    const total = rows.reduce((sum, item) => sum + asNumber(item.valor_medido), 0);
    const pickerOpen = approvedPickerMacro === macro.codigo;
    return (
      <article key={macro.codigo} className="cr-macro-planning-block">
        <header className="cr-macro-planning-heading">
          <div>
            <b>{macroIndex + 1}</b>
            <div>
              <strong>{macro.codigo} · {macro.descricao}</strong>
              <span>{rows.length} subitem(ns) na medição aprovada</span>
            </div>
          </div>
          {permissions.measurement ? (
            <button
              type="button"
              className="btn btn-outline"
              aria-expanded={pickerOpen}
              onClick={() => {
                setApprovedPickerMacro(pickerOpen ? '' : macro.codigo);
                setApprovedSearch('');
              }}
            >
              <HiOutlinePlus className="h-4 w-4" />
              Adicionar subitem
            </button>
          ) : null}
        </header>
        {pickerOpen ? (
          <div className="cr-macro-subitem-picker">
            <strong>Selecione um subitem aprovado nesta etapa</strong>
            <label className="cr-macro-picker-search">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
              <input
                autoFocus
                type="search"
                value={approvedSearch}
                placeholder="Pesquisar subitem aprovado..."
                aria-label={`Pesquisar subitens aprovados de ${macro.descricao}`}
                onChange={(event) => setApprovedSearch(event.target.value)}
              />
            </label>
            <div className="cr-macro-picker-results" role="listbox">
              {available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => addApprovedMeasurement(item)}
                >
                  <span>{item.codigo} · {item.descricao}</span>
                  <small>
                    {item.unidade || 'un'} · orçado {item.quantidade_orcada} × {currency.format(item.custo_unitario_orcado)}
                  </small>
                  <HiOutlinePlus className="h-4 w-4" />
                </button>
              ))}
              {approvedItemSearch.loading ? (
                <span className="cr-macro-picker-empty">Pesquisando itens da planilha...</span>
              ) : null}
              {approvedItemSearch.error ? (
                <span className="cr-macro-picker-empty" data-tone="error">{approvedItemSearch.error}</span>
              ) : null}
              {!approvedItemSearch.loading && !approvedItemSearch.error && !available.length ? (
                <span className="cr-macro-picker-empty">
                  {approvedSearch.trim()
                    ? 'Nenhum subitem da planilha corresponde à pesquisa nesta etapa.'
                    : 'Nenhum subitem disponível na planilha para esta etapa.'}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="cr-table-shell cr-planning-table cr-forecast-measurement-table">
          <table>
            <thead>
              <tr>
                <th>Serviço aprovado</th>
                <th>Unid.</th>
                <th>Qtd. orçada</th>
                <th>Qtd. já aprovada</th>
                <th>Qtd. aprovada</th>
                <th>Valor unitário</th>
                <th>Valor aprovado</th>
                <th>Data / boletim</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const index = measurements.findIndex(
                  (row) => planningRowKey(row) === planningRowKey(item)
                );
                const previousQuantity = asNumber(item.item?.quantidade_aprovada_anterior);
                return (
                  <tr key={planningRowKey(item)}>
                    <td><strong>{item.item?.codigo} · {item.descricao || item.item?.descricao}</strong></td>
                    <td>{item.unidade || item.item?.unidade || 'un'}</td>
                    <td>{item.quantidade_base}</td>
                    <td>{previousQuantity}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={Math.max(0, asNumber(item.quantidade_base) - previousQuantity)}
                        step="0.0001"
                        value={item.quantidade_medida}
                        disabled={!permissions.measurement}
                        onChange={(event) => updateMeasurement(index, 'quantidade_medida', event.target.value)}
                      />
                    </td>
                    <td>{currency.format(item.custo_unitario || 0)}</td>
                    <td><strong>{currency.format(item.valor_medido || 0)}</strong></td>
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
                    <td>
                      {permissions.measurement ? (
                        <button
                          type="button"
                          className="cr-icon-action"
                          onClick={() => removeMeasurement(planningRowKey(item))}
                          aria-label={`Remover ${item.descricao || item.item?.descricao}`}
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan="9" className="cr-table-empty">Adicione os subitens efetivamente aprovados pelo órgão.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <footer className="cr-macro-total">
          <span>Total aprovado da etapa</span>
          <strong>{currency.format(total)}</strong>
        </footer>
      </article>
    );
  }

  async function runMutation(kind, action, successMessage, draftSection = '') {
    if (saving) return null;
    try {
      setSaving(kind);
      setError('');
      setFeedback('');
      const result = await action();
      if (draftSection && draftKeys[draftSection]) {
        removePlanningDraft(draftKeys[draftSection]);
        refreshDraftPresence();
      }
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
      'Medição prevista salva.',
      'receipts'
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
      'Custos planejados salvos.',
      'costs'
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
        })),
        measurementJustification
      ),
      'Medição consolidada com rastreabilidade.',
      'measurement'
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
      <input
        ref={sheetFileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={handlePlanningFile}
      />
      <header className="cr-workspace-heading">
        <div>
          <span>Competência {competencia}</span>
          <h2>Planejamento · {obra.codigo || obra.id} · {obra.nome}</h2>
          <p>
            Plano micro v{data?.plano?.versao} · {isPublic ? 'Obra pública com medição' : 'Obra privada com recebíveis contratuais'}
          </p>
        </div>
        <div className="cr-planning-status-stack">
          <span className="cr-status-pill" data-status={data?.competencia?.estado}>
            {COMPETENCIA_ESTADO_LABELS[data?.competencia?.estado] || data?.competencia?.estado}
          </span>
          {draftNotice ? (
            <span className="cr-draft-indicator" data-error={draftNotice.startsWith('Não') || undefined}>
              {draftNotice}
            </span>
          ) : null}
          {hasLocalDraft ? (
            <button type="button" className="cr-draft-discard" onClick={discardLocalDraft}>
              Descartar rascunho
            </button>
          ) : null}
        </div>
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
                Pesquise os subitens da planilha dentro de cada etapa macro. As informações orçamentárias são carregadas automaticamente; informe somente a quantidade prevista para medição.
              </p>
            </div>
            {renderPlanningSheetActions('medicao-prevista', permissions.receipts)}
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
                Pesquise na planilha os itens efetivamente aprovados. Eles podem ser diferentes
                da previsão; a diferença total será tratada como glosa e exigirá justificativa.
              </p>
            </div>
            {renderPlanningSheetActions('medicao-aprovada', permissions.measurement)}
          </div>
          {permissions.measurementView ? (
            <>
              <div className="cr-macro-planning-list">
                {(data?.macros || []).map(renderApprovedMeasurementMacro)}
                {!data?.macros?.length ? (
                  <div className="cr-empty-state">Nenhuma etapa macro disponível no plano publicado.</div>
                ) : null}
              </div>
              {totalApproved < totalReceipts ? (
                <label className="cr-field cr-measurement-justification">
                  <span>Justificativa da diferença entre previsto e aprovado</span>
                  <textarea
                    rows="3"
                    value={measurementJustification}
                    placeholder="Explique a glosa ou a diferença de composição aprovada pelo órgão."
                    disabled={!permissions.measurement}
                    onChange={(event) => setMeasurementJustification(event.target.value)}
                  />
                </label>
              ) : null}
              <div className="cr-panel-actions">
                <span>
                  Aprovado: {currency.format(totalApproved)} · Glosa: {currency.format(totalGlosa)}
                </span>
                {permissions.measurement ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      !measurements.length
                      || Boolean(saving)
                      || (totalApproved < totalReceipts && measurementJustification.trim().length < 5)
                    }
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
            {renderPlanningSheetActions('custos', permissions.costs)}
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
      {sheetPreview ? (
        <CrPlanningImportModal
          obraId={obra.id}
          competencia={competencia}
          tipo={sheetType}
          preview={sheetPreview}
          onClose={() => setSheetPreview(null)}
          onConfirm={applyPlanningImport}
        />
      ) : null}
    </section>
  );
}
