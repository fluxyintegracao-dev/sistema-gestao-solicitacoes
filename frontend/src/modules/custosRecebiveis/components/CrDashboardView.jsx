import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineChartBar,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import { COMPETENCIA_ESTADO_LABELS } from '../constants/custosRecebiveis';
import { obterCustosRecebiveisDashboard } from '../services/custosRecebiveis';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export default function CrDashboardView({ competencia, onOpenPlanning }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setData(await obterCustosRecebiveisDashboard(competencia));
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Erro ao carregar visão geral.');
    } finally {
      setLoading(false);
    }
  }, [competencia]);

  useEffect(() => {
    load();
  }, [load]);

  const maxValue = useMemo(() => Math.max(
    1,
    ...(data?.macros || []).map((item) => Math.max(item.previsto, item.realizado))
  ), [data]);

  if (loading && !data) {
    return <section className="cr-section cr-empty-state">Carregando visão geral...</section>;
  }
  if (error) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineExclamationTriangle className="h-6 w-6" />
        <strong>Não foi possível carregar o dashboard</strong>
        <span>{error}</span>
        <button type="button" className="btn btn-outline" onClick={load}>Tentar novamente</button>
      </section>
    );
  }

  return (
    <div className="cr-dashboard-layout">
      <section className="cr-section cr-dashboard-card">
        <div className="cr-section-heading">
          <div>
            <h2>Previsto x realizado por macro</h2>
            <p>Leitura consolidada das obras no seu escopo para {competencia}.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
            <HiOutlineArrowPath className="h-4 w-4" />
            Atualizar
          </button>
        </div>
        <div className="cr-kpi-strip">
          <div>
            <span>Custo previsto</span>
            <strong>{currency.format(data?.cards?.custo_previsto || 0)}</strong>
          </div>
          <div data-tone="actual">
            <span>Custo realizado</span>
            <strong>{currency.format(data?.cards?.custo_realizado || 0)}</strong>
          </div>
        </div>
        <div className="cr-macro-progress-list">
          {(data?.macros || []).map((item) => (
            <div key={item.codigo} className="cr-macro-progress-row">
              <div>
                <strong>{item.codigo}</strong>
                <span>{currency.format(item.realizado)} de {currency.format(item.previsto)}</span>
              </div>
              <div className="cr-progress-track" aria-label={`${item.percentual_execucao || 0}% executado`}>
                <span
                  data-state={item.estado}
                  style={{ width: `${Math.min(100, (item.realizado / maxValue) * 100)}%` }}
                />
              </div>
              <b data-state={item.estado}>
                {item.percentual_execucao == null ? 'Sem base' : `${item.percentual_execucao}%`}
              </b>
            </div>
          ))}
          {!data?.macros?.length ? (
            <div className="cr-empty-state">Nenhuma previsão ou realizado registrado nesta competência.</div>
          ) : null}
        </div>
      </section>

      <section className="cr-section cr-dashboard-card">
        <div className="cr-section-heading">
          <div>
            <h2>Status das etapas</h2>
            <p>Competências e desvios por obra, sem alterar o orçamento de origem.</p>
          </div>
          <HiOutlineChartBar className="h-5 w-5 cr-heading-icon" />
        </div>
        <div className="cr-stage-list">
          {(data?.etapas || []).map((item) => (
            <button
              key={item.obra.id}
              type="button"
              className="cr-stage-row"
              onClick={() => onOpenPlanning(item.obra.id)}
            >
              <div>
                <strong>{item.obra.codigo || item.obra.id} · {item.obra.nome}</strong>
                <span>
                  {currency.format(item.realizado)} realizado · {item.estouros} estouro(s)
                </span>
              </div>
              <span className="cr-status-pill" data-status={item.estado_competencia}>
                {COMPETENCIA_ESTADO_LABELS[item.estado_competencia] || item.estado_competencia}
              </span>
            </button>
          ))}
          {!data?.etapas?.length ? (
            <div className="cr-empty-state">Nenhuma obra disponível no escopo.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
