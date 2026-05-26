import { useEffect, useState } from 'react';
import { getObras } from '../../../services/obras';
import { getRhEmpresasGrupo } from '../../../services/rhDp';
import { getSstRelatorioOperacional, sincronizarEventosVencimentoSst } from '../services/sst';

function moneyless(value) {
  return value ?? 0;
}

function getLabel(item, fallback = '-') {
  if (!item) return fallback;
  return item.nome || item.razao_social || item.titulo || fallback;
}

function optionLabel(type, item) {
  if (!item) return '';
  if (type === 'obras') {
    return [item.nome, item.codigo ? `Codigo ${item.codigo}` : null].filter(Boolean).join(' - ');
  }
  return item.razao_social || item.nome_fantasia || item.nome || `#${item.id}`;
}

function Metric({ label, value, detail, tone = 'default' }) {
  const toneClass = {
    default: 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900'
  }[tone] || 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]';

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs font-medium opacity-70">{detail}</p> : null}
    </div>
  );
}

function SimpleTable({ title, columns, rows, renderRow, empty = 'Nenhum registro encontrado.' }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--c-text)]">{title}</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--c-muted)]">{rows.length} item(ns)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--c-surface-muted)] text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-border)]">
            {rows.map(renderRow)}
            {!rows.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-[var(--c-muted)]" colSpan={columns.length}>{empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SstRelatorioOperacional() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refs, setRefs] = useState({ empresas: [], obras: [] });
  const [filters, setFilters] = useState({ empresa_id: '', obra_id: '' });

  const load = (params = filters) => {
    setLoading(true);
    getSstRelatorioOperacional(params)
      .then((payload) => {
        setData(payload);
        setError('');
      })
      .catch((err) => setError(err.message || 'Erro ao carregar relatorio SST'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getRhEmpresasGrupo({ ativo: true }),
      getObras({ ativo: true })
    ]).then(([empresasResult, obrasResult]) => {
      if (!active) return;
      setRefs({
        empresas: empresasResult.status === 'fulfilled' && Array.isArray(empresasResult.value) ? empresasResult.value : [],
        obras: obrasResult.status === 'fulfilled' && Array.isArray(obrasResult.value) ? obrasResult.value : []
      });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    load();
  }, []);

  async function syncEvents() {
    setMessage('');
    try {
      const payload = await sincronizarEventosVencimentoSst();
      setMessage(`${payload.eventos_criados || 0} evento(s) novo(s), ${payload.eventos_existentes || 0} ja existentes.`);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar eventos SST');
    }
  }

  const cards = data?.cards || {};
  const prontidao = data?.prontidao_esocial || {};
  const conformidade = data?.conformidade || {};
  const analytics = data?.analytics || {};

  return (
    <div className="sst-page space-y-6">
      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--c-muted)]">SST</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--c-text)]">Relatorio operacional SST</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--c-muted)]">
              Visao analitica de conformidade, riscos, vencimentos, documentos, acidentes, eventos operacionais e prontidao tecnica para eSocial.
            </p>
          </div>
          <button type="button" onClick={syncEvents} className="btn btn-primary">Atualizar vencimentos</button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div> : null}

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Empresa</span>
            <select
              value={filters.empresa_id}
              onChange={(event) => setFilters((current) => ({ ...current, empresa_id: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todas</option>
              {refs.empresas.map((item) => <option key={item.id} value={item.id}>{optionLabel('empresas', item)}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">Obra/Centro</span>
            <select
              value={filters.obra_id}
              onChange={(event) => setFilters((current) => ({ ...current, obra_id: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todos</option>
              {refs.obras.map((item) => <option key={item.id} value={item.id}>{optionLabel('obras', item)}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => load()} className="btn btn-primary">Atualizar relatorio</button>
            <button
              type="button"
              onClick={() => {
                const empty = { empresa_id: '', obra_id: '' };
                setFilters(empty);
                load(empty);
              }}
              className="btn btn-outline"
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Compliance score" value={`${moneyless(cards.compliance_score ?? 100)}%`} detail="Base operacional atual" tone="ok" />
        <Metric label="Riscos criticos" value={moneyless(cards.riscos_criticos)} detail="Severidade alta ou critica" tone={cards.riscos_criticos ? 'danger' : 'info'} />
        <Metric label="Pendencias criticas" value={moneyless(conformidade.pendencias_criticas || cards.pendencias_criticas)} detail="Motor de conformidade" tone={(conformidade.pendencias_criticas || cards.pendencias_criticas) ? 'danger' : 'ok'} />
        <Metric label="Pendencias totais" value={moneyless(conformidade.pendencias_total || cards.pendencias_total)} detail={`${data?.periodo_alerta_dias || 30} dias`} tone="warn" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Acidentes por obra" value={analytics.acidentes_por_obra?.length || 0} detail="Agrupamentos com ocorrencias" />
        <Metric label="Riscos por obra" value={analytics.riscos_por_obra?.length || 0} detail="Base para mapa operacional" />
        <Metric label="Colaboradores ativos" value={conformidade.total_colaboradores_ativos || 0} detail="Analisados na conformidade" />
      </section>

      <section className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Prontidao eSocial SST</h2>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              Transmissao permanece bloqueada ate validacao formal dos leiautes/XSDs oficiais dos eventos S-2210, S-2220 e S-2240.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            prontidao.bloqueio_produto
              ? 'border border-amber-200 bg-amber-50 text-amber-800'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            {prontidao.bloqueio_produto ? 'Bloqueado para transmissao' : 'Preparado para transmissao'}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Ambiente" value={prontidao.ambiente || 'NAO_CONFIGURADO'} detail="Configuracao tecnica" />
          <Metric label="Eventos preparados" value={moneyless(prontidao.eventos_preparados)} detail="Registros internos" />
          <Metric label="Documentacao oficial" value={prontidao.documentacao_oficial_validada ? 'Validada' : 'Pendente'} detail="Leiautes e XSDs SST" tone={prontidao.documentacao_oficial_validada ? 'ok' : 'warn'} />
        </div>
      </section>

      {loading ? <p className="text-sm text-[var(--c-muted)]">Carregando relatorio...</p> : null}

      <SimpleTable
        title="Pendencias de conformidade"
        columns={['Tipo', 'Severidade', 'Mensagem', 'Origem']}
        rows={conformidade.pendencias || []}
        renderRow={(row, index) => (
          <tr key={`pendencia-${index}-${row.origem_tipo}-${row.origem_id}`}>
            <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{row.tipo}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{row.severidade}</td>
            <td className="px-4 py-3 text-[var(--c-text)]">{row.mensagem}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{row.origem_tipo || '-'} #{row.origem_id || '-'}</td>
          </tr>
        )}
      />

      <SimpleTable
        title="Eventos operacionais abertos"
        columns={['Tipo', 'Severidade', 'Empresa', 'Obra', 'Mensagem']}
        rows={data?.eventos_abertos || []}
        renderRow={(row) => (
          <tr key={`evento-${row.id}`}>
            <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{row.tipo_evento}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{row.severidade}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{getLabel(row.empresa)}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{getLabel(row.obra)}</td>
            <td className="px-4 py-3 text-[var(--c-text)]">{row.mensagem}</td>
          </tr>
        )}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <SimpleTable
          title="Riscos criticos"
          columns={['Risco', 'Severidade', 'Probabilidade', 'Obra']}
          rows={data?.riscos_criticos || []}
          renderRow={(row) => (
            <tr key={`risco-${row.id}`}>
              <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{row.nome}</td>
              <td className="px-4 py-3 text-[var(--c-muted)]">{row.severidade}</td>
              <td className="px-4 py-3 text-[var(--c-muted)]">{row.probabilidade}</td>
              <td className="px-4 py-3 text-[var(--c-muted)]">{getLabel(row.obra)}</td>
            </tr>
          )}
        />
        <SimpleTable
          title="Acidentes e incidentes recentes"
          columns={['Data', 'Tipo', 'Gravidade', 'Obra']}
          rows={data?.acidentes_recentes || []}
          renderRow={(row) => (
            <tr key={`acidente-${row.id}`}>
              <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{row.data_ocorrencia}</td>
              <td className="px-4 py-3 text-[var(--c-muted)]">{row.tipo}</td>
              <td className="px-4 py-3 text-[var(--c-muted)]">{row.gravidade}</td>
              <td className="px-4 py-3 text-[var(--c-muted)]">{getLabel(row.obra)}</td>
            </tr>
          )}
        />
      </div>

      <SimpleTable
        title="Historico recente SST"
        columns={['Data', 'Recurso', 'Acao', 'Empresa', 'Resumo']}
        rows={data?.historicos_recentes || []}
        renderRow={(row) => (
          <tr key={`historico-${row.id}`}>
            <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{new Date(row.createdAt).toLocaleString('pt-BR')}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{row.recurso}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{row.acao}</td>
            <td className="px-4 py-3 text-[var(--c-muted)]">{getLabel(row.empresa)}</td>
            <td className="px-4 py-3 text-[var(--c-text)]">{row.resumo}</td>
          </tr>
        )}
      />
    </div>
  );
}
