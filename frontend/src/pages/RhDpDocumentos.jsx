import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import {
  getRhDocumentoLink,
  getRhDocumentos,
  getRhDocumentoTipos,
  getRhEmpresasGrupo,
  substituirRhDocumento
} from '../services/rhDp';
import { canManageRhDpDocumentos } from '../utils/acessoProduto';

function formatCpf(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return value || '-';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function validadeLabel(status) {
  switch (status) {
    case 'VENCIDO':
      return 'Vencido';
    case 'A_VENCER':
      return 'A vencer';
    case 'VALIDO':
      return 'Valido';
    default:
      return 'Sem validade';
  }
}

export default function RhDpDocumentos() {
  const { user } = useAuth();
  const podeEditar = canManageRhDpDocumentos(user);
  const [carregando, setCarregando] = useState(false);
  const [substituindoId, setSubstituindoId] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total_pages: 0, total: 0, limit: 20 });
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [filtros, setFiltros] = useState({
    q: '',
    empresa_grupo_id: '',
    obra_id: '',
    tipo_vinculo: '',
    tipo_documento_id: '',
    status: '',
    validade_status: '',
    incluir_historico: false,
    page: 1,
    limit: 20
  });

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    carregarDocumentos().catch((error) => {
      console.error(error);
      alert(error?.message || 'Erro ao carregar documentos RH/DP');
    });
  }, [filtros.page]);

  async function carregarBase() {
    try {
      setCarregando(true);
      const [listaEmpresas, listaObras, listaTipos] = await Promise.all([
        getRhEmpresasGrupo({ ativo: true }),
        getObras(),
        getRhDocumentoTipos({ ativo: true })
      ]);

      setEmpresas(Array.isArray(listaEmpresas) ? listaEmpresas : []);
      setObras(Array.isArray(listaObras) ? listaObras : []);
      setTipos(Array.isArray(listaTipos) ? listaTipos : []);
      await carregarDocumentos();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar base documental RH/DP');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDocumentos() {
    setCarregando(true);
    try {
      const resposta = await getRhDocumentos({
        q: filtros.q || undefined,
        empresa_grupo_id: filtros.empresa_grupo_id || undefined,
        obra_id: filtros.obra_id || undefined,
        tipo_vinculo: filtros.tipo_vinculo || undefined,
        tipo_documento_id: filtros.tipo_documento_id || undefined,
        status: filtros.status || undefined,
        validade_status: filtros.validade_status || undefined,
        incluir_historico: filtros.incluir_historico ? true : undefined,
        page: filtros.page,
        limit: filtros.limit
      });

      setDocumentos(Array.isArray(resposta?.data) ? resposta.data : []);
      setMeta({
        page: Number(resposta?.meta?.page || filtros.page || 1),
        total_pages: Number(resposta?.meta?.total_pages || 0),
        total: Number(resposta?.meta?.total || 0),
        limit: Number(resposta?.meta?.limit || filtros.limit || 20)
      });
    } finally {
      setCarregando(false);
    }
  }

  async function aplicarFiltros() {
    setFiltros((prev) => ({ ...prev, page: 1 }));
    try {
      setCarregando(true);
      const resposta = await getRhDocumentos({
        q: filtros.q || undefined,
        empresa_grupo_id: filtros.empresa_grupo_id || undefined,
        obra_id: filtros.obra_id || undefined,
        tipo_vinculo: filtros.tipo_vinculo || undefined,
        tipo_documento_id: filtros.tipo_documento_id || undefined,
        status: filtros.status || undefined,
        validade_status: filtros.validade_status || undefined,
        incluir_historico: filtros.incluir_historico ? true : undefined,
        page: 1,
        limit: filtros.limit
      });

      setDocumentos(Array.isArray(resposta?.data) ? resposta.data : []);
      setMeta({
        page: Number(resposta?.meta?.page || 1),
        total_pages: Number(resposta?.meta?.total_pages || 0),
        total: Number(resposta?.meta?.total || 0),
        limit: Number(resposta?.meta?.limit || filtros.limit || 20)
      });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao aplicar filtros dos documentos RH/DP');
    } finally {
      setCarregando(false);
    }
  }

  async function abrirDocumento(id) {
    try {
      const url = await getRhDocumentoLink(id);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao abrir documento RH/DP');
    }
  }

  async function onSelecionarSubstituicao(documento, file) {
    if (!file) return;

    if (!window.confirm(`Substituir o documento "${documento.nome_original}"?`)) {
      return;
    }

    try {
      setSubstituindoId(documento.id);
      await substituirRhDocumento(documento.id, {
        tipo_documento_id: documento.documento_tipo_id,
        validade: documento.validade || undefined,
        status: documento.status === 'REJEITADO' ? 'ENVIADO' : documento.status,
        observacoes: documento.observacoes || undefined,
        file
      });
      await carregarDocumentos();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao substituir documento RH/DP');
    } finally {
      setSubstituindoId(null);
    }
  }

  const paginaAtual = Number(meta.page || 1);
  const totalPaginas = Number(meta.total_pages || 0);

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP - Documentos</h1>
            <p className="page-subtitle">
              Painel geral de documentos por colaborador, com busca, validade, historico e acesso por link assinado.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">
              Voltar ao RH/DP
            </Link>
            <Link to="/rh-dp/colaboradores" className="btn btn-outline">
              Colaboradores
            </Link>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="form-control"
            placeholder="Buscar por colaborador, CPF, matricula, arquivo ou observacao"
            value={filtros.q}
            onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
          />
          <select
            className="form-control"
            value={filtros.empresa_grupo_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, empresa_grupo_id: e.target.value }))}
          >
            <option value="">Todas as empresas</option>
            {empresas.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={filtros.obra_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, obra_id: e.target.value }))}
          >
            <option value="">Todas as obras</option>
            {obras.map((item) => (
              <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={filtros.tipo_vinculo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipo_vinculo: e.target.value }))}
          >
            <option value="">Todos os vinculos</option>
            <option value="CLT">CLT</option>
            <option value="NAO_CLT">Nao CLT</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            className="form-control"
            value={filtros.tipo_documento_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipo_documento_id: e.target.value }))}
          >
            <option value="">Todos os tipos</option>
            {tipos.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={filtros.status}
            onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Todos os status</option>
            <option value="ENVIADO">Enviado</option>
            <option value="CONFERIDO">Conferido</option>
            <option value="REJEITADO">Rejeitado</option>
            <option value="SUBSTITUIDO">Substituido</option>
          </select>
          <select
            className="form-control"
            value={filtros.validade_status}
            onChange={(e) => setFiltros((prev) => ({ ...prev, validade_status: e.target.value }))}
          >
            <option value="">Todas as validades</option>
            <option value="VALIDO">Valido</option>
            <option value="A_VENCER">A vencer</option>
            <option value="VENCIDO">Vencido</option>
            <option value="SEM_VALIDADE">Sem validade</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={filtros.incluir_historico}
              onChange={(e) => setFiltros((prev) => ({ ...prev, incluir_historico: e.target.checked }))}
            />
            Incluir historico
          </label>
        </div>

        <div className="app-page-actions">
          <button type="button" className="btn btn-outline" onClick={aplicarFiltros} disabled={carregando}>
            Aplicar filtros
          </button>
          <span className="text-sm text-slate-500">
            Total: {meta.total}
          </span>
        </div>
      </div>

      <div className="card sol-surface-card app-table-shell">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Arquivo</th>
                <th>Status</th>
                <th>Validade</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium text-slate-900">{item.colaborador?.nome || '-'}</div>
                    <div className="text-xs text-slate-500">
                      {formatCpf(item.colaborador?.cpf)} · {item.colaborador?.matricula || '-'} · {item.colaborador?.empresaGrupo?.nome || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-slate-900">{item.tipoDocumento?.nome || '-'}</div>
                    <div className="text-xs text-slate-500">{item.colaborador?.tipo_vinculo === 'NAO_CLT' ? 'Nao CLT' : item.colaborador?.tipo_vinculo || '-'}</div>
                  </td>
                  <td>
                    <div className="font-medium text-slate-900">{item.nome_original}</div>
                    <div className="text-xs text-slate-500">{item.observacoes || '-'}</div>
                  </td>
                  <td>
                    <div>{item.status}</div>
                    <div className="text-xs text-slate-500">{item.ativo ? 'Atual' : 'Historico'}</div>
                  </td>
                  <td>
                    <div>{formatDate(item.validade)}</div>
                    <div className="text-xs text-slate-500">{validadeLabel(item.validade_status)}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-outline" onClick={() => abrirDocumento(item.id)}>
                        Abrir
                      </button>
                      <Link
                        to={`/rh-dp/colaboradores?colaborador_id=${item.colaborador_id}`}
                        className="btn btn-outline"
                      >
                        Colaborador
                      </Link>
                      {podeEditar && item.ativo && (
                        <label className={`btn btn-outline cursor-pointer ${substituindoId === item.id ? 'opacity-60 pointer-events-none' : ''}`}>
                          Substituir
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              onSelecionarSubstituicao(item, file);
                            }}
                            disabled={substituindoId === item.id}
                          />
                        </label>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!documentos.length && (
                <tr>
                  <td colSpan="6" align="center">
                    {carregando ? 'Carregando...' : 'Nenhum documento localizado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPaginas > 0 && (
        <div className="app-page-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFiltros((prev) => ({ ...prev, page: Math.max(1, paginaAtual - 1) }))}
            disabled={paginaAtual <= 1 || carregando}
          >
            Pagina anterior
          </button>
          <span className="text-sm text-slate-500">
            Pagina {paginaAtual} de {Math.max(totalPaginas, 1)}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFiltros((prev) => ({ ...prev, page: Math.min(totalPaginas, paginaAtual + 1) }))}
            disabled={paginaAtual >= totalPaginas || carregando}
          >
            Proxima pagina
          </button>
        </div>
      )}
    </div>
  );
}
