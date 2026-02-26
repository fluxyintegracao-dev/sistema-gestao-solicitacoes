import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowDownTray, HiArrowUpTray } from 'react-icons/hi2';
import { getUsuarios, ativarUsuario, desativarUsuario, importarUsuariosEmMassa } from '../services/usuarios';

export default function Usuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const data = await getUsuarios();
    setUsuarios(Array.isArray(data) ? data : []);
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
      ['Nome', 'Email', 'Cargo', 'Setor', 'Perfil', 'Obras', 'Senha'],
      ['Usuario Exemplo', 'usuario.exemplo@empresa.com', 'Analista', 'FINANCEIRO', 'USUARIO', '7|8', '123456']
    ];

    const csv = linhas
      .map(colunas => colunas.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
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
      alert('Utilize o arquivo modelo em CSV para importar usuários.');
      return;
    }

    if (!confirm(`Importar usuários em massa usando o arquivo "${file.name}"?`)) {
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
        const resumo = erros.slice(0, 5).map(item => `Linha ${item.linha}: ${item.error}`).join('\n');
        alert(`Importados: ${importados}. Ignorados: ${ignorados}. Erros: ${erros.length}.\n${resumo}${erros.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Importação concluída. Importados: ${importados}. Ignorados: ${ignorados}.`);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao importar usuários em massa');
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Cadastro e gestao de usuarios.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline px-3"
            onClick={baixarModeloImportacaoUsuarios}
            title="Baixar planilha modelo de importação"
          >
            <HiArrowDownTray className="w-4 h-4" />
          </button>

          <label
            className={`btn btn-outline px-3 cursor-pointer ${importando ? 'opacity-60 pointer-events-none' : ''}`}
            title="Importar usuários em massa (.csv)"
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

      <div className="text-sm text-gray-600">
        Modelo CSV: Nome, Email, Cargo, Setor, Perfil, Obras (separar por <code>|</code> ou <code>,</code>) e Senha. Perfis aceitos: <code>USUARIO</code>, <code>ADMIN</code> e <code>SUPERADMIN</code>. A senha informada (ex.: <code>123456</code>) é convertida em hash automaticamente no import.
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Cargo</th>
              <th>Setor</th>
              <th>Obras</th>
              <th>Ativo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.cargoInfo?.nome || '-'}</td>
                <td>{u.setor?.nome || '-'}</td>
                <td>
                  {(u.vinculos || [])
                    .map(v => v.obra ? (v.obra.codigo ? `${v.obra.codigo} - ${v.obra.nome}` : v.obra.nome) : null)
                    .filter(Boolean)
                    .join(', ')}
                </td>
                <td>{u.ativo ? 'Sim' : 'Nao'}</td>
                <td>
                  <button className="btn btn-outline" onClick={() => navigate(`/usuarios/${u.id}`)}>
                    Editar
                  </button>{' '}
                  <button className="btn btn-secondary" onClick={() => toggleAtivo(u)}>
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="7" align="center">Nenhum usuario cadastrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
