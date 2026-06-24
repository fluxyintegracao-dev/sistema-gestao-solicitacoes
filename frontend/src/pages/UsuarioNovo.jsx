import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, authHeaders } from '../services/api';
import { getUsuario, criarUsuario, atualizarUsuario } from '../services/usuarios';
import { useAuth } from '../contexts/AuthContext';
import { isBusinessAdmin, isSuperadmin } from '../utils/acessoProduto';
import { useSafeNavigateBack } from '../utils/navigation';

export default function UsuarioNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const navigateBack = useSafeNavigateBack('/usuarios');
  const { id } = useParams();
  const editando = Boolean(id);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviarConvite, setEnviarConvite] = useState(true);
  const [perfil, setPerfil] = useState('');
  const [setorId, setSetorId] = useState('');
  const [obras, setObras] = useState([]);
  const [podeCriarSolicitacaoCompra, setPodeCriarSolicitacaoCompra] = useState(false);

  const [listaSetores, setListaSetores] = useState([]);
  const [listaObras, setListaObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const isSuperadminLogado = isSuperadmin(user);
  const isBusinessAdminLogado = isBusinessAdmin(user);
  const perfilNormalizado = String(perfil || '').toUpperCase();
  const permissaoCompraTravada =
    perfilNormalizado === 'ADMIN' ||
    perfilNormalizado === 'ADMINISTRADOR' ||
    perfilNormalizado === 'SUPERADMIN';

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    try {
      setLoading(true);
      const [setores, obrasLista] = await Promise.all([
        fetch(`${API_URL}/setores`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API_URL}/obras`, { headers: authHeaders() }).then(r => r.json())
      ]);

      setListaSetores(Array.isArray(setores) ? setores : []);
      setListaObras(Array.isArray(obrasLista) ? obrasLista : []);

      if (editando) {
        const usuario = await getUsuario(id);
        setNome(usuario.nome || '');
        setEmail(usuario.email || '');
        setPerfil(usuario.perfil || '');
        setSetorId(usuario.setor_id ? String(usuario.setor_id) : '');
        setPodeCriarSolicitacaoCompra(Boolean(usuario.pode_criar_solicitacao_compra));
        const vinculos = Array.isArray(usuario.vinculos) ? usuario.vinculos : [];
        setObras(vinculos.map(v => v.obra_id).filter(Boolean));
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar dados do usuario');
    } finally {
      setLoading(false);
    }
  }

  function toggleObra(idObra) {
    setObras((atual) => (
      atual.includes(idObra)
        ? atual.filter((obraId) => obraId !== idObra)
        : [...atual, idObra]
    ));
  }

  async function salvar(e) {
    e.preventDefault();

    const payload = {
      nome,
      email,
      senha,
      enviar_convite: enviarConvite,
      perfil,
      setor_id: setorId || null,
      obras,
      pode_criar_solicitacao_compra: podeCriarSolicitacaoCompra
    };

    if (editando && !senha.trim()) {
      delete payload.senha;
    }

    if (!editando && enviarConvite && !senha.trim()) {
      delete payload.senha;
    }

    if (!editando && !enviarConvite && !senha.trim()) {
      alert('Informe uma senha inicial forte ou mantenha o envio de link por e-mail habilitado.');
      return;
    }

    try {
      const resultado = editando
        ? await atualizarUsuario(id, payload)
        : await criarUsuario(payload);

      if (!editando && resultado?.convite_erro) {
        alert(`Usuario criado, mas o link de definicao de senha nao foi enviado: ${resultado.convite_erro}`);
      }
      navigate('/usuarios');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar usuario');
    }
  }

  if (loading) {
    return <p>Carregando usuario...</p>;
  }

  return (
    <div className="page solicitacoes-page max-w-3xl mx-auto">
      <h1 className="page-title">
        {editando ? 'Editar Usuario' : 'Novo Usuario'}
      </h1>

      <form
        onSubmit={salvar}
        className="card space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm">
            Nome
            <input
              className="input"
              placeholder="Nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            Email
            <input
              className="input"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            Senha
            <input
              type="password"
              className="input"
              placeholder={
                editando
                  ? 'Deixe em branco para manter a senha'
                  : enviarConvite
                    ? 'Opcional; usuario recebera link seguro'
                    : 'Senha inicial forte'
              }
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required={!editando && !enviarConvite}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Perfil
            <select
              className="input"
              value={perfil}
              onChange={e => setPerfil(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {isBusinessAdminLogado && <option value="ADMINISTRADOR">ADMINISTRADOR</option>}
              <option value="ADMIN">ADMIN</option>
              {isSuperadminLogado && <option value="SUPERADMIN">SUPERADMIN</option>}
              <option value="USUARIO">USUARIO</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Setor
            <select
              className="input"
              value={setorId}
              onChange={e => setSetorId(e.target.value)}
            >
              <option value="">Selecione</option>
              {listaSetores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!editando && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={enviarConvite}
                onChange={e => setEnviarConvite(e.target.checked)}
              />
              <span className="grid gap-1">
                <span className="font-medium">Enviar link para definir senha por e-mail</span>
                <span className="text-[var(--c-muted)]">
                  O usuario recebe um link seguro para criar a propria senha. Se desmarcar, informe uma senha inicial forte.
                </span>
              </span>
            </label>
          </div>
        )}

        {isBusinessAdminLogado && (
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={permissaoCompraTravada ? true : podeCriarSolicitacaoCompra}
                onChange={e => setPodeCriarSolicitacaoCompra(e.target.checked)}
                disabled={permissaoCompraTravada}
              />
              <span className="grid gap-1">
                <span className="font-medium">Permitir acesso a Nova Solicitação de Compra</span>
                <span className="text-[var(--c-muted)]">
                  {permissaoCompraTravada
                    ? 'Perfis ADMIN, ADMINISTRADOR e SUPERADMIN ja possuem esse acesso automaticamente.'
                    : 'Define se este usuário pode acessar e utilizar a tela de Nova Solicitação de Compra.'}
                </span>
              </span>
            </label>
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Obras vinculadas</p>
            <span className="text-sm text-[var(--c-muted)]">
              {obras.length} selecionada(s)
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)]">
            {listaObras.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[var(--c-muted)]">
                Nenhuma obra disponivel para vinculo.
              </div>
            ) : (
              listaObras.map((obra) => {
                const checked = obras.includes(obra.id);

                return (
                  <label
                    key={obra.id}
                    className={`flex cursor-pointer items-start gap-3 border-b border-[var(--c-border)] px-4 py-3 last:border-b-0 ${
                      checked ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleObra(obra.id)}
                    />
                    <span className="grid gap-1">
                      <span className="font-medium">
                        {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                      </span>
                      <span className="text-xs text-[var(--c-muted)]">
                        ID {obra.id}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigateBack('/usuarios')}
          >
            Cancelar
          </button>

          <button
            className="btn-primary"
            type="submit"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
