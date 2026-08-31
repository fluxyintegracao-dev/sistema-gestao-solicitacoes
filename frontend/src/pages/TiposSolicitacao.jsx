import { useEffect, useState } from 'react';
import {
  getTiposSolicitacao,
  criarTipoSolicitacao,
  atualizarTipoSolicitacao,
  ativarTipoSolicitacao,
  desativarTipoSolicitacao,
  excluirTipoSolicitacao
} from '../services/tiposSolicitacao';
import { getSetores } from '../services/setores';
import {
  getTiposSolicitacaoPorSetor,
  salvarTiposSolicitacaoPorSetor
} from '../services/configuracoesSistema';
import { getDefaultTipoSolicitacaoBehavior, getTipoSolicitacaoBehavior } from '../utils/tipoSolicitacao';

const BEHAVIOR_FIELDS = [
  { key: 'mostrar_valor', label: 'Mostrar valor' },
  { key: 'exige_valor', label: 'Exigir valor' },
  { key: 'mostrar_descricao', label: 'Mostrar descricao' },
  { key: 'exige_descricao', label: 'Exigir descricao' },
  { key: 'mostrar_apropriacao_principal', label: 'Mostrar apropriacao principal' },
  { key: 'exige_apropriacao_principal', label: 'Exigir apropriacao principal' },
  { key: 'mostrar_contrato', label: 'Mostrar contrato' },
  { key: 'exige_contrato', label: 'Exigir contrato' },
  { key: 'mostrar_subtipo', label: 'Mostrar subtipo' },
  { key: 'exige_subtipo', label: 'Exigir subtipo' },
  { key: 'mostrar_periodo_medicao', label: 'Mostrar periodo de medicao' },
  { key: 'exige_periodo_medicao', label: 'Exigir periodo de medicao' },
  { key: 'mostrar_ref_contrato_abertura', label: 'Mostrar ref. contrato abertura' },
  { key: 'exige_ref_contrato_abertura', label: 'Exigir ref. contrato abertura' },
  { key: 'mostrar_itens_apropriacao', label: 'Mostrar itens de apropriacao' },
  { key: 'exige_itens_apropriacao', label: 'Exigir itens de apropriacao' },
  { key: 'usa_fluxo_contrato_novo', label: 'Usar fluxo novo de contratos' },
  { key: 'usa_fluxo_despesa_eventual', label: 'Usar fluxo de Despesa Eventual' },
  { key: 'exige_apropriacoes_contrato', label: 'Exigir apropriacoes do contrato' }
];

function formatarRegrasTipo(tipo) {
  return BEHAVIOR_FIELDS
    .filter(field => getTipoSolicitacaoBehavior(tipo)?.[field.key])
    .map(field => field.label);
}

function setorKey(item) {
  return String(item?.codigo || item?.nome || item?.id || '').trim().toUpperCase();
}

function normalizarIdsTipos(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite))
  );
}

function getTiposEfetivosSetor(tipos, regrasTiposPorSetor, setorSelecionado) {
  const listaTipos = Array.isArray(tipos) ? tipos : [];
  if (!setorSelecionado) return listaTipos;

  const regra = regrasTiposPorSetor?.[setorSelecionado];
  const ids = normalizarIdsTipos(regra?.tipos);

  if (ids.length === 0) {
    return listaTipos;
  }

  const idsPermitidos = new Set(ids);
  return listaTipos.filter(tipo => idsPermitidos.has(Number(tipo.id)));
}

export default function TiposSolicitacao() {
  const [tipos, setTipos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [regrasTiposPorSetor, setRegrasTiposPorSetor] = useState({});
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [nome, setNome] = useState('');
  const [codigoInterno, setCodigoInterno] = useState('');
  const [comportamento, setComportamento] = useState(getDefaultTipoSolicitacaoBehavior());
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigoInterno, setEditCodigoInterno] = useState('');
  const [editComportamento, setEditComportamento] = useState(getDefaultTipoSolicitacaoBehavior());
  const [saving, setSaving] = useState(false);

  async function carregar() {
    const [tiposData, setoresData, cfg] = await Promise.all([
      getTiposSolicitacao(),
      getSetores(),
      getTiposSolicitacaoPorSetor()
    ]);

    const listaTipos = Array.isArray(tiposData) ? tiposData : [];
    const listaSetores = Array.isArray(setoresData) ? setoresData : [];
    const regras = cfg?.regras && typeof cfg.regras === 'object' ? cfg.regras : {};

    setTipos(listaTipos);
    setSetores(listaSetores);
    setRegrasTiposPorSetor(regras);

    if (!setorSelecionado && listaSetores.length > 0) {
      setSetorSelecionado(setorKey(listaSetores[0]));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!setorSelecionado) {
      alert('Selecione o setor para vincular o tipo.');
      return;
    }

    const nomeNormalizado = String(nome || '').trim();
    if (!nomeNormalizado) {
      alert('Informe o nome do tipo.');
      return;
    }

    const novoTipo = await criarTipoSolicitacao({
      nome: nomeNormalizado,
      codigo_interno: codigoInterno,
      comportamento
    });

    const regraAtual = regrasTiposPorSetor?.[setorSelecionado] || { tipos: [], modos: {} };
    const tiposBase = getTiposEfetivosSetor(tipos, regrasTiposPorSetor, setorSelecionado);
    const tiposAtualizados = normalizarIdsTipos([
      ...tiposBase.map(item => item?.id),
      novoTipo.id
    ]);
    const modosBase =
      regraAtual.modos && typeof regraAtual.modos === 'object' ? regraAtual.modos : {};
    const modosAtualizados = tiposAtualizados.reduce((acc, tipoId) => {
      acc[String(tipoId)] = modosBase[String(tipoId)] || 'TODOS_VISIVEIS';
      return acc;
    }, {});
    const novasRegras = {
      ...regrasTiposPorSetor,
      [setorSelecionado]: {
        tipos: tiposAtualizados,
        modos: modosAtualizados
      }
    };

    await salvarTiposSolicitacaoPorSetor({ regras: novasRegras });
    setRegrasTiposPorSetor(novasRegras);

    setNome('');
    setCodigoInterno('');
    setComportamento(getDefaultTipoSolicitacaoBehavior());
    carregar();
  }

  async function toggle(tipo) {
    try {
      if (tipo.ativo) {
        await desativarTipoSolicitacao(tipo.id);
      } else {
        await ativarTipoSolicitacao(tipo.id);
      }
      carregar();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao alterar status do tipo');
    }
  }

  async function excluir(tipo) {
    if (!window.confirm(`Deseja excluir o tipo "${tipo.nome}"?`)) return;

    try {
      await excluirTipoSolicitacao(tipo.id);
      carregar();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao excluir tipo');
    }
  }

  function iniciarEdicao(item) {
    setEditId(item.id);
    setEditNome(item.nome);
    setEditCodigoInterno(item.codigo_interno || '');
    setEditComportamento(getTipoSolicitacaoBehavior(item));
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditCodigoInterno('');
    setEditComportamento(getDefaultTipoSolicitacaoBehavior());
  }

  async function salvarEdicao(id) {
    try {
      setSaving(true);
      await atualizarTipoSolicitacao(id, {
        nome: editNome,
        codigo_interno: editCodigoInterno,
        comportamento: editComportamento
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

  const tiposFiltrados = (() => {
    return getTiposEfetivosSetor(tipos, regrasTiposPorSetor, setorSelecionado);
  })();

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">Tipos (Macro)</h1>
        <p className="page-subtitle">Cadastro dos tipos macro utilizados nas solicitacoes.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Novo tipo</h2>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[220px_1fr_220px_auto]">
          <label className="grid gap-1 text-sm">
            Setor
            <select
              className="input"
              value={setorSelecionado}
              onChange={e => setSetorSelecionado(e.target.value)}
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
            Nome do tipo
            <input
              className="input"
              placeholder="Ex: Adm. Local"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Codigo interno
            <input
              className="input"
              placeholder="Ex: SOLICITACAO_DE_COMPRA"
              value={codigoInterno}
              onChange={e => setCodigoInterno(e.target.value.toUpperCase())}
            />
          </label>
          <button type="submit" className="btn btn-primary md:self-end">
            Adicionar
          </button>
          <div className="grid gap-2 text-sm md:col-span-4">
            <span>Comportamento do tipo</span>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {BEHAVIOR_FIELDS.map(field => (
                <label key={field.key} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(comportamento[field.key])}
                    onChange={e => setComportamento(prev => ({ ...prev, [field.key]: e.target.checked }))}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
        <p className="mt-2 text-xs" style={{ color: 'var(--c-muted)' }}>
          O tipo é criado no cadastro geral e automaticamente vinculado ao setor selecionado.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">
            Tipos {setorSelecionado ? 'do setor selecionado' : ''}
          </h2>
        </div>
        <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codigo interno</th>
              <th>Regras</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {tiposFiltrados.map(t => (
              <tr key={t.id}>
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
                <td>
                  {editId === t.id ? (
                    <input
                      className="input"
                      value={editCodigoInterno}
                      onChange={e => setEditCodigoInterno(e.target.value.toUpperCase())}
                    />
                  ) : (
                    t.codigo_interno || '-'
                  )}
                </td>
                <td>
                  {editId === t.id ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {BEHAVIOR_FIELDS.map(field => (
                        <label key={field.key} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={Boolean(editComportamento[field.key])}
                            onChange={e => setEditComportamento(prev => ({ ...prev, [field.key]: e.target.checked }))}
                          />
                          <span>{field.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formatarRegrasTipo(t).length > 0 ? formatarRegrasTipo(t).map(label => (
                        <span key={label} className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-2 py-1 text-xs">
                          {label}
                        </span>
                      )) : <span className="text-xs text-[var(--c-muted)]">Padrao</span>}
                    </div>
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
            {tiposFiltrados.length === 0 && (
              <tr>
                <td colSpan="5" align="center">Nenhum tipo cadastrado</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
