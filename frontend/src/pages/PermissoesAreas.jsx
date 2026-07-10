import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUsuarios } from '../services/usuarios';
import {
  getPermissoesAreas,
  getPermissoesAreasRegistry,
  salvarPermissoesAreas
} from '../services/configuracoesSistema';
import {
  buildModuleEnabledMap,
  getModuleGovernance,
  MODULE_GOVERNANCE
} from '../constants/moduleGovernance';
import { isSuperadmin } from '../utils/acessoProduto';

const PERMISSAO_SOLICITACOES_MINHAS = 'solicitacoes.lista.visualizar_minhas';
const COMPRAS_SCOPE_KEYS = [
  'compras.escopo.minhas_atribuidas',
  'compras.escopo.setor',
  'compras.escopo.todas'
];
const COMPRAS_SCOPE_DEFAULT = 'compras.escopo.minhas_atribuidas';
const COMPRAS_SCOPE_SELECT_ALL = 'compras.escopo.setor';

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePerfil(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isComprasScopeKey(value) {
  return COMPRAS_SCOPE_KEYS.includes(normalizeKey(value));
}

function getEffectiveComprasScope(permissoes = []) {
  const normalized = new Set(permissoes.map(normalizeKey));
  if (normalized.has('compras.escopo.todas')) return 'compras.escopo.todas';
  if (normalized.has('compras.escopo.setor')) return 'compras.escopo.setor';
  return COMPRAS_SCOPE_DEFAULT;
}

function normalizeMapa(input) {
  if (!input || typeof input !== 'object') return {};
  return Object.entries(input).reduce((acc, [userId, perms]) => {
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) return acc;

    const lista = Array.isArray(perms)
      ? [...new Set(perms.map(normalizeKey).filter(Boolean))]
      : [];

    if (lista.length) acc[id] = lista;
    return acc;
  }, {});
}

function normalizePadroes(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  return Object.entries(input).reduce((acc, [setorKey, perfis]) => {
    const key = String(setorKey || '').trim();
    if (!key || !perfis || typeof perfis !== 'object' || Array.isArray(perfis)) return acc;

    const normalizedPerfis = Object.entries(perfis).reduce((perfilAcc, [perfil, permissoes]) => {
      const perfilKey = normalizePerfil(perfil);
      if (!perfilKey) return perfilAcc;

      perfilAcc[perfilKey] = Array.isArray(permissoes)
        ? [...new Set(permissoes.map(normalizeKey).filter(Boolean))]
        : [];
      return perfilAcc;
    }, {});

    acc[key] = normalizedPerfis;
    return acc;
  }, {});
}

function sortUsuarios(lista = []) {
  return [...lista].sort((a, b) =>
    String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
  );
}

function isSetorObra(setor) {
  const tokens = [setor?.codigo, setor?.nome, setor?.slug]
    .map(normalizeToken)
    .filter(Boolean);

  return Boolean(setor?.eh_setor_obra) || tokens.some((token) => token === 'OBRA' || token.includes('OBRA'));
}

function getSetorPermissionKeys(usuario) {
  const values = [
    usuario?.setor_id,
    usuario?.setor?.id,
    usuario?.setor?.codigo,
    usuario?.setor?.nome
  ];

  return [...new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .flatMap((value) => [value, normalizeToken(value)])
      .filter(Boolean)
  )];
}

function getPermissoesPadraoUsuario(usuario, padroesSetorPerfil) {
  if (!usuario || !padroesSetorPerfil || typeof padroesSetorPerfil !== 'object') return [];

  const perfil = normalizePerfil(usuario?.perfil);
  const permissoes = [];

  getSetorPermissionKeys(usuario).forEach((setorKey) => {
    const perfis = padroesSetorPerfil[setorKey] || padroesSetorPerfil[normalizeToken(setorKey)];
    if (perfis?.[perfil]) {
      permissoes.push(...perfis[perfil]);
    }
  });

  if (isSetorObra(usuario?.setor)) {
    permissoes.push(PERMISSAO_SOLICITACOES_MINHAS);
  }

  return [...new Set(permissoes.map(normalizeKey).filter(Boolean))];
}

function isBypassAdmin(usuario) {
  const perfil = String(usuario?.perfil || '').trim().toUpperCase();
  return perfil === 'SUPERADMIN' || perfil === 'ADMINISTRADOR';
}

function BadgePerfil({ perfil }) {
  const token = String(perfil || '').toUpperCase();
  const colorClass =
    token === 'SUPERADMIN' ? 'bg-violet-100 text-violet-700' :
    token === 'ADMINISTRADOR' ? 'bg-sky-100 text-sky-700' :
    token === 'FINANCEIRO' ? 'bg-emerald-100 text-emerald-700' :
    'bg-slate-100 text-slate-600';

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colorClass}`}>
      {token || 'USUARIO'}
    </span>
  );
}

function CheckboxItem({ permissao, checked, onChange, disabled, origem, inputType = 'checkbox', inputName }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        disabled
          ? 'cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-canvas)] opacity-40'
          : checked
            ? 'border-[var(--c-primary)] bg-blue-50/60'
            : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-canvas)]'
      }`}
    >
      <input
        type={inputType}
        name={inputName}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-[var(--c-text)]">{permissao.label}</span>
        {permissao.descricao && (
          <span className="text-[11px] text-[var(--c-muted)]">{permissao.descricao}</span>
        )}
        {origem && (
          <span
            className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              origem === 'bloqueada'
                ? 'bg-rose-100 text-rose-700'
                : origem === 'individual'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {origem === 'bloqueada'
              ? 'Bloqueada neste usuario'
              : origem === 'individual'
                ? 'Permissao individual'
                : 'Padrao do setor/perfil'}
          </span>
        )}
        <span className="font-mono text-[10px] text-[var(--c-muted)] opacity-60">{permissao.key}</span>
      </span>
    </label>
  );
}

function ModuleGovernancePanel({ moduleEnabledMap }) {
  return (
    <div className="card sol-surface-card space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--c-text)]">Matriz modular relevante para permissao de area</h2>
          <p className="text-sm text-[var(--c-muted)]">
            Esta leitura mostra o impacto estrutural dos modulos que mais afetam o fluxo principal da instalacao.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] px-3 py-2 text-xs text-[var(--c-muted)]">
          A tela de permissao nao habilita modulo. Ela apenas restringe o que cada usuario pode operar nos modulos ativos.
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {MODULE_GOVERNANCE.map((item) => {
          const active = moduleEnabledMap.has(item.key) ? moduleEnabledMap.get(item.key) : true;

          return (
            <article
              key={item.key}
              className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
                    {item.role}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-[var(--c-text)]">{item.label}</h3>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {active ? 'Ativo' : 'Desabilitado'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs text-[var(--c-muted)]">
                <p><strong className="text-[var(--c-text)]">Relacao:</strong> {item.dependency}</p>
                <p><strong className="text-[var(--c-text)]">Usado em:</strong> {item.usedIn.join(' | ')}</p>
                <p><strong className="text-[var(--c-text)]">Ao desabilitar:</strong> {item.disabledEffect}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ModuleCard({
  grupo,
  governance,
  moduleEnabled,
  sessionIsSuperadmin,
  selectedUserIsBypassAdmin,
  permissoesUsuarioAtual,
  permissoesPadraoUsuarioAtual,
  permissoesIndividuaisUsuarioAtual,
  permissoesBloqueadasUsuarioAtual,
  areaExpandida,
  onToggleArea,
  onTogglePermissao,
  onSelectAll,
  onClearAll
}) {
  const todasChaves = grupo.areas.flatMap((area) => area.permissoes.map((perm) => perm.key));
  const marcadas = todasChaves.filter((key) => permissoesUsuarioAtual.includes(normalizeKey(key)));

  const statusLabel = moduleEnabled
    ? 'Disponivel na instalacao'
    : (sessionIsSuperadmin ? 'Modulo desligado' : 'Recurso indisponivel');

  return (
    <div className="card sol-surface-card overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-canvas)] px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[var(--c-text)]">{grupo.label}</span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                moduleEnabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--c-muted)]">{grupo.descricao}</p>
          {sessionIsSuperadmin && governance && (
            <p className="mt-1 text-[11px] text-[var(--c-muted)]">
              <strong className="text-[var(--c-text)]">Impacto operacional:</strong> {governance.disabledEffect}
            </p>
          )}
        </div>

        {selectedUserIsBypassAdmin ? (
          <span className="shrink-0 text-xs text-[var(--c-muted)]">Bypass total</span>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="tabular-nums text-[11px] text-[var(--c-muted)]">
              {marcadas.length}/{todasChaves.length}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm px-2 py-0.5 text-[11px]"
              onClick={onSelectAll}
            >
              Marcar tudo
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm px-2 py-0.5 text-[11px]"
              onClick={onClearAll}
            >
              Desmarcar
            </button>
          </div>
        )}
      </div>

      {!moduleEnabled && (
        <div className="border-b border-[var(--ui-border)] bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
          {sessionIsSuperadmin
            ? 'As permissoes deste modulo podem ser configuradas agora, mas so entram em vigor quando o modulo for habilitado na instalacao.'
            : 'Este recurso nao esta disponivel nesta instalacao. As permissoes podem ser deixadas preparadas, mas permanecem inativas ate a liberacao.'}
        </div>
      )}

      {!selectedUserIsBypassAdmin && (
        <div className="divide-y divide-[var(--ui-border)]">
          {grupo.areas.map((area) => {
            const aberta = areaExpandida === area.key;
            const areaEscopoCompras = area.key === 'compras.escopo';
            const escopoComprasAtivo = areaEscopoCompras
              ? getEffectiveComprasScope(permissoesUsuarioAtual)
              : null;
            const marcadasArea = area.permissoes.filter(
              (perm) => areaEscopoCompras
                ? normalizeKey(perm.key) === escopoComprasAtivo
                : permissoesUsuarioAtual.includes(normalizeKey(perm.key))
            ).length;

            return (
              <div key={area.key}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--ui-canvas)]"
                  onClick={() => onToggleArea(area.key)}
                >
                  <span className="text-[13px] font-semibold text-[var(--c-text)]">{area.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-[11px] text-[var(--c-muted)]">
                      {marcadasArea}/{area.permissoes.length}
                    </span>
                    <span className="text-[11px] text-[var(--c-muted)]">{aberta ? '▲' : '▼'}</span>
                  </div>
                </button>

                {aberta && (
                  <div className="grid gap-2 px-4 pb-3 sm:grid-cols-2">
                    {area.permissoes.map((perm) => {
                      const key = normalizeKey(perm.key);
                      const vemDoPadrao = permissoesPadraoUsuarioAtual.includes(key);
                      const individual = permissoesIndividuaisUsuarioAtual.includes(key);
                      const bloqueada = permissoesBloqueadasUsuarioAtual.includes(key);
                      return (
                        <CheckboxItem
                          key={perm.key}
                          permissao={perm}
                          checked={areaEscopoCompras ? key === escopoComprasAtivo : permissoesUsuarioAtual.includes(key)}
                          onChange={() => onTogglePermissao(perm.key)}
                          disabled={false}
                          origem={bloqueada ? 'bloqueada' : individual ? 'individual' : vemDoPadrao ? 'padrao' : ''}
                          inputType={areaEscopoCompras ? 'radio' : 'checkbox'}
                          inputName={areaEscopoCompras ? `compras-escopo-${normalizeKey(grupo.modulo)}` : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PermissoesAreas() {
  const { user, updateUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [mapa, setMapa] = useState({});
  const [bloqueiosMapa, setBloqueiosMapa] = useState({});
  const [padroesSetorPerfil, setPadroesSetorPerfil] = useState({});
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(null);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [areaExpandida, setAreaExpandida] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const sessionIsSuperadmin = useMemo(() => isSuperadmin(user), [user]);
  const moduleEnabledMap = useMemo(
    () => buildModuleEnabledMap(user?.modulos_habilitados),
    [user]
  );

  useEffect(() => {
    async function load() {
      setCarregando(true);
      try {
        const [listaUsuarios, configAtual, registroPerms] = await Promise.all([
          getUsuarios(),
          getPermissoesAreas(),
          getPermissoesAreasRegistry()
        ]);

        const ativos = Array.isArray(listaUsuarios)
          ? listaUsuarios.filter((item) => item?.ativo !== false)
          : [];

        setUsuarios(sortUsuarios(ativos));
        setMapa(normalizeMapa(configAtual?.usuarios));
        setBloqueiosMapa(normalizeMapa(configAtual?.usuarios_bloqueios));
        setPadroesSetorPerfil(normalizePadroes(configAtual?.padroes_setor_perfil));
        setRegistry(Array.isArray(registroPerms) ? registroPerms : []);
      } catch (err) {
        alert(err?.message || 'Erro ao carregar configuracoes de permissoes');
      } finally {
        setCarregando(false);
      }
    }

    load();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const filtro = String(filtroUsuario || '').trim().toLowerCase();
    if (!filtro) return usuarios;

    return usuarios.filter((item) => {
      const haystack = [item?.nome, item?.email, item?.perfil, item?.setor?.nome]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return haystack.includes(filtro);
    });
  }, [filtroUsuario, usuarios]);

  const usuarioSelecionado = useMemo(
    () => usuarios.find((item) => item.id === usuarioSelecionadoId) || null,
    [usuarios, usuarioSelecionadoId]
  );

  const selectedUserIsBypassAdmin = useMemo(() => {
    return isBypassAdmin(usuarioSelecionado);
  }, [usuarioSelecionado]);

  const permissoesIndividuaisUsuarioAtual = useMemo(() => {
    if (!usuarioSelecionadoId) return [];
    return mapa[usuarioSelecionadoId] || [];
  }, [mapa, usuarioSelecionadoId]);

  const permissoesBloqueadasUsuarioAtual = useMemo(() => {
    if (!usuarioSelecionadoId) return [];
    return bloqueiosMapa[usuarioSelecionadoId] || [];
  }, [bloqueiosMapa, usuarioSelecionadoId]);

  const permissoesPadraoUsuarioAtual = useMemo(() => {
    if (!usuarioSelecionado) return [];
    return getPermissoesPadraoUsuario(usuarioSelecionado, padroesSetorPerfil);
  }, [padroesSetorPerfil, usuarioSelecionado]);

  const permissoesUsuarioAtual = useMemo(() => {
    const bloqueadas = new Set(permissoesBloqueadasUsuarioAtual);
    return [...new Set([...permissoesPadraoUsuarioAtual, ...permissoesIndividuaisUsuarioAtual])]
      .filter((key) => !bloqueadas.has(key));
  }, [permissoesBloqueadasUsuarioAtual, permissoesIndividuaisUsuarioAtual, permissoesPadraoUsuarioAtual]);

  function setUserList(setter, userId, updater) {
    setter((current) => {
      const listaAtual = current[userId] || [];
      const proximaLista = [...new Set(updater(listaAtual).map(normalizeKey).filter(Boolean))];
      const next = { ...current };

      if (proximaLista.length) {
        next[userId] = proximaLista;
      } else {
        delete next[userId];
      }

      return next;
    });
  }

  function togglePermissao(permKey) {
    const id = usuarioSelecionadoId;
    if (!id) return;

    const normalizedKey = normalizeKey(permKey);
    const vemDoPadrao = permissoesPadraoUsuarioAtual.includes(normalizedKey);
    const estaBloqueada = permissoesBloqueadasUsuarioAtual.includes(normalizedKey);

    if (isComprasScopeKey(normalizedKey)) {
      const escopoAtual = getEffectiveComprasScope(permissoesUsuarioAtual);
      if (escopoAtual === normalizedKey) return;

      const padrao = new Set(permissoesPadraoUsuarioAtual);
      setUserList(setMapa, id, (lista) => [
        ...lista.filter((item) => !isComprasScopeKey(item)),
        ...(padrao.has(normalizedKey) ? [] : [normalizedKey])
      ]);
      setUserList(setBloqueiosMapa, id, (lista) => [
        ...lista.filter((item) => !isComprasScopeKey(item)),
        ...COMPRAS_SCOPE_KEYS.filter((key) => key !== normalizedKey && padrao.has(key))
      ]);
      return;
    }

    if (vemDoPadrao) {
      setUserList(setBloqueiosMapa, id, (lista) =>
        estaBloqueada ? lista.filter((item) => item !== normalizedKey) : [...lista, normalizedKey]
      );
      setUserList(setMapa, id, (lista) => lista.filter((item) => item !== normalizedKey));
      return;
    }

    setUserList(setMapa, id, (lista) =>
      lista.includes(normalizedKey)
        ? lista.filter((item) => item !== normalizedKey)
        : [...lista, normalizedKey]
    );
    setUserList(setBloqueiosMapa, id, (lista) => lista.filter((item) => item !== normalizedKey));
  }

  function toggleArea(areaKey) {
    setAreaExpandida((current) => (current === areaKey ? null : areaKey));
  }

  function selecionarTudoModulo(grupo) {
    if (!usuarioSelecionadoId || selectedUserIsBypassAdmin) return;

    const chavesOriginais = grupo.areas.flatMap((area) => area.permissoes.map((perm) => normalizeKey(perm.key)));
    const possuiEscopoCompras = chavesOriginais.some(isComprasScopeKey);
    const chaves = possuiEscopoCompras
      ? [...chavesOriginais.filter((key) => !isComprasScopeKey(key)), COMPRAS_SCOPE_SELECT_ALL]
      : chavesOriginais;
    const padrao = new Set(permissoesPadraoUsuarioAtual);
    setUserList(setMapa, usuarioSelecionadoId, (lista) => [
      ...lista.filter((key) => !possuiEscopoCompras || !isComprasScopeKey(key)),
      ...chaves.filter((key) => !padrao.has(key))
    ]);
    setUserList(setBloqueiosMapa, usuarioSelecionadoId, (lista) =>
      [
        ...lista.filter((item) => !chaves.includes(item) && (!possuiEscopoCompras || !isComprasScopeKey(item))),
        ...(possuiEscopoCompras
          ? COMPRAS_SCOPE_KEYS.filter((key) => key !== COMPRAS_SCOPE_SELECT_ALL && padrao.has(key))
          : [])
      ]
    );
  }

  function desmarcarTudoModulo(grupo) {
    if (!usuarioSelecionadoId || selectedUserIsBypassAdmin) return;

    const removidas = new Set(
      grupo.areas.flatMap((area) => area.permissoes.map((perm) => normalizeKey(perm.key)))
    );

    const padrao = new Set(permissoesPadraoUsuarioAtual);
    setUserList(setMapa, usuarioSelecionadoId, (lista) => lista.filter((item) => !removidas.has(item)));
    setUserList(setBloqueiosMapa, usuarioSelecionadoId, (lista) => [
      ...lista.filter((item) => !removidas.has(item)),
      ...Array.from(removidas).filter((key) => padrao.has(key))
    ]);
  }

  async function salvar() {
    try {
      setSalvando(true);
      const resultado = await salvarPermissoesAreas({
        usuarios: mapa,
        usuarios_bloqueios: bloqueiosMapa
      });
      const persistedMap = normalizeMapa(resultado?.usuarios);
      const persistedBlocks = normalizeMapa(resultado?.usuarios_bloqueios);
      setMapa(persistedMap);
      setBloqueiosMapa(persistedBlocks);
      if (Number(usuarioSelecionadoId) === Number(user?.id)) {
        const padroesUsuario = getPermissoesPadraoUsuario(usuarioSelecionado, normalizePadroes(resultado?.padroes_setor_perfil));
        const bloqueadas = new Set(persistedBlocks[usuarioSelecionadoId] || []);
        updateUser({
          areas_permissoes: [...new Set([...padroesUsuario, ...(persistedMap[usuarioSelecionadoId] || [])])]
            .filter((key) => !bloqueadas.has(key))
        });
      }
      alert('Permissoes salvas com sucesso.');
    } catch (err) {
      alert(err?.message || 'Erro ao salvar permissoes');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Permissoes adicionais por Usuario</h1>
            <p className="page-subtitle">
              Adicione excecoes individuais acima do padrao por setor e perfil. SUPERADMIN e ADMINISTRADOR seguem
              com bypass total e nao sao afetados por esta configuracao.
            </p>
          </div>
          <div className="app-page-actions">
            <a href="/permissoes-areas-padroes" className="btn btn-outline btn-sm">
              Padroes por setor/perfil
            </a>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={salvar}
              disabled={salvando || carregando}
            >
              {salvando ? 'Salvando...' : 'Salvar permissoes'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <strong>Como funciona:</strong> esta tela mostra o acesso efetivo do usuario: padrao do setor/perfil,
        permissoes individuais extras e bloqueios individuais. Se uma permissao herdada for desmarcada aqui,
        ela fica bloqueada apenas para este usuario.
      </div>

      {sessionIsSuperadmin ? (
        <ModuleGovernancePanel moduleEnabledMap={moduleEnabledMap} />
      ) : (
        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--c-muted)]">
          <strong className="text-[var(--c-text)]">Leitura operacional:</strong> esta tela controla apenas o que cada
          usuario pode operar nos recursos disponiveis nesta instalacao. Se algum recurso ainda nao estiver disponivel,
          as permissoes podem ser deixadas prontas aqui, mas permanecem inativas ate a liberacao.
        </div>
      )}

      {carregando ? (
        <div className="app-empty-card">Carregando...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <div className="card sol-surface-card self-start space-y-3 lg:sticky lg:top-4">
            <input
              className="input input-sm w-full"
              placeholder="Buscar usuario..."
              value={filtroUsuario}
              onChange={(event) => setFiltroUsuario(event.target.value)}
            />

            <div className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">
              {usuariosFiltrados.length} usuario(s)
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {usuariosFiltrados.map((item) => {
                const extras = mapa[item.id] || [];
                const bloqueios = bloqueiosMapa[item.id] || [];
                const padroes = getPermissoesPadraoUsuario(item, padroesSetorPerfil);
                const qPerms = [...new Set([...padroes, ...extras])].filter((key) => !bloqueios.includes(key)).length;
                const perfil = String(item.perfil || '').toUpperCase();
                const ehBypass = perfil === 'SUPERADMIN' || perfil === 'ADMINISTRADOR';
                const ativo = item.id === usuarioSelecionadoId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      ativo
                        ? 'bg-[var(--c-primary)] text-white'
                        : 'text-[var(--c-text)] hover:bg-[var(--ui-canvas)]'
                    }`}
                    onClick={() => {
                      setUsuarioSelecionadoId(item.id);
                      setAreaExpandida(null);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{item.nome}</span>
                      {ehBypass ? (
                        <span className={`shrink-0 text-[10px] ${ativo ? 'text-white/70' : 'text-[var(--c-muted)]'}`}>
                          bypass
                        </span>
                      ) : qPerms > 0 ? (
                        <span className={`shrink-0 tabular-nums text-[10px] ${ativo ? 'text-white/80' : 'text-[var(--c-primary)]'}`}>
                          {qPerms} perm.
                        </span>
                      ) : null}
                    </div>

                    <div className={`mt-0.5 flex items-center gap-2 ${ativo ? 'text-white/70' : 'text-[var(--c-muted)]'}`}>
                      <span className="truncate text-[11px]">{item.setor?.nome || 'Sem setor'}</span>
                      <BadgePerfil perfil={item.perfil} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {!usuarioSelecionado ? (
              <div className="app-empty-card">
                <p className="text-sm text-[var(--c-muted)]">Selecione um usuario para configurar as permissoes.</p>
              </div>
            ) : (
              <>
                <div className="card sol-surface-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[var(--c-text)]">{usuarioSelecionado.nome}</h2>
                      <p className="text-sm text-[var(--c-muted)]">{usuarioSelecionado.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <BadgePerfil perfil={usuarioSelecionado.perfil} />
                        <span className="text-[11px] text-[var(--c-muted)]">
                          {usuarioSelecionado.setor?.nome || 'Sem setor'}
                        </span>
                      </div>
                    </div>

                    {selectedUserIsBypassAdmin ? (
                      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] text-violet-700">
                        Bypass total: este perfil nao e afetado por permissoes de area.
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-[11px] text-[var(--c-muted)]">Permissoes configuradas</div>
                        <div className="tabular-nums text-2xl font-black leading-tight text-[var(--c-primary)]">
                          {permissoesUsuarioAtual.length}
                        </div>
                        <div className="text-[10px] text-[var(--c-muted)]">
                          {permissoesPadraoUsuarioAtual.length} padrao | {permissoesIndividuaisUsuarioAtual.length} individual | {permissoesBloqueadasUsuarioAtual.length} bloqueada(s)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {registry.map((grupo) => {
                  const moduloKey = String(grupo.modulo || '').trim().toUpperCase();
                  const moduleEnabled = moduleEnabledMap.has(moduloKey) ? moduleEnabledMap.get(moduloKey) : true;
                  const governance = getModuleGovernance(moduloKey);

                  return (
                    <ModuleCard
                      key={grupo.modulo}
                      grupo={grupo}
                      governance={governance}
                      moduleEnabled={moduleEnabled}
                      sessionIsSuperadmin={sessionIsSuperadmin}
                      selectedUserIsBypassAdmin={selectedUserIsBypassAdmin}
                      permissoesUsuarioAtual={permissoesUsuarioAtual}
                      permissoesPadraoUsuarioAtual={permissoesPadraoUsuarioAtual}
                      permissoesIndividuaisUsuarioAtual={permissoesIndividuaisUsuarioAtual}
                      permissoesBloqueadasUsuarioAtual={permissoesBloqueadasUsuarioAtual}
                      areaExpandida={areaExpandida}
                      onToggleArea={toggleArea}
                      onTogglePermissao={togglePermissao}
                      onSelectAll={() => selecionarTudoModulo(grupo)}
                      onClearAll={() => desmarcarTudoModulo(grupo)}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
