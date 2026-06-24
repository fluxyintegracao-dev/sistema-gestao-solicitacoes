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
import { canDeleteCompraSolicitacoes, canEncaminharCompraSolicitacoes } from '../../../utils/acessoProduto';

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

  if (valor === 'ENVIADO' || valor === 'ABERTA') {
    return 'app-status-pill compra-status-pill compra-status-blue bg-blue-100 text-blue-700';
  }

  if (valor === 'AGUARDANDO_DIRETORIA') {
    return 'app-status-pill compra-status-pill bg-amber-100 text-amber-700';
  }

  if (valor === 'FINALIZADA' || valor === 'ENCERRADO') {
    return 'app-status-pill compra-status-pill compra-status-muted bg-slate-100 text-slate-700';
  }

  return 'app-status-pill compra-status-pill compra-status-default bg-indigo-100 text-indigo-700';
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
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState([]);
  const podeInativar = canDeleteCompraSolicitacoes(user);
  const podeEncaminharCompras = canEncaminharCompraSolicitacoes(user);
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
      const params = obraId ? { obra_id: obraId } : {};
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
    <div className="page solicitacoes-page">
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
          {podeEncaminharCompras && selecionadas.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleEncaminharCompras(selecionadas)}
              disabled={encaminhando}
            >
              {encaminhando ? 'Enviando...' : 'Enviar para Compras'}
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
          </div>
        </div>

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
              <option value="ENVIADO">Enviado</option>
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

      <div className="card sol-surface-card compras-table-card">
        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">
            Nenhuma solicitacao de compra encontrada.
          </div>
        ) : (
          <div className="compras-table-wrapper">
            <table className="compras-data-table compras-data-table-solicitacoes">
              <colgroup>
                {podeSelecionar ? <col className="w-12" /> : null}
                <col className="compras-col-codigo" />
                <col className="compras-col-obra" />
                <col className="compras-col-solicitante" />
                <col className="compras-col-numero" />
                <col className="compras-col-numero" />
                <col className="compras-col-data" />
                <col className="compras-col-data" />
                <col className="compras-col-status" />
                <col className="compras-col-acoes" />
              </colgroup>
              <thead>
                <tr>
                  {podeSelecionar ? (
                    <th className="text-center">
                      <input
                        type="checkbox"
                        checked={todasSelecionadas}
                        onChange={toggleTodasSelecionadas}
                        aria-label="Selecionar solicitacoes listadas"
                      />
                    </th>
                  ) : null}
                  <th>Codigo</th>
                  <th>Obra</th>
                  <th>Solicitante</th>
                  <th>Itens</th>
                  <th>Fornecedores</th>
                  <th>Necessario para</th>
                  <th>Criada em</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoesFiltradas.map((solicitacao) => (
                  <tr key={solicitacao.id}>
                    {podeSelecionar ? (
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={selecionadas.includes(Number(solicitacao.id))}
                          onChange={() => toggleSelecionada(solicitacao.id)}
                          aria-label={`Selecionar solicitacao SC-${String(solicitacao.id).padStart(5, '0')}`}
                        />
                      </td>
                    ) : null}
                    <td className="font-mono text-sm font-semibold">
                      SC-{String(solicitacao.id).padStart(5, '0')}
                    </td>
                    <td>
                      <div className="grid gap-1">
                        <span className="font-medium">{solicitacao.obra?.nome || '-'}</span>
                        <span className="text-xs text-[var(--c-muted)]">{solicitacao.obra?.codigo || '-'}</span>
                      </div>
                    </td>
                    <td>{solicitacao.solicitante?.nome || '-'}</td>
                    <td>{(solicitacao.itens?.length || 0) + (solicitacao.itensManuais?.length || 0)}</td>
                    <td>{solicitacao.fornecedores?.length || 0}</td>
                    <td>{formatarData(solicitacao.necessario_para)}</td>
                    <td>{formatarData(solicitacao.createdAt)}</td>
                    <td>
                      <span className={classNameStatus(solicitacao.status)}>
                        {formatarStatus(solicitacao.status)}
                      </span>
                    </td>
                    <td>
                      <div className="compras-table-actions">
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
                        {podeEncaminharCompras ? (
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
