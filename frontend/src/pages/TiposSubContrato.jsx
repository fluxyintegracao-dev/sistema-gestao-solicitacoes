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

function setorKey(item) {
  return String(item?.codigo || item?.nome || item?.id || '').trim().toUpperCase();
}

function setorLabel(setores, setorValor) {
  const valor = String(setorValor || '').trim().toUpperCase();
  if (!valor) return 'Nao definido';
  const setor = setores.find(item => setorKey(item) === valor);
  return setor?.nome || setor?.codigo || valor;
}

function filtrarTiposPorSetor(macros, regrasTiposPorSetor, setorSelecionado) {
  const lista = Array.isArray(macros) ? macros : [];
  if (!setorSelecionado) return lista;

  const regra = regrasTiposPorSetor?.[setorSelecionado];
  const ids = Array.isArray(regra?.tipos) ? regra.tipos.map(Number).filter(Number.isFinite) : [];
  if (ids.length === 0) return lista;

  const idsSet = new Set(ids);
  return lista.filter(item => idsSet.has(Number(item.id)));
}

export default function TiposSubContrato() {
  const [tipos, setTipos] = useState([]);
  const [macros, setMacros] = useState([]);
  const [setores, setSetores] = useState([]);
  const [regrasTiposPorSetor, setRegrasTiposPorSetor] = useState({});
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [nome, setNome] = useState('');
  const [tipoMacroId, setTipoMacroId] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editMacroId, setEditMacroId] = useState('');
  const [editSetor, setEditSetor] = useState('');
  const [saving, setSaving] = useState(false);

  async function carregar() {
    const [subtiposData, macrosData, setoresData, cfgTiposPorSetor] = await Promise.all([
      getTiposSubContrato(),
      getTiposSolicitacao(),
      getSetores(),
      getTiposSolicitacaoPorSetor()
    ]);

    setTipos(Array.isArray(subtiposData) ? subtiposData : []);
    setMacros(Array.isArray(macrosData) ? macrosData : []);
    setSetores(Array.isArray(setoresData) ? setoresData : []);
    setRegrasTiposPorSetor(
      cfgTiposPorSetor?.regras && typeof cfgTiposPorSetor.regras === 'object'
        ? cfgTiposPorSetor.regras
        : {}
    );
  }

  useEffect(() => {
    carregar();
  }, []);

  const macrosNovoSubtipo = useMemo(
    () => filtrarTiposPorSetor(macros, regrasTiposPorSetor, setorSelecionado),
    [macros, regrasTiposPorSetor, setorSelecionado]
  );

  const macrosEdicao = useMemo(
    () => filtrarTiposPorSetor(macros, regrasTiposPorSetor, editSetor),
    [macros, regrasTiposPorSetor, editSetor]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (!setorSelecionado) {
        alert('Selecione o setor.');
        return;
      }
      if (!tipoMacroId) {
        alert('Selecione o tipo macro.');
        return;
      }

      setSaving(true);
      await criarTipoSubContrato({
        nome,
        tipo_macro_id: tipoMacroId,
        setor: setorSelecionado
      });
      setNome('');
      setTipoMacroId('');
      carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar subtipo');
    } finally {
      setSaving(false);
    }
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
    setEditSetor(String(item.setor || '').trim().toUpperCase());
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditMacroId('');
    setEditSetor('');
  }

  async function salvarEdicao(id) {
    try {
      if (!editSetor) {
        alert('Selecione o setor.');
        return;
      }
      if (!editMacroId) {
        alert('Selecione o tipo macro.');
        return;
      }

      setSaving(true);
      await atualizarTipoSubContrato(id, {
        nome: editNome,
        tipo_macro_id: editMacroId,
        setor: editSetor
      });
      cancelarEdicao();
      carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar edicao');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Subtipos</h1>
        <p className="page-subtitle">Cadastro dos subtipos vinculados ao setor e ao tipo de solicitacao.</p>
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
              }}
              required
            >
              <option value="">Selecione</option>
              {setores.map(s => (
                <option key={s.id} value={setorKey(s)}>
                  {s.nome || s.codigo}
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
              disabled={!setorSelecionado}
            >
              <option value="">{setorSelecionado ? 'Selecione' : 'Selecione o setor primeiro'}</option>
              {macrosNovoSubtipo.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome}
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

          <button type="submit" className="btn btn-primary md:self-end" disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Setor</th>
              <th>Macro</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map(t => (
              <tr key={t.id}>
                <td>
                  {editId === t.id ? (
                    <select
                      className="input"
                      value={editSetor}
                      onChange={e => {
                        setEditSetor(e.target.value);
                        setEditMacroId('');
                      }}
                    >
                      <option value="">Setor</option>
                      {setores.map(s => (
                        <option key={s.id} value={setorKey(s)}>
                          {s.nome || s.codigo}
                        </option>
                      ))}
                    </select>
                  ) : (
                    setorLabel(setores, t.setor)
                  )}
                </td>
                <td>
                  {editId === t.id ? (
                    <select
                      className="input"
                      value={editMacroId}
                      onChange={e => setEditMacroId(e.target.value)}
                      disabled={!editSetor}
                    >
                      <option value="">Tipo macro</option>
                      {macrosEdicao.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    t.macro?.nome || '-'
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
            ))}
            {tipos.length === 0 && (
              <tr>
                <td colSpan="5" align="center">Nenhum subtipo cadastrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
