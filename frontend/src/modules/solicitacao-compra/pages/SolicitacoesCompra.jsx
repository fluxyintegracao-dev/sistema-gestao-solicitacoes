import { useEffect, useMemo, useState } from 'react';
import { HiOutlineArrowDownTray, HiOutlineEye, HiOutlinePaperAirplane, HiOutlineTrash } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  baixarPdfSolicitacaoCompra,
  encaminharSolicitacaoCompraParaCompras,
  encaminharSolicitacoesCompraParaCompras,
  inativarSolicitacaoCompra,
  inativarSolicitacoesCompra,
  listarSolicitacoesCompra
} from '../../../services/compras';
import { getMinhasObras } from '../../../services/obras';
import {
  canDeleteCompraSolicitacoes,
  canEncaminharCompraSolicitacoes,
  isBusinessAdmin
} from '../../../utils/acessoProduto';
import { userHasSetorCapability } from '../../../utils/setor';
import { TabelaPadrao, CelulaDupla } from '../../../components/padrao';
import useComprasRealtimeRefresh from '../hooks/useComprasRealtimeRefresh';

function formatarData(data) {
  if (!data) {
    return '-';
  }

  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) {
    return '-';
  }

  return valor.toLocaleDateString('pt-BR');
}

function formatarStatus(status) {
  return String(status || '-')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function classNameStatus(status) {
  const valor = String(status || '').toUpperCase();

  if (valor === 'PENDENTE' || valor === 'ENVIADO' || valor === 'ABERTA') {
    return 'app-status-pill compra-status-pill compra-status-blue bg-blue-100 text-blue-700';
  }

  if (valor === 'AGUARDANDO_DIRETORIA') {
    return 'app-status-pill compra-status-pill compra-status-warning bg-amber-100 text-amber-700';
  }

  if (valor === 'FECHAMENTO_PARCIAL') {
    return 'app-status-pill compra-status-pill compra-status-warning bg-amber-100 text-amber-800';
  }

  if (valor === 'FINALIZADA' || valor === 'ENCERRADO') {
    return 'app-status-pill compra-status-pill compra-status-muted bg-slate-100 text-slate-700';
  }

  return 'app-status-pill compra-status-pill compra-status-default bg-indigo-100 text-indigo-700';
}

function estaAguardandoRevisaoGeo(status) {
  return ['PENDENTE', 'ENVIADO', 'INTEGRADO_SIENGE'].includes(
    String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  );
}

export default function SolicitacoesCompra() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inativando, setInativando] = useState(false);
  const [encaminhando, setEncaminhando] = useState(false);
  const [obraId, setObraId] = useState('');
  // ?status= chega do cartão de pendências do Hub: a tela abre já
  // filtrada no MESMO status que o cartão contou.
  const [status, setStatus] = useState(() => (
    String(new URLSearchParams(window.location.search).get('status') || '').trim().toUpperCase()
  ));
  const [busca, setBusca] = useState('');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const podeInativar = canDeleteCompraSolicitacoes(user);
  const podeEncaminharCompras = (
    canEncaminharCompraSolicitacoes(user)
    && (userHasSetorCapability(user, 'eh_setor_geo') || isBusinessAdmin(user))
  );
  const podeSelecionar = podeInativar || podeEncaminharCompras;
  async function carregarObras() {
    try {
      const data = await getMinhasObras({ modo: 'CRIACAO' });
      setObras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarSolicitacoes() {
    try {
      setLoading(true);
      const params = { visao: 'resumo', ...(obraId ? { obra_id: obraId } : {}) };
      const data = await listarSolicitacoesCompra(params);
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar solicitacoes de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [obraId]);

  useComprasRealtimeRefresh(carregarSolicitacoes);

  const solicitacoesFiltradas = useMemo(() => {
    const termo = String(busca || '').trim().toLowerCase();

    return solicitacoes.filter((solicitacao) => {
      const statusOk = !status || String(solicitacao.status || '').toUpperCase() === status;

      if (!statusOk) {
        return false;
      }

      if (!termo) {
        return true;
      }

      const obraNome = String(solicitacao.obra?.nome || '').toLowerCase();
      const obraCodigo = String(solicitacao.obra?.codigo || '').toLowerCase();
      const solicitante = String(solicitacao.solicitante?.nome || '').toLowerCase();
      const codigo = `sc-${String(solicitacao.id || '').padStart(5, '0')}`.toLowerCase();

      return (
        obraNome.includes(termo) ||
        obraCodigo.includes(termo) ||
        solicitante.includes(termo) ||
        codigo.includes(termo)
      );
    });
  }, [busca, solicitacoes, status]);

  const idsFiltrados = useMemo(
    () => solicitacoesFiltradas.map((solicitacao) => Number(solicitacao.id)).filter(Boolean),
    [solicitacoesFiltradas]
  );
  const idsSelecionadosEncaminhaveis = useMemo(() => {
    const ids = new Set(selecionadas);
    return solicitacoesFiltradas
      .filter((solicitacao) => ids.has(Number(solicitacao.id)) && estaAguardandoRevisaoGeo(solicitacao.status))
      .map((solicitacao) => Number(solicitacao.id));
  }, [selecionadas, solicitacoesFiltradas]);

  const todasSelecionadas = useMemo(
    () => idsFiltrados.length > 0 && idsFiltrados.every((id) => selecionadas.includes(id)),
    [idsFiltrados, selecionadas]
  );

  useEffect(() => {
    setSelecionadas((atuais) => atuais.filter((id) => idsFiltrados.includes(id)));
  }, [idsFiltrados]);

  function toggleSelecionada(id) {
    const key = Number(id);
    setSelecionadas((atuais) =>
      atuais.includes(key) ? atuais.filter((item) => item !== key) : [...atuais, key]
    );
  }

  function toggleTodasSelecionadas() {
    setSelecionadas(todasSelecionadas ? [] : idsFiltrados);
  }

  async function handleBaixarPdf(id) {
    try {
      const blob = await baixarPdfSolicitacaoCompra(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao gerar PDF');
    }
  }

  async function handleInativar(ids) {
    const idsValidos = [...new Set(
      (Array.isArray(ids) ? ids : [ids])
        .map((id) => Number(id))
        .filter(Boolean)
    )];

    if (!idsValidos.length) {
      alert('Selecione ao menos uma solicitacao de compra.');
      return;
    }

    if (!window.confirm(`Inativar ${idsValidos.length} solicitacao(oes) de compra selecionada(s)?`)) {
      return;
    }

    try {
      setInativando(true);
      if (idsValidos.length === 1) {
        await inativarSolicitacaoCompra(idsValidos[0]);
      } else {
        await inativarSolicitacoesCompra(idsValidos);
      }
      setSelecionadas([]);
      await carregarSolicitacoes();
      alert('Solicitacao(oes) de compra inativada(s) com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao inativar solicitacao de compra');
    } finally {
      setInativando(false);
    }
  }

  async function handleEncaminharCompras(ids) {
    const idsValidos = [...new Set(
      (Array.isArray(ids) ? ids : [ids])
        .map((id) => Number(id))
        .filter(Boolean)
    )];

    if (!idsValidos.length) {
      alert('Selecione ao menos uma solicitacao de compra.');
      return;
    }

    if (!window.confirm(`Enviar ${idsValidos.length} solicitacao(oes) para a fila do setor de Compras?`)) {
      return;
    }

    try {
      setEncaminhando(true);
      if (idsValidos.length === 1) {
        await encaminharSolicitacaoCompraParaCompras(idsValidos[0]);
      } else {
        await encaminharSolicitacoesCompraParaCompras(idsValidos);
      }
      setSelecionadas([]);
      await carregarSolicitacoes();
      alert('Solicitacao(oes) enviada(s) para a fila do setor de Compras.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao enviar solicitacao para Compras');
    } finally {
      setEncaminhando(false);
    }
  }

  return (
    <div className="page solicitacoes-page compras-solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Solicitacoes de Compra</h1>
            <p className="page-subtitle">
              Acompanhe as solicitacoes de compra criadas no modulo e gere o PDF quando necessario.
            </p>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          Registros disponiveis: <strong>{solicitacoesFiltradas.length}</strong>
          {podeSelecionar && selecionadas.length > 0 ? (
            <span className="ml-2 text-[var(--c-muted)]">Selecionadas: {selecionadas.length}</span>
          ) : null}
        </div>
        <div className="app-page-actions">
          {podeSelecionar && solicitacoesFiltradas.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={toggleTodasSelecionadas}
              aria-label="Selecionar solicitacoes listadas"
            >
              {todasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
          ) : null}
          {podeEncaminharCompras && idsSelecionadosEncaminhaveis.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleEncaminharCompras(idsSelecionadosEncaminhaveis)}
              disabled={encaminhando}
            >
              {encaminhando ? 'Enviando...' : `Enviar para Compras (${idsSelecionadosEncaminhaveis.length})`}
            </button>
          ) : null}
          {podeInativar && selecionadas.length > 0 ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleInativar(selecionadas)}
              disabled={inativando}
            >
              {inativando ? 'Inativando...' : 'Inativar selecionadas'}
            </button>
          ) : null}
          <button type="button" className="btn btn-outline" onClick={carregarSolicitacoes} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/solicitacoes-compra/nova')}>
            Nova solicitacao
          </button>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-filtros app-filters-card rounded-xl p-4 md:p-5">
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Filtros</p>
            <p className="sol-filtros-subtitle">
              Refine por obra, status e busca textual para localizar a solicitacao certa mais rapido.
            </p>
          </div>

          <div className="sol-filtros-meta">
            <div className="sol-filtros-soma">
              <span className="sol-filtros-soma-label">Total listado</span>
              <strong className="sol-filtros-soma-value">{solicitacoesFiltradas.length}</strong>
            </div>
            <button
              type="button"
              className="btn btn-outline compras-mobile-filter-toggle"
              aria-expanded={filtrosVisiveis}
              onClick={() => setFiltrosVisiveis((atual) => !atual)}
            >
              {filtrosVisiveis ? 'Ocultar filtros' : 'Exibir filtros'}
            </button>
          </div>
        </div>

        <div className={`compras-filter-content ${filtrosVisiveis ? 'is-open' : ''}`}>
          <div className="sol-filtros-grid">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Obra</span>
              <select className="input" value={obraId} onChange={(event) => setObraId(event.target.value)}>
                <option value="">Todas</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.codigo ? `${obra.codigo} - ` : ''}
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Status</span>
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="ENVIADO">Enviado</option>
                <option value="LIBERADO_PARA_COMPRA">Liberado para compra</option>
                <option value="FECHAMENTO_PARCIAL">Fechamento parcial</option>
                <option value="ENCERRADO">Encerrado</option>
              </select>
            </label>

            <label className="sol-filter-field md:col-span-2">
              <span className="sol-filter-label">Busca</span>
              <input
                className="input"
                placeholder="Codigo, obra ou solicitante"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="card sol-surface-card compras-table-card compras-adaptive-list">
        <TabelaPadrao
          colunas={[
            ...(podeSelecionar ? [{
              id: 'selecao',
              titulo: 'Sel.',
              tipo: 'status',
              render: (solicitacao) => (
                <input
                  type="checkbox"
                  checked={selecionadas.includes(Number(solicitacao.id))}
                  onChange={() => toggleSelecionada(solicitacao.id)}
                  aria-label={`Selecionar solicitacao SC-${String(solicitacao.id).padStart(5, '0')}`}
                />
              )
            }] : []),
            {
              id: 'codigo',
              titulo: 'Codigo',
              tipo: 'codigo',
              render: (solicitacao) => (
                <span className="font-mono text-sm font-semibold">
                  SC-{String(solicitacao.id).padStart(5, '0')}
                </span>
              )
            },
            {
              id: 'obra',
              titulo: 'Obra',
              tipo: 'identidade',
              noCard: 'titulo',
              render: (solicitacao) => (
                <CelulaDupla
                  principal={solicitacao.obra?.nome || '-'}
                  sub={solicitacao.obra?.codigo || '-'}
                />
              )
            },
            {
              id: 'solicitante',
              titulo: 'Solicitante',
              tipo: 'texto',
              render: (solicitacao) => solicitacao.solicitante?.nome || '-'
            },
            {
              id: 'itens',
              titulo: 'Itens',
              tipo: 'numero',
              render: (solicitacao) => (
                solicitacao.itens_count
                  ?? ((solicitacao.itens?.length || 0) + (solicitacao.itensManuais?.length || 0))
              )
            },
            {
              id: 'fornecedores',
              titulo: 'Fornecedores',
              tipo: 'numero',
              render: (solicitacao) => solicitacao.fornecedores_count ?? (solicitacao.fornecedores?.length || 0)
            },
            {
              id: 'necessario_para',
              titulo: 'Necessario para',
              tipo: 'data',
              render: (solicitacao) => formatarData(solicitacao.necessario_para)
            },
            {
              id: 'criada_em',
              titulo: 'Criada em',
              tipo: 'data',
              render: (solicitacao) => formatarData(solicitacao.createdAt)
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (solicitacao) => (
                <span className={classNameStatus(solicitacao.status)}>
                  {formatarStatus(solicitacao.status)}
                </span>
              )
            }
          ]}
          itens={solicitacoesFiltradas}
          carregando={loading}
          vazio="Nenhuma solicitacao de compra encontrada."
          storageKey="tabela:solicitacoes-compra"
          rotuloRolagem="Solicitacoes de compra"
          acoesLinha={(solicitacao) => (
            <>
              <button
                type="button"
                className="compras-icon-action"
                onClick={() => navigate(`/solicitacoes-compra/${solicitacao.id}`)}
                title="Abrir detalhes"
                aria-label={`Abrir detalhes da solicitacao SC-${String(solicitacao.id).padStart(5, '0')}`}
              >
                <HiOutlineEye />
              </button>
              <button
                type="button"
                className="compras-icon-action"
                onClick={() => handleBaixarPdf(solicitacao.id)}
                title="Baixar PDF"
                aria-label={`Baixar PDF da solicitacao SC-${String(solicitacao.id).padStart(5, '0')}`}
              >
                <HiOutlineArrowDownTray />
              </button>
              {podeEncaminharCompras && estaAguardandoRevisaoGeo(solicitacao.status) ? (
                <button
                  type="button"
                  className="compras-icon-action"
                  onClick={() => handleEncaminharCompras([solicitacao.id])}
                  title="Enviar para fila de Compras"
                  aria-label={`Enviar solicitacao SC-${String(solicitacao.id).padStart(5, '0')} para Compras`}
                  disabled={encaminhando}
                >
                  <HiOutlinePaperAirplane />
                </button>
              ) : null}
              {podeInativar ? (
                <button
                  type="button"
                  className="compras-icon-action text-red-600 hover:text-red-700"
                  onClick={() => handleInativar([solicitacao.id])}
                  title="Inativar solicitacao"
                  aria-label={`Inativar solicitacao SC-${String(solicitacao.id).padStart(5, '0')}`}
                  disabled={inativando}
                >
                  <HiOutlineTrash />
                </button>
              ) : null}
            </>
          )}
          larguraAcoes={220}
        />
      </div>
    </div>
  );
}
