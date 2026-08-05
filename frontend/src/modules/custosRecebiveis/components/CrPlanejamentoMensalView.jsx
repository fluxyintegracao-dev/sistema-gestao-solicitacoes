import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
  HiOutlineScale
} from 'react-icons/hi2';
import {
  criarCompetenciaObra,
  listarCompetenciasObra
} from '../services/custosRecebiveis';
import CrMonthlySummaryCard from './CrMonthlySummaryCard';
import CrComparativoView from './CrComparativoView';
import CrPlanejamentoView from './CrPlanejamentoView';
import CrRealizadoView from './CrRealizadoView';

function monthLabel(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return value || '-';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function CrPlanejamentoMensalView({
  obra,
  userId,
  initialCompetencia,
  autoOpen = false,
  permissions,
  onChanged
}) {
  const [data, setData] = useState(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState(
    autoOpen ? initialCompetencia : null
  );
  const [newMonthOpen, setNewMonthOpen] = useState(false);
  const [newMonth, setNewMonth] = useState('');
  const [detailArea, setDetailArea] = useState('planning');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!obra?.id) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await listarCompetenciasObra(obra.id);
      setData(response);
      setNewMonth((current) => (
        response.competencias_permitidas?.includes(current)
          ? current
          : response.competencias_permitidas?.[0] || ''
      ));
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Erro ao carregar competências.');
    } finally {
      setLoading(false);
    }
  }, [obra?.id]);

  useEffect(() => {
    setSelectedCompetencia(autoOpen ? initialCompetencia : null);
    setDetailArea('planning');
    setNewMonthOpen(false);
    load();
  }, [autoOpen, initialCompetencia, load]);

  const existingMonths = useMemo(
    () => new Set((data?.items || []).map((item) => item.competencia)),
    [data?.items]
  );
  const availableNewMonths = (data?.competencias_permitidas || [])
    .filter((item) => !existingMonths.has(item));
  const canCreate = permissions.costs || permissions.receipts;
  const isPublic = obra?.classificacao === 'PUBLICA';

  async function createMonth() {
    if (!newMonth || creating) return;
    try {
      setCreating(true);
      setError('');
      const result = await criarCompetenciaObra(obra.id, newMonth);
      setNewMonthOpen(false);
      setSelectedCompetencia(result.competencia.competencia);
      await load();
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível criar a competência.');
    } finally {
      setCreating(false);
    }
  }

  if (!obra?.id) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineCalendarDays className="h-7 w-7" />
        <strong>Selecione uma obra</strong>
        <span>Escolha a obra no contexto para consultar o planejamento mensal.</span>
      </section>
    );
  }

  if (selectedCompetencia) {
    return (
      <div className="cr-month-editor">
        <div className="cr-month-detail-toolbar">
          <button
            type="button"
            className="btn btn-outline cr-month-back"
            onClick={() => {
              setSelectedCompetencia(null);
              setDetailArea('planning');
              load();
            }}
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Meses da obra
          </button>
          <nav aria-label="Áreas da competência">
            <button type="button" className={detailArea === 'planning' ? 'is-active' : ''} onClick={() => setDetailArea('planning')}>
              Planejamento
            </button>
            {isPublic && permissions.measurementView ? (
              <button type="button" className={detailArea === 'approved' ? 'is-active' : ''} onClick={() => setDetailArea('approved')}>
                Medição aprovada
              </button>
            ) : null}
            {permissions.realizedView ? (
              <button type="button" className={detailArea === 'realized' ? 'is-active' : ''} onClick={() => setDetailArea('realized')}>
                <HiOutlineBanknotes className="h-4 w-4" /> Custos realizados
              </button>
            ) : null}
            {isPublic && permissions.comparativeView ? (
              <button type="button" className={detailArea === 'comparison' ? 'is-active' : ''} onClick={() => setDetailArea('comparison')}>
                <HiOutlineScale className="h-4 w-4" /> Comparativo
              </button>
            ) : null}
          </nav>
        </div>
        {detailArea === 'planning' || detailArea === 'approved' ? (
          <CrPlanejamentoView
            obra={obra}
            userId={userId}
            competencia={selectedCompetencia}
            permissions={permissions}
            viewMode={detailArea}
            onChanged={async () => {
              await load();
              onChanged?.();
            }}
          />
        ) : null}
        {detailArea === 'realized' ? (
          <CrRealizadoView
            obra={obra}
            competencia={selectedCompetencia}
            permissions={{
              update: permissions.realizedUpdate,
              reconcile: permissions.realizedReconcile
            }}
          />
        ) : null}
        {detailArea === 'comparison' ? (
          <CrComparativoView obra={obra} competencia={selectedCompetencia} />
        ) : null}
      </div>
    );
  }

  return (
    <section className="cr-workspace cr-months-workspace">
      <header className="cr-workspace-heading">
        <div>
          <span>{obra.codigo || obra.id} · {isPublic ? 'Obra pública' : 'Obra privada'}</span>
          <h2>Planejamento mensal · {obra.nome}</h2>
          <p>
            {isPublic
              ? 'Planeje custos e medição. A aprovação, os realizados e o comparativo ficam no detalhe de cada mês.'
              : 'Custos planejados, recebíveis financeiros do período e valores realizados.'}
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!availableNewMonths.length}
            onClick={() => {
              setNewMonth(availableNewMonths[0] || '');
              setNewMonthOpen(true);
            }}
          >
            <HiOutlinePlus className="h-4 w-4" />
            Novo mês
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="cr-feedback" data-tone="error">
          <HiOutlineExclamationTriangle className="h-5 w-5" />
          {error}
        </div>
      ) : null}

      {newMonthOpen ? (
        <div className="cr-new-month-bar">
          <label className="cr-field">
            <span>Competência</span>
            <select value={newMonth} onChange={(event) => setNewMonth(event.target.value)}>
              {availableNewMonths.map((item) => (
                <option key={item} value={item}>{monthLabel(item)}</option>
              ))}
            </select>
          </label>
          <div>
            <button
              type="button"
              className="btn btn-outline"
              disabled={creating}
              onClick={() => setNewMonthOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!newMonth || creating}
              onClick={createMonth}
            >
              {creating ? 'Criando...' : 'Abrir competência'}
            </button>
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="cr-empty-state">Carregando competências...</div>
      ) : null}

      {!loading && data && !data.items?.length ? (
        <div className="cr-empty-state cr-empty-state--large">
          <HiOutlineCalendarDays className="h-7 w-7" />
          <strong>Nenhuma competência iniciada</strong>
          <span>
            {isPublic
              ? 'Use Novo mês para registrar custos planejados e a medição prevista.'
              : 'Use Novo mês para registrar custos e consultar os recebíveis do período.'}
          </span>
        </div>
      ) : null}

      {data?.items?.length ? (
        <div className="cr-month-grid">
          {data.items.map((item) => (
            <CrMonthlySummaryCard
              key={item.id}
              title={monthLabel(item.competencia)}
              eyebrow="Competência"
              classification={obra.classificacao}
              status={item.estado}
              custoPlanejado={item.total_custo_previsto}
              custoRealizado={item.custo_realizado}
              recebivelPrevisto={item.medicao_apresentada ?? item.total_receita_prevista}
              recebivelReconhecido={isPublic
                ? item.medicao_aprovada
                : item.total_receita_prevista}
              receitaRecebida={item.receita_recebida}
              medicaoAprovadaInformada={!isPublic || item.medicao_aprovada != null}
              glosa={item.glosa}
              actionLabel={item.estado === 'FINALIZADA' ? 'Ver detalhes' : 'Editar'}
              onOpen={() => {
                setDetailArea('planning');
                setSelectedCompetencia(item.competencia);
              }}
              onOpenApproved={isPublic && permissions.measurementView ? () => {
                setDetailArea('approved');
                setSelectedCompetencia(item.competencia);
              } : null}
              approvedActionLabel={!permissions.measurement
                ? 'Ver aprovação'
                : (item.medicao_aprovada != null ? 'Revisar aprovação' : 'Registrar aprovação')}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
