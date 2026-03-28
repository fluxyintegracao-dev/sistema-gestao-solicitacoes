import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  arquivarConversasEmMassa,
  criarConversa,
  criarConversaEmMassa,
  desarquivarConversasEmMassa,
  getCaixaEntrada,
  getDestinatariosConversa
} from '../services/conversasInternas';
import { getSetores } from '../services/setores';
import { HiPaperClip } from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';

function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR');
}

function alternarSelecionado(lista, id) {
  if (lista.includes(id)) return lista.filter((item) => item !== id);
  return [...lista, id];
}

export default function ConversasEntrada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('ABERTAS');
  const [selecionadas, setSelecionadas] = useState([]);
  const [showNova, setShowNova] = useState(false);
  const [destinatarios, setDestinatarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [destinatariosMassaIds, setDestinatariosMassaIds] = useState([]);
  const [setoresMassaIds, setSetoresMassaIds] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [modoMassa, setModoMassa] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limitePorPagina, setLimitePorPagina] = useState(20);
  const [metaPaginacao, setMetaPaginacao] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });

  const arquivadas = aba === 'ARQUIVADAS';

  async function carregar() {
    try {
      setLoading(true);
      const data = await getCaixaEntrada({
        arquivadas,
        page: paginaAtual,
        limit: limitePorPagina
      });
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setItens(lista);
      setMetaPaginacao({
        page: Number(data?.meta?.page || paginaAtual),
        limit: Number(data?.meta?.limit || limitePorPagina),
        total: Number(data?.meta?.total || lista.length),
        total_pages: Number(data?.meta?.total_pages || (lista.length > 0 ? 1 : 0))
      });
      setSelecionadas([]);
      if (!arquivadas) {
        const userId = Number(user?.id);
        if (Number.isInteger(userId) && userId > 0) {
          localStorage.setItem(`conversas_entrada_last_seen_${userId}`, new Date().toISOString());
          window.dispatchEvent(new Event('conversas:entrada:seen'));
        }
      }
    } catch (error) {
      alert(error?.message || 'Erro ao carregar caixa de entrada');
    } finally {
      setLoading(false);
    }
  }

  async function arquivarOuDesarquivarEmMassa() {
    if (selecionadas.length === 0) {
      alert('Selecione ao menos uma conversa.');
      return;
    }
    try {
      if (arquivadas) {
        await desarquivarConversasEmMassa(selecionadas);
        alert('Conversas desarquivadas com sucesso.');
      } else {
        await arquivarConversasEmMassa(selecionadas);
        alert('Conversas arquivadas com sucesso.');
      }
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao processar arquivamento em massa');
    }
  }

  async function arquivarOuDesarquivarIndividual(conversaId) {
    try {
      if (arquivadas) {
        await desarquivarConversasEmMassa([conversaId]);
        alert('Conversa desarquivada com sucesso.');
      } else {
        await arquivarConversasEmMassa([conversaId]);
        alert('Conversa arquivada com sucesso.');
      }
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao processar conversa');
    }
  }

  async function abrirNovaConversa() {
    try {
      const [usuarios, setoresAtivos] = await Promise.all([
        getDestinatariosConversa(),
        getSetores()
      ]);
      setDestinatarios(Array.isArray(usuarios) ? usuarios : []);
      setSetores((Array.isArray(setoresAtivos) ? setoresAtivos : []).filter((item) => item.ativo !== false));
      setShowNova(true);
    } catch (error) {
      alert(error?.message || 'Erro ao carregar opções');
    }
  }

  async function salvarNovaConversa(e) {
    e.preventDefault();
    if (!assunto.trim()) return alert('Preencha o assunto.');
    if (!mensagem.trim() && arquivos.length === 0) return alert('Informe mensagem ou anexo.');

    try {
      setSalvando(true);
      if (modoMassa) {
        if (destinatariosMassaIds.length === 0 && setoresMassaIds.length === 0) {
          return alert('Selecione usuários e/ou setores.');
        }
        const result = await criarConversaEmMassa({
          assunto: assunto.trim(),
          mensagem: mensagem.trim(),
          destinatarios_ids: destinatariosMassaIds,
          setores_ids: setoresMassaIds,
          files: arquivos
        });
        alert(`Mensagens enviadas. Conversas criadas: ${result?.total || 0}.`);
      } else {
        if (!destinatarioId) return alert('Selecione o destinatário.');
        const result = await criarConversa({
          destinatario_id: Number(destinatarioId),
          assunto: assunto.trim(),
          mensagem: mensagem.trim(),
          files: arquivos
        });
        if (result?.id) navigate(`/conversas/${result.id}`);
      }
      setShowNova(false);
      setAssunto('');
      setMensagem('');
      setDestinatarioId('');
      setDestinatariosMassaIds([]);
      setSetoresMassaIds([]);
      setArquivos([]);
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao criar conversa');
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    setPaginaAtual(1);
  }, [aba, limitePorPagina]);

  useEffect(() => {
    carregar();
  }, [aba, user?.id, paginaAtual, limitePorPagina]);

  const totalAbertas = useMemo(
    () => itens.filter((item) => item.status === 'ABERTA').length,
    [itens]
  );
  const totalRegistros = Number(metaPaginacao.total || 0);
  const totalPaginas = Number(metaPaginacao.total_pages || 0);
  const paginaInicial = totalRegistros === 0 ? 0 : ((paginaAtual - 1) * limitePorPagina) + 1;
  const paginaFinal = totalRegistros === 0 ? 0 : Math.min(totalRegistros, paginaAtual * limitePorPagina);

  return (
    <div className="page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Caixa de Entrada</h1>
          <p className="page-subtitle">Conversas recebidas entre usuários.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[var(--c-muted)]">Abertas: {totalAbertas}</span>
          <button type="button" className="btn btn-outline" onClick={carregar}>Atualizar</button>
          <button type="button" className="btn btn-outline" onClick={arquivarOuDesarquivarEmMassa}>
            {arquivadas ? 'Desarquivar em massa' : 'Arquivar em massa'}
          </button>
          <button type="button" className="btn btn-primary" onClick={abrirNovaConversa}>Nova conversa</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            className={`btn ${aba === 'ABERTAS' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAba('ABERTAS')}
          >
            Abertas
          </button>
          <button
            type="button"
            className={`btn ${aba === 'ARQUIVADAS' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAba('ARQUIVADAS')}
          >
            Arquivadas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={itens.length > 0 && selecionadas.length === itens.length}
                    onChange={(e) =>
                      setSelecionadas(e.target.checked ? itens.map((item) => item.id) : [])
                    }
                  />
                </th>
                <th>Assunto</th>
                <th>Remetente</th>
                <th>Status</th>
                <th>Última mensagem</th>
                <th>Anexos</th>
                <th>Participantes</th>
                <th>Atualizado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="9" align="center">Carregando...</td>
                </tr>
              )}
              {!loading && itens.length === 0 && (
                <tr>
                  <td colSpan="9" align="center">Nenhuma conversa nesta aba.</td>
                </tr>
              )}
              {!loading && itens.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selecionadas.includes(item.id)}
                      onChange={() =>
                        setSelecionadas((prev) => alternarSelecionado(prev, item.id))
                      }
                    />
                  </td>
                  <td>{item.assunto}</td>
                  <td>{item.criador?.nome || '-'}</td>
                  <td>{item.status}</td>
                  <td>{item.ultima_mensagem?.mensagem || '-'}</td>
                  <td>{item.anexos_total ?? 0}</td>
                  <td>{item.participantes_total ?? 0}</td>
                  <td>{formatarDataHora(item.updatedAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate(`/conversas/${item.id}`, { state: { origemConversa: 'entrada' } })}
                      >
                        Abrir chat
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => arquivarOuDesarquivarIndividual(item.id)}
                      >
                        {arquivadas ? 'Desarquivar' : 'Arquivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-[var(--c-muted)]">
            {totalRegistros > 0
              ? `Exibindo ${paginaInicial}-${paginaFinal} de ${totalRegistros} conversas`
              : 'Nenhuma conversa nesta aba.'}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span>Por página</span>
              <select
                className="input !w-auto min-w-[88px]"
                value={limitePorPagina}
                onChange={(e) => setLimitePorPagina(Number(e.target.value) || 20)}
              >
                {[10, 20, 50, 100].map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                disabled={paginaAtual <= 1}
              >
                Anterior
              </button>
              <span className="text-sm min-w-[96px] text-center">
                Página {paginaAtual} de {Math.max(totalPaginas, 1)}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPaginaAtual((prev) => Math.min(Math.max(totalPaginas, 1), prev + 1))}
                disabled={totalPaginas === 0 || paginaAtual >= totalPaginas}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNova && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4" onClick={() => !salvando && setShowNova(false)}>
          <div className="card w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">Nova conversa</h2>
            <form className="grid gap-3" onSubmit={salvarNovaConversa}>
              <div className="flex items-center gap-2">
                <button type="button" className={`btn ${!modoMassa ? 'btn-primary' : 'btn-outline'}`} onClick={() => setModoMassa(false)}>Individual</button>
                <button type="button" className={`btn ${modoMassa ? 'btn-primary' : 'btn-outline'}`} onClick={() => setModoMassa(true)}>Em massa</button>
              </div>

              {!modoMassa ? (
                <label className="text-sm">
                  <span className="block mb-1">Destinatário</span>
                  <select
                    value={destinatarioId}
                    onChange={(e) => setDestinatarioId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-[var(--c-text)]"
                  >
                    <option value="">Selecione...</option>
                    {destinatarios.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.nome} ({dest.setor?.nome || 'Sem setor'})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="block mb-1">Usuários</span>
                    <div className="w-full min-h-[160px] max-h-[220px] overflow-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 space-y-1">
                      {destinatarios.map((dest) => (
                        <label key={dest.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={destinatariosMassaIds.includes(Number(dest.id))}
                            onChange={() =>
                              setDestinatariosMassaIds((prev) => alternarSelecionado(prev, Number(dest.id)))
                            }
                          />
                          <span>{dest.nome} ({dest.setor?.nome || 'Sem setor'})</span>
                        </label>
                      ))}
                    </div>
                  </label>

                  <label className="text-sm">
                    <span className="block mb-1">Setores</span>
                    <div className="w-full min-h-[160px] max-h-[220px] overflow-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 space-y-1">
                      {setores.map((setor) => (
                        <label key={setor.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setoresMassaIds.includes(Number(setor.id))}
                            onChange={() =>
                              setSetoresMassaIds((prev) => alternarSelecionado(prev, Number(setor.id)))
                            }
                          />
                          <span>{setor.nome}</span>
                        </label>
                      ))}
                    </div>
                  </label>
                </div>
              )}

              <label className="text-sm">
                <span className="block mb-1">Assunto</span>
                <input className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
              </label>

              <label className="text-sm">
                <span className="block mb-1">Mensagem</span>
                <textarea className="w-full min-h-[120px] rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
              </label>

              <div className="text-sm">
                <span className="block mb-1">Anexos</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className={`btn btn-outline inline-flex items-center gap-2 cursor-pointer ${salvando ? 'opacity-60 pointer-events-none' : ''}`}>
                    <HiPaperClip className="w-4 h-4" />
                    <span>Anexar arquivos</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      disabled={salvando}
                      onChange={(e) => {
                        const novos = Array.from(e.target.files || []);
                        if (novos.length > 0) setArquivos((prev) => [...prev, ...novos]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span className="text-xs text-[var(--c-muted)]">
                    {arquivos.length > 0
                      ? `${arquivos.length} arquivo(s) selecionado(s)`
                      : 'Nenhum arquivo selecionado'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowNova(false)} disabled={salvando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
