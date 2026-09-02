import { useEffect, useMemo, useState } from 'react';
import { getUsuarios } from '../services/usuarios';
import {
  getUsuariosPermissoesRhDp,
  salvarUsuariosPermissoesRhDp
} from '../services/configuracoesSistema';
import { RH_DP_PERMISSION_GROUPS, normalizeRhDpPermissionList } from '../constants/rhDpPermissions';

function normalizePermissionMap(input) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.entries(source).reduce((acc, [userId, permissions]) => {
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      return acc;
    }

    const normalized = normalizeRhDpPermissionList(permissions);
    if (!normalized.length) {
      return acc;
    }

    acc[id] = normalized;
    return acc;
  }, {});
}

function sortUsuarios(lista = []) {
  return [...lista].sort((a, b) =>
    String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
  );
}

function perfilLabel(usuario) {
  return String(usuario?.perfil || '').trim().toUpperCase() || 'USUARIO';
}

function setorLabel(usuario) {
  return String(usuario?.setor?.nome || '-').trim().toUpperCase();
}

export default function UsuariosPermissoesRhDp() {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function load() {
      const [listaUsuarios, config] = await Promise.all([
        getUsuarios(),
        getUsuariosPermissoesRhDp()
      ]);

      const ativos = Array.isArray(listaUsuarios)
        ? listaUsuarios.filter((usuario) => usuario?.ativo !== false)
        : [];

      setUsuarios(sortUsuarios(ativos));
      setSelecionados(normalizePermissionMap(config?.usuarios));
    }

    load().catch((error) => {
      console.error(error);
      alert(error?.message || 'Erro ao carregar permissoes do RH/DP');
    });
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const query = String(filtro || '').trim().toLowerCase();
    if (!query) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const haystack = [
        usuario?.nome,
        usuario?.email,
        usuario?.perfil,
        usuario?.setor?.nome
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');

      return haystack.includes(query);
    });
  }, [filtro, usuarios]);

  function togglePermission(userId, permissionKey) {
    const normalizedKey = String(permissionKey || '').trim().toLowerCase();
    const id = Number(userId);

    setSelecionados((current) => {
      const currentList = normalizeRhDpPermissionList(current[id] || []);
      const nextList = currentList.includes(normalizedKey)
        ? currentList.filter((item) => item !== normalizedKey)
        : [...currentList, normalizedKey];

      const next = { ...current };
      if (nextList.length) {
        next[id] = nextList;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      const payload = {
        usuarios: Object.entries(selecionados).reduce((acc, [userId, permissions]) => {
          const normalized = normalizeRhDpPermissionList(permissions);
          if (normalized.length) {
            acc[userId] = normalized;
          }
          return acc;
        }, {})
      };

      const response = await salvarUsuariosPermissoesRhDp(payload);
      setSelecionados(normalizePermissionMap(response?.usuarios));
      alert('Permissoes do RH/DP salvas com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar permissoes do RH/DP');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page solicitacoes-page rhdp-page space-y-6">
      <div>
        <h1 className="page-title">Permissoes RH/DP por usuario</h1>
        <p className="page-subtitle mt-1">
          Monte usuarios de RH e contabilidade sem criar perfil hardcoded novo. O `ADMINISTRADOR` define exatamente
          quais areas do RH/DP cada usuario pode operar.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          `SUPERADMIN` e `ADMINISTRADOR` continuam com bypass total. Esta tela serve para liberar acessos granulares
          aos demais usuarios, inclusive contabilidade com escopo parcial.
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
          <input
            className="form-control"
            placeholder="Buscar por nome, email, perfil ou setor"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Usuarios configurados: <strong className="text-slate-900">{Object.keys(selecionados).length}</strong>
          </div>
        </div>

        <div className="space-y-6">
          {usuariosFiltrados.map((usuario) => {
            const currentPermissions = normalizeRhDpPermissionList(selecionados[Number(usuario.id)] || []);

            return (
              <section key={usuario.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{usuario.nome}</h2>
                    <p className="text-sm text-slate-500">
                      {usuario.email} | {perfilLabel(usuario)} | {setorLabel(usuario)}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                    {currentPermissions.length} permissao(oes)
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {RH_DP_PERMISSION_GROUPS.map((group) => (
                    <div key={group.key} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{group.label}</h3>
                      <div className="mt-3 space-y-3">
                        {(group.permissions || []).map((permission) => {
                          const permissionKey = permission?.key || permission;
                          const permissionLabel = permission?.label || permissionKey;
                          const permissionDescription = permission?.description || '';
                          const checked = currentPermissions.includes(String(permissionKey).toLowerCase());

                          return (
                            <label key={permissionKey} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(usuario.id, permissionKey)}
                              />
                              <span className="flex flex-col gap-1">
                                <span className="font-medium text-slate-900">{permissionLabel}</span>
                                <span className="text-slate-500">{permissionDescription}</span>
                                <span className="text-xs text-slate-500">{permissionKey}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {!usuariosFiltrados.length && (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              Nenhum usuario encontrado para o filtro atual.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar matriz de permissoes'}
          </button>
        </div>
      </div>
    </div>
  );
}
