import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineXMark
} from 'react-icons/hi2';
import {
  getNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas
} from '../services/notificacoes';

export default function NotificacoesBell() {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const painelRef = useRef(null);
  const botaoRef = useRef(null);

  async function carregar({ showLoading = false } = {}) {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    try {
      if (showLoading) setCarregando(true);
      const itensRecebidos = Array.isArray(data.itens) ? data.itens : [];

      setItens(itensRecebidos);
      setTotalNaoLidas(Number(data.total_nao_lidas) || itensRecebidos.filter((item) => !item.lida_em).length);
    } catch (error) {
      console.error(error);
    } finally {
      if (showLoading) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    const id = setInterval(() => carregar(), 120000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!aberto) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (painelRef.current?.contains(target) || botaoRef.current?.contains(target)) {
        return;
      }
      setAberto(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAberto(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [aberto]);

  async function alternarPainel() {
    const nextState = !aberto;
    if (nextState) {
      await carregar({ showLoading: true });
    }
    setAberto(nextState);
  }

  async function marcarTudo() {
    await marcarTodasNotificacoesLidas();
    await carregar({ showLoading: true });
  }

  async function abrirSolicitacao(item) {
    if (item.destinatario_id && !item.lida_em) {
      await marcarNotificacaoLida(item.destinatario_id);
    }

    await carregar();
    if (item.solicitacao_id) {
      navigate(`/solicitacoes/${item.solicitacao_id}`);
    }
    setAberto(false);
  }

  return (
    <div className="notification-shell">
      <button
        ref={botaoRef}
        onClick={alternarPainel}
        className={`notification-trigger ${aberto ? 'is-open' : ''}`}
        aria-label="Notificacoes"
        aria-expanded={aberto}
        aria-haspopup="dialog"
        type="button"
      >
        <HiOutlineBell className="notification-trigger-icon" />
        {totalNaoLidas > 0 && (
          <span className="notification-trigger-badge">
            {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <button
            type="button"
            className="notification-overlay md:hidden"
            onClick={() => setAberto(false)}
            aria-label="Fechar notificacoes"
          />

          <section
            ref={painelRef}
            className="notification-panel"
            role="dialog"
            aria-label="Central de notificacoes"
          >
            <header className="notification-panel-header">
              <div>
                <p className="notification-panel-kicker">Atualizacoes do Fluxy</p>
                <h2 className="notification-panel-title">Notificacoes</h2>
                <p className="notification-panel-subtitle">
                  {totalNaoLidas > 0
                    ? `${totalNaoLidas} item(ns) ainda pedem leitura.`
                    : 'Tudo em dia no momento.'}
                </p>
              </div>

              <div className="notification-panel-actions">
                <button
                  type="button"
                  onClick={marcarTudo}
                  className="btn btn-ghost btn-sm"
                  disabled={!itens.length || !totalNaoLidas}
                >
                  <HiOutlineCheck className="h-4 w-4" />
                  Marcar lidas
                </button>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="notification-close"
                  aria-label="Fechar painel de notificacoes"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="notification-list">
              {carregando ? (
                <div className="notification-empty">
                  <div className="loading-skeleton loading-skeleton-circle h-10 w-10" />
                  <div className="w-full space-y-2">
                    <div className="loading-skeleton h-3 w-2/3" />
                    <div className="loading-skeleton h-3 w-full" />
                    <div className="loading-skeleton h-3 w-1/2" />
                  </div>
                </div>
              ) : null}

              {!carregando && itens.length === 0 && (
                <div className="notification-empty">
                  <div className="notification-empty-icon">
                    <HiOutlineSparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="notification-empty-title">Nenhuma notificacao nova</p>
                    <p className="notification-empty-copy">
                      Quando houver mencoes ou alertas operacionais, eles aparecem aqui.
                    </p>
                  </div>
                </div>
              )}

              {!carregando && itens.map((item) => (
                <button
                  key={item.destinatario_id}
                  onClick={() => abrirSolicitacao(item)}
                  className={`notification-item ${item.lida_em ? 'is-read' : 'is-unread'}`}
                  type="button"
                >
                  <div className="notification-item-marker" aria-hidden="true">
                    {!item.lida_em ? <span className="notification-item-dot" /> : <HiOutlineCheck className="h-4 w-4" />}
                  </div>

                  <div className="notification-item-body">
                    <p className="notification-item-message">{item.mensagem}</p>
                    {item.createdAt && (
                      <p className="notification-item-date">
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
