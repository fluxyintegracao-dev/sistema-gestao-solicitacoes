import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCircleStack,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowDownTray,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineShieldCheck,
  HiOutlineScale
} from 'react-icons/hi2';
import { useAuth } from '../../../contexts/AuthContext';
import CrComparativoView from '../components/CrComparativoView';
import CrConfiguracoesView from '../components/CrConfiguracoesView';
import CrDashboardView from '../components/CrDashboardView';
import CrExportacoesView from '../components/CrExportacoesView';
import CrExecutiveFilters from '../components/CrExecutiveFilters';
import CrImportacoesView from '../components/CrImportacoesView';
import CrObrasView from '../components/CrObrasView';
import CrObrigacoesView from '../components/CrObrigacoesView';
import CrPlanejamentoMensalView from '../components/CrPlanejamentoMensalView';
import CrPlanoWorkspace from '../components/CrPlanoWorkspace';
import CrRealizadoView from '../components/CrRealizadoView';
import CrAuditoriaView from '../components/CrAuditoriaView';
import {
  CUSTOS_RECEBIVEIS_PERMISSIONS,
  CUSTOS_RECEBIVEIS_TABS
} from '../constants/custosRecebiveis';
import {
  baixarModeloPlanoMicro,
  importarPlanoMicro,
  listarCustosRecebiveisObras,
  obterPlanoMicroObra,
  publicarPlanoMicro,
  listarMinhasObrigacoesCustosRecebiveis,
  validarPlanoMicro
} from '../services/custosRecebiveis';
import {
  hasExplicitCustosRecebiveisPermission
} from '../utils/access';
import '../styles/custos-recebiveis.css';

const TAB_ICONS = {
  'visao-geral': HiOutlineChartBarSquare,
  obras: HiOutlineBuildingOffice2,
  planejamento: HiOutlineClipboardDocumentList,
  comparativo: HiOutlineScale,
  realizado: HiOutlineBanknotes,
  obrigacoes: HiOutlineClock,
  importacoes: HiOutlineCircleStack,
  exportacoes: HiOutlineArrowDownTray,
  auditoria: HiOutlineShieldCheck,
  configuracoes: HiOutlineCog6Tooth
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function CustosRecebiveis() {
  const { user, refreshSession } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [obras, setObras] = useState([]);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [obrasError, setObrasError] = useState('');
  const [planData, setPlanData] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [obligationSummary, setObligationSummary] = useState(null);
  const [obligationData, setObligationData] = useState(null);

  const hasAdministrativeCapability = [
    CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_IMPORT,
    CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_PUBLISH,
    CUSTOS_RECEBIVEIS_PERMISSIONS.AUDITORIA_VIEW,
    CUSTOS_RECEBIVEIS_PERMISSIONS.CONFIG_MANAGE,
    CUSTOS_RECEBIVEIS_PERMISSIONS.REPORT_EXPORT
  ].some((permission) => hasExplicitCustosRecebiveisPermission(user, permission));
  const operationalExperience = (
    hasExplicitCustosRecebiveisPermission(user, CUSTOS_RECEBIVEIS_PERMISSIONS.OBRAS_VIEW)
    && hasExplicitCustosRecebiveisPermission(user, CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_VIEW)
    && !hasAdministrativeCapability
  );

  const availableTabs = useMemo(
    () => CUSTOS_RECEBIVEIS_TABS.filter((tab) => (
      hasExplicitCustosRecebiveisPermission(user, tab.permission)
    )),
    [user]
  );
  const visibleTabs = useMemo(() => {
    const tabs = availableTabs.filter((tab) => (
      !tab.hidden || (operationalExperience && tab.id === 'obras')
    ));
    if (!operationalExperience) return tabs;
    const operationalOrder = new Map([
      ['obras', 0],
      ['planejamento', 1],
      ['visao-geral', 2],
      ['obrigacoes', 3]
    ]);
    return [...tabs].sort((left, right) => (
      (operationalOrder.get(left.id) ?? 99) - (operationalOrder.get(right.id) ?? 99)
    ));
  }, [availableTabs, operationalExperience]);
  const defaultTab = operationalExperience && availableTabs.some((tab) => tab.id === 'obras')
    ? 'obras'
    : visibleTabs[0]?.id || availableTabs[0]?.id || 'obras';
  const requestedTab = searchParams.get('aba') || defaultTab;
  const activeTab = availableTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : defaultTab || null;
  const selectedObraId = Number(searchParams.get('obra'));
  const selectedPlanId = Number(searchParams.get('plano'));
  const competencia = searchParams.get('competencia') || currentMonth();
  const dashboardObraId = Number(searchParams.get('obra_decisao'));
  const dashboardClassificacao = ['PUBLICA', 'PRIVADA'].includes(
    String(searchParams.get('classificacao_decisao') || '').toUpperCase()
  ) ? String(searchParams.get('classificacao_decisao')).toUpperCase() : '';
  const dashboardCompetencias = [...new Set(
    String(searchParams.get('competencias') || competencia)
      .split(',')
      .map((item) => item.trim())
      .filter((item) => /^\d{4}-\d{2}$/.test(item))
  )];
  const detailMode = searchParams.get('detalhe') === '1'
    ? (searchParams.get('painel') || 'details')
    : null;
  const canViewObras = hasExplicitCustosRecebiveisPermission(
    user,
    CUSTOS_RECEBIVEIS_PERMISSIONS.OBRAS_VIEW
  );
  const canViewStructure = hasExplicitCustosRecebiveisPermission(
    user,
    CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_VIEW
  );
  const canImport = hasExplicitCustosRecebiveisPermission(
    user,
    CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_IMPORT
  );
  const canPublish = hasExplicitCustosRecebiveisPermission(
    user,
    CUSTOS_RECEBIVEIS_PERMISSIONS.ESTRUTURA_PUBLISH
  );
  const planningPermissions = useMemo(() => ({
    costs: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_COSTS
    ),
    receipts: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_RECEIVABLES
    ),
    finish: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.PLANEJAMENTO_FINISH
    ),
    measurementView: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.MEDICAO_VIEW
    ),
    measurement: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.MEDICAO_CONSOLIDATE
    ),
    reopenRequest: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REOPEN_REQUEST
    ),
    reopenApprove: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REOPEN_APPROVE
    ),
    comparativeView: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.COMPARATIVO_VIEW
    ),
    realizedView: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_VIEW
    ),
    realizedUpdate: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_UPDATE
    ),
    realizedReconcile: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_RECONCILE
    )
  }), [user]);
  const realizedPermissions = useMemo(() => ({
    update: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_UPDATE
    ),
    reconcile: hasExplicitCustosRecebiveisPermission(
      user,
      CUSTOS_RECEBIVEIS_PERMISSIONS.REALIZADOS_RECONCILE
    )
  }), [user]);
  const canGrantBypass = hasExplicitCustosRecebiveisPermission(
    user,
    CUSTOS_RECEBIVEIS_PERMISSIONS.OBLIGATION_BYPASS
  );
  const canViewObligations = hasExplicitCustosRecebiveisPermission(
    user,
    CUSTOS_RECEBIVEIS_PERMISSIONS.OBRIGACOES_VIEW
  );
  const canOpenPlanning = availableTabs.some((tab) => tab.id === 'planejamento');
  const selectedObra = obras.find((obra) => Number(obra.id) === selectedObraId)
    || planData?.obra
    || null;
  const executiveWorks = useMemo(
    () => obras.filter((obra) => String(obra.tipo_centro_custo || '').toUpperCase() === 'OBRA'),
    [obras]
  );

  const updateQuery = useCallback((updates, options = {}) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      return next;
    }, options);
  }, [setSearchParams]);

  const loadObras = useCallback(async () => {
    if (!canViewObras) {
      setObras([]);
      setObrasError('A permissão de visualizar obras não foi concedida.');
      return;
    }
    try {
      setObrasLoading(true);
      setObrasError('');
      const response = await listarCustosRecebiveisObras();
      setObras(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      setObrasError(error.message || 'Erro ao carregar obras.');
    } finally {
      setObrasLoading(false);
    }
  }, [canViewObras]);

  const loadPlan = useCallback(async (obraId = selectedObraId, planId = selectedPlanId) => {
    if (!Number.isInteger(Number(obraId)) || Number(obraId) <= 0) {
      setPlanData(null);
      setPlanError('');
      return null;
    }
    if (!canViewStructure) {
      setPlanData(null);
      setPlanError('A permissão de visualizar a estrutura micro não foi concedida.');
      return null;
    }
    try {
      setPlanLoading(true);
      setPlanError('');
      const response = await obterPlanoMicroObra(
        Number(obraId),
        Number.isInteger(Number(planId)) && Number(planId) > 0 ? Number(planId) : null
      );
      setPlanData(response);
      return response;
    } catch (error) {
      setPlanData(null);
      setPlanError(error.message || 'Erro ao carregar o plano micro.');
      return null;
    } finally {
      setPlanLoading(false);
    }
  }, [canViewStructure, selectedObraId, selectedPlanId]);

  const loadObligationSummary = useCallback(async () => {
    if (!canViewObligations) {
      setObligationSummary(null);
      setObligationData(null);
      return;
    }
    try {
      const response = await listarMinhasObrigacoesCustosRecebiveis();
      setObligationSummary(response?.resumo || null);
      setObligationData(response || null);
    } catch {
      setObligationSummary(null);
      setObligationData(null);
    }
  }, [canViewObligations]);

  useEffect(() => {
    if (activeTab && requestedTab !== activeTab) {
      updateQuery({ aba: activeTab }, { replace: true });
    }
  }, [activeTab, requestedTab, updateQuery]);

  useEffect(() => {
    loadObras();
  }, [loadObras]);

  useEffect(() => {
    loadPlan(selectedObraId, selectedPlanId);
  }, [loadPlan, selectedObraId, selectedPlanId]);

  useEffect(() => {
    void loadObligationSummary();
    const refresh = () => void loadObligationSummary();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [loadObligationSummary, refreshToken]);

  function handleOpenObra(obraId) {
    updateQuery({
      aba: 'planejamento',
      obra: obraId,
      sub: null,
      plano: null,
      detalhe: null,
      painel: null
    });
    requestAnimationFrame(() => {
      document.getElementById('cr-workspace-anchor')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  function handleSelectContextObra(value) {
    updateQuery({
      obra: value || null,
      plano: null,
      sub: value ? 'estrutura' : null
    });
  }

  function handleSelectPlan(planId) {
    updateQuery({ plano: planId || null });
  }

  function handleOpenImport() {
    updateQuery({ aba: 'importacoes' });
  }

  function handleOpenPlan(planId) {
    updateQuery({
      aba: 'obras',
      sub: 'estrutura',
      plano: planId
    });
  }

  async function handleDownloadModel() {
    if (!selectedObraId) return;
    try {
      setFeedback(null);
      await baixarModeloPlanoMicro(selectedObraId, selectedObra?.codigo);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Erro ao baixar modelo.' });
    }
  }

  async function handleValidate(file) {
    if (!selectedObraId) return null;
    try {
      setValidating(true);
      setFeedback(null);
      return await validarPlanoMicro(selectedObraId, file);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Erro ao validar arquivo.' });
      return error.details || null;
    } finally {
      setValidating(false);
    }
  }

  async function handleImport(file, reason) {
    if (!selectedObraId) return null;
    try {
      setImporting(true);
      setFeedback(null);
      const result = await importarPlanoMicro(selectedObraId, file, reason);
      setFeedback({
        tone: 'success',
        message: result.idempotente
          ? `Este arquivo já havia criado a versão v${result.plano?.versao}. Nenhuma duplicidade foi gerada.`
          : `Versão v${result.plano?.versao} importada como rascunho.`
      });
      if (result.plano?.id) {
        updateQuery({ plano: result.plano.id });
      }
      await Promise.all([loadObras(), loadPlan(selectedObraId, result.plano?.id)]);
      return result;
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Erro ao importar arquivo.' });
      return null;
    } finally {
      setImporting(false);
    }
  }

  async function handlePublish(planId, justification) {
    if (!window.confirm(
      'Publicar esta versão fará com que ela substitua a versão vigente da obra. Deseja continuar?'
    )) return;
    try {
      setPublishing(true);
      setFeedback(null);
      const result = await publicarPlanoMicro(planId, justification);
      setFeedback({
        tone: 'success',
        message: result.idempotente
          ? 'Esta versão já estava publicada.'
          : `Versão v${result.plano?.versao} publicada com sucesso.`
      });
      await Promise.all([loadObras(), loadPlan(selectedObraId, planId)]);
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message || 'Erro ao publicar versão.' });
    } finally {
      setPublishing(false);
    }
  }

  async function handleRefresh() {
    setFeedback(null);
    setRefreshToken((current) => current + 1);
    await Promise.all([loadObras(), loadPlan()]);
  }

  function handleOpenPlanning(obraId) {
    updateQuery({
      aba: 'planejamento',
      obra: obraId,
      plano: null,
      detalhe: null,
      painel: null
    });
  }

  function handleOpenDashboardArea(item) {
    if (operationalExperience) {
      const panelByDestination = {
        comparativo: 'comparison',
        realizado: 'realized',
        planejamento: ['PLANEJAMENTO_AUSENTE', 'OBRIGACAO_VENCIDA'].includes(item?.tipo)
          ? 'planning'
          : 'details'
      };
      updateQuery({
        aba: 'planejamento',
        obra: item?.obra_id || null,
        competencia: item?.competencia || competencia,
        detalhe: '1',
        painel: panelByDestination[item?.destino] || 'details',
        plano: null,
        bloqueio: item?.tipo === 'OBRIGACAO_VENCIDA' ? '1' : null
      });
      return;
    }
    updateQuery({
      aba: item?.destino || 'comparativo',
      obra: item?.obra_id || null,
      competencia: item?.competencia || competencia,
      plano: null,
      bloqueio: item?.tipo === 'OBRIGACAO_VENCIDA' ? '1' : null
    });
  }

  function handleOpenObligationPlanning(item) {
    updateQuery({
      aba: 'planejamento',
      obra: item.obra_id,
      competencia: item.competencia,
      plano: null,
      detalhe: '1',
      painel: 'planning',
      bloqueio: item.exige_reabertura ? '1' : null
    });
  }

  async function handlePlanningChanged() {
    await Promise.all([
      loadObras(),
      loadObligationSummary(),
      refreshSession().catch(() => null)
    ]);
  }

  if (!activeTab) {
    return (
      <div className="page cr-page">
        <section className="cr-section cr-empty-state cr-empty-state--large">
          <HiOutlineChartBarSquare className="h-7 w-7" />
          <strong>Nenhuma área do módulo foi liberada</strong>
          <span>Solicite ao administrador pelo menos uma permissão de visualização.</span>
        </section>
      </div>
    );
  }

  return (
    <div className="page cr-page">
      <header className="cr-page-header">
        <div>
          <span>Planejamento e acompanhamento por obra</span>
          <h1>Custos e Recebíveis</h1>
          <p>Planeje o mês, acompanhe medições e compare com os lançamentos financeiros.</p>
        </div>
        <div className="cr-page-header__actions">
          {canViewObligations ? (
            <button
              type="button"
              className="cr-obligation-counter"
              data-overdue={Number(obligationSummary?.vencidas || 0) > 0 || undefined}
              onClick={() => updateQuery({ aba: 'obrigacoes' })}
            >
              <HiOutlineClock className="h-4 w-4" />
              <span>Prazos</span>
              <strong>{obligationSummary?.vencidas || 0} vencida(s)</strong>
              <small>{obligationSummary?.pendentes || 0} pendente(s)</small>
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={handleRefresh}>
            <HiOutlineArrowPath className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </header>

      <nav className="cr-tabs" aria-label="Áreas de Custos e Recebíveis">
        {visibleTabs.map((tab) => {
          const Icon = TAB_ICONS[tab.id] || HiOutlineChartBarSquare;
          return (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'is-active' : ''}
              onClick={() => updateQuery({ aba: tab.id })}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'visao-geral' ? (
        <CrExecutiveFilters
          obras={executiveWorks}
          obraId={Number.isInteger(dashboardObraId) && dashboardObraId > 0
            ? dashboardObraId
            : ''}
          classificacao={dashboardClassificacao}
          competenciaReferencia={competencia}
          competencias={dashboardCompetencias.length ? dashboardCompetencias : [competencia]}
          onObraChange={(value) => updateQuery({ obra_decisao: value || null })}
          onClassificacaoChange={(value) => updateQuery({
            classificacao_decisao: value || null
          })}
          onCompetenciaReferenciaChange={(value) => updateQuery({
            competencia: value,
            competencias: null
          })}
          onCompetenciasChange={(values) => updateQuery({
            competencias: values.length === 1 && values[0] === competencia
              ? null
              : values.join(',')
          })}
          operational={operationalExperience}
          onPeriodChange={(start, end, values) => updateQuery({
            competencia: end,
            competencias: values.join(','),
            periodo_inicio: start,
            periodo_fim: end
          })}
        />
      ) : activeTab !== 'obras' ? (
      <section className="cr-context-bar" aria-label="Contexto do módulo">
        <label className="cr-field">
          <span>Obra em contexto</span>
          <select
            value={Number.isInteger(selectedObraId) && selectedObraId > 0 ? selectedObraId : ''}
            onChange={(event) => handleSelectContextObra(event.target.value)}
          >
            <option value="">Selecione uma obra</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.codigo || obra.id} · {obra.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="cr-field">
          <span>Competência de contexto</span>
          <input
            type="month"
            value={competencia}
            onChange={(event) => updateQuery({ competencia: event.target.value })}
          />
          {activeTab === 'realizado' ? (
            <small>Altere o mês e o ano para recalcular o período financeiro.</small>
          ) : null}
        </label>
        <div className="cr-context-summary">
          <span>Escopo atual</span>
          <strong>{selectedObra ? selectedObra.nome : `${obras.length} obra(s) disponível(is)`}</strong>
          <small>
            {selectedObra?.empresa?.nome || 'A competência será usada nas próximas fases do módulo.'}
          </small>
        </div>
      </section>
      ) : null}

      {feedback && activeTab !== 'importacoes' ? (
        <div className="cr-feedback" data-tone={feedback.tone || 'info'}>
          {feedback.message}
        </div>
      ) : null}

      {activeTab === 'obras' ? (
        <>
          <CrObrasView
            obras={obras}
            loading={obrasLoading}
            error={obrasError}
            onReload={loadObras}
            onOpen={handleOpenObra}
            showAdministrationLink={!operationalExperience && canViewStructure}
          />
          {!operationalExperience && Number.isInteger(selectedObraId) && selectedObraId > 0 ? (
            <div id="cr-workspace-anchor">
              <CrPlanoWorkspace
                data={planData}
                loading={planLoading}
                error={planError}
                canImport={canImport}
                canPublish={canPublish}
                publishing={publishing}
                onReload={() => loadPlan()}
                onSelectPlan={handleSelectPlan}
                onOpenImport={handleOpenImport}
                onDownloadModel={handleDownloadModel}
                onPublish={handlePublish}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === 'visao-geral' ? (
        <CrDashboardView
          key={`carteira-${competencia}-${refreshToken}`}
          competencia={competencia}
          competencias={dashboardCompetencias.length ? dashboardCompetencias : [competencia]}
          obraFilterId={Number.isInteger(dashboardObraId) && dashboardObraId > 0
            ? dashboardObraId
            : null}
          classificacaoFilter={dashboardClassificacao}
          canOpenPlanning={canOpenPlanning}
          onOpenArea={handleOpenDashboardArea}
        />
      ) : null}

      {activeTab === 'planejamento' ? (
        <CrPlanejamentoMensalView
          key={`${selectedObraId}-${competencia}-${refreshToken}`}
          obra={selectedObra}
          userId={user?.id}
          initialCompetencia={competencia}
          autoOpen={searchParams.get('bloqueio') === '1'}
          detailMode={detailMode}
          obligations={obligationData?.items || []}
          obligationsServerTime={obligationData?.server_time || null}
          permissions={planningPermissions}
          onChanged={handlePlanningChanged}
          onNavigateDetail={(competenciaValue, area) => updateQuery({
            competencia: competenciaValue || competencia,
            detalhe: competenciaValue ? '1' : null,
            painel: competenciaValue ? area : null,
            bloqueio: null
          })}
        />
      ) : null}

      {activeTab === 'comparativo' ? (
        <CrComparativoView
          key={`${selectedObraId}-${competencia}-${refreshToken}`}
          obra={selectedObra}
          competencia={competencia}
        />
      ) : null}

      {activeTab === 'realizado' ? (
        <CrRealizadoView
          key={`${selectedObraId}-${competencia}-${refreshToken}`}
          obra={selectedObra}
          competencia={competencia}
          permissions={realizedPermissions}
        />
      ) : null}

      {activeTab === 'obrigacoes' ? (
        <CrObrigacoesView
          key={refreshToken}
          canGrantBypass={canGrantBypass}
          onOpenPlanning={handleOpenObligationPlanning}
        />
      ) : null}

      {activeTab === 'importacoes' ? (
        <CrImportacoesView
          key={selectedObraId || 'none'}
          obra={selectedObra}
          data={planData}
          canImport={canImport}
          validating={validating}
          importing={importing}
          feedback={feedback}
          onDownloadModel={handleDownloadModel}
          onValidate={handleValidate}
          onImport={handleImport}
          onOpenPlan={handleOpenPlan}
        />
      ) : null}

      {activeTab === 'exportacoes' ? (
        <CrExportacoesView
          key={`${selectedObraId}-${competencia}`}
          obra={selectedObra}
          competencia={competencia}
        />
      ) : null}

      {activeTab === 'auditoria' ? (
        <CrAuditoriaView
          key={`${selectedObraId}-${refreshToken}`}
          obra={selectedObra}
        />
      ) : null}

      {activeTab === 'configuracoes' ? (
        <CrConfiguracoesView
          key={`${selectedObraId}-${refreshToken}`}
          obra={selectedObra}
          onChanged={handleRefresh}
        />
      ) : null}
    </div>
  );
}
