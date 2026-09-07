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
import {
  FINALIDADES_DATA_SOLICITACAO,
  getDefaultTipoSolicitacaoBehavior,
  getTipoSolicitacaoBehavior,
  obterRotuloDataSolicitacao
} from '../utils/tipoSolicitacao';
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  FormSecao,
  CampoForm,
  Avisos,
  useAvisos,
  useConfirmacao
} from '../components/padrao';
import OverlayModal from '../components/ui/OverlayModal';
import StatusBadge from '../components/StatusBadge';

const BEHAVIOR_FIELDS = [
  { key: 'mostrar_valor', label: 'Mostrar valor' },
  { key: 'exige_valor', label: 'Exigir valor' },
  { key: 'mostrar_descricao', label: 'Mostrar descrição' },
  { key: 'exige_descricao', label: 'Exigir descrição' },
  { key: 'mostrar_apropriacao_principal', label: 'Mostrar apropriação principal' },
  { key: 'exige_apropriacao_principal', label: 'Exigir apropriação principal' },
  { key: 'mostrar_contrato', label: 'Mostrar contrato' },
  { key: 'exige_contrato', label: 'Exigir contrato' },
  { key: 'mostrar_subtipo', label: 'Mostrar subtipo' },
  { key: 'exige_subtipo', label: 'Exigir subtipo' },
  { key: 'mostrar_periodo_medicao', label: 'Mostrar período de medição' },
  { key: 'exige_periodo_medicao', label: 'Exigir período de medição' },
  { key: 'mostrar_ref_contrato_abertura', label: 'Mostrar ref. contrato abertura' },
  { key: 'exige_ref_contrato_abertura', label: 'Exigir ref. contrato abertura' },
  { key: 'mostrar_itens_apropriacao', label: 'Mostrar itens de apropriação' },
  { key: 'exige_itens_apropriacao', label: 'Exigir itens de apropriação' },
  { key: 'usa_fluxo_contrato_novo', label: 'Usar fluxo novo de contratos' },
  { key: 'usa_fluxo_despesa_eventual', label: 'Usar fluxo de Despesa Eventual' },
  { key: 'exige_apropriacoes_contrato', label: 'Exigir apropriações do contrato' }
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
  const [formAberto, setFormAberto] = useState(false);
  // R3: aviso e confirmação do sistema no lugar das caixas do navegador.
  const { avisos, avisar, fechar } = useAvisos();
  const { confirmar, elementoConfirmacao } = useConfirmacao();

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

  function abrirNovoTipo() {
    setFormAberto(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!setorSelecionado) {
      avisar.alerta('Selecione o setor para vincular o tipo.');
      return;
    }

    const nomeNormalizado = String(nome || '').trim();
    if (!nomeNormalizado) {
      avisar.alerta('Informe o nome do tipo.');
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
    setFormAberto(false);
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
      avisar.erro(error.message || 'Erro ao alterar status do tipo');
    }
  }

  async function excluir(tipo) {
    // confirmar() devolve { ok, texto } — objeto é sempre truthy, então o
    // retorno TEM de ser desestruturado (R21), senão "Cancelar" excluiria.
    const { ok } = await confirmar({
      titulo: 'Excluir tipo',
      mensagem: `Deseja excluir o tipo "${tipo.nome}"?`,
      rotuloConfirmar: 'Excluir',
      destrutiva: true
    });
    if (!ok) return;

    try {
      await excluirTipoSolicitacao(tipo.id);
      carregar();
    } catch (error) {
      console.error(error);
      avisar.erro(error.message || 'Erro ao excluir tipo');
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
      avisar.erro('Erro ao salvar edição');
    } finally {
      setSaving(false);
    }
  }

  // R16: UM dono para a faixa de avisos. Com o modal aberto ela vive dentro
  // dele (a validação do "Novo tipo" avisa com o modal aberto e ficaria
  // atrás do fundo escuro); fechado, logo abaixo do PageHeader.
  const faixaAvisos = <Avisos avisos={avisos} aoFechar={fechar} />;

  const tiposFiltrados = (() => {
    return getTiposEfetivosSetor(tipos, regrasTiposPorSetor, setorSelecionado);
  })();

  const setorAtual = setores.find(s => setorKey(s) === setorSelecionado);

  const colunas = [
    {
      id: 'nome',
      titulo: 'Nome',
      tipo: 'identidade',
      noCard: 'titulo',
      render: (t) => (
        editId === t.id ? (
          <input
            className="input input-sm w-full"
            value={editNome}
            onChange={e => setEditNome(e.target.value)}
            aria-label="Nome do tipo"
          />
        ) : (
          t.nome
        )
      )
    },
    {
      id: 'codigo_interno',
      // TRAVADAS (05/09): em edicao, codigo interno e regras sao os campos do
      // formulario da linha — sem elas o tipo nao tem como ser editado.
      sempreVisivel: true,
      titulo: 'Código interno',
      // Codigo interno é longo (ex: SOLICITACAO_DE_COMPRA) — não cabe nos
      // 130px do tipo 'codigo'; 'texto' dá a medida de leitura.
      tipo: 'texto',
      render: (t) => (
        editId === t.id ? (
          <input
            className="input input-sm w-full"
            value={editCodigoInterno}
            onChange={e => setEditCodigoInterno(e.target.value.toUpperCase())}
            aria-label="Código interno do tipo"
          />
        ) : (
          t.codigo_interno || '-'
        )
      )
    },
    {
      id: 'regras',
      sempreVisivel: true,
      titulo: 'Regras',
      tipo: 'badge',
      render: (t) => (
        editId === t.id ? (
          <div className="grid gap-2 md:grid-cols-2">
            <label className="grid gap-1 text-xs md:col-span-2">
              <span className="font-semibold text-[var(--c-text)]">Finalidade da data</span>
              <select
                className="select select-sm w-full"
                value={editComportamento.finalidade_data_vencimento}
                onChange={e => setEditComportamento(prev => ({
                  ...prev,
                  finalidade_data_vencimento: e.target.value
                }))}
              >
                <option value={FINALIDADES_DATA_SOLICITACAO.RESPOSTA}>Data de Resposta</option>
                <option value={FINALIDADES_DATA_SOLICITACAO.PAGAMENTO}>Data de Pagamento</option>
              </select>
            </label>
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
          <div className="flex flex-wrap gap-1">
            <span className="fx-badge fx-badge--neutral">
              {obterRotuloDataSolicitacao(getTipoSolicitacaoBehavior(t))}
            </span>
            {formatarRegrasTipo(t).length > 0 ? formatarRegrasTipo(t).map(label => (
              <span key={label} className="fx-badge fx-badge--neutral">
                {label}
              </span>
            )) : <span className="text-xs text-[var(--c-muted)]">Padrão</span>}
          </div>
        )
      )
    },
    {
      id: 'status',
      titulo: 'Status',
      tipo: 'status',
      render: (t) => <StatusBadge status={t.ativo ? 'Ativo' : 'Inativo'} />
    }
  ];

  return (
    <Pagina>
      {/* C2: apoio na faixa (decisão 02/09) — contagem + descrição em uma
          linha no próprio PageHeader. */}
      <PageHeader
        titulo="Tipos (Macro)"
        contagem={`${tiposFiltrados.length} tipo(s)`}
        descricao="Cadastro dos tipos macro utilizados nas solicitações."
        acaoPrincipal={{ rotulo: 'Novo tipo', onClick: abrirNovoTipo }}
      />

      {!formAberto && faixaAvisos}

      {/* R9 (docs/REGRAS-LAYOUT.md): cadastro raro abre em MODAL pela ação
          principal do cabeçalho; a lista é o bloco primário PERMANENTE.
          O ritmo vertical vem do Pagina. */}
      {formAberto && (
        <OverlayModal rotulo="Novo tipo" onFechar={() => setFormAberto(false)}>
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
            <h3 className="text-lg font-semibold text-[var(--c-text)]">Novo tipo</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setFormAberto(false)}>
              Fechar
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-3">
            {faixaAvisos}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormSecao legenda="Identificação" colunas={2}>
                <CampoForm label="Nome do tipo" obrigatorio>
                  <input
                    className="input w-full"
                    placeholder="Ex: Adm. Local"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                  />
                </CampoForm>
                <CampoForm
                  label="Código interno"
                  hint="Opcional; usado por integracoes e regras internas."
                >
                  <input
                    className="input w-full"
                    placeholder="Ex: SOLICITACAO_DE_COMPRA"
                    value={codigoInterno}
                    onChange={e => setCodigoInterno(e.target.value.toUpperCase())}
                  />
                </CampoForm>
              </FormSecao>

              <BlocoConteudo
                titulo="Comportamento do tipo"
                variante="secundario"
                recolhivel
                recolhidoPadrao
              >
                <CampoForm
                  label="Finalidade da data"
                  hint="Define o nome exibido na abertura da solicitação; a gravação e as regras permanecem as mesmas."
                >
                  <select
                    className="select w-full"
                    value={comportamento.finalidade_data_vencimento}
                    onChange={e => setComportamento(prev => ({
                      ...prev,
                      finalidade_data_vencimento: e.target.value
                    }))}
                  >
                    <option value={FINALIDADES_DATA_SOLICITACAO.RESPOSTA}>Data de Resposta</option>
                    <option value={FINALIDADES_DATA_SOLICITACAO.PAGAMENTO}>Data de Pagamento</option>
                  </select>
                </CampoForm>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {BEHAVIOR_FIELDS.map(field => (
                    <label key={field.key} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(comportamento[field.key])}
                        onChange={e => setComportamento(prev => ({ ...prev, [field.key]: e.target.checked }))}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </BlocoConteudo>

              <p className="app-note">
                O tipo é criado no cadastro geral e automaticamente vinculado ao setor selecionado na lista abaixo.
              </p>

              <div className="app-actionbar">
                <button type="submit" className="btn btn-primary">
                  Adicionar
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setFormAberto(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </OverlayModal>
      )}

      <BlocoConteudo
        titulo={setorAtual ? `Tipos do setor ${setorAtual.nome || setorAtual.codigo}` : 'Tipos'}
        variante="primario"
        cor="var(--c-primary)"
        acoes={(
          // R12: este select é seletor de CONTEXTO (define o setor listado
          // E a qual setor novos tipos são vinculados) — não é filtro.
          <label className="app-busca flex items-center gap-2 text-sm font-normal">
            <span className="text-[var(--c-muted)]">Setor</span>
            <select
              className="input input-sm flex-1"
              value={setorSelecionado}
              onChange={e => setSetorSelecionado(e.target.value)}
              aria-label="Setor dos tipos listados e do vínculo de novos tipos"
            >
              <option value="">Selecione</option>
              {setores.map(s => (
                <option key={s.id} value={setorKey(s)}>
                  {s.nome || s.codigo}
                </option>
              ))}
            </select>
          </label>
        )}
      >
        <TabelaPadrao
          colunas={colunas}
          itens={tiposFiltrados}
          storageKey="tabela:tipos-solicitacao"
          larguraAcoes={320}
          aoClicarLinha={(t) => {
            // Clique na linha abre a edição inline; com uma edição ativa
            // o clique não faz nada (evita perder o que foi digitado).
            if (editId === null) iniciarEdicao(t);
          }}
          vazio={{
            title: 'Nenhum tipo cadastrado',
            message: 'Use "Novo tipo" para criar o primeiro registro deste setor.'
          }}
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
                {t.ativo ? (
                  <button type="button" className="btn btn-outline btn-sm btn-perigo-suave" onClick={() => toggle(t)}>
                    Desativar
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(t)}>
                    Ativar
                  </button>
                )}
                <span className="app-actionbar-apartada">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm btn-perigo-suave"
                    onClick={() => excluir(t)}
                    title="Excluir definitivamente este tipo"
                  >
                    Excluir
                  </button>
                </span>
              </>
            )
          )}
        />
      </BlocoConteudo>

      {elementoConfirmacao}
    </Pagina>
  );
}
