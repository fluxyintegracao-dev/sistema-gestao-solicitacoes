import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { criarRhEmpresaGrupo, atualizarRhEmpresaGrupo, getRhEmpresasGrupo } from '../services/rhDp';
import { canAccessRhDpEmpresas } from '../utils/acessoProduto';

function emptyForm() {
  return {
    id: null,
    codigo: '',
    nome: '',
    razao_social: '',
    cnpj: '',
    ativo: true
  };
}

function formatDocumento(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return value || '-';
}

export default function RhDpEmpresas() {
  const { user } = useAuth();
  const podeEditar = canAccessRhDpEmpresas(user);
  const [empresas, setEmpresas] = useState([]);
  const [filtros, setFiltros] = useState({ q: '', ativo: '' });
  const [form, setForm] = useState(emptyForm());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      const data = await getRhEmpresasGrupo({
        q: filtros.q || undefined,
        ativo: filtros.ativo === '' ? undefined : filtros.ativo
      });
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar empresas do grupo');
    } finally {
      setCarregando(false);
    }
  }

  function selecionarEmpresa(item) {
    setForm({
      id: item.id,
      codigo: item.codigo || '',
      nome: item.nome || '',
      razao_social: item.razao_social || '',
      cnpj: item.cnpj || '',
      ativo: Boolean(item.ativo)
    });
  }

  function limparFormulario() {
    setForm(emptyForm());
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) {
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        codigo: form.codigo || undefined,
        nome: form.nome,
        razao_social: form.razao_social || undefined,
        cnpj: form.cnpj || undefined,
        ativo: Boolean(form.ativo)
      };

      if (form.id) {
        await atualizarRhEmpresaGrupo(form.id, payload);
      } else {
        await criarRhEmpresaGrupo(payload);
      }

      limparFormulario();
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar empresa do grupo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP • Empresas do grupo</h1>
            <p className="page-subtitle">
              Dimensao interna do RH/DP para separar colaboradores por empresa operacional dentro da instalacao.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">
              Voltar ao RH/DP
            </Link>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="form-control"
            placeholder="Buscar por nome, codigo ou CNPJ"
            value={filtros.q}
            onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
          />
          <select
            className="form-control"
            value={filtros.ativo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, ativo: e.target.value }))}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={carregar} disabled={carregando}>
              Aplicar filtros
            </button>
            {podeEditar && (
              <button type="button" className="btn btn-primary" onClick={limparFormulario}>
                Nova empresa
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="card sol-surface-card app-table-shell">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nome</th>
                  <th>Razao social</th>
                  <th>CNPJ</th>
                  <th>Ativa</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo || '-'}</td>
                    <td>{item.nome}</td>
                    <td>{item.razao_social || '-'}</td>
                    <td>{formatDocumento(item.cnpj)}</td>
                    <td>{item.ativo ? 'Sim' : 'Nao'}</td>
                    <td>
                      <button type="button" className="btn btn-outline" onClick={() => selecionarEmpresa(item)}>
                        {podeEditar ? 'Editar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!empresas.length && (
                  <tr>
                    <td colSpan="6" align="center">
                      {carregando ? 'Carregando...' : 'Nenhuma empresa do grupo cadastrada'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form className="sol-surface-card rounded-xl p-4 space-y-4" onSubmit={salvar}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {form.id ? 'Detalhe da empresa' : 'Nova empresa do grupo'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cadastro usado pelo RH/DP para distribuicao de colaboradores por empresa operacional.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Codigo</span>
              <input
                className="form-control"
                value={form.codigo}
                onChange={(e) => setForm((prev) => ({ ...prev, codigo: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>CNPJ</span>
              <input
                className="form-control"
                value={form.cnpj}
                onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span>Nome</span>
            <input
              className="form-control"
              value={form.nome}
              onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
              disabled={!podeEditar}
              required
            />
          </label>

          <label className="space-y-1 text-sm block">
            <span>Razao social</span>
            <input
              className="form-control"
              value={form.razao_social}
              onChange={(e) => setForm((prev) => ({ ...prev, razao_social: e.target.value }))}
              disabled={!podeEditar}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.ativo)}
              onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
              disabled={!podeEditar}
            />
            Empresa ativa
          </label>

          {podeEditar && (
            <div className="app-page-actions">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {form.id ? 'Salvar alteracoes' : 'Criar empresa'}
              </button>
              <button type="button" className="btn btn-outline" onClick={limparFormulario} disabled={salvando}>
                Limpar
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
