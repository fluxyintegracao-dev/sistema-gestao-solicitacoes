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
import CrImportacoesView from '../components/CrImportacoesView';
import CrObrasView from '../components/CrObrasView';
import CrObrigacoesView from '../components/CrObrigacoesView';
import CrPlanejamentoView from '../components/CrPlanejamentoView';
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

  const availableTabs = useMemo(
    () => CUSTOS_RECEBIVEIS_TABS.filter((tab) => (
      hasExplicitCustosRecebiveisPermission(user, tab.permission)
    )),
    [user]
  );
  const requestedTab = searchParams.get('aba') || availableTabs[0]?.id || 'obras';
  const activeTab = availableTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : availableTabs[0]?.id || null;
  const selectedObraId = Number(searchParams.get('obra'));
  const selectedPlanId = Number(searchParams.get('plano'));
  const competencia = searchParams.get('competencia') || currentMonth();
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
  const selectedObra = obras.find((obra) => Number(obra.id) === selectedObraId)
    || planData?.obra
    || null;

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

  function handleOpenObra(obraId) {
    updateQuery({
      aba: 'obras',
      obra: obraId,
      sub: 'estrutura',
      plano: null
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
    updateQuery({ aba: 'planejamento', obra: obraId, plano: null });
  }

  function handleOpenObligationPlanning(item) {
    updateQuery({
      aba: 'planejamento',
      obra: item.obra_id,
      competencia: item.competencia,
      plano: null,
      bloqueio: item.exige_reabertura ? '1' : null
    });
  }

  async function handlePlanningChanged() {
    await Promise.all([
      loadObras(),
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
          <span>Controle operacional</span>
          <h1>Custos e Recebíveis</h1>
          <p>Estrutura micro versionada, vinculada ao orçamento macro sem alterar o cadastro de Obras.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleRefresh}>
          <HiOutlineArrowPath className="h-4 w-4" />
          Atualizar
        </button>
      </header>

      <div className="cr-integrity-banner">
        <HiOutlineCircleStack className="h-5 w-5" />
        <div>
          <strong>Estrutura independente e rastreável</strong>
          <span>
            O módulo consulta os códigos e valores macro em modo somente leitura. Importar ou
            publicar uma versão grava apenas nas tabelas <code>cr_*</code>.
          </span>
        </div>
      </div>

      <nav className="cr-tabs" aria-label="Áreas de Custos e Recebíveis">
        {availableTabs.map((tab) => {
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
        </label>
        <div className="cr-context-summary">
          <span>Escopo atual</span>
          <strong>{selectedObra ? selectedObra.nome : `${obras.length} obra(s) disponível(is)`}</strong>
          <small>
            {selectedObra?.empresa?.nome || 'A competência será usada nas próximas fases do módulo.'}
          </small>
        </div>
      </section>

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
          />
          {Number.isInteger(selectedObraId) && selectedObraId > 0 ? (
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
          key={`${competencia}-${refreshToken}`}
          competencia={competencia}
          onOpenPlanning={handleOpenPlanning}
        />
      ) : null}

      {activeTab === 'planejamento' ? (
        <CrPlanejamentoView
          key={`${selectedObraId}-${competencia}-${refreshToken}`}
          obra={selectedObra}
          competencia={competencia}
          permissions={planningPermissions}
          onChanged={handlePlanningChanged}
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
