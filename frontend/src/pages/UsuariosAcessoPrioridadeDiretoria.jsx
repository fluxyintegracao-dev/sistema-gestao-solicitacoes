import { useEffect, useMemo, useState } from 'react';
import {
  getUsuariosAcessoPrioridadeDiretoria,
  salvarUsuariosAcessoPrioridadeDiretoria
} from '../services/configuracoesSistema';

const MODO_NENHUM = 'NENHUM';
const MODO_TODOS = 'TODOS';
const MODO_DIRETORIAS = 'DIRETORIAS';

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarAcesso(acesso) {
  const modo = String(acesso?.modo || '').trim().toUpperCase();
  if (modo === MODO_TODOS) {
    return { modo: MODO_TODOS, diretorias: [] };
  }

  const diretorias = Array.isArray(acesso?.diretorias)
    ? [...new Set(acesso.diretorias.map(item => String(item || '').trim().toUpperCase()).filter(Boolean))]
    : [];

  if (modo === MODO_DIRETORIAS && diretorias.length > 0) {
    return { modo: MODO_DIRETORIAS, diretorias };
  }

  return { modo: MODO_NENHUM, diretorias: [] };
}

export default function UsuariosAcessoPrioridadeDiretoria() {
  const [usuarios, setUsuarios] = useState([]);
  const [diretorias, setDiretorias] = useState([]);
  const [acessos, setAcessos] = useState({});
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
        setDiretorias(Array.isArray(data?.diretorias_disponiveis) ? data.diretorias_disponiveis : []);
        setAcessos(lista.reduce((acc, usuario) => {
          acc[String(usuario.id)] = normalizarAcesso(usuario?.prioridade_diretoria_acesso);
          return acc;
        }, {}));
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

  const totalConfigurados = useMemo(() => Object.values(acessos).filter(item => item?.modo !== MODO_NENHUM).length, [acessos]);

  function primeiraDiretoriaDisponivel() {
    return String(diretorias[0]?.classificacao || '').trim().toUpperCase();
  }

  function alterarModo(usuarioId, modo) {
    const id = String(usuarioId);
    const novoModo = String(modo || MODO_NENHUM).toUpperCase();
    setAcessos((prev) => {
      const atual = normalizarAcesso(prev[id]);
      if (novoModo === MODO_TODOS) {
        return { ...prev, [id]: { modo: MODO_TODOS, diretorias: [] } };
      }
      if (novoModo === MODO_DIRETORIAS) {
        return {
          ...prev,
          [id]: {
            modo: MODO_DIRETORIAS,
            diretorias: atual.diretorias.length ? atual.diretorias : [primeiraDiretoriaDisponivel()].filter(Boolean)
          }
        };
      }
      return { ...prev, [id]: { modo: MODO_NENHUM, diretorias: [] } };
    });
  }

  function alternarDiretoria(usuarioId, classificacao) {
    const id = String(usuarioId);
    const chave = String(classificacao || '').trim().toUpperCase();
    if (!chave) return;

    setAcessos((prev) => {
      const atual = normalizarAcesso(prev[id]);
      const selecionadas = new Set(atual.diretorias);
      if (selecionadas.has(chave)) selecionadas.delete(chave);
      else selecionadas.add(chave);
      return {
        ...prev,
        [id]: {
          modo: MODO_DIRETORIAS,
          diretorias: Array.from(selecionadas)
        }
      };
    });
  }

  function selecionarTodosFiltrados() {
    setAcessos((prev) => {
      const next = { ...prev };
      usuariosFiltrados
        .filter(usuario => usuario?.ativo !== false)
        .forEach((usuario) => {
          next[String(usuario.id)] = { modo: MODO_TODOS, diretorias: [] };
        });
      return next;
    });
  }

  function limparTodosFiltrados() {
    setAcessos((prev) => {
      const next = { ...prev };
      usuariosFiltrados.forEach((usuario) => {
        next[String(usuario.id)] = { modo: MODO_NENHUM, diretorias: [] };
      });
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      const usuariosPayload = Object.entries(acessos).reduce((acc, [usuarioId, acesso]) => {
        const normalizado = normalizarAcesso(acesso);
        if (normalizado.modo === MODO_TODOS) {
          acc[usuarioId] = { modo: MODO_TODOS, diretorias: [] };
        } else if (normalizado.modo === MODO_DIRETORIAS && normalizado.diretorias.length > 0) {
          acc[usuarioId] = { modo: MODO_DIRETORIAS, diretorias: normalizado.diretorias };
        }
        return acc;
      }, {});

      await salvarUsuariosAcessoPrioridadeDiretoria({ usuarios: usuariosPayload });
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
        <p className="mt-1 text-sm text-[var(--c-muted)]">
          Defina quais usuarios acessam os lotes de prioridade e se enxergam todos os lotes ou apenas diretorias especificas.
        </p>
      </div>

      <div className="card space-y-4">
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
              Todos os lotes filtrados
            </button>
            <button type="button" className="btn btn-outline" onClick={limparTodosFiltrados}>
              Limpar filtrados
            </button>
          </div>
        </div>

        <div className="text-sm text-[var(--c-muted)]">
          Usuarios configurados: <strong>{totalConfigurados}</strong>
        </div>

        {diretorias.length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            Nenhuma diretoria esta configurada em Aprovacao por Diretoria. Configure as diretorias antes de limitar por diretoria especifica.
          </div>
        )}

        {carregando ? (
          <p className="text-sm text-[var(--c-muted)]">Carregando usuarios...</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {usuariosFiltrados.map((usuario) => {
              const acesso = normalizarAcesso(acessos[String(usuario.id)]);
              const setorLabel = usuario?.setor?.nome || usuario?.setor?.codigo || '-';
              const ativo = usuario?.ativo !== false;

              return (
                <div
                  key={usuario.id}
                  className="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_240px] md:items-start">
                    <div className="grid gap-1">
                      <span className="font-medium text-[var(--c-text)]">
                        {usuario.nome}
                        {!ativo ? ' (inativo)' : ''}
                      </span>
                      <span className="text-[var(--c-muted)]">
                        {usuario.email} - {String(usuario.perfil || '').toUpperCase()} - {setorLabel}
                      </span>
                    </div>

                    <label className="grid gap-1">
                      Escopo
                      <select
                        className="input"
                        value={acesso.modo}
                        disabled={!ativo}
                        onChange={(event) => alterarModo(usuario.id, event.target.value)}
                      >
                        <option value={MODO_NENHUM}>Sem acesso</option>
                        <option value={MODO_TODOS}>Todos os lotes</option>
                        <option value={MODO_DIRETORIAS}>Diretorias especificas</option>
                      </select>
                    </label>
                  </div>

                  {acesso.modo === MODO_DIRETORIAS && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {diretorias.map((diretoria) => {
                        const classificacao = String(diretoria.classificacao || '').toUpperCase();
                        return (
                          <label key={`${usuario.id}-${classificacao}`} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={acesso.diretorias.includes(classificacao)}
                              disabled={!ativo}
                              onChange={() => alternarDiretoria(usuario.id, classificacao)}
                            />
                            <span>{classificacao} - {diretoria.diretoria_label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
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
