import { useEffect, useMemo, useState } from 'react';
import {
  getUsuariosAcessoPrioridadeDiretoria,
  salvarUsuariosAcessoPrioridadeDiretoria
} from '../services/configuracoesSistema';
import { Pagina, PageHeader, BlocoConteudo, TabelaPadrao, CelulaDupla } from '../components/padrao';
import StatusBadge from '../components/StatusBadge';

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

  const colunas = [
    {
      id: 'usuario',
      titulo: 'Usuario',
      tipo: 'texto',
      noCard: 'titulo',
      render: (usuario) => <CelulaDupla principal={usuario.nome} sub={usuario.email} />
    },
    {
      id: 'perfil',
      titulo: 'Perfil',
      tipo: 'badge',
      render: (usuario) => String(usuario.perfil || '').toUpperCase() || '-'
    },
    {
      id: 'setor',
      titulo: 'Setor',
      tipo: 'badge',
      render: (usuario) => usuario?.setor?.nome || usuario?.setor?.codigo || '-'
    },
    {
      id: 'status',
      titulo: 'Status',
      tipo: 'status',
      render: (usuario) => <StatusBadge status={usuario?.ativo !== false ? 'Ativo' : 'Inativo'} />
    },
    {
      id: 'escopo',
      titulo: 'Escopo',
      tipo: 'texto',
      flex: false,
      render: (usuario) => {
        const acesso = normalizarAcesso(acessos[String(usuario.id)]);
        const ativo = usuario?.ativo !== false;
        return (
          <select
            className="input input-sm w-full"
            value={acesso.modo}
            disabled={!ativo}
            aria-label={`Escopo de ${usuario.nome}`}
            onChange={(event) => alterarModo(usuario.id, event.target.value)}
          >
            <option value={MODO_NENHUM}>Sem acesso</option>
            <option value={MODO_TODOS}>Todos os lotes</option>
            <option value={MODO_DIRETORIAS}>Diretorias especificas</option>
          </select>
        );
      }
    },
    {
      id: 'diretorias',
      titulo: 'Diretorias',
      tipo: 'texto',
      flex: false,
      render: (usuario) => {
        const acesso = normalizarAcesso(acessos[String(usuario.id)]);
        const ativo = usuario?.ativo !== false;
        if (acesso.modo !== MODO_DIRETORIAS) {
          return (
            <span
              className="text-[var(--c-muted)]"
              title="Disponivel apenas no escopo 'Diretorias especificas'"
            >
              -
            </span>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            {diretorias.map((diretoria) => {
              const classificacao = String(diretoria.classificacao || '').toUpperCase();
              return (
                <label key={`${usuario.id}-${classificacao}`} className="inline-flex items-center gap-2 text-sm">
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
        );
      }
    }
  ];

  return (
    <Pagina>
      <PageHeader
        titulo="Acesso a Prioridade Diretoria"
        subtitulo="Defina quais usuarios acessam os lotes de prioridade e se enxergam todos os lotes ou apenas diretorias especificas."
        acaoPrincipal={{
          rotulo: salvando ? 'Salvando...' : 'Salvar configuracao',
          onClick: salvar,
          desabilitada: salvando
        }}
        secundarias={[
          { rotulo: 'Todos os lotes filtrados', onClick: selecionarTodosFiltrados },
          { rotulo: 'Limpar filtrados', onClick: limparTodosFiltrados }
        ]}
      />

      {diretorias.length === 0 && !carregando && (
        <div className="app-alert">
          Nenhuma diretoria esta configurada em Aprovacao por Diretoria. Configure as diretorias antes de limitar por diretoria especifica.
        </div>
      )}

      <BlocoConteudo
        titulo={`Usuarios (${totalConfigurados} configurado(s))`}
        variante="primario"
        cor="var(--c-primary)"
        acoes={(
          <input
            className="input input-sm app-busca"
            placeholder="Nome, email, perfil ou setor"
            aria-label="Buscar usuario"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        )}
      >
        <TabelaPadrao
          colunas={colunas}
          itens={usuariosFiltrados}
          carregando={carregando}
          storageKey="tabela:usuarios-prioridade-diretoria"
          vazio={{ title: 'Nenhum usuario encontrado' }}
        />
      </BlocoConteudo>
    </Pagina>
  );
}
