import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { atualizarEmpresaGrupo, criarEmpresaGrupo, getEmpresasGrupo } from '../services/empresasGrupo';

function emptyForm() {
  return {
    id: null,
    codigo: '',
    nome: '',
    razao_social: '',
    cnpj: '',
    tipo_empresa: 'OPERACIONAL',
    tipo_gerencial: 'OPERACIONAL',
    empresa_caixa: false,
    empresa_operacional: true,
    consolidar_no_grupo: true,
    elimina_intercompany: true,
    holding_id: '',
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

const TIPOS_GERENCIAIS = [
  ['HOLDING', 'Holding'],
  ['TESOURARIA', 'Tesouraria'],
  ['SPE', 'SPE'],
  ['ADMINISTRATIVA', 'Administrativa'],
  ['OPERACIONAL', 'Operacional'],
  ['PATRIMONIAL', 'Patrimonial'],
  ['COMERCIAL', 'Comercial'],
  ['RH_FOLHA', 'RH/Folha'],
  ['INVESTIMENTOS', 'Investimentos']
];

function labelTipoGerencial(value) {
  return TIPOS_GERENCIAIS.find(([key]) => key === String(value || '').toUpperCase())?.[1] || 'Operacional';
}

export default function EmpresasGrupo() {
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
      const data = await getEmpresasGrupo({
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
      tipo_empresa: item.tipo_empresa || 'OPERACIONAL',
      tipo_gerencial: item.tipo_gerencial || 'OPERACIONAL',
      empresa_caixa: Boolean(item.empresa_caixa),
      empresa_operacional: item.empresa_operacional !== false,
      consolidar_no_grupo: item.consolidar_no_grupo !== false,
      elimina_intercompany: item.elimina_intercompany !== false,
      holding_id: item.holding_id ? String(item.holding_id) : '',
      ativo: item.ativo !== false
    });
  }

  function limparFormulario() {
    setForm(emptyForm());
  }

  async function salvar(event) {
    event.preventDefault();
    try {
      setSalvando(true);
      const payload = {
        codigo: form.codigo || undefined,
        nome: form.nome,
        razao_social: form.razao_social || undefined,
        cnpj: form.cnpj || undefined,
        tipo_empresa: form.tipo_empresa || 'OPERACIONAL',
        tipo_gerencial: form.tipo_gerencial || 'OPERACIONAL',
        empresa_caixa: Boolean(form.empresa_caixa),
        empresa_operacional: Boolean(form.empresa_operacional),
        consolidar_no_grupo: Boolean(form.consolidar_no_grupo),
        elimina_intercompany: Boolean(form.elimina_intercompany),
        holding_id: form.tipo_empresa === 'HOLDING' ? null : (form.holding_id ? Number(form.holding_id) : null),
        ativo: Boolean(form.ativo)
      };

      if (form.id) {
        await atualizarEmpresaGrupo(form.id, payload);
      } else {
        await criarEmpresaGrupo(payload);
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

  const holdings = empresas.filter((empresa) => String(empresa.tipo_empresa || '').toUpperCase() === 'HOLDING');

  return (
    <div className="page solicitacoes-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Empresas do Grupo</h1>
            <p className="page-subtitle">
              Cadastro central usado por financeiro, pagamentos, RH/DP e demais modulos multiempresa.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/configuracoes" className="btn btn-outline">
              Voltar
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
            onChange={(event) => setFiltros((prev) => ({ ...prev, q: event.target.value }))}
          />
          <select
            className="form-control"
            value={filtros.ativo}
            onChange={(event) => setFiltros((prev) => ({ ...prev, ativo: event.target.value }))}
          >
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={carregar} disabled={carregando}>
              Aplicar filtros
            </button>
            <button type="button" className="btn btn-primary" onClick={limparFormulario}>
              Nova empresa
            </button>
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
                  <th>Tipo</th>
                  <th>Gerencial</th>
                  <th>Consolida</th>
                  <th>Holding</th>
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
                    <td>{String(item.tipo_empresa || 'OPERACIONAL') === 'HOLDING' ? 'Holding' : 'Empresa operacional'}</td>
                    <td>{labelTipoGerencial(item.tipo_gerencial)}</td>
                    <td>{item.consolidar_no_grupo !== false ? 'Sim' : 'Nao'}</td>
                    <td>{item.holding_id ? (empresas.find((empresa) => Number(empresa.id) === Number(item.holding_id))?.nome || item.holding_id) : '-'}</td>
                    <td>{formatDocumento(item.cnpj)}</td>
                    <td>{item.ativo ? 'Sim' : 'Nao'}</td>
                    <td>
                      <button type="button" className="btn btn-outline" onClick={() => selecionarEmpresa(item)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {!empresas.length && (
                  <tr>
                    <td colSpan="10" align="center">
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
              Essas empresas passam a ser a autoridade central para contas, caixa, pagamentos e RH/DP.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Codigo</span>
              <input
                className="form-control"
                value={form.codigo}
                onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>CNPJ</span>
              <input
                className="form-control"
                value={form.cnpj}
                onChange={(event) => setForm((prev) => ({ ...prev, cnpj: event.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Tipo</span>
              <select
                className="form-control"
                value={form.tipo_empresa}
                onChange={(event) => setForm((prev) => ({
                  ...prev,
                  tipo_empresa: event.target.value,
                  tipo_gerencial: event.target.value === 'HOLDING' ? 'HOLDING' : prev.tipo_gerencial,
                  empresa_operacional: event.target.value === 'HOLDING' ? false : prev.empresa_operacional,
                  holding_id: event.target.value === 'HOLDING' ? '' : prev.holding_id
                }))}
              >
                <option value="HOLDING">Holding</option>
                <option value="OPERACIONAL">Empresa operacional</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Tipo gerencial</span>
              <select
                className="form-control"
                value={form.tipo_gerencial}
                onChange={(event) => setForm((prev) => ({ ...prev, tipo_gerencial: event.target.value }))}
              >
                {TIPOS_GERENCIAIS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Holding controladora</span>
              <select
                className="form-control"
                value={form.holding_id}
                onChange={(event) => setForm((prev) => ({ ...prev, holding_id: event.target.value }))}
                disabled={form.tipo_empresa === 'HOLDING'}
              >
                <option value="">Nao vinculada</option>
                {holdings
                  .filter((holding) => Number(holding.id) !== Number(form.id))
                  .map((holding) => (
                    <option key={holding.id} value={holding.id}>
                      {holding.nome}
                    </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span>Nome</span>
            <input
              className="form-control"
              value={form.nome}
              onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Razao social</span>
            <input
              className="form-control"
              value={form.razao_social}
              onChange={(event) => setForm((prev) => ({ ...prev, razao_social: event.target.value }))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(event) => setForm((prev) => ({ ...prev, ativo: event.target.checked }))}
            />
            Empresa ativa
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">Classificacao gerencial</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.empresa_caixa}
                  onChange={(event) => setForm((prev) => ({ ...prev, empresa_caixa: event.target.checked }))}
                />
                Empresa caixa / tesouraria
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.empresa_operacional}
                  onChange={(event) => setForm((prev) => ({ ...prev, empresa_operacional: event.target.checked }))}
                />
                Empresa operacional
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.consolidar_no_grupo}
                  onChange={(event) => setForm((prev) => ({ ...prev, consolidar_no_grupo: event.target.checked }))}
                />
                Consolidar no grupo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.elimina_intercompany}
                  onChange={(event) => setForm((prev) => ({ ...prev, elimina_intercompany: event.target.checked }))}
                />
                Eliminar entre empresas no consolidado
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar empresa'}
            </button>
            {form.id && (
              <button type="button" className="btn btn-outline" onClick={limparFormulario}>
                Cancelar edicao
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
