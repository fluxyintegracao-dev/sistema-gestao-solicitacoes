import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { getEmpresasGrupo } from '../services/empresasGrupo';
import { getRelatorioIntercompanyFinanceiro } from '../services/financeiro';

const DEFAULT_FILTERS = {
  periodo: 'MES_ATUAL',
  data_inicial: '',
  data_final: '',
  holding_id: '',
  empresa_id: '',
  tipo_intercompany: '',
  status: '',
  elimina_consolidado: '',
  limit: '1000'
};

const TIPOS_INTERCOMPANY = [
  ['APORTE', 'Aporte'],
  ['EMPRESTIMO', 'Emprestimo'],
  ['REEMBOLSO', 'Reembolso'],
  ['RATEIO', 'Rateio'],
  ['COBERTURA_CAIXA', 'Cobertura de caixa'],
  ['FOLHA', 'Folha'],
  ['ADMINISTRATIVO', 'Administrativo'],
  ['IMPOSTO', 'Imposto'],
  ['TRANSFERENCIA_OPERACIONAL', 'Transferencia operacional']
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function labelTipo(value) {
  return TIPOS_INTERCOMPANY.find(([key]) => key === value)?.[1] || value || 'Sem tipo';
}

function labelStatus(value) {
  const labels = {
    ABERTO: 'Aberto',
    PARCIAL: 'Parcial',
    QUITADO: 'Quitado',
    CANCELADO: 'Cancelado',
    ESTORNADO: 'Estornado',
    ATIVA: 'Ativa',
    CANCELADA: 'Cancelada'
  };
  return labels[String(value || '').toUpperCase()] || value || '-';
}

function Metric({ label, value, detail, positive = null }) {
  const color =
    positive == null
      ? 'var(--c-text)'
      : positive
        ? '#15803d'
        : '#b91c1c';

  return (
    <div className="app-summary-card">
      <span className="app-summary-label">{label}</span>
      <strong className="app-summary-value" style={{ color }}>
        {value}
      </strong>
      {detail ? <span className="app-summary-subvalue">{detail}</span> : null}
    </div>
  );
}

export default function FinanceiroIntercompany() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [empresas, setEmpresas] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getEmpresasGrupo({ ativo: true })
      .then((data) => {
        if (!active) return;
        setEmpresas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setEmpresas([]);
      })
      .finally(() => {
        if (active) setLoadingEmpresas(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getRelatorioIntercompanyFinanceiro(appliedFilters)
      .then((data) => {
        if (!active) return;
        setRelatorio(data || null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar movimentos entre empresas');
        setRelatorio(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const holdings = useMemo(
    () => empresas.filter((empresa) => String(empresa.tipo_empresa || '').toUpperCase() === 'HOLDING'),
    [empresas]
  );

  const empresasOperacionais = useMemo(
    () => empresas.filter((empresa) => String(empresa.tipo_empresa || 'OPERACIONAL').toUpperCase() !== 'HOLDING'),
    [empresas]
  );

  const resumo = relatorio?.resumo || {};
  const relacoes = Array.isArray(relatorio?.relacoes) ? relatorio.relacoes : [];
  const porTipo = Array.isArray(relatorio?.por_tipo) ? relatorio.por_tipo : [];
  const titulos = Array.isArray(relatorio?.titulos) ? relatorio.titulos : [];
  const transferencias = Array.isArray(relatorio?.transferencias) ? relatorio.transferencias : [];
  const schemaPendencias = Array.isArray(relatorio?.schema?.pendencias)
    ? relatorio.schema.pendencias
    : [];

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === 'holding_id' ? { empresa_id: '' } : null)
    }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Relatorio Entre Empresas</h1>
            <p className="page-subtitle">
              Transferencias, aportes, reembolsos e rateios entre empresas do grupo.
            </p>
          </div>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <label className="app-filter-field">
            <span className="app-filter-label">Periodo</span>
            <select className="input w-full input-sm" value={filters.periodo} onChange={(event) => updateFilter('periodo', event.target.value)}>
              <option value="MES_ATUAL">Mes atual</option>
              <option value="PROXIMO_MES">Proximo mes</option>
              <option value="HOJE">Hoje</option>
              <option value="30_DIAS">30 dias</option>
              <option value="90_DIAS">90 dias</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial} disabled={filters.periodo !== 'PERSONALIZADO'} onChange={(event) => updateFilter('data_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Data final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final} disabled={filters.periodo !== 'PERSONALIZADO'} onChange={(event) => updateFilter('data_final', event.target.value)} />
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Holding</span>
            <select className="input w-full input-sm" value={filters.holding_id} disabled={loadingEmpresas} onChange={(event) => updateFilter('holding_id', event.target.value)}>
              <option value="">Todas</option>
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.id}>{holding.nome}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Empresa</span>
            <select className="input w-full input-sm" value={filters.empresa_id} disabled={loadingEmpresas} onChange={(event) => updateFilter('empresa_id', event.target.value)}>
              <option value="">Todas</option>
              {empresasOperacionais
                .filter((empresa) => !filters.holding_id || Number(empresa.holding_id) === Number(filters.holding_id))
                .map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Tipo</span>
            <select className="input w-full input-sm" value={filters.tipo_intercompany} onChange={(event) => updateFilter('tipo_intercompany', event.target.value)}>
              <option value="">Todos</option>
              {TIPOS_INTERCOMPANY.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="app-filter-field">
            <span className="app-filter-label">Consolidado</span>
            <select className="input w-full input-sm" value={filters.elimina_consolidado} onChange={(event) => updateFilter('elimina_consolidado', event.target.value)}>
              <option value="">Todos</option>
              <option value="true">Elimina</option>
              <option value="false">Nao elimina</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="app-filter-field">
              <span className="app-filter-label">Status</span>
              <select className="input w-full input-sm" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">Todos</option>
                <option value="ABERTO">Aberto</option>
                <option value="PARCIAL">Parcial</option>
                <option value="QUITADO">Quitado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="ESTORNADO">Estornado</option>
                <option value="ATIVA">Transferencia ativa</option>
                <option value="CANCELADA">Transferencia cancelada</option>
              </select>
            </label>
            <label className="app-filter-field">
              <span className="app-filter-label">Limite</span>
              <select className="input w-full input-sm" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>
                <option value="100">100 registros</option>
                <option value="500">500 registros</option>
                <option value="1000">1000 registros</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
            <button type="submit" className="btn btn-primary btn-sm">Atualizar relatorio</button>
          </div>
        </div>
      </form>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}
      {!error && schemaPendencias.length ? (
        <div className="app-alert">
          Existem migrations pendentes para o relatorio Entre Empresas: {schemaPendencias.join(', ')}.
          Atualize o banco para liberar todos os dados da visao.
        </div>
      ) : null}

      <div className="app-summary-grid">
        <Metric label="Valor previsto" value={formatCurrency(resumo.valor_previsto)} detail={`${resumo.titulos || 0} titulo(s)`} />
        <Metric label="Valor realizado" value={formatCurrency(resumo.valor_realizado)} detail="Baixas e transferencias ativas" />
        <Metric label="Eliminado consolidado" value={formatCurrency(resumo.valor_eliminado_consolidado)} detail="Movimento interno do grupo" positive={Number(resumo.valor_eliminado_consolidado || 0) >= 0} />
        <Metric label="Nao eliminado" value={formatCurrency(resumo.valor_nao_eliminado_consolidado)} detail="Permanece na visao consolidada" />
        <Metric label="Transferencias" value={String(resumo.transferencias || 0)} detail="Registros financeiros" />
        <Metric label="Relacoes" value={String(resumo.relacoes_empresas || 0)} detail="Origem x destino" />
        <Metric label="Grupos" value={String(resumo.grupos_intercompany || 0)} detail="Identificadores entre empresas" />
      </div>

      {loading ? (
        <div className="app-empty-card">Carregando relatorio Entre Empresas...</div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Fluxo entre empresas</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Mostra quem financia, repassa ou recebe recursos dentro do grupo.
                </p>
              </div>
              <TabelaPadrao
                colunas={[
                  {
                    id: 'origem',
                    titulo: 'Origem',
                    // R17: a empresa de origem NOMEIA a relacao.
                    tipo: 'identidade',
                    noCard: 'titulo',
                    render: (item) => item.empresa_origem_nome
                  },
                  { id: 'destino', titulo: 'Destino', tipo: 'texto', render: (item) => item.empresa_destino_nome },
                  { id: 'titulos', titulo: 'Titulos', tipo: 'numero', render: (item) => item.titulos },
                  { id: 'transferencias', titulo: 'Transferencias', tipo: 'numero', render: (item) => item.transferencias },
                  { id: 'previsto', titulo: 'Previsto', tipo: 'valor', render: (item) => formatCurrency(item.valor_previsto) },
                  { id: 'realizado', titulo: 'Realizado', tipo: 'valor', render: (item) => formatCurrency(item.valor_realizado) }
                ]}
                itens={relacoes}
                getId={(item) => `${item.empresa_origem_id || 'o'}-${item.empresa_destino_id || 'd'}`}
                storageKey="tabela:financeiro-intercompany:relacoes"
                rotuloRolagem="Fluxo entre empresas"
                vazio="Nenhuma relacao entre empresas encontrada no periodo."
              />
            </div>

            <div className="card sol-surface-card app-table-shell">
              <div className="border-b border-[var(--c-border)] px-4 py-3">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Tipos de movimento entre empresas</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  Ajuda a separar aporte, cobertura de caixa, reembolso e rateio.
                </p>
              </div>
              <TabelaPadrao
                colunas={[
                  {
                    id: 'tipo',
                    titulo: 'Tipo',
                    // R17: o tipo de movimento NOMEIA a linha deste resumo.
                    tipo: 'identidade',
                    noCard: 'titulo',
                    render: (item) => labelTipo(item.tipo_intercompany)
                  },
                  { id: 'titulos', titulo: 'Titulos', tipo: 'numero', render: (item) => item.titulos },
                  { id: 'transferencias', titulo: 'Transferencias', tipo: 'numero', render: (item) => item.transferencias },
                  { id: 'realizado', titulo: 'Realizado', tipo: 'valor', render: (item) => formatCurrency(item.valor_realizado) }
                ]}
                itens={porTipo}
                getId={(item) => item.tipo_intercompany}
                storageKey="tabela:financeiro-intercompany:tipos"
                rotuloRolagem="Tipos de movimento entre empresas"
                vazio="Nenhum tipo encontrado."
              />
            </div>
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Transferencias financeiras entre empresas</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Registros efetivos entre contas de empresas diferentes, vindos do caixa ou da conciliacao bancaria.
              </p>
            </div>
            <TabelaPadrao
              colunas={[
                { id: 'data', titulo: 'Data', tipo: 'data', render: (transferencia) => formatDate(transferencia.data_transferencia) },
                {
                  id: 'origem',
                  titulo: 'Origem',
                  // R17: a empresa de origem NOMEIA a transferencia.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (transferencia) => (
                    <div>
                      <span className="font-medium text-[var(--c-text)]">{transferencia.empresa_origem_nome}</span>
                      <div className="text-xs text-[var(--c-muted)]">{transferencia.conta_origem_nome || '-'}</div>
                    </div>
                  )
                },
                {
                  id: 'destino',
                  titulo: 'Destino',
                  tipo: 'texto',
                  render: (transferencia) => (
                    <div>
                      <span className="font-medium text-[var(--c-text)]">{transferencia.empresa_destino_nome}</span>
                      <div className="text-xs text-[var(--c-muted)]">{transferencia.conta_destino_nome || '-'}</div>
                    </div>
                  )
                },
                {
                  id: 'tipo',
                  titulo: 'Tipo',
                  tipo: 'texto',
                  render: (transferencia) => (
                    <div>
                      {labelTipo(transferencia.tipo_intercompany)}
                      <div className="text-xs text-[var(--c-muted)]">{transferencia.motivo_intercompany || transferencia.descricao || '-'}</div>
                    </div>
                  )
                },
                { id: 'status', titulo: 'Status', tipo: 'status', render: (transferencia) => labelStatus(transferencia.status) },
                { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (transferencia) => formatCurrency(transferencia.valor_realizado) },
                { id: 'consolidado', titulo: 'Consolidado', tipo: 'badge', render: (transferencia) => (transferencia.elimina_consolidado ? 'Elimina' : 'Mantem') }
              ]}
              itens={transferencias}
              storageKey="tabela:financeiro-intercompany:transferencias"
              rotuloRolagem="Transferencias financeiras entre empresas"
              vazio="Nenhuma transferencia entre empresas encontrada para os filtros atuais."
            />
          </section>

          <section className="card sol-surface-card app-table-shell">
            <div className="border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Titulos entre empresas</h2>
              <p className="text-sm text-[var(--c-muted)]">
                Base analitica para auditoria, conciliacao e explicacao do consolidado.
              </p>
            </div>
            <TabelaPadrao
              colunas={[
                {
                  id: 'titulo',
                  titulo: 'Titulo',
                  // R17: o codigo do titulo NOMEIA o registro.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (titulo) => (
                    <div>
                      <Link to={`/financeiro/titulos/${titulo.id}`} className="font-semibold text-[var(--c-primary)]">
                        {titulo.codigo || `#${titulo.id}`}
                      </Link>
                      <div className="text-xs text-[var(--c-muted)]">{titulo.descricao || titulo.parceiro_nome || '-'}</div>
                    </div>
                  )
                },
                { id: 'competencia', titulo: 'Competencia', tipo: 'data', render: (titulo) => formatDate(titulo.competencia_data || titulo.data_emissao || titulo.data_vencimento) },
                { id: 'origem', titulo: 'Origem', tipo: 'texto', render: (titulo) => titulo.empresa_origem_nome },
                { id: 'destino', titulo: 'Destino', tipo: 'texto', render: (titulo) => titulo.empresa_destino_nome },
                { id: 'tipo', titulo: 'Tipo', tipo: 'texto', render: (titulo) => labelTipo(titulo.tipo_intercompany) },
                { id: 'status', titulo: 'Status', tipo: 'status', render: (titulo) => labelStatus(titulo.status) },
                { id: 'previsto', titulo: 'Previsto', tipo: 'valor', render: (titulo) => formatCurrency(titulo.valor_previsto) },
                { id: 'realizado', titulo: 'Realizado', tipo: 'valor', render: (titulo) => formatCurrency(titulo.valor_realizado) },
                { id: 'consolidado', titulo: 'Consolidado', tipo: 'badge', render: (titulo) => (titulo.elimina_consolidado ? 'Elimina' : 'Mantem') }
              ]}
              itens={titulos}
              storageKey="tabela:financeiro-intercompany:titulos"
              rotuloRolagem="Titulos entre empresas"
              vazio="Nenhum titulo entre empresas encontrado para os filtros atuais."
            />
          </section>
        </>
      )}
    </div>
  );
}
