import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendarDays,
  HiOutlineExclamationTriangle,
  HiOutlinePlus
} from 'react-icons/hi2';
import { COMPETENCIA_ESTADO_LABELS } from '../constants/custosRecebiveis';
import {
  criarCompetenciaObra,
  listarCompetenciasObra
} from '../services/custosRecebiveis';
import CrPlanejamentoView from './CrPlanejamentoView';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

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
        <button
          type="button"
          className="btn btn-outline cr-month-back"
          onClick={() => {
            setSelectedCompetencia(null);
            load();
          }}
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Planejamento mensal
        </button>
        <CrPlanejamentoView
          obra={obra}
          userId={userId}
          competencia={selectedCompetencia}
          permissions={permissions}
          onChanged={async () => {
            await load();
            onChanged?.();
          }}
        />
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
              ? 'Custos planejados, medições previstas e aprovadas, glosas e valores realizados.'
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
        <div className="cr-month-list">
          {data.items.map((item) => (
            <article key={item.id} className="cr-month-row">
              <div className="cr-month-identity">
                <span>Competência</span>
                <strong>{monthLabel(item.competencia)}</strong>
                <span className="cr-status-pill" data-status={item.estado}>
                  {COMPETENCIA_ESTADO_LABELS[item.estado] || item.estado}
                </span>
              </div>
              <dl>
                <div><dt>Custo planejado</dt><dd>{currency.format(item.total_custo_previsto || 0)}</dd></div>
                {isPublic ? (
                  <>
                    <div><dt>Medição prevista</dt><dd>{currency.format(item.medicao_apresentada || 0)}</dd></div>
                    <div>
                      <dt>Medição aprovada</dt>
                      <dd>
                        {item.medicao_aprovada == null
                          ? 'Aguardando'
                          : currency.format(item.medicao_aprovada)}
                      </dd>
                    </div>
                    <div data-tone={item.glosa > 0 ? 'negative' : 'neutral'}>
                      <dt>Glosa</dt>
                      <dd>{item.glosa == null ? '—' : currency.format(item.glosa)}</dd>
                    </div>
                  </>
                ) : (
                  <div><dt>Recebíveis do período</dt><dd>{currency.format(item.total_receita_prevista || 0)}</dd></div>
                )}
                <div><dt>Custo realizado</dt><dd>{currency.format(item.custo_realizado || 0)}</dd></div>
                <div data-tone="positive">
                  <dt>Receita recebida</dt><dd>{currency.format(item.receita_recebida || 0)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedCompetencia(item.competencia)}
              >
                {item.estado === 'FINALIZADA' ? 'Ver detalhes' : 'Editar'}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
