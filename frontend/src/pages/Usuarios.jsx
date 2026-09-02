import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiEnvelope } from 'react-icons/hi2';
import {
  getUsuarios,
  ativarUsuario,
  desativarUsuario,
  importarUsuariosEmMassa,
  enviarConviteUsuario,
  forcarResetSenhaUsuarios
} from '../services/usuarios';
import { PageHeader, BlocoConteudo, TabelaPadrao, CelulaDupla } from '../components/padrao';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { isSuperadmin } from '../utils/acessoProduto';

function resumirObras(vinculos) {
  const nomes = (vinculos || [])
    .map((v) => (v.obra ? (v.obra.codigo ? `${v.obra.codigo} - ${v.obra.nome}` : v.obra.nome) : null))
    .filter(Boolean);
  if (nomes.length === 0) return { texto: '-', completo: '' };
  // A coluna mostrava TODAS as obras em linha corrida e explodia a largura;
  // o dado completo continua no title (tooltip) — só a forma mudou.
  const visiveis = nomes.slice(0, 2).join(', ');
  const resto = nomes.length - 2;
  return {
    texto: resto > 0 ? `${visiveis} +${resto}` : visiveis,
    completo: nomes.join(', ')
  };
}

export default function Usuarios() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputImportacaoRef = useRef(null);
  const [usuarios, setUsuarios] = useState([]);
  const [importando, setImportando] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSuperadminLogado = isSuperadmin(user);

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
      ['Nome', 'Email', 'Setor', 'Perfil', 'Obras', 'Senha', 'Enviar convite'],
      ['Usuario Exemplo', 'usuario.exemplo@empresa.com', 'FINANCEIRO', 'USUARIO', '7|8', '', 'Sim']
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
      const convitesEnviados = Number(resultado?.convites_enviados || 0);
      const convitesErros = Number(resultado?.convites_erros || 0);
      const erros = Array.isArray(resultado?.erros) ? resultado.erros : [];
      if (erros.length > 0) {
        const resumo = erros.slice(0, 5).map((item) => `Linha ${item.linha}: ${item.error}`).join('\n');
        alert(`Importados: ${importados}. Ignorados: ${ignorados}. Convites enviados: ${convitesEnviados}. Falhas de convite: ${convitesErros}. Erros: ${erros.length}.\n${resumo}${erros.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Importacao concluida. Importados: ${importados}. Ignorados: ${ignorados}. Convites enviados: ${convitesEnviados}. Falhas de convite: ${convitesErros}.`);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao importar usuarios em massa');
    } finally {
      setImportando(false);
    }
  }

  async function enviarConvite(usuario) {
    if (!confirm(`Enviar link para definicao de senha para ${usuario.nome || usuario.email}?`)) {
      return;
    }

    try {
      const resultado = await enviarConviteUsuario(usuario.id);
      alert(resultado?.email_configurado === false
        ? 'Link gerado, mas o SMTP nao esta configurado. Configure o e-mail antes de usar em producao.'
        : 'Link enviado com sucesso.');
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao enviar link de senha');
    }
  }

  async function forcarResetSenhas() {
    if (!confirm('Isso vai exigir que todos os usuarios ativos redefinam a senha no proximo acesso e enviara links por e-mail. Deseja continuar?')) {
      return;
    }

    try {
      const resultado = await forcarResetSenhaUsuarios();
      alert(`Reset aplicado. Usuarios processados: ${resultado?.total || 0}. Links enviados: ${resultado?.enviados || 0}. Falhas: ${resultado?.falhas || 0}.`);
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao forcar redefinicao de senhas');
    }
  }

  const colunas = [
    {
      id: 'usuario',
      titulo: 'Usuario',
      largura: 260,
      minWidth: 180,
      noCard: 'titulo',
      render: (u) => <CelulaDupla principal={u.nome} sub={u.email} />
    },
    {
      id: 'setor',
      titulo: 'Setor',
      largura: 150,
      render: (u) => u.setor?.nome || '-'
    },
    {
      id: 'obras',
      titulo: 'Obras',
      largura: 240,
      render: (u) => {
        const obras = resumirObras(u.vinculos);
        return <span title={obras.completo}>{obras.texto}</span>;
      }
    },
    {
      id: 'status',
      titulo: 'Status',
      largura: 96,
      render: (u) => <StatusBadge status={u.ativo ? 'Ativo' : 'Inativo'} />
    }
  ];

  return (
    <div className="page solicitacoes-page">
      <PageHeader
        titulo="Usuarios"
        contagem={loading ? null : `${usuarios.length} usuario(s)`}
        subtitulo="Cadastro, importacao e gestao operacional de usuarios."
        acaoPrincipal={{ rotulo: 'Novo usuario', onClick: () => navigate('/usuarios/novo') }}
        mais={[
          { rotulo: 'Baixar modelo CSV', onClick: baixarModeloImportacaoUsuarios },
          {
            rotulo: importando ? 'Importando…' : 'Importar usuarios (.csv)',
            desabilitada: importando,
            onClick: () => inputImportacaoRef.current?.click()
          },
          isSuperadminLogado && {
            rotulo: 'Resetar senhas de todos',
            perigosa: true,
            title: 'Forcar redefinicao de senha para todos os usuarios ativos',
            onClick: forcarResetSenhas
          }
        ]}
      />

      <input
        ref={inputImportacaoRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onSelecionarArquivoImportacao}
        disabled={importando}
      />

      <div className="space-y-3">
        <BlocoConteudo
          titulo="Modelo de importacao CSV"
          variante="secundario"
          recolhivel
          recolhidoPadrao
        >
          <p className="app-note">
            Colunas: Nome, Email, Setor, Perfil, Obras (separar por <code>|</code> ou <code>,</code>), Senha e Enviar convite. Perfis aceitos: <code>USUARIO</code>, <code>ESTAGIARIO</code>, <code>ADMIN</code>, <code>ADMINISTRADOR</code> e <code>SUPERADMIN</code>. Com convite marcado, a senha pode ficar vazia e o usuario define a propria senha pelo link seguro.
          </p>
        </BlocoConteudo>

        <BlocoConteudo variante="primario" cor="var(--c-primary)">
          <TabelaPadrao
            colunas={colunas}
            itens={usuarios}
            carregando={loading}
            storageKey="tabela:usuarios"
            larguraAcoes={320}
            aoClicarLinha={(u) => navigate(`/usuarios/${u.id}`)}
            vazio={{
              title: 'Nenhum usuario cadastrado',
              message: 'Quando novos acessos forem criados ou importados, eles aparecem aqui.'
            }}
            acoesLinha={(u) => (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => enviarConvite(u)}
                  title="Enviar link para definir ou redefinir senha"
                >
                  <HiEnvelope className="w-4 h-4" />
                  Convite
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/usuarios/${u.id}`)}>
                  Editar
                </button>
                {u.ativo ? (
                  <button className="btn btn-outline btn-sm btn-perigo-suave" onClick={() => toggleAtivo(u)}>
                    Desativar
                  </button>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={() => toggleAtivo(u)}>
                    Ativar
                  </button>
                )}
              </>
            )}
          />
        </BlocoConteudo>
      </div>
    </div>
  );
}
