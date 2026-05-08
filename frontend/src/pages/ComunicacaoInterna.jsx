import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HiOutlineArchiveBox,
  HiOutlineArrowUturnLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronLeft,
  HiOutlineInformationCircle,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineXMark,
  HiPaperClip
} from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import { getSetores } from '../services/setores';
import {
  arquivarConversasEmMassa,
  criarConversa,
  criarConversaEmMassa,
  deletarMensagemConversa,
  desarquivarConversasEmMassa,
  editarMensagemConversa,
  enviarMensagemConversa,
  getConversa,
  getDestinatariosConversa,
  getMensagens,
  listarConversas,
  marcarLida
} from '../services/conversasInternas';
import PendingAttachmentsList from '../components/attachments/PendingAttachmentsList';
import {
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite
} from '../utils/pendingAttachments';

const LIST_POLL_INTERVAL_MS = 15000;
const ACTIVE_CHAT_POLL_INTERVAL_MS = 5000;

function formatHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  const mesmodia =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear();
  if (mesmodia) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDataHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function nomeConversa(conv, userId) {
  if (!conv) return '';
  if (conv.is_group) return conv.setor_grupo?.nome ? `Grupo: ${conv.setor_grupo.nome}` : conv.assunto;
  if (conv.criador?.id === userId) return conv.destinatario?.nome || conv.assunto;
  return conv.criador?.nome || conv.assunto;
}

function setorConversa(conv, userId) {
  if (!conv || conv.is_group) return '';
  const usuario = conv.criador?.id === userId ? conv.destinatario : conv.criador;
  return usuario?.setor?.nome || usuario?.setor?.codigo || '';
}

function timestampConversa(conv) {
  const data = new Date(conv?.last_message_at || conv?.updatedAt || conv?.createdAt || 0);
  return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}


function isMensagemVista(msg, participantesLeitura, userId) {
  const msgTime = new Date(msg.createdAt).getTime();
  return participantesLeitura.some(
    (p) => p.usuario_id !== userId && p.lida_em && new Date(p.lida_em).getTime() >= msgTime
  );
}

function TicksMensagem({ vista }) {
  if (vista) {
    return (
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M1 5L4.5 8.5L10 1.5" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5L9.5 8.5L15 1.5" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M1 5L4.5 8.5L11 1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AvatarConversa({ conv, size = 9 }) {
  const isGroup = conv?.is_group;
  const nome = conv?.assunto || '';
  const inicial = isGroup ? '#' : nome.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size * 4,
        height: size * 4,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 14,
        fontWeight: 700,
        background: isGroup ? '#ede9fe' : '#dbeafe',
        color: isGroup ? '#6d28d9' : '#1d4ed8'
      }}
    >
      {inicial}
    </div>
  );
}

export default function ComunicacaoInterna() {
  const { user } = useAuth();
  const userId = user?.id;

  const [conversas, setConversas] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [busca, setBusca] = useState('');
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [oldestId, setOldestId] = useState(null);
  const [loadingMais, setLoadingMais] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState('');
  const [mobileModo, setMobileModo] = useState('lista');
  const [isMobile, setIsMobile] = useState(false);
  const [participantesLeitura, setParticipantesLeitura] = useState([]);
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [menuMsgOpenUpward, setMenuMsgOpenUpward] = useState(true);
  const [infoMsg, setInfoMsg] = useState(null);
  const [mostrandoArquivadas, setMostrandoArquivadas] = useState(false);
  const [mensagemRespondendo, setMensagemRespondendo] = useState(null);

  // Modal nova conversa
  const [showNova, setShowNova] = useState(false);
  const [modoMassa, setModoMassa] = useState(false);
  const [assuntoNova, setAssuntoNova] = useState('');
  const [mensagemNova, setMensagemNova] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [destinatariosMassaIds, setDestinatariosMassaIds] = useState([]);
  const [setoresMassaIds, setSetoresMassaIds] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [arquivosNova, setArquivosNova] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const chatEndRef = useRef(null);
  const mensagensContainerRef = useRef(null);
  const inputRef = useRef(null);
  const mensagensRef = useRef([]);
  const msgElemsRef = useRef({});

  const adicionarArquivosConversa = useCallback((files) => {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivos, files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivos(proximoEstado);
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }, [arquivos]);

  const adicionarArquivosNovaConversa = useCallback((files) => {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivosNova, files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivosNova(proximoEstado);
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }, [arquivosNova]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollChatToTop = useCallback(() => {
    if (mensagensContainerRef.current) {
      mensagensContainerRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const scrollToMessage = useCallback((msgId) => {
    const el = msgElemsRef.current[Number(msgId)];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.style.transition = 'background-color 0.15s ease';
    el.style.backgroundColor = 'rgba(74,144,217,0.18)';
    el.style.borderRadius = '12px';
    setTimeout(() => {
      el.style.backgroundColor = '';
      el.style.borderRadius = '';
    }, 1400);
  }, []);

  useEffect(() => {
    mensagensRef.current = mensagens;
  }, [mensagens]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const carregarLista = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingLista(true);
      const params = { limit: 100 };
      if (mostrandoArquivadas) params.arquivadas = true;
      const data = await listarConversas(params);
      setConversas(data?.items || []);
    } catch {
      // silencioso
    } finally {
      if (!silent) setLoadingLista(false);
    }
  }, [mostrandoArquivadas]);

  useEffect(() => {
    carregarLista();
    const interval = setInterval(() => carregarLista(true), LIST_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [carregarLista]);

  const abrirConversa = useCallback(async (conv) => {
    setConversaAtiva(conv.id);
    setMensagens([]);
    setTemMais(false);
    setOldestId(null);
    setTexto('');
    setArquivos([]);
    setParticipantesLeitura([]);
    setMenuMsgId(null);
    setInfoMsg(null);
    setMensagemRespondendo(null);
    setMobileModo('chat');
    setLoadingChat(true);
    try {
      const [det, msgs] = await Promise.all([
        getConversa(conv.id),
        getMensagens(conv.id, { limit: 50 })
      ]);
      setDetalhe(det);
      setMensagens(msgs?.mensagens || []);
      setTemMais(!!msgs?.tem_mais);
      setOldestId(msgs?.oldest_id || null);
      setParticipantesLeitura(msgs?.participantes_leitura || []);
      await marcarLida(conv.id).catch(() => {});
      setConversas((prev) => prev.map((c) => c.id === conv.id ? { ...c, tem_novidade: false } : c));
    } catch {
      // erro ao carregar
    } finally {
      setLoadingChat(false);
      setTimeout(scrollChatToTop, 100);
    }
  }, [scrollChatToTop]);

  const carregarMais = useCallback(async () => {
    if (!conversaAtiva || !oldestId || loadingMais) return;
    setLoadingMais(true);
    try {
      const data = await getMensagens(conversaAtiva, { before_id: oldestId, limit: 50 });
      setMensagens((prev) => [...(data?.mensagens || []), ...prev]);
      setTemMais(!!data?.tem_mais);
      setOldestId(data?.oldest_id || null);
      if (data?.participantes_leitura) setParticipantesLeitura(data.participantes_leitura);
    } catch {
      // erro
    } finally {
      setLoadingMais(false);
    }
  }, [conversaAtiva, oldestId, loadingMais]);

  const carregarNovasMensagens = useCallback(async () => {
    if (!conversaAtiva || loadingChat) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const ultimaMensagem = mensagensRef.current[mensagensRef.current.length - 1];
    const afterId = Number(ultimaMensagem?.id || 0);
    if (!afterId) return;

    try {
      const data = await getMensagens(conversaAtiva, { after_id: afterId, limit: 50 });
      if (data?.participantes_leitura) setParticipantesLeitura(data.participantes_leitura);
      const novas = data?.mensagens || [];
      if (!novas.length) return;

      setMensagens((prev) => {
        const existentes = new Set(prev.map((m) => Number(m.id)));
        return [...prev, ...novas.filter((m) => !existentes.has(Number(m.id)))];
      });

      const ultimaNova = novas[novas.length - 1];
      const previewAutor = Number(ultimaNova.usuario_id) === Number(userId) ? 'Voce' : (ultimaNova.autor?.nome || 'Mensagem');
      setConversas((prev) =>
        prev.map((c) => c.id === conversaAtiva
          ? {
              ...c,
              last_message_at: ultimaNova.createdAt || new Date().toISOString(),
              last_message_preview: `${previewAutor}: ${ultimaNova.mensagem || ''}`,
              tem_novidade: false
            }
          : c
        ).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
      );

      await marcarLida(conversaAtiva).catch(() => {});
      setTimeout(scrollToBottom, 50);
    } catch {
      // polling silencioso para nao interromper o usuario durante digitacao
    }
  }, [conversaAtiva, loadingChat, scrollToBottom, userId]);

  useEffect(() => {
    if (!conversaAtiva) return undefined;
    const interval = setInterval(carregarNovasMensagens, ACTIVE_CHAT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversaAtiva, carregarNovasMensagens]);

  const enviar = useCallback(async () => {
    if (!conversaAtiva || enviando) return;
    const msg = texto.trim();
    if (!msg && arquivos.length === 0) return;
    setEnviando(true);
    const textoEnviado = msg;
    const arquivosEnviados = arquivos;
    const citacaoAtual = mensagemRespondendo;
    setTexto('');
    setArquivos([]);
    setMensagemRespondendo(null);
    try {
      const nova = await enviarMensagemConversa(
        conversaAtiva,
        textoEnviado,
        extrairFilesAnexosPendentes(arquivosEnviados),
        citacaoAtual?.id || null
      );
      setMensagens((prev) => [...prev, {
        id: nova.id,
        conversa_id: conversaAtiva,
        usuario_id: userId,
        mensagem: nova.mensagem || textoEnviado,
        createdAt: nova.createdAt || new Date().toISOString(),
        editada_em: null,
        pode_editar: true,
        pode_deletar: true,
        citacao_id: nova.citacao_id || citacaoAtual?.id || null,
        citacao: nova.citacao || (citacaoAtual ? { id: citacaoAtual.id, mensagem: citacaoAtual.mensagem, autor: citacaoAtual.autor || null } : null),
        autor: { id: userId, nome: user?.nome },
        anexos: []
      }]);
      const agora = new Date().toISOString();
      setConversas((prev) =>
        prev.map((c) => c.id === conversaAtiva
          ? { ...c, last_message_at: agora, last_message_preview: `Você: ${textoEnviado}`, tem_novidade: false }
          : c
        ).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
      );
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setTexto(textoEnviado);
      setArquivos(arquivosEnviados);
      alert(err.message || 'Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }, [conversaAtiva, enviando, texto, arquivos, mensagemRespondendo, userId, user, scrollToBottom]);

  const deletarMensagem = useCallback(async (msgId) => {
    if (!window.confirm('Excluir esta mensagem?')) return;
    try {
      await deletarMensagemConversa(msgId);
      setMensagens((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      alert(err.message || 'Erro ao excluir mensagem');
    }
  }, []);

  const salvarEdicao = useCallback(async () => {
    if (!editandoId) return;
    const txt = textoEdicao.trim();
    if (!txt) return;
    try {
      await editarMensagemConversa(editandoId, txt);
      setMensagens((prev) => prev.map((m) => m.id === editandoId ? { ...m, mensagem: txt, editada_em: new Date().toISOString() } : m));
      setEditandoId(null);
      setTextoEdicao('');
    } catch (err) {
      alert(err.message || 'Erro ao editar');
    }
  }, [editandoId, textoEdicao]);

  const handleArquivar = useCallback(async () => {
    if (!conversaAtiva) return;
    try {
      await arquivarConversasEmMassa([conversaAtiva]);
      setConversaAtiva(null);
      setDetalhe(null);
      setMensagens([]);
      setMobileModo('lista');
      await carregarLista();
    } catch (err) { alert(err.message || 'Erro'); }
  }, [conversaAtiva, carregarLista]);

  const handleDesarquivar = useCallback(async () => {
    if (!conversaAtiva) return;
    try {
      await desarquivarConversasEmMassa([conversaAtiva]);
      setConversaAtiva(null);
      setDetalhe(null);
      setMensagens([]);
      setMobileModo('lista');
      await carregarLista();
    } catch (err) { alert(err.message || 'Erro'); }
  }, [conversaAtiva, carregarLista]);

  const toggleArquivadas = useCallback(() => {
    setMostrandoArquivadas((v) => !v);
    setConversaAtiva(null);
    setDetalhe(null);
    setMensagens([]);
    setMobileModo('lista');
  }, []);

  const abrirModalNova = useCallback(async () => {
    setShowNova(true);
    setModoMassa(false);
    setAssuntoNova('');
    setMensagemNova('');
    setDestinatarioId('');
    setDestinatariosMassaIds([]);
    setSetoresMassaIds([]);
    setArquivosNova([]);
    try {
      const [dests, sets] = await Promise.all([getDestinatariosConversa(), getSetores()]);
      setDestinatarios(dests || []);
      setSetores(sets || []);
    } catch { /* silencioso */ }
  }, []);

  const salvarNovaConversa = useCallback(async (e) => {
    e?.preventDefault();
    if (!assuntoNova.trim()) { alert('Informe o assunto'); return; }
    if (!mensagemNova.trim() && arquivosNova.length === 0) { alert('Informe a mensagem ou anexo'); return; }
    setSalvando(true);
    try {
      if (modoMassa) {
        if (destinatariosMassaIds.length === 0 && setoresMassaIds.length === 0) {
          alert('Selecione ao menos um destinatário ou setor');
          setSalvando(false);
          return;
        }
        await criarConversaEmMassa({
          assunto: assuntoNova, mensagem: mensagemNova,
          destinatarios_ids: destinatariosMassaIds,
          setores_ids: setoresMassaIds,
          files: extrairFilesAnexosPendentes(arquivosNova)
        });
        setShowNova(false);
        await carregarLista();
      } else {
        if (!destinatarioId) { alert('Selecione um destinatário'); setSalvando(false); return; }
        const res = await criarConversa({
          destinatario_id: destinatarioId,
          assunto: assuntoNova,
          mensagem: mensagemNova,
          files: extrairFilesAnexosPendentes(arquivosNova)
        });
        setShowNova(false);
        const lista = await listarConversas({ limit: 100 });
        const items = lista?.items || [];
        setConversas(items);
        const found = items.find((c) => c.id === res?.id);
        if (found) abrirConversa(found);
      }
    } catch (err) {
      alert(err.message || 'Erro ao criar conversa');
    } finally {
      setSalvando(false);
    }
  }, [assuntoNova, mensagemNova, arquivosNova, modoMassa, destinatarioId, destinatariosMassaIds, setoresMassaIds, carregarLista, abrirConversa]);

  const conversasFiltradas = conversas
    .filter((c) => {
      if (!busca) return true;
      const q = busca.toLowerCase();
      return nomeConversa(c, userId).toLowerCase().includes(q) || (c.assunto || '').toLowerCase().includes(q);
    })
    .sort((a, b) => timestampConversa(b) - timestampConversa(a));

  const mostrarLista = !isMobile || mobileModo === 'lista';
  const mostrarChat = !isMobile || mobileModo === 'chat';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* === PAINEL ESQUERDO — lista === */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: mostrarLista ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight: '1px solid var(--c-border)',
          background: 'var(--c-surface)'
        }}
        className="md:flex"
      >
        {/* Cabeçalho */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {mostrandoArquivadas && (
              <button
                onClick={toggleArquivadas}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                title="Voltar"
              >
                <HiOutlineChevronLeft size={16} />
              </button>
            )}
            {mostrandoArquivadas ? 'Arquivadas' : 'Comunicação Interna'}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!mostrandoArquivadas && (
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={abrirModalNova}>
                + Nova
              </button>
            )}
            <button
              onClick={toggleArquivadas}
              className="btn btn-outline"
              style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              title={mostrandoArquivadas ? 'Ver conversas ativas' : 'Ver arquivadas'}
            >
              <HiOutlineArchiveBox size={15} />
            </button>
          </div>
        </div>

        {/* Busca */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-border)' }}>
          <input
            className="input"
            style={{ fontSize: 13 }}
            placeholder="Buscar conversa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Lista de conversas */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingLista && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--c-muted)', fontSize: 13 }}>Carregando...</div>
          )}
          {!loadingLista && conversasFiltradas.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-muted)', fontSize: 13 }}>
              <p>Nenhuma conversa</p>
              <button onClick={abrirModalNova} style={{ color: 'var(--c-primary)', textDecoration: 'underline', fontSize: 12, marginTop: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                Criar nova conversa
              </button>
            </div>
          )}
          {conversasFiltradas.map((conv) => {
            const ativa = conv.id === conversaAtiva;
            const nome = nomeConversa(conv, userId);
            const setor = setorConversa(conv, userId);
            return (
              <button
                key={conv.id}
                onClick={() => abrirConversa(conv)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  background: ativa ? 'var(--c-primary-soft, rgba(37,99,235,0.08))' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  border: 'none',
                  borderBottom: '1px solid var(--c-border)'
                }}
                onMouseEnter={(e) => { if (!ativa) e.currentTarget.style.background = 'var(--c-hover, rgba(0,0,0,0.04))'; }}
                onMouseLeave={(e) => { if (!ativa) e.currentTarget.style.background = 'transparent'; }}
              >
                <AvatarConversa conv={conv} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: conv.tem_novidade ? 700 : 500, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nome}{setor ? ` (${setor})` : ''}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--c-muted)', flexShrink: 0 }}>{formatHora(conv.last_message_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--c-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {conv.last_message_preview || conv.assunto}
                    </span>
                    {conv.tem_novidade && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)', flexShrink: 0 }} />
                    )}
                  </div>
                  {conv.status === 'CONCLUIDA' && (
                    <span style={{ fontSize: 10, color: 'var(--c-muted)', background: 'var(--c-border)', padding: '1px 5px', borderRadius: 4 }}>concluída</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* === PAINEL DIREITO — chat === */}
      <div style={{ flex: 1, minWidth: 0, display: mostrarChat ? 'flex' : 'none', flexDirection: 'column' }} className="md:flex">
        {!conversaAtiva ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)', gap: 12 }}>
            <HiOutlineChatBubbleLeftRight size={40} style={{ opacity: 0.35 }} />
            <span style={{ fontSize: 14 }}>Selecione uma conversa ou crie uma nova</span>
            {!mostrandoArquivadas && (
              <button onClick={abrirModalNova} className="btn btn-outline" style={{ fontSize: 13 }}>Nova conversa</button>
            )}
          </div>
        ) : (
          <>
            {/* Cabeçalho do chat */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button className="md:hidden" style={{ color: 'var(--c-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setMobileModo('lista')}>
                <HiOutlineChevronLeft size={20} />
              </button>
              <AvatarConversa conv={detalhe?.conversa} size={8} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nomeConversa(detalhe?.conversa, userId)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--c-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detalhe?.conversa?.assunto}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {mostrandoArquivadas ? (
                  <button onClick={handleDesarquivar} className="btn btn-outline" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Desarquivar">
                    <HiOutlineArrowUturnLeft size={15} />
                  </button>
                ) : (
                  <button onClick={handleArquivar} className="btn btn-outline" style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Arquivar">
                    <HiOutlineArchiveBox size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Área de mensagens */}
            <div ref={mensagensContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingChat ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)', fontSize: 13 }}>Carregando...</div>
              ) : (
                <>
                  {/* Spacer empurra mensagens para baixo quando há poucas */}
                  <div style={{ flex: 1 }} />
                  {temMais && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                      <button
                        onClick={carregarMais}
                        disabled={loadingMais}
                        style={{ color: 'var(--c-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                      >
                        {loadingMais ? 'Carregando...' : 'Carregar mensagens anteriores'}
                      </button>
                    </div>
                  )}
                  {menuMsgId && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenuMsgId(null)} />
                  )}
                  {mensagens.map((msg) => {
                    const euSou = msg.usuario_id === userId;
                    const menuAberto = menuMsgId === msg.id;
                    const vista = euSou && isMensagemVista(msg, participantesLeitura, userId);
                    return (
                      <div
                        key={msg.id}
                        ref={(el) => { if (el) msgElemsRef.current[Number(msg.id)] = el; else delete msgElemsRef.current[Number(msg.id)]; }}
                        style={{ display: 'flex', justifyContent: euSou ? 'flex-end' : 'flex-start' }}
                      >
                        <div style={{ position: 'relative', maxWidth: '72%' }}>
                          {/* Botão seta — sempre visível */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuMsgOpenUpward(rect.top > 200);
                              setMenuMsgId(menuAberto ? null : msg.id);
                            }}
                            style={{
                              position: 'absolute', top: 6, right: 6, zIndex: 20,
                              width: 18, height: 18, borderRadius: '50%',
                              background: euSou ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.07)',
                              border: 'none', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              color: euSou ? '#fff' : 'var(--c-muted)', fontSize: 9, lineHeight: 1,
                              transition: 'background 0.15s'
                            }}
                          >▾</button>

                          {/* Dropdown menu — direção dinâmica */}
                          {menuAberto && (
                            <div style={{
                              position: 'absolute',
                              ...(menuMsgOpenUpward
                                ? { bottom: '100%', marginBottom: 4 }
                                : { top: '100%', marginTop: 4 }),
                              right: 0, zIndex: 30,
                              background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                              minWidth: 150, overflow: 'hidden'
                            }}>
                                <button
                                onClick={() => { setMensagemRespondendo(msg); setMenuMsgId(null); inputRef.current?.focus(); }}
                                style={{ display: 'flex', width: '100%', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text)', gap: 8, alignItems: 'center' }}
                              ><HiOutlineArrowUturnLeft size={14} /> Responder</button>
                              {msg.pode_editar && (
                                <button
                                  onClick={() => { setEditandoId(msg.id); setTextoEdicao(msg.mensagem); setMenuMsgId(null); }}
                                  style={{ display: 'flex', width: '100%', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text)', gap: 8, alignItems: 'center' }}
                                ><HiOutlinePencil size={14} /> Editar</button>
                              )}
                              {msg.pode_deletar && (
                                <button
                                  onClick={() => { deletarMensagem(msg.id); setMenuMsgId(null); }}
                                  style={{ display: 'flex', width: '100%', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', gap: 8, alignItems: 'center' }}
                                ><HiOutlineTrash size={14} /> Excluir</button>
                              )}
                              <button
                                onClick={() => { setInfoMsg(msg); setMenuMsgId(null); }}
                                style={{ display: 'flex', width: '100%', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text)', gap: 8, alignItems: 'center', borderTop: '1px solid var(--c-border)' }}
                              ><HiOutlineInformationCircle size={14} /> Informações</button>
                            </div>
                          )}

                          {/* Bolha */}
                          <div style={{
                            borderRadius: euSou ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            padding: '8px 14px',
                            fontSize: 13,
                            background: euSou ? '#4a90d9' : 'var(--c-surface)',
                            color: euSou ? '#ffffff' : 'var(--c-text)',
                            border: euSou ? 'none' : '1px solid var(--c-border)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                          }}>
                            {!euSou && (
                              <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: 'var(--c-primary)' }}>{msg.autor?.nome}</p>
                            )}
                            {msg.citacao && (
                              <div
                                onClick={() => scrollToMessage(msg.citacao.id)}
                                style={{
                                  background: euSou ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.05)',
                                  borderLeft: `4px solid ${euSou ? 'rgba(255,255,255,0.75)' : 'var(--c-primary)'}`,
                                  borderRadius: '0 6px 6px 0',
                                  padding: '6px 10px',
                                  marginBottom: 8,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, overflow: 'hidden' }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: euSou ? 'rgba(255,255,255,0.95)' : 'var(--c-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {euSou ? 'Você' : (msg.autor?.nome || 'Alguém')}
                                  </span>
                                  <span style={{ fontSize: 10, color: euSou ? 'rgba(255,255,255,0.55)' : 'var(--c-muted)', flexShrink: 0 }}>respondeu</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: euSou ? 'rgba(255,255,255,0.85)' : 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {msg.citacao.autor?.nome || 'Mensagem'}
                                  </span>
                                </div>
                                <p style={{ fontSize: 12, margin: 0, color: euSou ? 'rgba(255,255,255,0.78)' : 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {msg.citacao.mensagem}
                                </p>
                              </div>
                            )}
                            {editandoId === msg.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <textarea
                                  className="input"
                                  rows={2}
                                  style={{ fontSize: 13, resize: 'none', color: 'var(--c-text)' }}
                                  value={textoEdicao}
                                  onChange={(e) => setTextoEdicao(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={salvarEdicao} className="btn btn-primary" style={{ fontSize: 11, padding: '2px 8px' }}>Salvar</button>
                                  <button onClick={() => setEditandoId(null)} style={{ fontSize: 11, color: euSou ? 'rgba(255,255,255,0.7)' : 'var(--c-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, paddingRight: 20 }}>{msg.mensagem}</p>
                            )}
                            {msg.anexos?.length > 0 && (
                              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {msg.anexos.map((a) => (
                                  <a key={a.id} href={a.caminho} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: euSou ? 'rgba(255,255,255,0.8)' : 'var(--c-primary)', textDecoration: 'underline' }}>
                                    📎 {a.nome_arquivo}
                                  </a>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 }}>
                              <span style={{ fontSize: 10, color: euSou ? 'rgba(255,255,255,0.6)' : 'var(--c-muted)' }}>
                                {formatDataHora(msg.createdAt)}{msg.editada_em ? ' (editada)' : ''}
                              </span>
                              {euSou && <TicksMensagem vista={vista} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input de mensagem */}
            <div style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-surface)', padding: '10px 16px', flexShrink: 0 }}>
                {mensagemRespondendo && (
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--c-border)', background: 'var(--c-bg, #f8fafc)' }}>
                    <div style={{ width: 4, flexShrink: 0, background: 'var(--c-primary)' }} />
                    <div style={{ flex: 1, minWidth: 0, padding: '6px 10px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-primary)', margin: '0 0 2px' }}>{mensagemRespondendo.autor?.nome || 'Mensagem'}</p>
                      <p style={{ fontSize: 12, color: 'var(--c-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{mensagemRespondendo.mensagem}</p>
                    </div>
                    <button onClick={() => setMensagemRespondendo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: '0 10px', flexShrink: 0 }}>
                      <HiOutlineXMark size={16} />
                    </button>
                  </div>
                )}
                <PendingAttachmentsList
                  items={arquivos}
                  onRemove={(index) => setArquivos((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  className="mb-2 space-y-2"
                  itemClassName="flex items-center justify-between gap-3 rounded border border-[var(--c-border)] bg-[var(--c-bg, #fff)] px-3 py-2 text-sm"
                  removeButtonClassName="text-red-600 font-semibold px-2"
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    placeholder="Digite uma mensagem... (Enter para enviar)"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                    style={{ flex: 1, fontSize: 13, resize: 'none', minHeight: 38, maxHeight: 120, borderRadius: 20, padding: '8px 14px', border: '1px solid var(--c-border)', background: 'var(--c-bg, #fff)', color: 'var(--c-text)', outline: 'none' }}
                  />
                  <label
                    className="btn btn-outline"
                    title="Anexar arquivos"
                    style={{ width: 38, height: 38, padding: 0, borderRadius: 20, flexShrink: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <HiPaperClip size={18} />
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        adicionarArquivosConversa(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    onClick={enviar}
                    disabled={enviando || (!texto.trim() && arquivos.length === 0)}
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: '8px 18px', borderRadius: 20, flexShrink: 0 }}
                  >
                    {enviando ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
          </>
        )}
      </div>

      {/* === MODAL informações da mensagem === */}
      {infoMsg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setInfoMsg(null)}
        >
          <div
            style={{ background: 'var(--c-surface)', borderRadius: 12, padding: '20px 24px', minWidth: 260, maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>Informações da mensagem</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--c-muted)', display: 'block', marginBottom: 2 }}>Enviada por</span>
                <span style={{ fontWeight: 500, color: 'var(--c-text)' }}>{infoMsg.autor?.nome || 'Desconhecido'}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--c-muted)', display: 'block', marginBottom: 2 }}>Enviada em</span>
                <span style={{ color: 'var(--c-text)' }}>{formatDataHora(infoMsg.createdAt)}</span>
              </div>
              {infoMsg.editada_em && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--c-muted)', display: 'block', marginBottom: 2 }}>Editada em</span>
                  <span style={{ color: 'var(--c-text)' }}>{formatDataHora(infoMsg.editada_em)}</span>
                </div>
              )}
              <div>
                <span style={{ fontSize: 11, color: 'var(--c-muted)', display: 'block', marginBottom: 2 }}>Visualização</span>
                {(() => {
                  const msgTime = new Date(infoMsg.createdAt).getTime();
                  const leituras = participantesLeitura.filter(
                    (p) => p.usuario_id !== infoMsg.usuario_id && p.lida_em && new Date(p.lida_em).getTime() >= msgTime
                  );
                  if (leituras.length === 0) {
                    return <span style={{ color: 'var(--c-muted)', fontStyle: 'italic' }}>Ainda não visualizada</span>;
                  }
                  return leituras.map((p) => (
                    <span key={p.usuario_id} style={{ color: '#2563eb', display: 'block' }}>✓✓ {formatDataHora(p.lida_em)}</span>
                  ));
                })()}
              </div>
            </div>
            <button
              onClick={() => setInfoMsg(null)}
              className="btn btn-outline"
              style={{ marginTop: 18, width: '100%', fontSize: 13 }}
            >Fechar</button>
          </div>
        </div>
      )}

      {/* === MODAL nova conversa === */}
      {showNova && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => !salvando && setShowNova(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-text)', margin: 0 }}>Nova Conversa</h2>
              <button onClick={() => setShowNova(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--c-muted)', lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={salvarNovaConversa} style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Modo */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn ${!modoMassa ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, fontSize: 13 }} onClick={() => setModoMassa(false)}>
                  Individual
                </button>
                <button type="button" className={`btn ${modoMassa ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, fontSize: 13 }} onClick={() => setModoMassa(true)}>
                  Em Massa / Setor
                </button>
              </div>

              {/* Assunto */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>Assunto</span>
                <input
                  className="input"
                  value={assuntoNova}
                  onChange={(e) => setAssuntoNova(e.target.value)}
                  placeholder="Assunto da conversa"
                />
              </label>

              {/* Destinatário individual */}
              {!modoMassa && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>Destinatário</span>
                  <select className="input" value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {destinatarios.map((d) => (
                      <option key={d.id} value={d.id}>{d.nome}{d.setor ? ` — ${d.setor.nome}` : ''}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Destinatários em massa */}
              {modoMassa && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>Usuários</span>
                    <div className="input" style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px' }}>
                      {destinatarios.map((d) => (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={destinatariosMassaIds.includes(d.id)}
                            onChange={() => setDestinatariosMassaIds((prev) => prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id])}
                          />
                          {d.nome}{d.setor ? ` — ${d.setor.nome}` : ''}
                        </label>
                      ))}
                    </div>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>Setores <span style={{ fontWeight: 400 }}>(cria grupo — como WhatsApp)</span></span>
                    <div className="input" style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px' }}>
                      {setores.map((s) => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={setoresMassaIds.includes(s.id)}
                            onChange={() => setSetoresMassaIds((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
                          />
                          {s.nome}
                        </label>
                      ))}
                    </div>
                  </label>
                </>
              )}

              {/* Mensagem */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>Mensagem</span>
                <textarea
                  className="input"
                  rows={4}
                  style={{ resize: 'vertical', minHeight: 90 }}
                  value={mensagemNova}
                  onChange={(e) => setMensagemNova(e.target.value)}
                  placeholder="Digite a mensagem..."
                />
              </label>

              {/* Anexos */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>Anexos (opcional)</span>
                <input
                  type="file"
                  multiple
                  style={{ fontSize: 13 }}
                  onChange={(e) => {
                    adicionarArquivosNovaConversa(e.target.files);
                    e.target.value = '';
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                  Limite atual: ate {UPLOAD_MAX_FILE_SIZE_MB_PADRAO} MB por arquivo.
                </span>
              </label>

              {/* Rodapé */}
              <PendingAttachmentsList
                items={arquivosNova}
                onRemove={(index) => setArquivosNova((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                className="space-y-2"
                itemClassName="flex items-center justify-between gap-3 rounded border border-[var(--c-border)] bg-[var(--c-bg, #fff)] px-3 py-2 text-sm"
                removeButtonClassName="text-red-600 font-semibold px-2"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowNova(false)} className="btn btn-outline" style={{ fontSize: 13 }}>Cancelar</button>
                <button type="submit" disabled={salvando} className="btn btn-primary" style={{ fontSize: 13 }}>
                  {salvando ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
