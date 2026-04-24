import { useEffect, useMemo, useState } from 'react';
import { getUsuarios } from '../services/usuarios';
import {
  getUsuariosAcessoFinanceiro,
  salvarUsuariosAcessoFinanceiro
} from '../services/configuracoesSistema';

function hasFinanceiroBaseAccess(usuario) {
  const perfil = String(usuario?.perfil || '').trim().toUpperCase();
  if (perfil === 'SUPERADMIN' || perfil === 'ADMINISTRADOR' || perfil === 'FINANCEIRO') {
    return true;
  }

  return Boolean(usuario?.setor?.eh_setor_financeiro);
}

export default function UsuariosAcessoFinanceiro() {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      const [listaUsuarios, cfg] = await Promise.all([
        getUsuarios(),
        getUsuariosAcessoFinanceiro()
      ]);

      const usuariosAtivos = Array.isArray(listaUsuarios)
        ? listaUsuarios.filter((usuario) => usuario?.ativo !== false)
        : [];
      setUsuarios(usuariosAtivos);

      const listaCfg = Array.isArray(cfg?.usuarios) ? cfg.usuarios : [];
      setSelecionados(new Set(listaCfg.map((item) => Number(item))));
    }

    load();
  }, []);

  const usuariosOrdenados = useMemo(() => (
    [...usuarios].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
    )
  ), [usuarios]);

  function alternarUsuario(usuarioId) {
    const key = Number(usuarioId);
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

  async function salvar() {
    try {
      setSalvando(true);
      await salvarUsuariosAcessoFinanceiro({ usuarios: Array.from(selecionados) });
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configuracao.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">Acesso ao financeiro por usuario</h1>
        <p className="page-subtitle mt-1">
          Marque usuarios extras que devem acessar o modulo financeiro.
          Usuarios liberados aqui tambem passam a operar o financeiro com acesso a todas as obras.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Perfis SUPERADMIN, ADMINISTRADOR, perfil FINANCEIRO e usuarios de setor financeiro
          ja possuem acesso por regra base, mesmo sem marcacao nesta tela.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {usuariosOrdenados.map((usuario) => {
            const marcado = selecionados.has(Number(usuario.id));
            const acessoBase = hasFinanceiroBaseAccess(usuario);
            const setorNome = String(usuario?.setor?.nome || '-').toUpperCase();

            return (
              <label key={usuario.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternarUsuario(usuario.id)}
                />
                <span className="flex flex-col gap-1">
                  <span className="font-medium text-slate-900">
                    {usuario.nome}
                  </span>
                  <span className="text-slate-600">
                    {usuario.email} | {setorNome} | {String(usuario?.perfil || '').toUpperCase()}
                  </span>
                  {acessoBase ? (
                    <span className="text-xs font-medium text-emerald-700">
                      Ja possui acesso por perfil/setor
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
