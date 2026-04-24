import { useEffect, useMemo, useState } from 'react';
import {
  getUsuariosAcessoPrioridadeDiretoria,
  salvarUsuariosAcessoPrioridadeDiretoria
} from '../services/configuracoesSistema';

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function UsuariosAcessoPrioridadeDiretoria() {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setCarregando(true);
        const data = await getUsuariosAcessoPrioridadeDiretoria();
        const lista = Array.isArray(data?.usuarios) ? data.usuarios : [];
        setUsuarios(lista);
        setSelecionados(new Set(
          lista
            .filter(usuario => Boolean(usuario?.acesso_prioridade_diretoria))
            .map(usuario => String(usuario.id))
        ));
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar usuarios com acesso a prioridade diretoria.');
      } finally {
        setCarregando(false);
      }
    }

    load();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    return [...usuarios]
      .filter((usuario) => {
        if (!termo) return true;
        const setorNome = usuario?.setor?.nome || usuario?.setor?.codigo || '';
        return [
          usuario?.nome,
          usuario?.email,
          usuario?.perfil,
          setorNome
        ].some(campo => normalizarTexto(campo).includes(termo));
      })
      .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [usuarios, busca]);

  function alternarUsuario(usuarioId) {
    const key = String(usuarioId);
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selecionarTodosFiltrados() {
    setSelecionados((prev) => {
      const next = new Set(prev);
      usuariosFiltrados
        .filter(usuario => usuario?.ativo !== false)
        .forEach((usuario) => next.add(String(usuario.id)));
      return next;
    });
  }

  function limparTodosFiltrados() {
    setSelecionados((prev) => {
      const next = new Set(prev);
      usuariosFiltrados.forEach((usuario) => next.delete(String(usuario.id)));
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      const usuarioIds = Array.from(selecionados)
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);

      await salvarUsuariosAcessoPrioridadeDiretoria({ usuario_ids: usuarioIds });
      setUsuarios((prev) => prev.map((usuario) => ({
        ...usuario,
        acesso_prioridade_diretoria: selecionados.has(String(usuario.id))
      })));
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar configuracao.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Acesso a Prioridade Diretoria</h1>
        <p className="text-sm text-gray-600 mt-1">
          Marque usuarios que podem acessar a pagina de prioridades para consultar lotes e solicitacoes autorizadas.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="grid gap-1 text-sm w-full md:max-w-md">
            Buscar usuario
            <input
              className="input"
              placeholder="Nome, email, perfil ou setor"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn btn-outline" onClick={selecionarTodosFiltrados}>
              Selecionar filtrados
            </button>
            <button type="button" className="btn btn-outline" onClick={limparTodosFiltrados}>
              Limpar filtrados
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Marcados: <strong>{selecionados.size}</strong>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-600">Carregando usuarios...</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {usuariosFiltrados.map((usuario) => {
              const marcado = selecionados.has(String(usuario.id));
              const setorLabel = usuario?.setor?.nome || usuario?.setor?.codigo || '-';
              const ativo = usuario?.ativo !== false;

              return (
                <label
                  key={usuario.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={marcado}
                    disabled={!ativo}
                    onChange={() => alternarUsuario(usuario.id)}
                  />

                  <span className="grid gap-1">
                    <span className="font-medium text-[var(--c-text)]">
                      {usuario.nome}
                      {!ativo ? ' (inativo)' : ''}
                    </span>
                    <span className="text-[var(--c-muted)]">
                      {usuario.email} - {String(usuario.perfil || '').toUpperCase()} - {setorLabel}
                    </span>
                  </span>
                </label>
              );
            })}

            {usuariosFiltrados.length === 0 && (
              <p className="text-sm text-gray-600">Nenhum usuario encontrado.</p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </div>
    </div>
  );
}
