import { useCallback, useEffect, useState } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { COMPARATIVO_ESTADO_LABELS } from '../constants/custosRecebiveis';
import { obterComparativoCompetencia } from '../services/custosRecebiveis';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export default function CrComparativoView({ obra, competencia }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!obra?.id) {
      setData(null);
      setError('');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setData(await obterComparativoCompetencia(obra.id, competencia));
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Erro ao carregar comparativo.');
    } finally {
      setLoading(false);
    }
  }, [obra?.id, competencia]);

  useEffect(() => {
    load();
  }, [load]);

  if (!obra?.id) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <strong>Selecione uma obra</strong>
        <span>O comparativo depende da obra e da competência escolhidas no contexto.</span>
      </section>
    );
  }
  if (loading && !data) {
    return <section className="cr-section cr-empty-state">Carregando comparativo...</section>;
  }
  if (error) {
    return (
      <section className="cr-section cr-empty-state cr-empty-state--large">
        <HiOutlineExclamationTriangle className="h-6 w-6" />
        <strong>Comparativo indisponível</strong>
        <span>{error}</span>
        <button type="button" className="btn btn-outline" onClick={load}>Tentar novamente</button>
      </section>
    );
  }

  return (
    <section className="cr-section">
      <div className="cr-section-heading">
        <div>
          <h2>Custos planejados x realizados</h2>
          <p>{obra.codigo || obra.id} · {obra.nome} · competência {competencia}</p>
        </div>
        <div className="cr-summary-inline">
          <span>Custo planejado <strong>{currency.format(data?.resumo?.previsto || 0)}</strong></span>
          <span>Custo realizado <strong>{currency.format(data?.resumo?.realizado || 0)}</strong></span>
        </div>
      </div>
      <div className="cr-kpi-strip cr-kpi-strip--receivables">
        <div>
          <span>Medição prevista</span>
          <strong>{currency.format(data?.recebiveis?.medicao_apresentada || 0)}</strong>
        </div>
        <div>
          <span>Medição aprovada</span>
          <strong>
            {data?.recebiveis?.medicao_aprovada == null
              ? 'Aguardando'
              : currency.format(data.recebiveis.medicao_aprovada)}
          </strong>
        </div>
        <div data-tone="negative">
          <span>Glosa</span>
          <strong>
            {data?.recebiveis?.glosa == null
              ? '—'
              : currency.format(data.recebiveis.glosa)}
          </strong>
        </div>
        <div data-tone="actual">
          <span>Receita recebida</span>
          <strong>{currency.format(data?.recebiveis?.receita_recebida || 0)}</strong>
        </div>
      </div>
      <div className="cr-table-shell cr-desktop-table">
        <table>
          <thead>
            <tr>
              <th>Macro / item micro</th>
              <th>Previsto</th>
              <th>Realizado</th>
              <th>Desvio</th>
              <th>Execução</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {(data?.linhas || []).map((item) => (
              <tr key={item.key}>
                <td>
                  <strong>{item.codigo} · {item.descricao}</strong>
                  <span>{item.etapa_macro_codigo || 'Sem macro'}</span>
                </td>
                <td>{currency.format(item.previsto)}</td>
                <td>{currency.format(item.realizado)}</td>
                <td data-negative={item.delta > 0}>{currency.format(item.delta)}</td>
                <td>{item.percentual_execucao == null ? '—' : `${item.percentual_execucao}%`}</td>
                <td>
                  <span className="cr-status-pill" data-status={item.estado}>
                    {COMPARATIVO_ESTADO_LABELS[item.estado] || item.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cr-mobile-list">
        {(data?.linhas || []).map((item) => (
          <article className="cr-mobile-record" key={item.key}>
            <div>
              <strong>{item.codigo} · {item.descricao}</strong>
              <span>{item.etapa_macro_codigo || 'Sem macro'}</span>
            </div>
            <dl className="cr-mobile-record-grid">
              <div><dt>Previsto</dt><dd>{currency.format(item.previsto)}</dd></div>
              <div><dt>Realizado</dt><dd>{currency.format(item.realizado)}</dd></div>
              <div><dt>Desvio</dt><dd>{currency.format(item.delta)}</dd></div>
              <div>
                <dt>Estado</dt>
                <dd>{COMPARATIVO_ESTADO_LABELS[item.estado] || item.estado}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {!data?.linhas?.length ? (
        <div className="cr-empty-state">Nenhum valor previsto ou realizado nesta competência.</div>
      ) : null}
    </section>
  );
}
