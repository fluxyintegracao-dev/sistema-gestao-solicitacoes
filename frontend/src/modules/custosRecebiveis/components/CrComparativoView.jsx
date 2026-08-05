import { useCallback, useEffect, useState } from 'react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { COMPARATIVO_ESTADO_LABELS } from '../constants/custosRecebiveis';
import { obterComparativoCompetencia } from '../services/custosRecebiveis';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const APPROVAL_STATUS = {
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO_INTEGRAL: 'Aprovado integralmente',
  APROVADO_PARCIAL: 'Aprovado parcialmente',
  ACIMA_PREVISTO: 'Aprovado acima do previsto',
  SEM_PREVISAO: 'Aprovado sem previsão'
};

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

  const rows = data?.linhas_medicao || [];

  return (
    <section className="cr-section">
      <div className="cr-section-heading">
        <div>
          <h2>Comparativo operacional por item</h2>
          <p>{obra.codigo || obra.id} · {obra.nome} · competência {competencia}</p>
        </div>
        <div className="cr-summary-inline">
          <span>Medição prevista <strong>{currency.format(data?.recebiveis?.medicao_apresentada || 0)}</strong></span>
          <span>Medição aprovada <strong>{data?.recebiveis?.medicao_aprovada == null ? 'Aguardando' : currency.format(data.recebiveis.medicao_aprovada)}</strong></span>
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
              <th>Medição prevista</th>
              <th>Medição aprovada</th>
              <th>Glosa</th>
              <th>Aprovação</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.key}>
                <td>
                  <strong>{item.codigo} · {item.descricao}</strong>
                  <span>{item.etapa_macro_codigo || 'Sem macro'}</span>
                </td>
                <td>{currency.format(item.previsto)}</td>
                <td>{item.tem_aprovacao ? currency.format(item.aprovado) : 'Aguardando'}</td>
                <td data-negative={item.glosa > 0}>{item.tem_aprovacao ? currency.format(item.glosa) : '—'}</td>
                <td>{item.percentual_aprovacao == null ? '—' : `${item.percentual_aprovacao}%`}</td>
                <td>
                  <span className="cr-status-pill" data-status={item.estado}>
                    {APPROVAL_STATUS[item.estado] || COMPARATIVO_ESTADO_LABELS[item.estado] || item.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cr-mobile-list">
        {rows.map((item) => (
          <article className="cr-mobile-record" key={item.key}>
            <div>
              <strong>{item.codigo} · {item.descricao}</strong>
              <span>{item.etapa_macro_codigo || 'Sem macro'}</span>
            </div>
            <dl className="cr-mobile-record-grid">
              <div><dt>Medição prevista</dt><dd>{currency.format(item.previsto)}</dd></div>
              <div><dt>Medição aprovada</dt><dd>{item.tem_aprovacao ? currency.format(item.aprovado) : 'Aguardando'}</dd></div>
              <div><dt>Glosa</dt><dd>{item.tem_aprovacao ? currency.format(item.glosa) : '—'}</dd></div>
              <div>
                <dt>Estado</dt>
                <dd>{APPROVAL_STATUS[item.estado] || COMPARATIVO_ESTADO_LABELS[item.estado] || item.estado}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {!rows.length ? (
        <div className="cr-empty-state">Nenhum item com medição prevista ou aprovada nesta competência.</div>
      ) : null}
    </section>
  );
}
