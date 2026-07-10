import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUsuarios } from '../services/usuarios';
import { getSetores } from '../services/setores';
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

const PERMISSAO_SOLICITACOES_MINHAS = 'solicitacoes.lista.visualizar_minhas';
const COMPRAS_SCOPE_KEYS = [
  'compras.escopo.minhas_atribuidas',
  'compras.escopo.setor',
  'compras.escopo.todas'
];
const COMPRAS_SCOPE_DEFAULT = 'compras.escopo.minhas_atribuidas';
const COMPRAS_SCOPE_SELECT_ALL = 'compras.escopo.setor';
const PERFIS_BASE = ['USUARIO', 'ESTAGIARIO', 'ADMINISTRADOR', 'FINANCEIRO', 'COMPRAS', 'RH_DP', 'DIRETORIA', 'ENGENHEIRO'];

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePerfil(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
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

function sortByName(lista = []) {
  return [...lista].sort((a, b) =>
    String(a?.nome || a?.label || '').localeCompare(String(b?.nome || b?.label || ''), 'pt-BR', {
      sensitivity: 'base'
    })
  );
}

function isSetorObra(setor) {
  const tokens = [setor?.codigo, setor?.nome, setor?.slug, setor?.id]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean);

  return Boolean(setor?.eh_setor_obra) || tokens.some((token) => token === 'OBRA' || token.includes('OBRA'));
}

function getSetorId(setor) {
  return setor?.id ? String(setor.id) : '';
}

function uniq(lista = []) {
  return [...new Set(lista.filter(Boolean))];
}

function CheckboxPermissao({ permissao, checked, disabled, onChange, inputType = 'checkbox', inputName }) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        disabled
          ? 'cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-canvas)] opacity-70'
          : checked
            ? 'border-[var(--c-primary)] bg-blue-50/70'
            : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-canvas)]'
      }`}
    >
      <input
        type={inputType}
        name={inputName}
        className="mt-0.5 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-[var(--c-text)]">{permissao.label}</span>
        {permissao.descricao && (
          <span className="text-[11px] text-[var(--c-muted)]">{permissao.descricao}</span>
        )}
        <span className="font-mono text-[10px] text-[var(--c-muted)] opacity-60">{permissao.key}</span>
        {disabled && (
          <span className="text-[11px] font-semibold text-emerald-700">
            Padrao obrigatorio para setor OBRA
          </span>
        )}
      </span>
    </label>
  );
}

function ModuleCard({
  grupo,
  governance,
  moduleEnabled,
  permissoesAtuais,
  permissoesObrigatorias,
  onTogglePermissao,
  onSelectAll,
  onClearAll
}) {
  const allKeys = grupo.areas.flatMap((area) => area.permissoes.map((perm) => normalizeKey(perm.key)));
  const checkedCount = allKeys.filter((key) => permissoesAtuais.includes(key) || permissoesObrigatorias.includes(key)).length;

  return (
    <section className="card sol-surface-card overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-canvas)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--c-text)]">{grupo.label}</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                moduleEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {moduleEnabled ? 'Modulo ativo' : 'Modulo desabilitado'}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--c-muted)]">{grupo.descricao}</p>
          {governance && (
            <p className="mt-1 text-[11px] text-[var(--c-muted)]">
              <strong className="text-[var(--c-text)]">Impacto:</strong> {governance.disabledEffect}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--ui-surface)] px-3 py-1 text-xs font-semibold text-[var(--c-muted)]">
            {checkedCount}/{allKeys.length}
          </span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onSelectAll(allKeys)}>
            Marcar tudo
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onClearAll(allKeys)}>
            Desmarcar
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {grupo.areas.map((area) => {
          const areaEscopoCompras = area.key === 'compras.escopo';
          const escopoComprasAtivo = areaEscopoCompras ? getEffectiveComprasScope(permissoesAtuais) : null;
          return (
          <div key={area.key} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] p-3">
            <div className="mb-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--c-muted)]">{area.label}</h3>
              {area.descricao && <p className="mt-1 text-xs text-[var(--c-muted)]">{area.descricao}</p>}
            </div>
            <div className="grid gap-2 xl:grid-cols-2">
              {area.permissoes.map((permissao) => {
                const key = normalizeKey(permissao.key);
                const obrigatoria = permissoesObrigatorias.includes(key);
                return (
                  <CheckboxPermissao
                    key={permissao.key}
                    permissao={permissao}
                    checked={areaEscopoCompras ? key === escopoComprasAtivo : permissoesAtuais.includes(key) || obrigatoria}
                    disabled={obrigatoria}
                    onChange={() => onTogglePermissao(key)}
                    inputType={areaEscopoCompras ? 'radio' : 'checkbox'}
                    inputName={areaEscopoCompras ? 'compras-escopo-padrao' : undefined}
                  />
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}

export default function PermissoesAreasPadroes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [setores, setSetores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [padroes, setPadroes] = useState({});
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [perfilSelecionado, setPerfilSelecionado] = useState('USUARIO');

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro('');
        const [setoresRes, usuariosRes, configRes, registryRes] = await Promise.all([
          getSetores(),
          getUsuarios(),
          getPermissoesAreas(),
          getPermissoesAreasRegistry()
        ]);

        const setoresAtivos = sortByName(Array.isArray(setoresRes) ? setoresRes.filter((setor) => setor?.ativo !== false) : []);
        const usuariosAtivos = Array.isArray(usuariosRes) ? usuariosRes.filter((usuario) => usuario?.ativo !== false) : [];

        setSetores(setoresAtivos);
        setUsuarios(usuariosAtivos);
        setRegistry(Array.isArray(registryRes) ? registryRes : []);
        setPadroes(normalizePadroes(configRes?.padroes_setor_perfil));

        if (!setorSelecionado && setoresAtivos.length) {
          setSetorSelecionado(getSetorId(setoresAtivos[0]));
        }
      } catch (error) {
        console.error(error);
        setErro('Nao foi possivel carregar as permissoes padrao.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const perfisDisponiveis = useMemo(() => {
    const perfisUsuarios = usuarios.map((usuario) => normalizePerfil(usuario?.perfil));
    return uniq([...PERFIS_BASE, ...perfisUsuarios]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [usuarios]);

  const setorAtual = useMemo(
    () => setores.find((setor) => getSetorId(setor) === String(setorSelecionado)),
    [setores, setorSelecionado]
  );

  const moduleEnabledMap = useMemo(() => {
    const source = registry?.module_settings || registry;
    return buildModuleEnabledMap(source);
  }, [registry]);

  const permissoesObrigatorias = useMemo(() => {
    return isSetorObra(setorAtual) ? [PERMISSAO_SOLICITACOES_MINHAS] : [];
  }, [setorAtual]);

  const permissoesAtuais = useMemo(() => {
    const lista = padroes[String(setorSelecionado)]?.[perfilSelecionado] || [];
    return uniq([...lista.map(normalizeKey), ...permissoesObrigatorias]);
  }, [padroes, perfilSelecionado, setorSelecionado, permissoesObrigatorias]);

  function updatePermissoes(nextList) {
    setPadroes((current) => ({
      ...current,
      [String(setorSelecionado)]: {
        ...(current[String(setorSelecionado)] || {}),
        [perfilSelecionado]: uniq([...nextList.map(normalizeKey), ...permissoesObrigatorias])
      }
    }));
  }

  function togglePermissao(key) {
    const normalized = normalizeKey(key);
    if (permissoesObrigatorias.includes(normalized)) return;

    if (isComprasScopeKey(normalized)) {
      const atual = getEffectiveComprasScope(permissoesAtuais);
      if (atual === normalized) return;
      updatePermissoes([
        ...permissoesAtuais.filter((item) => !isComprasScopeKey(item)),
        normalized
      ]);
      return;
    }

    if (permissoesAtuais.includes(normalized)) {
      updatePermissoes(permissoesAtuais.filter((item) => item !== normalized));
      return;
    }

    updatePermissoes([...permissoesAtuais, normalized]);
  }

  function selectAll(keys) {
    const normalizedKeys = keys.map(normalizeKey);
    const possuiEscopoCompras = normalizedKeys.some(isComprasScopeKey);
    updatePermissoes(uniq([
      ...permissoesAtuais.filter((key) => !possuiEscopoCompras || !isComprasScopeKey(key)),
      ...normalizedKeys.filter((key) => !isComprasScopeKey(key)),
      ...(possuiEscopoCompras ? [COMPRAS_SCOPE_SELECT_ALL] : [])
    ]));
  }

  function clearAll(keys) {
    const removable = new Set(keys.map(normalizeKey).filter((key) => !permissoesObrigatorias.includes(key)));
    updatePermissoes(permissoesAtuais.filter((key) => !removable.has(key)));
  }

  async function salvar() {
    try {
      setSaving(true);
      setErro('');
      const resultado = await salvarPermissoesAreas({ padroes_setor_perfil: padroes });
      setPadroes(normalizePadroes(resultado?.padroes_setor_perfil));
      alert('Permissoes padrao por setor e perfil salvas.');
    } catch (error) {
      console.error(error);
      setErro('Nao foi possivel salvar as permissoes padrao.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell space-y-6">
      <header className="surface-card flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
            Configuracoes
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--c-text)]">Permissoes por Setor e Perfil</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--c-muted)]">
            Defina a matriz padrao para todos os usuarios de um setor e perfil. Permissoes adicionais continuam
            sendo configuradas por usuario na tela granular existente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/permissoes-areas" className="btn btn-outline">
            Excecoes por usuario
          </Link>
          <button type="button" className="btn btn-primary" onClick={salvar} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar padroes'}
          </button>
        </div>
      </header>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      <section className="card sol-surface-card space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,280px)_auto] lg:items-end">
          <label className="form-field">
            <span>Setor</span>
            <select value={setorSelecionado} onChange={(event) => setSetorSelecionado(event.target.value)}>
              {setores.map((setor) => (
                <option key={setor.id} value={getSetorId(setor)}>
                  {setor.nome || setor.codigo || `Setor ${setor.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Perfil</span>
            <select value={perfilSelecionado} onChange={(event) => setPerfilSelecionado(normalizePerfil(event.target.value))}>
              {perfisDisponiveis.map((perfil) => (
                <option key={perfil} value={perfil}>
                  {perfil}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] px-4 py-3 text-sm text-[var(--c-muted)]">
            <strong className="text-[var(--c-text)]">{permissoesAtuais.length}</strong> permissao(oes) no padrao atual
          </div>
        </div>

        {isSetorObra(setorAtual) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Setor OBRA recebe automaticamente a permissao para ver suas proprias solicitacoes e solicitacoes das obras
            vinculadas ao usuario, sem liberar todas as solicitacoes do setor.
          </div>
        )}
      </section>

      {loading ? (
        <div className="card sol-surface-card text-sm text-[var(--c-muted)]">Carregando permissoes...</div>
      ) : (
        <div className="grid gap-4">
          {registry.map((grupo) => (
            <ModuleCard
              key={grupo.key}
              grupo={grupo}
              governance={getModuleGovernance(grupo.key)}
              moduleEnabled={moduleEnabledMap.has(grupo.key) ? moduleEnabledMap.get(grupo.key) : true}
              permissoesAtuais={permissoesAtuais}
              permissoesObrigatorias={permissoesObrigatorias}
              onTogglePermissao={togglePermissao}
              onSelectAll={selectAll}
              onClearAll={clearAll}
            />
          ))}
        </div>
      )}

      <section className="card sol-surface-card space-y-4">
        <h2 className="text-base font-semibold text-[var(--c-text)]">Resumo dos modulos</h2>
        <div className="grid gap-3 xl:grid-cols-2">
          {MODULE_GOVERNANCE.map((item) => {
            const active = moduleEnabledMap.has(item.key) ? moduleEnabledMap.get(item.key) : true;
            return (
              <article key={item.key} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
                      {item.role}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-[var(--c-text)]">{item.label}</h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {active ? 'Ativo' : 'Desabilitado'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--c-muted)]">{item.dependency}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
