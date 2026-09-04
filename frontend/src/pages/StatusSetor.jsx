import { useEffect, useState } from 'react';
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  FormSecao,
  CampoForm,
  Avisos,
  useAvisos
} from '../components/padrao';
import OverlayModal from '../components/ui/OverlayModal';
import { getSetores } from '../services/setores';
import {
  getStatusSetor,
  criarStatusSetor,
  atualizarStatusSetor,
  ativarStatusSetor,
  desativarStatusSetor
} from '../services/statusSetor';

export default function StatusSetor() {
  const [setores, setSetores] = useState([]);
  const [setor, setSetor] = useState('');
  const [status, setStatus] = useState([]);
  const [nome, setNome] = useState('');
  const [ordem, setOrdem] = useState(1);
  // null = modal de cadastro fechado (R9: cadastro raro não mora na tela).
  const [novoAberto, setNovoAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editOrdem, setEditOrdem] = useState(1);
  const [saving, setSaving] = useState(false);
  const [reordenando, setReordenando] = useState(false);
  // R3/R19: as duas chamadas de alert() desta tela viram faixa do sistema.
  const { avisos, avisar, fechar } = useAvisos();

  useEffect(() => {
    carregarSetores();
  }, []);

  useEffect(() => {
    if (setor) {
      carregarStatus(setor);
    } else {
      setStatus([]);
    }
  }, [setor]);

  async function carregarSetores() {
    try {
      const data = await getSetores();
      const lista = Array.isArray(data) ? data : [];
      setSetores(lista);
      if (lista.length > 0) {
        setSetor(lista[0].codigo);
      }
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao carregar setores');
    }
  }

  async function carregarStatus(cod) {
    try {
      const data = await getStatusSetor({ setor: cod });
      setStatus(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao carregar status do setor');
    }
  }

  function abrirNovoStatus() {
    setNome('');
    // Sugere o próximo lugar da fila em vez de recomeçar em 1 — a ordem
    // duplicada só apareceria depois de salvar.
    setOrdem(status.length + 1);
    setNovoAberto(true);
  }

  function fecharNovoStatus() {
    setNovoAberto(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setCriando(true);
      await criarStatusSetor({
        setor,
        nome,
        ordem: Number(ordem)
      });
      setNome('');
      setOrdem(1);
      setNovoAberto(false);
      avisar.sucesso('Status cadastrado.');
      carregarStatus(setor);
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao cadastrar status');
    } finally {
      setCriando(false);
    }
  }

  async function toggle(item) {
    try {
      if (item.ativo) {
        await desativarStatusSetor(item.id);
      } else {
        await ativarStatusSetor(item.id);
      }
      carregarStatus(setor);
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao mudar a situacao do status');
    }
  }

  function iniciarEdicao(item) {
    setEditId(item.id);
    setEditNome(item.nome);
    setEditOrdem(item.ordem);
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditOrdem(1);
  }

  async function salvarEdicao(id) {
    try {
      setSaving(true);
      await atualizarStatusSetor(id, {
        nome: editNome,
        ordem: Number(editOrdem)
      });
      cancelarEdicao();
      carregarStatus(setor);
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao salvar edicao');
    } finally {
      setSaving(false);
    }
  }

  async function reordenar() {
    try {
      setReordenando(true);
      const ordenado = [...status].sort((a, b) => a.ordem - b.ordem);
      await Promise.all(
        ordenado.map((item, index) =>
          atualizarStatusSetor(item.id, { ordem: index + 1 })
        )
      );
      carregarStatus(setor);
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao reordenar');
    } finally {
      setReordenando(false);
    }
  }

  // R16: UM dono para a faixa de avisos. Com o modal aberto ela vive dentro
  // dele (o erro do cadastro acontece com o modal aberto e ficaria atrás do
  // fundo escuro); com o modal fechado, logo abaixo do PageHeader.
  const faixaAvisos = <Avisos avisos={avisos} aoFechar={fechar} />;

  return (
    <Pagina>
      {/* C1/C2/R5/R13: título, contagem e apoio na faixa fixa do topo; as
          ações da tela ficam na barra do cabeçalho — inclusive "Reordenar",
          que antes vivia no card-header do bloco da lista (C5). */}
      <PageHeader
        titulo="Status por Setor"
        contagem={`${status.length} status`}
        descricao="Defina os status disponiveis por setor."
        secundarias={[{
          rotulo: reordenando ? 'Reordenando...' : 'Reordenar',
          onClick: reordenar,
          desabilitada: reordenando || status.length === 0
        }]}
        acaoPrincipal={{
          rotulo: 'Novo status',
          onClick: abrirNovoStatus,
          desabilitada: !setor
        }}
      />

      {!novoAberto && faixaAvisos}

      {/* R12: seletor de CONTEXTO (escolhe de qual setor são os status que a
          tela lista e cadastra), não filtro — continua sendo select. */}
      <BlocoConteudo titulo="Selecionar setor">
        <FormSecao colunas={2}>
          <CampoForm label="Setor">
            <select className="input w-full" value={setor} onChange={e => setSetor(e.target.value)}>
              {setores.map(s => (
                <option key={s.id} value={s.codigo}>
                  {s.nome}
                </option>
              ))}
            </select>
          </CampoForm>
        </FormSecao>
      </BlocoConteudo>

      {/* R9: cadastro de uso esporádico abre em MODAL — a tela inteira fica
          com a listagem. Mesmo handler, mesmo payload; só a moldura mudou. */}
      {novoAberto && (
        <OverlayModal aberto rotulo="Novo status do setor" onFechar={fecharNovoStatus}>
          <BlocoConteudo
            titulo="Novo status"
            acoes={(
              <button type="button" className="btn btn-outline btn-sm" onClick={fecharNovoStatus}>
                Fechar
              </button>
            )}
          >
            <form className="space-y-4" onSubmit={handleSubmit}>
              {faixaAvisos}

              <FormSecao legenda="Identificação" colunas={2}>
                <CampoForm label="Nome do status" obrigatorio span={2}>
                  <input
                    className="input w-full"
                    placeholder="Ex: Em analise"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                  />
                </CampoForm>
                <CampoForm label="Ordem" obrigatorio>
                  <input
                    className="input w-full"
                    type="number"
                    min="1"
                    value={ordem}
                    onChange={e => setOrdem(e.target.value)}
                    required
                  />
                </CampoForm>
              </FormSecao>

              <div className="app-actionbar">
                <button type="submit" className="btn btn-primary" disabled={criando}>
                  {criando ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button type="button" className="btn btn-outline" onClick={fecharNovoStatus}>
                  Cancelar
                </button>
              </div>
            </form>
          </BlocoConteudo>
        </OverlayModal>
      )}

      <BlocoConteudo
        titulo="Lista de status"
        variante="primario"
        cor="var(--c-primary)"
      >
        <TabelaPadrao
          colunas={[
            {
              id: 'ordem',
              titulo: 'Ordem',
              tipo: 'numero',
              render: s => (
                editId === s.id ? (
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={editOrdem}
                    onChange={e => setEditOrdem(e.target.value)}
                  />
                ) : (
                  s.ordem
                )
              )
            },
            {
              id: 'nome',
              titulo: 'Nome',
              // R17: o nome do status é o registro desta lista.
              tipo: 'identidade',
              noCard: 'titulo',
              render: s => (
                editId === s.id ? (
                  <input
                    className="input"
                    value={editNome}
                    onChange={e => setEditNome(e.target.value)}
                  />
                ) : (
                  s.nome
                )
              )
            },
            {
              id: 'ativo',
              titulo: 'Status',
              tipo: 'status',
              render: s => (s.ativo ? 'Ativo' : 'Inativo')
            }
          ]}
          itens={status}
          getId={s => s.id}
          storageKey="tabela:status-setor"
          rotuloRolagem="Status do setor"
          vazio="Nenhum status cadastrado"
          acoesLinha={s => (
            editId === s.id ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => salvarEdicao(s.id)} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>{' '}
                <button type="button" className="btn btn-outline btn-sm" onClick={cancelarEdicao} disabled={saving}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => iniciarEdicao(s)}>
                  Editar
                </button>{' '}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggle(s)}>
                  {s.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </>
            )
          )}
          larguraAcoes={200}
        />
      </BlocoConteudo>
    </Pagina>
  );
}
