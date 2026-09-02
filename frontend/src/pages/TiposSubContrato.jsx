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
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  CelulaDupla,
  FormSecao,
  CampoForm
} from '../components/padrao';
import OverlayModal from '../components/ui/OverlayModal';
import StatusBadge from '../components/StatusBadge';

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
  const [formAberto, setFormAberto] = useState(false); // painel "Novo subtipo"
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

  function abrirNovoSubtipo() {
    setFormAberto(true);
  }

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

  function macroDoSubtipo(t) {
    return macrosPorId.get(Number(t.tipo_macro_id)) || t.macro;
  }

  // 6 colunas viraram 3 + acoes. O que a tabela antiga repetia foi unificado:
  // a coluna "Setor" e o "status do tipo" apareciam soltos E dentro do texto
  // da coluna "Tipo macro" (macroLabel) — agora setores viram o subtexto da
  // coluna Tipo macro e o status do tipo vira o subtexto da coluna Status.
  const colunas = [
    {
      id: 'subtipo',
      titulo: 'Subtipo',
      tipo: 'texto',
      noCard: 'titulo',
      render: (t) => (
        editId === t.id ? (
          <input
            className="input input-sm w-full"
            aria-label="Nome do subtipo"
            value={editNome}
            onChange={e => setEditNome(e.target.value)}
          />
        ) : (
          t.nome
        )
      )
    },
    {
      id: 'tipo_macro',
      titulo: 'Tipo macro',
      tipo: 'texto',
      render: (t) => (
        editId === t.id ? (
          <select
            className="input input-sm w-full"
            aria-label="Tipo macro"
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
          <CelulaDupla
            principal={macroDoSubtipo(t)?.nome || '-'}
            sub={macroSetoresLabel(t.tipo_macro_id)}
          />
        )
      )
    },
    {
      id: 'status',
      titulo: 'Status',
      tipo: 'status',
      render: (t) => {
        const macro = macroDoSubtipo(t);
        const statusTipo = macro?.ativo === false ? 'inativo' : 'ativo';
        return (
          <CelulaDupla
            principal={<StatusBadge status={t.ativo ? 'Ativo' : 'Inativo'} />}
            sub={`Tipo ${statusTipo}`}
            title={`Subtipo ${t.ativo ? 'ativo' : 'inativo'} — tipo macro ${statusTipo}`}
          />
        );
      }
    }
  ];

  return (
    <Pagina>
      {/* R5 (02/09): o texto de apoio saiu do PageHeader e ancora no bloco
          da lista (BlocoConteudo descricao). */}
      <PageHeader
        titulo="Subtipos"
        acaoPrincipal={{ rotulo: 'Novo subtipo', onClick: abrirNovoSubtipo }}
      />

      {/* R9 (docs/REGRAS-LAYOUT.md): cadastro raro abre em MODAL pela ação
          principal do cabeçalho; a lista é o bloco primário PERMANENTE.
          O seletor de Setor ficou junto da lista porque também é o recorte
          dela (mesmo estado de sempre). O ritmo vertical vem do Pagina. */}
      {formAberto && (
        <OverlayModal rotulo="Novo subtipo" onFechar={() => setFormAberto(false)}>
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
            <h3 className="text-lg font-semibold text-[var(--c-text)]">Novo subtipo</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setFormAberto(false)}>
              Fechar
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormSecao legenda="Dados do subtipo" colunas={3}>
                <CampoForm
                  label="Tipo macro"
                  obrigatorio
                  hint="Opções limitadas ao setor selecionado no recorte da lista."
                >
                  <select
                    className="input w-full"
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
                </CampoForm>

                <CampoForm label="Nome do subtipo" obrigatorio hint="Ex: Combustivel">
                  <input
                    className="input w-full"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                  />
                </CampoForm>

                <div className="flex items-end">
                  <button type="submit" className="btn btn-primary">
                    Adicionar
                  </button>
                </div>
              </FormSecao>

              <p className="app-note">
                O subtipo continua vinculado ao ID do tipo. O setor serve para evitar escolher um tipo duplicado por engano.
              </p>
            </form>
          </div>
        </OverlayModal>
      )}

      <BlocoConteudo
        titulo="Subtipos cadastrados"
        descricao="Cadastro dos subtipos vinculados ao tipo e ao contexto operacional do setor."
        variante="primario"
        cor="var(--c-primary)"
        acoes={(
          <>
            {/* R12: este select é seletor de CONTEXTO (define o recorte da
                lista E o setor de vínculo de novos subtipos) — não é filtro. */}
            <select
              className="input input-sm app-busca"
              aria-label="Setor"
              value={setorSelecionado}
              onChange={e => {
                setSetorSelecionado(e.target.value);
                setTipoMacroId('');
                cancelarEdicao();
              }}
            >
              <option value="">Selecione o setor</option>
              {setores.map(setor => (
                <option key={setor.id} value={setorKey(setor)}>
                  {setorLabel(setor)}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--c-muted)' }}>
              <input
                type="checkbox"
                checked={mostrarTiposInativos}
                onChange={event => setMostrarTiposInativos(event.target.checked)}
              />
              Mostrar tipos inativos
            </label>
          </>
        )}
      >
        <TabelaPadrao
          colunas={colunas}
          itens={tiposFiltrados}
          storageKey="tabela:tipos-subcontrato"
          larguraAcoes={260}
          aoClicarLinha={(t) => {
            if (editId !== t.id) iniciarEdicao(t);
          }}
          vazio={{ title: 'Nenhum subtipo cadastrado para este recorte' }}
          acoesLinha={(t) => (
            editId === t.id ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => salvarEdicao(t.id)} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={cancelarEdicao} disabled={saving}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => iniciarEdicao(t)}>
                  Editar
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(t)}>
                  {t.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button type="button" className="btn btn-outline btn-sm btn-perigo-suave" onClick={() => excluir(t)}>
                  Excluir
                </button>
              </>
            )
          )}
        />
      </BlocoConteudo>
    </Pagina>
  );
}
