import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  criarIntegracaoSiengeFila,
  reprocessarIntegracaoSiengeFila
} from '../services/integracaoSienge';
import { getObras } from '../services/obras';
import {
  getRhEmpresasGrupo,
  getRhFechamento,
  getRhFechamentos,
  reabrirRhFechamento
} from '../services/rhDp';
import {
  canRetryIntegracaoSienge,
  canViewIntegracaoSienge,
  canExecuteRhDpFechamento
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

function queueStatusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'SUCESSO') {
    return 'app-status-pill bg-emerald-100 text-emerald-700';
  }
  if (normalized === 'ERRO') {
    return 'app-status-pill bg-rose-100 text-rose-700';
  }
  if (normalized === 'PROCESSANDO') {
    return 'app-status-pill bg-amber-100 text-amber-700';
  }
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function canQueueTituloSienge(titulo) {
  const tipo = String(titulo?.tipo || '').trim().toUpperCase();
  const status = String(titulo?.status || '').trim().toUpperCase();
  return tipo === 'PAGAR' && ['ABERTO', 'PARCIAL'].includes(status);
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
  const [processandoSiengeKey, setProcessandoSiengeKey] = useState('');
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

  const podeVerIntegracaoSienge = canViewIntegracaoSienge(user);
  const podeOperarIntegracaoSienge = canRetryIntegracaoSienge(user);
  const podeReabrirFechamento = canExecuteRhDpFechamento(user);

  async function enviarTituloParaSienge(tituloId) {
    try {
      setProcessandoSiengeKey(`titulo-${Number(tituloId)}`);
      await criarIntegracaoSiengeFila({
        titulo_financeiro_id: Number(tituloId),
        origem_modulo: 'RH_DP',
        processar_agora: true,
        forcar_recriar_payload: false
      });
      if (detalhe?.id) {
        await abrirFechamento(detalhe.id);
      }
      alert('Titulo do fechamento enviado para a fila SIENGE.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao enviar titulo do fechamento para o SIENGE');
    } finally {
      setProcessandoSiengeKey('');
    }
  }

  async function reprocessarTituloNoSienge(filaId) {
    try {
      setProcessandoSiengeKey(`fila-${Number(filaId)}`);
      await reprocessarIntegracaoSiengeFila(filaId, {
        forcar_recriar_payload: true
      });
      if (detalhe?.id) {
        await abrirFechamento(detalhe.id);
      }
      alert('Item da fila SIENGE reprocessado a partir do fechamento RH/DP.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao reprocessar item da fila SIENGE');
    } finally {
      setProcessandoSiengeKey('');
    }
  }

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
    <div className="page solicitacoes-page space-y-6">
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
            {podeVerIntegracaoSienge ? (
              <Link to="/integracao-sienge" className="btn btn-outline">
                Gateway SIENGE
              </Link>
            ) : null}
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
        {carregandoBase || carregandoLista ? (
          <p className="text-sm text-slate-500">Carregando fechamentos RH/DP...</p>
        ) : !fechamentos.length ? (
          <p className="text-sm text-slate-500">Nenhum fechamento encontrado para os filtros atuais.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Competencia</th>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Obra</th>
                  <th className="px-3 py-2 font-medium">Vencimento</th>
                  <th className="px-3 py-2 font-medium">Titulos</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {fechamentos.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3">{item.apuracao?.competencia || '-'}</td>
                    <td className="px-3 py-3">{item.apuracao?.empresaGrupo?.nome || '-'}</td>
                    <td className="px-3 py-3">{item.apuracao?.obra?.nome || 'Todas as obras'}</td>
                    <td className="px-3 py-3">{formatDate(item.data_vencimento)}</td>
                    <td className="px-3 py-3">{item.total_titulos || 0}</td>
                    <td className="px-3 py-3">{formatCurrency(item.total_valor)}</td>
                    <td className="px-3 py-3">
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => selecionarFechamento(item)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  <p className="text-xs text-slate-400">
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

              {!detalhe.titulos?.length ? (
                <p className="text-sm text-slate-500">Nenhum titulo foi vinculado a este fechamento.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-3 py-2 font-medium">Colaborador</th>
                        <th className="px-3 py-2 font-medium">Vinculo</th>
                        <th className="px-3 py-2 font-medium">Titulo</th>
                        <th className="px-3 py-2 font-medium">Parceiro</th>
                        <th className="px-3 py-2 font-medium">Obra</th>
                        {podeVerIntegracaoSienge ? (
                          <th className="px-3 py-2 font-medium">SIENGE</th>
                        ) : null}
                        <th className="px-3 py-2 font-medium">Valor</th>
                        <th className="px-3 py-2 font-medium">Vencimento</th>
                        {podeVerIntegracaoSienge ? (
                          <th className="px-3 py-2 font-medium">Enviar ao SIENGE</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {detalhe.titulos.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-800">{item.itemApuracao?.colaborador?.nome || '-'}</div>
                            <div className="text-xs text-slate-500">
                              {item.itemApuracao?.colaborador?.matricula || '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3">{item.itemApuracao?.colaborador?.tipo_vinculo || '-'}</td>
                          <td className="px-3 py-3">
                            {item.tituloFinanceiro?.id ? (
                              <Link className="text-blue-600 hover:underline" to={`/financeiro/titulos/${item.tituloFinanceiro.id}`}>
                                #{item.tituloFinanceiro.id} - {item.tituloFinanceiro.descricao || 'Titulo'}
                              </Link>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-3">{item.tituloFinanceiro?.parceiro?.nome || '-'}</td>
                          <td className="px-3 py-3">{item.tituloFinanceiro?.obra?.nome || '-'}</td>
                          {podeVerIntegracaoSienge ? (
                            <td className="px-3 py-3 whitespace-nowrap">
                              {item.tituloFinanceiro?.integracaoSienge ? (
                                <div>
                                  <span className={queueStatusClass(item.tituloFinanceiro.integracaoSienge.status)}>
                                    {item.tituloFinanceiro.integracaoSienge.status}
                                  </span>
                                  <div className="mt-1 text-[10px] text-slate-500">
                                    {item.tituloFinanceiro.integracaoSienge.external_title_id
                                      ? `Externo: ${item.tituloFinanceiro.integracaoSienge.external_title_id}`
                                      : `Tentativas: ${item.tituloFinanceiro.integracaoSienge.tentativas || 0}`}
                                  </div>
                                </div>
                              ) : canQueueTituloSienge(item.tituloFinanceiro) ? (
                                <span className="app-status-pill bg-slate-100 text-slate-700">NAO ENVIADO</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          ) : null}
                          <td className="px-3 py-3">{formatCurrency(item.valor_gerado || item.itemApuracao?.valor_liquido)}</td>
                          <td className="px-3 py-3">{formatDate(item.tituloFinanceiro?.data_vencimento)}</td>
                          {podeVerIntegracaoSienge ? (
                            <td className="px-3 py-3 whitespace-nowrap">
                              {canQueueTituloSienge(item.tituloFinanceiro) ? (
                                item.tituloFinanceiro?.integracaoSienge ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    disabled={
                                      !podeOperarIntegracaoSienge ||
                                      processandoSiengeKey === `fila-${item.tituloFinanceiro.integracaoSienge.id}` ||
                                      String(item.tituloFinanceiro.integracaoSienge.status || '').toUpperCase() === 'PROCESSANDO'
                                    }
                                    onClick={() => reprocessarTituloNoSienge(item.tituloFinanceiro.integracaoSienge.id)}
                                  >
                                    {processandoSiengeKey === `fila-${item.tituloFinanceiro.integracaoSienge.id}`
                                      ? 'Processando...'
                                      : 'Reprocessar'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    disabled={!podeOperarIntegracaoSienge || processandoSiengeKey === `titulo-${item.tituloFinanceiro?.id}`}
                                    onClick={() => enviarTituloParaSienge(item.tituloFinanceiro.id)}
                                  >
                                    {processandoSiengeKey === `titulo-${item.tituloFinanceiro?.id}`
                                      ? 'Enviando...'
                                      : 'Enviar'}
                                  </button>
                                )
                              ) : (
                                <span className="text-slate-400">Sem acao</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
