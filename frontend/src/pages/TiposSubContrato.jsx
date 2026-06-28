import { useEffect, useMemo, useState } from 'react';
import {
  getTiposSubContrato,
  criarTipoSubContrato,
  atualizarTipoSubContrato,
  ativarTipoSubContrato,
  desativarTipoSubContrato,
  excluirTipoSubContrato
} from '../services/tiposSubContrato';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import { getSetores } from '../services/setores';
import { getTiposSolicitacaoPorSetor } from '../services/configuracoesSistema';

function setorKey(setor) {
  return String(setor?.codigo || setor?.nome || setor?.id || '').trim().toUpperCase();
}

function setorLabel(setor) {
  const nome = String(setor?.nome || '').trim();
  const codigo = String(setor?.codigo || '').trim().toUpperCase();
  if (nome && codigo && nome.toUpperCase() !== codigo) return `${nome} (${codigo})`;
  return nome || codigo || '-';
}

function normalizarIds(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite))
  );
}

export default function TiposSubContrato() {
  const [tipos, setTipos] = useState([]);
  const [macros, setMacros] = useState([]);
  const [setores, setSetores] = useState([]);
  const [regrasTiposPorSetor, setRegrasTiposPorSetor] = useState({});
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [mostrarTiposInativos, setMostrarTiposInativos] = useState(false);
  const [nome, setNome] = useState('');
  const [tipoMacroId, setTipoMacroId] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editMacroId, setEditMacroId] = useState('');
  const [saving, setSaving] = useState(false);

  async function carregar() {
    const data = await getTiposSubContrato();
    setTipos(Array.isArray(data) ? data : []);
  }

  async function carregarMacros() {
    const [tiposData, setoresData, configData] = await Promise.all([
      getTiposSolicitacao(),
      getSetores(),
      getTiposSolicitacaoPorSetor()
    ]);
    const listaSetores = Array.isArray(setoresData) ? setoresData : [];
    setMacros(Array.isArray(tiposData) ? tiposData : []);
    setSetores(listaSetores);
    setRegrasTiposPorSetor(
      configData?.regras && typeof configData.regras === 'object' ? configData.regras : {}
    );
    if (!setorSelecionado && listaSetores.length > 0) {
      setSetorSelecionado(setorKey(listaSetores[0]));
    }
  }

  useEffect(() => {
    carregar();
    carregarMacros();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!setorSelecionado) {
      alert('Selecione o setor antes de cadastrar o subtipo.');
      return;
    }
    await criarTipoSubContrato({
      nome,
      tipo_macro_id: tipoMacroId
    });
    setNome('');
    setTipoMacroId('');
    carregar();
  }

  async function toggle(tipo) {
    try {
      if (tipo.ativo) {
        await desativarTipoSubContrato(tipo.id);
      } else {
        await ativarTipoSubContrato(tipo.id);
      }
      carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao alterar status do subtipo');
    }
  }

  async function excluir(item) {
    if (!confirm(`Excluir o subtipo "${item.nome}"?`)) return;
    try {
      await excluirTipoSubContrato(item.id);
      carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir subtipo');
    }
  }

  function iniciarEdicao(item) {
    setEditId(item.id);
    setEditNome(item.nome);
    setEditMacroId(item.tipo_macro_id ? String(item.tipo_macro_id) : '');
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditMacroId('');
  }

  async function salvarEdicao(id) {
    try {
      setSaving(true);
      await atualizarTipoSubContrato(id, {
        nome: editNome,
        tipo_macro_id: editMacroId
      });
      cancelarEdicao();
      carregar();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar edicao');
    } finally {
      setSaving(false);
    }
  }

  const setoresPorKey = useMemo(() => {
    const map = new Map();
    setores.forEach(setor => {
      map.set(setorKey(setor), setor);
    });
    return map;
  }, [setores]);

  const macrosPorId = useMemo(() => {
    const map = new Map();
    macros.forEach(macro => map.set(Number(macro.id), macro));
    return map;
  }, [macros]);

  const contextoPorTipoId = useMemo(() => {
    const map = new Map();
    Object.entries(regrasTiposPorSetor || {}).forEach(([key, regra]) => {
      const ids = normalizarIds(regra?.tipos);
      const setor = setoresPorKey.get(String(key || '').trim().toUpperCase());
      ids.forEach(id => {
        const atual = map.get(id) || [];
        atual.push({
          key,
          label: setor ? setorLabel(setor) : String(key || '').trim().toUpperCase()
        });
        map.set(id, atual);
      });
    });
    return map;
  }, [regrasTiposPorSetor, setoresPorKey]);

  const idsPermitidosSetor = useMemo(() => {
    const regra = regrasTiposPorSetor?.[setorSelecionado];
    return normalizarIds(regra?.tipos);
  }, [regrasTiposPorSetor, setorSelecionado]);

  const macrosDoSetor = useMemo(() => {
    const idsPermitidos = new Set(idsPermitidosSetor);
    const temRegraRestritiva = idsPermitidosSetor.length > 0;
    return macros
      .filter(macro => {
        if (!mostrarTiposInativos && macro?.ativo === false) return false;
        if (!temRegraRestritiva) return true;
        return idsPermitidos.has(Number(macro.id));
      })
      .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
  }, [idsPermitidosSetor, macros, mostrarTiposInativos]);

  const tiposFiltrados = useMemo(() => {
    const idsPermitidos = new Set(idsPermitidosSetor);
    const temRegraRestritiva = idsPermitidosSetor.length > 0;
    return tipos.filter(tipo => {
      const macro = macrosPorId.get(Number(tipo.tipo_macro_id));
      if (!mostrarTiposInativos && macro?.ativo === false) return false;
      if (!temRegraRestritiva) return true;
      return idsPermitidos.has(Number(tipo.tipo_macro_id));
    });
  }, [idsPermitidosSetor, macrosPorId, mostrarTiposInativos, tipos]);

  function macroLabel(macro) {
    const contextos = contextoPorTipoId.get(Number(macro?.id)) || [];
    const contextoSetor = contextos.length > 0
      ? contextos.map(item => item.label).join(', ')
      : 'Sem restricao por setor';
    const status = macro?.ativo === false ? 'Inativo' : 'Ativo';
    return `${macro?.nome || '-'} - ${contextoSetor} - ${status}`;
  }

  function macroSetoresLabel(macroId) {
    const contextos = contextoPorTipoId.get(Number(macroId)) || [];
    if (contextos.length === 0) return 'Todos os setores';
    return contextos.map(item => item.label).join(', ');
  }

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">Subtipos</h1>
        <p className="page-subtitle">Cadastro dos subtipos vinculados ao tipo e ao contexto operacional do setor.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Novo subtipo</h2>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            Setor
            <select
              className="input"
              value={setorSelecionado}
              onChange={e => {
                setSetorSelecionado(e.target.value);
                setTipoMacroId('');
                cancelarEdicao();
              }}
              required
            >
              <option value="">Selecione</option>
              {setores.map(setor => (
                <option key={setor.id} value={setorKey(setor)}>
                  {setorLabel(setor)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Tipo macro
            <select
              className="input"
              value={tipoMacroId}
              onChange={e => setTipoMacroId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {macrosDoSetor.map(m => (
                <option key={m.id} value={m.id}>
                  {macroLabel(m)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Nome do subtipo
            <input
              className="input"
              placeholder="Ex: Combustivel"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary md:self-end">
            Adicionar
          </button>
        </form>

        <div className="mt-3 flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between" style={{ color: 'var(--c-muted)' }}>
          <span>
            O subtipo continua vinculado ao ID do tipo. O setor serve para evitar escolher um tipo duplicado por engano.
          </span>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarTiposInativos}
              onChange={event => setMostrarTiposInativos(event.target.checked)}
            />
            Mostrar tipos inativos
          </label>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Setor</th>
              <th>Tipo macro</th>
              <th>Subtipo</th>
              <th>Status do tipo</th>
              <th>Status do subtipo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {tiposFiltrados.map(t => {
              const macro = macrosPorId.get(Number(t.tipo_macro_id)) || t.macro;
              return (
              <tr key={t.id}>
                <td>{macroSetoresLabel(t.tipo_macro_id)}</td>
                <td>
                  {editId === t.id ? (
                    <select
                      className="input"
                      value={editMacroId}
                      onChange={e => setEditMacroId(e.target.value)}
                    >
                      <option value="">Tipo macro</option>
                      {macrosDoSetor.map(m => (
                        <option key={m.id} value={m.id}>
                          {macroLabel(m)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    macroLabel(macro)
                  )}
                </td>
                <td>
                  {editId === t.id ? (
                    <input
                      className="input"
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                    />
                  ) : (
                    t.nome
                  )}
                </td>
                <td>{macro?.ativo === false ? 'Inativo' : 'Ativo'}</td>
                <td>{t.ativo ? 'Ativo' : 'Inativo'}</td>
                <td>
                  {editId === t.id ? (
                    <>
                      <button type="button" className="btn btn-primary" onClick={() => salvarEdicao(t.id)} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>{' '}
                      <button type="button" className="btn btn-outline" onClick={cancelarEdicao} disabled={saving}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-outline" onClick={() => iniciarEdicao(t)}>
                        Editar
                      </button>{' '}
                      <button type="button" className="btn btn-secondary" onClick={() => toggle(t)}>
                        {t.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      {' '}
                      <button type="button" className="btn btn-danger" onClick={() => excluir(t)}>
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
              );
            })}
            {tiposFiltrados.length === 0 && (
              <tr>
                <td colSpan="6" align="center">Nenhum subtipo cadastrado para este recorte</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
