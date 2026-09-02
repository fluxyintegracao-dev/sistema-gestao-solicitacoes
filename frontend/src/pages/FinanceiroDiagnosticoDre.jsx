import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDiagnosticoDreFinanceira } from '../services/financeiro';

const EMPTY_DIAGNOSTICO = {
  gerado_em: null,
  resumo: {
    status: 'OK',
    total_pendencias: 0,
    pendencias_criticas: 0,
    pendencias_altas: 0,
    pendencias_medias: 0,
    total_titulos_dre: 0,
    total_empresas: 0,
    total_holdings: 0
  },
  itens: []
};

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function severityClass(severidade) {
  switch (severidade) {
    case 'CRITICA':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'ALTA':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'MEDIA':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

function statusClass(status) {
  switch (status) {
    case 'CRITICO':
      return 'text-red-700';
    case 'ATENCAO':
      return 'text-amber-700';
    case 'REVISAR':
      return 'text-sky-700';
    default:
      return 'text-emerald-700';
  }
}

function SummaryCard({ label, value, detail, colorClass = '' }) {
  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className={`app-summary-value ${colorClass}`}>{value}</strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
}

function ExampleLine({ item }) {
  const valorExemplo = item.valor_original ?? item.valor_quitacao ?? item.valor;
  const title =
    item.descricao ||
    item.titulo_descricao ||
    item.nome ||
    item.empresa_nome ||
    item.empresa_origem_nome ||
    item.empresa_destino_nome ||
    item.obra_nome ||
    item.categoria_nome ||
    item.titulo_codigo ||
    item.codigo ||
    `Registro #${item.id}`;

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        {valorExemplo != null ? (
          <span className="text-xs font-semibold text-slate-500">{formatMoney(valorExemplo)}</span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {item.id ? <span>ID {item.id}</span> : null}
        {item.codigo ? <span>Codigo {item.codigo}</span> : null}
        {item.titulo_codigo ? <span>Titulo {item.titulo_codigo}</span> : null}
        {item.tipo ? <span>Tipo {item.tipo}</span> : null}
        {item.status ? <span>Status {item.status}</span> : null}
        {item.empresa_nome ? <span>Empresa {item.empresa_nome}</span> : null}
        {item.titulo_empresa_nome ? <span>Empresa do titulo {item.titulo_empresa_nome}</span> : null}
        {item.empresa_origem_nome ? <span>Origem {item.empresa_origem_nome}</span> : null}
        {item.empresa_destino_nome ? <span>Destino {item.empresa_destino_nome}</span> : null}
        {item.obra_nome ? <span>Obra/Centro {item.obra_nome}</span> : null}
        {item.categoria_nome ? <span>Categoria {item.categoria_nome}</span> : null}
        {item.competencia_data ? <span>Competencia {item.competencia_data}</span> : null}
        {item.data_movimento ? <span>Movimento {item.data_movimento}</span> : null}
        {item.data_transferencia ? <span>Transferencia {item.data_transferencia}</span> : null}
        {item.tipo_intercompany ? <span>Entre Empresas {item.tipo_intercompany}</span> : null}
      </div>
    </li>
  );
}

function DiagnosticoItem({ item }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{item.titulo}</h2>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityClass(item.severidade)}`}>
              {item.severidade}
            </span>
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{item.descricao}</p>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-semibold text-slate-950">{item.total}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">pendencias</span>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {item.acao_recomendada}
        </p>

        {item.exemplos?.length ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Exemplos</p>
            <ul className="space-y-2">
              {item.exemplos.map((example, index) => (
                <ExampleLine key={`${item.codigo}-${example.id || index}`} item={example} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function FinanceiroDiagnosticoDre() {
  const [diagnostico, setDiagnostico] = useState(EMPTY_DIAGNOSTICO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function carregar() {
    setLoading(true);
    setError('');
    try {
      const data = await getDiagnosticoDreFinanceira();
      setDiagnostico({
        ...EMPTY_DIAGNOSTICO,
        ...data,
        resumo: {
          ...EMPTY_DIAGNOSTICO.resumo,
          ...(data?.resumo || {})
        },
        itens: Array.isArray(data?.itens) ? data.itens : []
      });
    } catch (err) {
      setError(err?.message || 'Erro ao carregar diagnostico da DRE');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const itensComPendencia = useMemo(
    () => diagnostico.itens.filter((item) => Number(item.total || 0) > 0),
    [diagnostico.itens]
  );

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Diagnostico da DRE</h1>
            <p className="page-subtitle">
              Verifique se empresas, obras, centros de custo, categorias e titulos estao prontos para uma DRE confiavel.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios" className="btn btn-outline">Voltar para relatorios</Link>
            <button type="button" className="btn btn-primary" onClick={carregar} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Status"
          value={diagnostico.resumo.status}
          detail={`Gerado em ${formatDateTime(diagnostico.gerado_em)}`}
          colorClass={statusClass(diagnostico.resumo.status)}
        />
        <SummaryCard
          label="Pendencias"
          value={diagnostico.resumo.total_pendencias}
          detail={`${diagnostico.resumo.pendencias_criticas} criticas, ${diagnostico.resumo.pendencias_altas} altas`}
        />
        <SummaryCard
          label="Titulos na DRE"
          value={diagnostico.resumo.total_titulos_dre}
          detail="Titulos marcados para considerar na DRE"
        />
        <SummaryCard
          label="Empresas"
          value={diagnostico.resumo.total_empresas}
          detail={`${diagnostico.resumo.total_holdings} holding(s) cadastrada(s)`}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Como usar este diagnostico</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Antes de confiar na DRE da Holding, corrija primeiro pendencias criticas, depois pendencias altas.
          A regra operacional recomendada e: toda obra/centro de custo pertence a uma empresa operacional,
            todo titulo financeiro herda ou informa essa empresa, toda categoria financeira tem grupo DRE,
          toda competencia representa o mes economico real do custo ou receita, e toda baixa ou transferencia
          entre empresas possui classificacao completa quando representar relacao interna do grupo.
        </p>
      </section>

      {loading ? (
        <div className="card sol-surface-card p-6 text-sm text-slate-500">Carregando diagnostico...</div>
      ) : itensComPendencia.length ? (
        <div className="space-y-4">
          {itensComPendencia.map((item) => (
            <DiagnosticoItem key={item.codigo} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm font-semibold text-emerald-700">
          Nenhuma pendencia encontrada para os dados acessiveis ao seu usuario.
        </div>
      )}
    </div>
  );
}
