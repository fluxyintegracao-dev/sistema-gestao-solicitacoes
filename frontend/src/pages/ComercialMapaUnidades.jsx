import { useEffect, useMemo, useState } from 'react';
import { getEmpreendimentosComerciais, getTabelasPrecoComerciais, getUnidadesComerciais } from '../services/comercial';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function statusClass(status) {
  switch (String(status || '').toUpperCase()) {
    case 'DISPONIVEL':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'RESERVADA':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'VENDIDA':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'DISTRATADA':
      return 'border-slate-200 bg-slate-50 text-slate-700';
    case 'BLOQUEADA':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function getAgrupador(unidade) {
  return unidade.bloco || unidade.torre || unidade.tipologia || 'Sem agrupamento';
}

export default function ComercialMapaUnidades() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [empreendimentoId, setEmpreendimentoId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [empreData, unidadesData, tabelasData] = await Promise.all([
        getEmpreendimentosComerciais({ ativo: 1 }),
        getUnidadesComerciais({ ativo: 1 }),
        getTabelasPrecoComerciais({ status: 'ATIVA' })
      ]);
      setEmpreendimentos(Array.isArray(empreData) ? empreData : []);
      setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
      setTabelas(Array.isArray(tabelasData) ? tabelasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar mapa de unidades');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!empreendimentoId && empreendimentos[0]?.id) {
      setEmpreendimentoId(String(empreendimentos[0].id));
    }
  }, [empreendimentoId, empreendimentos]);

  const unidadesFiltradas = useMemo(
    () => unidades.filter((item) => String(item.empreendimento_id) === String(empreendimentoId)),
    [empreendimentoId, unidades]
  );

  const tabelaAtiva = useMemo(
    () => tabelas.find((item) => String(item.empreendimento_id) === String(empreendimentoId) && String(item.status) === 'ATIVA'),
    [empreendimentoId, tabelas]
  );

  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const unidade of unidadesFiltradas) {
      const chave = getAgrupador(unidade);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(unidade);
    }
    return [...mapa.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'pt-BR'))
      .map(([nome, itens]) => ({
        nome,
        itens: itens.sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), 'pt-BR'))
      }));
  }, [unidadesFiltradas]);

  const resumo = useMemo(() => ({
    disponivel: unidadesFiltradas.filter((item) => item.situacao === 'DISPONIVEL').length,
    reservada: unidadesFiltradas.filter((item) => item.situacao === 'RESERVADA').length,
    vendida: unidadesFiltradas.filter((item) => item.situacao === 'VENDIDA').length,
    bloqueada: unidadesFiltradas.filter((item) => item.situacao === 'BLOQUEADA').length
  }), [unidadesFiltradas]);

  if (loading) {
    return <div className="page solicitacoes-page"><div className="app-empty-card">Carregando mapa de unidades...</div></div>;
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Mapa de unidades</h1>
            <p className="page-subtitle">
              Visualize a disponibilidade comercial por empreendimento com leitura rapida de reservas, vendas e tabela ativa.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <section className="sol-surface-card rounded-2xl p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[280px_repeat(4,minmax(0,1fr))]">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Empreendimento</span>
            <select className="input w-full" value={empreendimentoId} onChange={(e) => setEmpreendimentoId(e.target.value)}>
              <option value="">Selecione</option>
              {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </label>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-700">Disponiveis</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-800">{resumo.disponivel}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Reservadas</div>
            <div className="mt-2 text-2xl font-semibold text-amber-800">{resumo.reservada}</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-blue-700">Vendidas</div>
            <div className="mt-2 text-2xl font-semibold text-blue-800">{resumo.vendida}</div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-rose-700">Bloqueadas</div>
            <div className="mt-2 text-2xl font-semibold text-rose-800">{resumo.bloqueada}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
          <div className="text-sm font-semibold text-[var(--c-text)]">Tabela ativa</div>
          <div className="mt-2 text-sm text-[var(--c-muted)]">
            {tabelaAtiva ? `${tabelaAtiva.nome}${tabelaAtiva.codigo ? ` · ${tabelaAtiva.codigo}` : ''}` : 'Nenhuma tabela de preco ativa para este empreendimento.'}
          </div>
        </div>
      </section>

      {grupos.length === 0 ? (
        <div className="app-empty-card">Nenhuma unidade encontrada para o empreendimento selecionado.</div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.nome} className="sol-surface-card rounded-2xl p-4 md:p-5">
            <div className="sol-filtros-head">
              <div>
                <p className="sol-filtros-title">{grupo.nome}</p>
                <p className="sol-filtros-subtitle">{grupo.itens.length} unidade(s) neste agrupamento.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {grupo.itens.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-4 ${statusClass(item.situacao)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{item.codigo}</h3>
                      <p className="text-sm opacity-80">{item.nome || item.tipologia || 'Unidade comercial'}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold">
                      {item.situacao}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div>Tipologia: {item.tipologia || '-'}</div>
                    <div>Reserva: {item.parceiroReserva?.nome || '-'}</div>
                    <div>Valor tabela: {item.valor_tabela ? formatCurrency(item.valor_tabela) : '-'}</div>
                    <div>Base venda: {item.valor_base_venda ? formatCurrency(item.valor_base_venda) : '-'}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
