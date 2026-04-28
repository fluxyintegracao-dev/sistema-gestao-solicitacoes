import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowDownTray, HiArrowUpTray } from 'react-icons/hi2';
import { getUsuarios, ativarUsuario, desativarUsuario, importarUsuariosEmMassa } from '../services/usuarios';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function Usuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [importando, setImportando] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      const data = await getUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(usuario) {
    if (usuario.ativo) {
      await desativarUsuario(usuario.id);
    } else {
      await ativarUsuario(usuario.id);
    }
    carregar();
  }

  function baixarModeloImportacaoUsuarios() {
    const linhas = [
      ['Nome', 'Email', 'Setor', 'Perfil', 'Obras', 'Senha'],
      ['Usuario Exemplo', 'usuario.exemplo@empresa.com', 'FINANCEIRO', 'USUARIO', '7|8', '123456']
    ];

    const csv = linhas
      .map((colunas) => colunas.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-importacao-usuarios.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function onSelecionarArquivoImportacao(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
      alert('Utilize o arquivo modelo em CSV para importar usuarios.');
      return;
    }

    if (!confirm(`Importar usuarios em massa usando o arquivo "${file.name}"?`)) {
      return;
    }

    try {
      setImportando(true);
      const resultado = await importarUsuariosEmMassa(file);
      await carregar();

      const importados = Number(resultado?.importados || 0);
      const ignorados = Number(resultado?.ignorados || 0);
      const erros = Array.isArray(resultado?.erros) ? resultado.erros : [];
      if (erros.length > 0) {
        const resumo = erros.slice(0, 5).map((item) => `Linha ${item.linha}: ${item.error}`).join('\n');
        alert(`Importados: ${importados}. Ignorados: ${ignorados}. Erros: ${erros.length}.\n${resumo}${erros.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Importacao concluida. Importados: ${importados}. Ignorados: ${ignorados}.`);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao importar usuarios em massa');
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Usuarios</h1>
            <p className="page-subtitle">Cadastro, importacao e gestao operacional de usuarios.</p>
          </div>
          <div className="app-page-actions">
            <span className="app-status-pill bg-sky-100 text-sky-700">
              {loading ? 'Carregando base...' : `${usuarios.length} usuario(s)`}
            </span>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          Usuarios cadastrados: <strong>{usuarios.length}</strong>
        </div>

        <div className="app-page-actions">
          <button
            type="button"
            className="btn btn-outline px-3"
            onClick={baixarModeloImportacaoUsuarios}
            title="Baixar planilha modelo de importacao"
          >
            <HiArrowDownTray className="w-4 h-4" />
          </button>

          <label
            className={`btn btn-outline px-3 cursor-pointer ${importando ? 'opacity-60 pointer-events-none' : ''}`}
            title="Importar usuarios em massa (.csv)"
          >
            <HiArrowUpTray className="w-4 h-4" />
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onSelecionarArquivoImportacao}
              disabled={importando}
            />
          </label>

          <button className="btn btn-primary" onClick={() => navigate('/usuarios/novo')}>
            Novo usuario
          </button>
        </div>
      </div>

      <div className="sol-surface-card rounded-xl p-4">
        <p className="app-note">
          Modelo CSV: Nome, Email, Setor, Perfil, Obras (separar por <code>|</code> ou <code>,</code>) e Senha. Perfis aceitos: <code>USUARIO</code>, <code>ADMIN</code>, <code>ADMINISTRADOR</code> e <code>SUPERADMIN</code>. A senha informada (ex.: <code>123456</code>) e convertida em hash automaticamente no import.
        </p>
      </div>

      <div className="card sol-surface-card app-table-shell">
        {loading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid gap-2 rounded-2xl border border-[var(--c-border)]/70 p-4">
                <LoadingSkeleton className="h-4 w-40 rounded-xl" />
                <LoadingSkeleton lines={2} lastLineClassName="w-1/2" />
              </div>
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <EmptyState
            title="Nenhum usuario cadastrado"
            message="Quando novos acessos forem criados ou importados, eles aparecem aqui."
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Setor</th>
                  <th>Obras</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{u.setor?.nome || '-'}</td>
                    <td>
                      {(u.vinculos || [])
                        .map((v) => (v.obra ? (v.obra.codigo ? `${v.obra.codigo} - ${v.obra.nome}` : v.obra.nome) : null))
                        .filter(Boolean)
                        .join(', ')}
                    </td>
                    <td>
                      <span className={u.ativo ? 'app-status-pill bg-emerald-100 text-emerald-700' : 'app-status-pill bg-slate-100 text-slate-700'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-outline" onClick={() => navigate(`/usuarios/${u.id}`)}>
                          Editar
                        </button>
                        <button className="btn btn-secondary" onClick={() => toggleAtivo(u)}>
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
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
