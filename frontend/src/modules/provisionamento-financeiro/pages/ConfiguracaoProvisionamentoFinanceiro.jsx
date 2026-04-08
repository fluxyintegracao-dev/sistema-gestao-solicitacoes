import { useEffect, useMemo, useState } from 'react';
import { getObras } from '../../../services/obras';
import { getSetores } from '../../../services/setores';
import { getUsuarios } from '../../../services/usuarios';
import {
  getProvisionamentoFinanceiroPermissoes,
  salvarProvisionamentoFinanceiroPermissoes
} from '../../../services/provisoesFinanceiras';

const PERFIS_OPCOES = [
  { value: 'SUPERADMIN', label: 'SUPERADMIN' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'USUARIO', label: 'USUARIO' }
];

function criarRegraVazia() {
  return {
    id: `nova-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    escopo_tipo: 'USUARIO',
    escopo_valor: '',
    escopo_valores: [],
    pode_acessar: false,
    pode_criar: false,
    pode_aprovar: false,
    pode_dashboard_global: false,
    obra_ids: []
  };
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function compararTexto(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', {
    sensitivity: 'base'
  });
}

function ordenarValoresEscopo(lista) {
  return [...new Set((Array.isArray(lista) ? lista : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))].sort((a, b) => {
      const numeroA = Number(a);
      const numeroB = Number(b);
      if (Number.isInteger(numeroA) && Number.isInteger(numeroB)) {
        return numeroA - numeroB;
      }
      return compararTexto(a, b);
    });
}

function normalizarListaObraIds(lista) {
  return [...new Set((Array.isArray(lista) ? lista : [])
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0))];
}

function formatarObra(obra) {
  const codigo = String(obra?.codigo || '').trim();
  const nome = String(obra?.nome || '').trim();
  if (codigo && nome) return `${codigo} - ${nome}`;
  return codigo || nome || `Obra ${obra?.id}`;
}

function obterUsuariosSelecionados(regra) {
  const valores = regra?.escopo_tipo === 'USUARIO'
    ? (Array.isArray(regra?.escopo_valores) && regra.escopo_valores.length > 0
      ? regra.escopo_valores
      : [regra?.escopo_valor])
    : [];

  return ordenarValoresEscopo(valores);
}

function consolidarRegras(regras) {
  const mapa = new Map();

  (Array.isArray(regras) ? regras : []).forEach((regra) => {
    const escopoTipo = String(regra?.escopo_tipo || '').trim();
    if (!escopoTipo) {
      return;
    }

    const obraIds = normalizarListaObraIds(regra?.obra_ids);

    if (escopoTipo === 'USUARIO') {
      const usuariosSelecionados = obterUsuariosSelecionados(regra);
      if (usuariosSelecionados.length === 0) {
        return;
      }

      const chave = [
        escopoTipo,
        Boolean(regra?.pode_acessar),
        Boolean(regra?.pode_criar),
        Boolean(regra?.pode_aprovar),
        Boolean(regra?.pode_dashboard_global),
        obraIds.slice().sort((a, b) => a - b).join(',')
      ].join('::');

      const atual = mapa.get(chave);
      if (!atual) {
        mapa.set(chave, {
          ...regra,
          escopo_tipo: escopoTipo,
          escopo_valor: usuariosSelecionados.length === 1 ? usuariosSelecionados[0] : '',
          escopo_valores: usuariosSelecionados,
          pode_acessar: Boolean(regra?.pode_acessar),
          pode_criar: Boolean(regra?.pode_criar),
          pode_aprovar: Boolean(regra?.pode_aprovar),
          pode_dashboard_global: Boolean(regra?.pode_dashboard_global),
          obra_ids: obraIds
        });
        return;
      }

      mapa.set(chave, {
        ...atual,
        escopo_valores: ordenarValoresEscopo([
          ...obterUsuariosSelecionados(atual),
          ...usuariosSelecionados
        ]),
        escopo_valor: ''
      });
      return;
    }

    const escopoValor = String(regra?.escopo_valor || '').trim();
    if (!escopoValor) {
      return;
    }

    const chave = `${escopoTipo}::${escopoValor}`;
    const atual = mapa.get(chave);

    if (!atual) {
      mapa.set(chave, {
        ...regra,
        escopo_tipo: escopoTipo,
        escopo_valor: escopoValor,
        escopo_valores: [],
        pode_acessar: Boolean(regra?.pode_acessar),
        pode_criar: Boolean(regra?.pode_criar),
        pode_aprovar: Boolean(regra?.pode_aprovar),
        pode_dashboard_global: Boolean(regra?.pode_dashboard_global),
        obra_ids: obraIds
      });
      return;
    }

    mapa.set(chave, {
      ...atual,
      pode_acessar: Boolean(atual.pode_acessar) || Boolean(regra?.pode_acessar),
      pode_criar: Boolean(atual.pode_criar) || Boolean(regra?.pode_criar),
      pode_aprovar: Boolean(atual.pode_aprovar) || Boolean(regra?.pode_aprovar),
      pode_dashboard_global: Boolean(atual.pode_dashboard_global) || Boolean(regra?.pode_dashboard_global),
      obra_ids: normalizarListaObraIds([...(atual.obra_ids || []), ...obraIds])
    });
  });

  return Array.from(mapa.values());
}

function obterOpcoesEscopo(escopoTipo, { usuarios, setores }) {
  if (escopoTipo === 'SETOR') {
    return setores.map((setor) => ({
      value: String(setor.id),
      label: setor?.nome || setor?.codigo || `Setor ${setor.id}`
    }));
  }

  if (escopoTipo === 'PERFIL') {
    return PERFIS_OPCOES;
  }

  return usuarios.map((usuario) => ({
    value: String(usuario.id),
    label: `${usuario?.nome || `Usuario ${usuario.id}`} - ${usuario?.email || 'sem email'}`
  }));
}

function obterLabelEscopo(regra, { usuarios, setores }) {
  if (regra?.escopo_tipo === 'PERFIL') {
    return regra?.escopo_valor || '';
  }

  if (regra?.escopo_tipo === 'SETOR') {
    const setor = setores.find((item) => String(item.id) === String(regra?.escopo_valor));
    return setor?.nome || setor?.codigo || regra?.escopo_valor || '';
  }

  const usuariosSelecionados = obterUsuariosSelecionados(regra);
  return usuariosSelecionados
    .map((usuarioId) => {
      const usuario = usuarios.find((item) => String(item.id) === String(usuarioId));
      return usuario?.nome || usuario?.email || usuarioId;
    })
    .join(', ');
}

function CheckboxPermissao({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] px-3 py-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function UsuariosEscopoSelector({
  usuarios,
  selectedIds,
  onToggle,
  onSelecionarTodos,
  onLimpar
}) {
  const [busca, setBusca] = useState('');

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return usuarios;

    return usuarios.filter((usuario) => normalizarTexto(
      `${usuario?.nome || ''} ${usuario?.email || ''}`
    ).includes(termo));
  }, [busca, usuarios]);

  const totalSelecionados = Array.isArray(selectedIds) ? selectedIds.length : 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--c-muted)]">
        <span>{totalSelecionados} usuario(s) selecionado(s)</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--c-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--c-surface)]"
            onClick={() => onSelecionarTodos(usuariosFiltrados.map((usuario) => usuario.id))}
          >
            Selecionar filtrados
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--c-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--c-surface)]"
            onClick={onLimpar}
          >
            Limpar
          </button>
        </div>
      </div>

      <input
        className="input"
        placeholder="Buscar usuario por nome ou email"
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
      />

      <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--c-border)] bg-white">
        {usuariosFiltrados.map((usuario) => {
          const checked = selectedIds.includes(String(usuario.id));
          return (
            <label
              key={usuario.id}
              className="flex items-center gap-3 border-b border-[var(--c-border)] px-3 py-2 text-sm last:border-b-0"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(usuario.id)}
              />
              <span>
                <strong>{usuario?.nome || `Usuario ${usuario.id}`}</strong>
                <span className="text-[var(--c-muted)]">{' '} - {usuario?.email || 'sem email'}</span>
              </span>
            </label>
          );
        })}

        {usuariosFiltrados.length === 0 && (
          <div className="px-3 py-3 text-sm text-[var(--c-muted)]">
            Nenhum usuario encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

function ObrasPermitidasSelector({
  obras,
  selectedIds,
  onToggle,
  onSelecionarTodas,
  onLimpar
}) {
  const totalSelecionadas = Array.isArray(selectedIds) ? selectedIds.length : 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--c-muted)]">
        <span>{totalSelecionadas} obra(s) selecionada(s)</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--c-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--c-surface)]"
            onClick={onSelecionarTodas}
          >
            Selecionar todas
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--c-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--c-surface)]"
            onClick={onLimpar}
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--c-border)] bg-white">
        {obras.map((obra) => {
          const checked = selectedIds.includes(Number(obra.id));
          return (
            <label
              key={obra.id}
              className="flex items-center gap-3 border-b border-[var(--c-border)] px-3 py-2 text-sm last:border-b-0"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(obra.id)}
              />
              <span>{formatarObra(obra)}</span>
            </label>
          );
        })}

        {obras.length === 0 && (
          <div className="px-3 py-3 text-sm text-[var(--c-muted)]">
            Nenhuma obra disponivel.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfiguracaoProvisionamentoFinanceiro() {
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [obras, setObras] = useState([]);
  const [regras, setRegras] = useState([]);
  const [regrasPersistidas, setRegrasPersistidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const [usuariosData, setoresData, obrasData, permissoesData] = await Promise.all([
          getUsuarios(),
          getSetores(),
          getObras(),
          getProvisionamentoFinanceiroPermissoes()
        ]);

        setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
        setSetores(Array.isArray(setoresData) ? setoresData : []);
        setObras(Array.isArray(obrasData) ? obrasData : []);
        const regrasCarregadas = consolidarRegras(permissoesData?.regras);
        setRegras(regrasCarregadas);
        setRegrasPersistidas(regrasCarregadas);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar configuracao do provisionamento financeiro.');
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  const usuariosOrdenados = useMemo(() => (
    [...usuarios].sort((a, b) => compararTexto(a?.nome, b?.nome))
  ), [usuarios]);

  const setoresOrdenados = useMemo(() => (
    [...setores].sort((a, b) => compararTexto(a?.nome || a?.codigo, b?.nome || b?.codigo))
  ), [setores]);

  const obrasOrdenadas = useMemo(() => (
    [...obras].sort((a, b) => compararTexto(
      `${a?.codigo || ''} ${a?.nome || ''}`,
      `${b?.codigo || ''} ${b?.nome || ''}`
    ))
  ), [obras]);

  const regrasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return regras;

    return regras.filter((regra) => {
      const escopoLabel = obterLabelEscopo(regra, {
        usuarios: usuariosOrdenados,
        setores: setoresOrdenados
      });

      return [
        regra?.escopo_tipo,
        regra?.escopo_valor,
        escopoLabel
      ].some((campo) => normalizarTexto(campo).includes(termo));
    });
  }, [busca, regras, setoresOrdenados, usuariosOrdenados]);

  function atualizarRegra(regraId, patch) {
    setRegras((prev) => prev.map((regra) => (
      regra.id === regraId ? { ...regra, ...patch } : regra
    )));
  }

  function obterRegraPersistida(escopoTipo, escopoValor) {
    return regrasPersistidas.find((regra) => (
      String(regra?.escopo_tipo || '') === String(escopoTipo || '')
      && String(regra?.escopo_valor || '') === String(escopoValor || '')
    ));
  }

  function obterRegraPersistidaUsuarios(escopoValores) {
    const usuariosSelecionados = ordenarValoresEscopo(escopoValores);
    if (usuariosSelecionados.length === 0) {
      return null;
    }

    return regrasPersistidas.find((regra) => {
      if (String(regra?.escopo_tipo || '') !== 'USUARIO') {
        return false;
      }

      const usuariosDaRegra = obterUsuariosSelecionados(regra);
      if (usuariosDaRegra.length !== usuariosSelecionados.length) {
        return false;
      }

      return usuariosDaRegra.every((usuarioId, indice) => usuarioId === usuariosSelecionados[indice]);
    }) || null;
  }

  function atualizarEscopoTipo(regraId, escopoTipo) {
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;
      return {
        ...regra,
        escopo_tipo: escopoTipo,
        escopo_valor: '',
        escopo_valores: [],
        pode_acessar: false,
        pode_criar: false,
        pode_aprovar: false,
        pode_dashboard_global: false,
        obra_ids: []
      };
    }));
  }

  function atualizarEscopoValor(regraId, escopoValor) {
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;

      const regraPersistida = obterRegraPersistida(regra.escopo_tipo, escopoValor);
      if (!regraPersistida) {
        return {
          ...regra,
          escopo_valor: escopoValor,
          escopo_valores: [],
          pode_acessar: false,
          pode_criar: false,
          pode_aprovar: false,
          pode_dashboard_global: false,
          obra_ids: []
        };
      }

      return {
        ...regra,
        escopo_valor: escopoValor,
        escopo_valores: [],
        pode_acessar: Boolean(regraPersistida.pode_acessar),
        pode_criar: Boolean(regraPersistida.pode_criar),
        pode_aprovar: Boolean(regraPersistida.pode_aprovar),
        pode_dashboard_global: Boolean(regraPersistida.pode_dashboard_global),
        obra_ids: Array.isArray(regraPersistida.obra_ids)
          ? regraPersistida.obra_ids.map(Number)
          : []
      };
    }));
  }

  function atualizarUsuariosRegra(regraId, usuarioIds) {
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;

      const usuariosSelecionados = ordenarValoresEscopo(usuarioIds);
      const regraPersistida = obterRegraPersistidaUsuarios(usuariosSelecionados);

      if (regraPersistida) {
        return {
          ...regra,
          escopo_valor: usuariosSelecionados.length === 1 ? usuariosSelecionados[0] : '',
          escopo_valores: usuariosSelecionados,
          pode_acessar: Boolean(regraPersistida.pode_acessar),
          pode_criar: Boolean(regraPersistida.pode_criar),
          pode_aprovar: Boolean(regraPersistida.pode_aprovar),
          pode_dashboard_global: Boolean(regraPersistida.pode_dashboard_global),
          obra_ids: Array.isArray(regraPersistida.obra_ids)
            ? regraPersistida.obra_ids.map(Number)
            : []
        };
      }

      if (usuariosSelecionados.length === 0) {
        return {
          ...regra,
          escopo_valor: '',
          escopo_valores: [],
          pode_acessar: false,
          pode_criar: false,
          pode_aprovar: false,
          pode_dashboard_global: false,
          obra_ids: []
        };
      }

      return {
        ...regra,
        escopo_valor: usuariosSelecionados.length === 1 ? usuariosSelecionados[0] : '',
        escopo_valores: usuariosSelecionados
      };
    }));
  }

  function alternarUsuarioRegra(regraId, usuarioId) {
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;

      const atuais = obterUsuariosSelecionados(regra);
      const usuarioIdNormalizado = String(usuarioId);
      const novosSelecionados = atuais.includes(usuarioIdNormalizado)
        ? atuais.filter((item) => item !== usuarioIdNormalizado)
        : [...atuais, usuarioIdNormalizado];

      const usuariosSelecionados = ordenarValoresEscopo(novosSelecionados);
      const regraPersistida = obterRegraPersistidaUsuarios(usuariosSelecionados);

      if (regraPersistida) {
        return {
          ...regra,
          escopo_valor: usuariosSelecionados.length === 1 ? usuariosSelecionados[0] : '',
          escopo_valores: usuariosSelecionados,
          pode_acessar: Boolean(regraPersistida.pode_acessar),
          pode_criar: Boolean(regraPersistida.pode_criar),
          pode_aprovar: Boolean(regraPersistida.pode_aprovar),
          pode_dashboard_global: Boolean(regraPersistida.pode_dashboard_global),
          obra_ids: Array.isArray(regraPersistida.obra_ids)
            ? regraPersistida.obra_ids.map(Number)
            : []
        };
      }

      if (usuariosSelecionados.length === 0) {
        return {
          ...regra,
          escopo_valor: '',
          escopo_valores: [],
          pode_acessar: false,
          pode_criar: false,
          pode_aprovar: false,
          pode_dashboard_global: false,
          obra_ids: []
        };
      }

      return {
        ...regra,
        escopo_valor: usuariosSelecionados.length === 1 ? usuariosSelecionados[0] : '',
        escopo_valores: usuariosSelecionados
      };
    }));
  }

  function atualizarObrasRegra(regraId, obraIds) {
    atualizarRegra(regraId, { obra_ids: normalizarListaObraIds(obraIds) });
  }

  function alternarObraRegra(regraId, obraId) {
    const obraIdNormalizado = Number(obraId);
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;

      const atuais = normalizarListaObraIds(regra.obra_ids);
      const jaSelecionada = atuais.includes(obraIdNormalizado);
      return {
        ...regra,
        obra_ids: jaSelecionada
          ? atuais.filter((item) => item !== obraIdNormalizado)
          : [...atuais, obraIdNormalizado]
      };
    }));
  }

  function adicionarRegra() {
    setRegras((prev) => [...prev, criarRegraVazia()]);
  }

  function removerRegra(regraId) {
    setRegras((prev) => prev.filter((regra) => regra.id !== regraId));
  }

  async function salvar() {
    try {
      setSalvando(true);

      const regrasConsolidadas = consolidarRegras(regras);
      const payload = regrasConsolidadas.flatMap((regra, indice) => {
        if (regra.escopo_tipo === 'USUARIO') {
          const usuariosSelecionados = obterUsuariosSelecionados(regra);
          if (usuariosSelecionados.length === 0) {
            throw new Error(`Regra ${indice + 1}: selecione ao menos um usuario.`);
          }

          return usuariosSelecionados.map((usuarioId) => ({
            escopo_tipo: 'USUARIO',
            escopo_valor: usuarioId,
            pode_acessar: Boolean(regra.pode_acessar),
            pode_criar: Boolean(regra.pode_criar),
            pode_aprovar: Boolean(regra.pode_aprovar),
            pode_dashboard_global: Boolean(regra.pode_dashboard_global),
            obra_ids: normalizarListaObraIds(regra.obra_ids)
          }));
        }

        if (!String(regra.escopo_valor || '').trim()) {
          throw new Error(`Regra ${indice + 1}: selecione um valor para o escopo.`);
        }

        return [{
          escopo_tipo: regra.escopo_tipo,
          escopo_valor: regra.escopo_valor,
          pode_acessar: Boolean(regra.pode_acessar),
          pode_criar: Boolean(regra.pode_criar),
          pode_aprovar: Boolean(regra.pode_aprovar),
          pode_dashboard_global: Boolean(regra.pode_dashboard_global),
          obra_ids: normalizarListaObraIds(regra.obra_ids)
        }];
      });

      await salvarProvisionamentoFinanceiroPermissoes({ regras: payload });
      const atualizado = await getProvisionamentoFinanceiroPermissoes();
      const regrasAtualizadas = consolidarRegras(atualizado?.regras);
      setRegras(regrasAtualizadas);
      setRegrasPersistidas(regrasAtualizadas);
      alert('Configuracao do provisionamento financeiro salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar configuracao do provisionamento financeiro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provisionamento Financeiro</h1>
        <p className="text-sm text-gray-600 mt-1">
          Sprint 1: base do modulo, com gate de permissao por usuario, setor ou perfil.
          Sem obras selecionadas, a regra vale para todas as obras permitidas pelo escopo.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="grid gap-1 text-sm w-full lg:max-w-md">
            Buscar regra
            <input
              className="input"
              placeholder="Escopo, usuario, setor ou perfil"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </label>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Regras: <strong>{regras.length}</strong>
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={adicionarRegra}
              disabled={carregando}
            >
              Nova regra
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          O modulo continua oculto no menu principal nesta etapa. Esta tela apenas prepara a
          base de permissao para a futura liberacao controlada.
        </div>

        {carregando ? (
          <p className="text-sm text-gray-600">Carregando configuracoes...</p>
        ) : (
          <div className="space-y-4">
            {regrasFiltradas.map((regra) => (
              <article key={regra.id} className="rounded-xl border border-[var(--c-border)] p-4 space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 flex-1">
                    <label className="grid gap-1 text-sm">
                      Escopo
                      <select
                        className="input"
                        value={regra.escopo_tipo}
                        onChange={(event) => atualizarEscopoTipo(regra.id, event.target.value)}
                      >
                        <option value="USUARIO">Usuario</option>
                        <option value="SETOR">Setor</option>
                        <option value="PERFIL">Perfil</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-1">
                      {regra.escopo_tipo === 'USUARIO' ? 'Usuarios' : 'Valor do escopo'}
                      {regra.escopo_tipo === 'USUARIO' ? (
                        <UsuariosEscopoSelector
                          usuarios={usuariosOrdenados}
                          selectedIds={obterUsuariosSelecionados(regra)}
                          onToggle={(usuarioId) => alternarUsuarioRegra(regra.id, usuarioId)}
                          onSelecionarTodos={(usuarioIds) => atualizarUsuariosRegra(regra.id, [...obterUsuariosSelecionados(regra), ...usuarioIds])}
                          onLimpar={() => atualizarUsuariosRegra(regra.id, [])}
                        />
                      ) : (
                        <select
                          className="input"
                          value={regra.escopo_valor || ''}
                          onChange={(event) => atualizarEscopoValor(regra.id, event.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {obterOpcoesEscopo(regra.escopo_tipo, {
                            usuarios: usuariosOrdenados,
                            setores: setoresOrdenados
                          }).map((opcao) => (
                            <option key={opcao.value} value={opcao.value}>
                              {opcao.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-1">
                      Obras permitidas
                      <ObrasPermitidasSelector
                        obras={obrasOrdenadas}
                        selectedIds={normalizarListaObraIds(regra.obra_ids)}
                        onToggle={(obraId) => alternarObraRegra(regra.id, obraId)}
                        onSelecionarTodas={() => atualizarObrasRegra(regra.id, obrasOrdenadas.map((obra) => obra.id))}
                        onLimpar={() => atualizarObrasRegra(regra.id, [])}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline self-start"
                    onClick={() => removerRegra(regra.id)}
                  >
                    Remover
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <CheckboxPermissao
                    label="Pode acessar"
                    checked={Boolean(regra.pode_acessar)}
                    onChange={(checked) => atualizarRegra(regra.id, { pode_acessar: checked })}
                  />
                  <CheckboxPermissao
                    label="Pode criar"
                    checked={Boolean(regra.pode_criar)}
                    onChange={(checked) => atualizarRegra(regra.id, { pode_criar: checked })}
                  />
                  <CheckboxPermissao
                    label="Pode aprovar"
                    checked={Boolean(regra.pode_aprovar)}
                    onChange={(checked) => atualizarRegra(regra.id, { pode_aprovar: checked })}
                  />
                  <CheckboxPermissao
                    label="Pode ver dashboard global"
                    checked={Boolean(regra.pode_dashboard_global)}
                    onChange={(checked) => atualizarRegra(regra.id, { pode_dashboard_global: checked })}
                  />
                </div>
              </article>
            ))}

            {regrasFiltradas.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--c-border)] p-6 text-sm text-gray-600">
                Nenhuma regra encontrada. Clique em <strong>Nova regra</strong> para iniciar a configuracao.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={carregando || salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </div>
    </div>
  );
}
