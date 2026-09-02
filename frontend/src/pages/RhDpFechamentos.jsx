import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CelulaDupla, TabelaPadrao } from '../components/padrao';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import {
  getRhEmpresasGrupo,
  getRhFechamento,
  getRhFechamentos,
  reabrirRhFechamento
} from '../services/rhDp';
import {
  canReopenRhDpFechamento
} from '../utils/acessoProduto';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function statusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'FECHADO') {
    return 'app-status-pill bg-emerald-100 text-emerald-700';
  }
  if (normalized === 'ESTORNADO') {
    return 'app-status-pill bg-rose-100 text-rose-700';
  }
  return 'app-status-pill bg-slate-100 text-slate-700';
}

export default function RhDpFechamentos() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoBase, setCarregandoBase] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [filtros, setFiltros] = useState({
    competencia: searchParams.get('competencia') || '',
    empresa_grupo_id: searchParams.get('empresa_grupo_id') || '',
    obra_id: searchParams.get('obra_id') || '',
    status: searchParams.get('status') || ''
  });

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    const fechamentoId = searchParams.get('fechamento_id');
    if (!fechamentoId) {
      return;
    }
    abrirFechamento(fechamentoId);
  }, [searchParams]);

  async function carregarBase() {
    try {
      setCarregandoBase(true);
      const [listaEmpresas, listaObras] = await Promise.all([
        getRhEmpresasGrupo({ ativo: true }),
        getObras()
      ]);
      setEmpresas(Array.isArray(listaEmpresas) ? listaEmpresas : []);
      setObras(Array.isArray(listaObras) ? listaObras : []);
      await carregarFechamentos();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar base dos fechamentos RH/DP');
    } finally {
      setCarregandoBase(false);
    }
  }

  async function carregarFechamentos(nextFilters = filtros) {
    try {
      setCarregandoLista(true);
      const params = {
        competencia: nextFilters.competencia || undefined,
        empresa_grupo_id: nextFilters.empresa_grupo_id || undefined,
        obra_id: nextFilters.obra_id || undefined,
        status: nextFilters.status || undefined
      };
      const data = await getRhFechamentos(params);
      setFechamentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar fechamentos RH/DP');
    } finally {
      setCarregandoLista(false);
    }
  }

  async function abrirFechamento(id) {
    try {
      setCarregandoDetalhe(true);
      const data = await getRhFechamento(id);
      setDetalhe(data);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar detalhe do fechamento RH/DP');
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  function aplicarFiltros() {
    const nextParams = {};
    if (filtros.competencia) nextParams.competencia = filtros.competencia;
    if (filtros.empresa_grupo_id) nextParams.empresa_grupo_id = filtros.empresa_grupo_id;
    if (filtros.obra_id) nextParams.obra_id = filtros.obra_id;
    if (filtros.status) nextParams.status = filtros.status;
    if (searchParams.get('fechamento_id')) {
      nextParams.fechamento_id = searchParams.get('fechamento_id');
    }
    setSearchParams(nextParams);
    carregarFechamentos(filtros);
  }

  function selecionarFechamento(item) {
    const nextParams = {};
    if (filtros.competencia) nextParams.competencia = filtros.competencia;
    if (filtros.empresa_grupo_id) nextParams.empresa_grupo_id = filtros.empresa_grupo_id;
    if (filtros.obra_id) nextParams.obra_id = filtros.obra_id;
    if (filtros.status) nextParams.status = filtros.status;
    nextParams.fechamento_id = String(item.id);
    setSearchParams(nextParams);
    abrirFechamento(item.id);
  }

  const resumo = useMemo(() => {
    return fechamentos.reduce(
      (acc, item) => {
        acc.quantidade += 1;
        acc.totalTitulos += Number(item.total_titulos || 0);
        acc.totalValor += Number(item.total_valor || 0);
        return acc;
      },
      {
        quantidade: 0,
        totalTitulos: 0,
        totalValor: 0
      }
    );
  }, [fechamentos]);

  const podeReabrirFechamento = canReopenRhDpFechamento(user);

  async function reabrirFechamentoAtual() {
    if (!detalhe?.id || !podeReabrirFechamento) {
      return;
    }

    const justificativa = window.prompt(
      'Informe a justificativa para estornar o fechamento e reabrir a apuracao. Esta acao so sera permitida se os titulos financeiros nao estiverem baixados.'
    );
    if (!justificativa || !justificativa.trim()) {
      return;
    }

    try {
      setReabrindo(true);
      const atualizado = await reabrirRhFechamento(detalhe.id, {
        justificativa: justificativa.trim()
      });
      setDetalhe(atualizado);
      await carregarFechamentos();
      alert('Fechamento estornado e apuracao reaberta. O financeiro foi notificado.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao reabrir fechamento RH/DP');
    } finally {
      setReabrindo(false);
    }
  }

  return (
    <div className="page solicitacoes-page rhdp-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP - Fechamentos</h1>
            <p className="page-subtitle">
              Consulte competencias fechadas, acompanhe os titulos gerados no financeiro central e abra o detalhe do lote.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">
              Voltar ao RH/DP
            </Link>
            <Link to="/rh-dp/apuracao" className="btn btn-outline">
              Apuracao
            </Link>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4">
        <div className="app-summary-grid">
          <div className="app-summary-card">
            <span className="app-summary-label">Fechamentos</span>
            <strong className="app-summary-value">{resumo.quantidade}</strong>
          </div>
          <div className="app-summary-card">
            <span className="app-summary-label">Titulos gerados</span>
            <strong className="app-summary-value">{resumo.totalTitulos}</strong>
          </div>
          <div className="app-summary-card">
            <span className="app-summary-label">Valor total</span>
            <strong className="app-summary-value">{formatCurrency(resumo.totalValor)}</strong>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-filtros app-filters-card rounded-xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Filtros</p>
            <p className="sol-filtros-subtitle">
              Refine a listagem por competencia, empresa do grupo, obra e status do fechamento.
            </p>
          </div>
        </div>

        <div className="sol-filtros-grid">
          <label className="sol-filter-field">
            <span className="sol-filter-label">Competencia</span>
            <input
              type="month"
              className="input w-full"
              value={filtros.competencia}
              onChange={(event) => setFiltros((current) => ({ ...current, competencia: event.target.value }))}
            />
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Empresa do grupo</span>
            <select
              className="input w-full"
              value={filtros.empresa_grupo_id}
              onChange={(event) => setFiltros((current) => ({ ...current, empresa_grupo_id: event.target.value }))}
            >
              <option value="">Todas</option>
              {empresas.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Obra</span>
            <select
              className="input w-full"
              value={filtros.obra_id}
              onChange={(event) => setFiltros((current) => ({ ...current, obra_id: event.target.value }))}
            >
              <option value="">Todas</option>
              {obras.map((item) => (
                <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
              ))}
            </select>
          </label>

          <label className="sol-filter-field">
            <span className="sol-filter-label">Status</span>
            <select
              className="input w-full"
              value={filtros.status}
              onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">Todos</option>
              <option value="FECHADO">Fechado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>
        </div>

        <div className="app-page-actions">
          <button type="button" className="btn btn-primary" onClick={aplicarFiltros} disabled={carregandoLista}>
            {carregandoLista ? 'Atualizando...' : 'Aplicar filtros'}
          </button>
        </div>
      </div>

      <div className="sol-surface-card rounded-xl p-4">
        <TabelaPadrao
          colunas={[
            {
              id: 'competencia',
              titulo: 'Competencia',
              tipo: 'codigo',
              render: (item) => item.apuracao?.competencia || '-'
            },
            {
              id: 'empresa',
              titulo: 'Empresa',
              // R17: a EMPRESA do grupo é o que nomeia o lote fechado.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => item.apuracao?.empresaGrupo?.nome || '-'
            },
            {
              id: 'obra',
              titulo: 'Obra',
              tipo: 'texto',
              render: (item) => item.apuracao?.obra?.nome || 'Todas as obras'
            },
            {
              id: 'vencimento',
              titulo: 'Vencimento',
              tipo: 'data',
              render: (item) => formatDate(item.data_vencimento)
            },
            {
              id: 'titulos',
              titulo: 'Titulos',
              tipo: 'numero',
              render: (item) => item.total_titulos || 0
            },
            {
              id: 'valor',
              titulo: 'Valor',
              tipo: 'valor',
              render: (item) => formatCurrency(item.total_valor)
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (item) => <span className={statusClass(item.status)}>{item.status}</span>
            }
          ]}
          itens={fechamentos}
          storageKey="tabela:rh-dp-fechamentos:lista"
          rotuloRolagem="Fechamentos RH/DP"
          carregando={carregandoBase || carregandoLista}
          vazio="Nenhum fechamento encontrado para os filtros atuais."
          acoesLinha={(item) => (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => selecionarFechamento(item)}>
              Abrir
            </button>
          )}
          larguraAcoes={120}
        />
      </div>

      {detalhe ? (
        <div className="sol-surface-card rounded-xl p-4 space-y-4">
          {carregandoDetalhe ? (
            <p className="text-sm text-slate-500">Carregando detalhe do fechamento...</p>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Fechamento {detalhe.apuracao?.competencia || '-'} - {detalhe.apuracao?.empresaGrupo?.nome || '-'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Recorte: {detalhe.apuracao?.obra?.nome || 'todas as obras'} | {detalhe.apuracao?.tipo_vinculo || 'todos os vinculos'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Fechado em {formatDate(detalhe.data_fechamento)} com vencimento em {formatDate(detalhe.data_vencimento)}
                  </p>
                </div>

                <div className="app-page-actions">
                  <span className={statusClass(detalhe.status)}>{detalhe.status}</span>
                  {String(detalhe.status || '').toUpperCase() === 'FECHADO' && podeReabrirFechamento ? (
                    <button type="button" className="btn btn-outline" onClick={reabrirFechamentoAtual} disabled={reabrindo}>
                      {reabrindo ? 'Processando...' : 'Estornar e reabrir'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="app-summary-grid">
                <div className="app-summary-card">
                  <span className="app-summary-label">Titulos gerados</span>
                  <strong className="app-summary-value">{detalhe.total_titulos || 0}</strong>
                </div>
                <div className="app-summary-card">
                  <span className="app-summary-label">Valor total</span>
                  <strong className="app-summary-value">{formatCurrency(detalhe.total_valor)}</strong>
                </div>
                <div className="app-summary-card">
                  <span className="app-summary-label">Categoria financeira</span>
                  <strong className="app-summary-value">{detalhe.categoriaFinanceira?.nome || 'Nao informada'}</strong>
                </div>
              </div>

              {detalhe.observacoes ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <strong className="mr-2 text-slate-800">Observacoes:</strong>
                  {detalhe.observacoes}
                </div>
              ) : null}

              <TabelaPadrao
                colunas={[
                  {
                    id: 'colaborador',
                    titulo: 'Colaborador',
                    // R17: o titulo gerado pertence a um COLABORADOR nomeado.
                    tipo: 'identidade',
                    noCard: 'titulo',
                    render: (item) => (
                      <CelulaDupla
                        principal={item.itemApuracao?.colaborador?.nome || '-'}
                        sub={item.itemApuracao?.colaborador?.matricula || '-'}
                      />
                    )
                  },
                  {
                    id: 'vinculo',
                    titulo: 'Vinculo',
                    tipo: 'badge',
                    render: (item) => item.itemApuracao?.colaborador?.tipo_vinculo || '-'
                  },
                  {
                    id: 'titulo',
                    titulo: 'Titulo',
                    tipo: 'texto',
                    render: (item) => (item.tituloFinanceiro?.id ? (
                      <Link className="text-blue-600 hover:underline" to={`/financeiro/titulos/${item.tituloFinanceiro.id}`}>
                        #{item.tituloFinanceiro.id} - {item.tituloFinanceiro.descricao || 'Titulo'}
                      </Link>
                    ) : '-')
                  },
                  {
                    id: 'parceiro',
                    titulo: 'Parceiro',
                    tipo: 'texto',
                    render: (item) => item.tituloFinanceiro?.parceiro?.nome || '-'
                  },
                  {
                    id: 'obra',
                    titulo: 'Obra',
                    tipo: 'texto',
                    render: (item) => item.tituloFinanceiro?.obra?.nome || '-'
                  },
                  {
                    id: 'valor',
                    titulo: 'Valor',
                    tipo: 'valor',
                    render: (item) => formatCurrency(item.valor_gerado || item.itemApuracao?.valor_liquido)
                  },
                  {
                    id: 'vencimento',
                    titulo: 'Vencimento',
                    tipo: 'data',
                    render: (item) => formatDate(item.tituloFinanceiro?.data_vencimento)
                  }
                ]}
                itens={detalhe.titulos || []}
                storageKey="tabela:rh-dp-fechamentos:titulos"
                rotuloRolagem="Titulos do fechamento"
                vazio="Nenhum titulo foi vinculado a este fechamento."
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
