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
    pode_acessar: true,
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

function formatarObra(obra) {
  const codigo = String(obra?.codigo || '').trim();
  const nome = String(obra?.nome || '').trim();
  if (codigo && nome) return `${codigo} - ${nome}`;
  return codigo || nome || `Obra ${obra?.id}`;
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

  const usuario = usuarios.find((item) => String(item.id) === String(regra?.escopo_valor));
  return usuario?.nome || usuario?.email || regra?.escopo_valor || '';
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
        setRegras(Array.isArray(permissoesData?.regras) ? permissoesData.regras : []);
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

  function atualizarEscopoTipo(regraId, escopoTipo) {
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;
      return {
        ...regra,
        escopo_tipo: escopoTipo,
        escopo_valor: ''
      };
    }));
  }

  function atualizarObrasRegra(regraId, obraIds) {
    const obraIdsNormalizados = obraIds
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);

    atualizarRegra(regraId, { obra_ids: obraIdsNormalizados });
  }

  function alternarObraRegra(regraId, obraId) {
    const obraIdNormalizado = Number(obraId);
    setRegras((prev) => prev.map((regra) => {
      if (regra.id !== regraId) return regra;

      const atuais = Array.isArray(regra.obra_ids) ? regra.obra_ids.map(Number) : [];
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

      const payload = regras.map((regra) => ({
        escopo_tipo: regra.escopo_tipo,
        escopo_valor: regra.escopo_valor,
        pode_acessar: Boolean(regra.pode_acessar),
        pode_criar: Boolean(regra.pode_criar),
        pode_aprovar: Boolean(regra.pode_aprovar),
        pode_dashboard_global: Boolean(regra.pode_dashboard_global),
        obra_ids: Array.isArray(regra.obra_ids) ? regra.obra_ids : []
      }));

      await salvarProvisionamentoFinanceiroPermissoes({ regras: payload });
      const atualizado = await getProvisionamentoFinanceiroPermissoes();
      setRegras(Array.isArray(atualizado?.regras) ? atualizado.regras : []);
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

                    <label className="grid gap-1 text-sm">
                      Valor do escopo
                      <select
                        className="input"
                        value={regra.escopo_valor || ''}
                        onChange={(event) => atualizarRegra(regra.id, { escopo_valor: event.target.value })}
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
                    </label>

                    <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-1">
                      Obras permitidas
                      <ObrasPermitidasSelector
                        obras={obrasOrdenadas}
                        selectedIds={(regra.obra_ids || []).map(Number)}
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
