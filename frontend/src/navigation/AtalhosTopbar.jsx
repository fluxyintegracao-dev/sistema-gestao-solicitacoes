import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HiOutlineStar,
  HiStar,
  HiOutlineHome,
  HiHome,
  HiOutlineLockClosed,
  HiOutlineChevronDoubleRight
} from 'react-icons/hi2';
import { AuthContext } from '../contexts/AuthContext';
import { findFixableByPath, resolveLabel } from './navigationConfig';
import { useAtalhos } from './AtalhosContext';
import { definirTelaInicial, limparTelaInicial } from '../services/telaInicial';
import { useFecharAoSair } from '../hooks/useFecharAoSair';

// =====================================================================
// BARRA DO TOPO — estrela de fixar a tela atual + botão de tela
// inicial + fileira de atalhos.
// ---------------------------------------------------------------------
// - Estrela: aparece em toda tela fixável (correspondência exata na
//   fonte única). Clicou, fixou; clicou de novo, saiu.
// - Casinha: define ESTA tela como a tela inicial do usuário (onde o
//   login entra). Mesma lógica e mesmo lugar da estrela, mas sem
//   competir com ela: contorno cinza apagado quando inativa, casa
//   preenchida na cor primária quando esta tela já é a inicial
//   (a estrela ativa é âmbar). Desmarcar volta para a Home.
// - Fileira: só o ÍCONE, na cor de identidade do módulo, nome em
//   tooltip; separada da navegação por um divisor vertical. Quantos
//   cabem é calculado pela largura disponível (ResizeObserver) — o
//   excedente abre no painel do botão "»", que só existe quando há
//   excedente. No mobile a fileira some e fica só o "»".
// =====================================================================

const LARGURA_ICONE = 36; // px por atalho na fileira
// Ligado com o pacote B5 (rotas /me/tela-inicial no backend).
const TELA_INICIAL_DISPONIVEL = true;

export default function AtalhosTopbar() {
  const { user, updateUser } = useContext(AuthContext);
  const { atalhos, fixados, alternar, carregando } = useAtalhos();
  const location = useLocation();
  const [salvandoInicial, setSalvandoInicial] = useState(false);
  const [capacidade, setCapacidade] = useState(4);
  const [painelAberto, setPainelAberto] = useState(false);
  const [mobile, setMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));
  const areaRef = useRef(null);
  const painelRef = useRef(null);

  const telaAtual = useMemo(
    () => findFixableByPath(user, location.pathname),
    [user, location.pathname]
  );
  const telaFixada = telaAtual ? fixados.has(telaAtual.id) : false;
  const ehTelaInicial = Boolean(telaAtual && user?.tela_inicial?.id === telaAtual.id);

  async function alternarTelaInicial() {
    if (!telaAtual || salvandoInicial) return;
    try {
      setSalvandoInicial(true);
      if (ehTelaInicial) {
        await limparTelaInicial();
        updateUser({ tela_inicial: null });
      } else {
        const data = await definirTelaInicial(telaAtual.id);
        updateUser({ tela_inicial: data?.tela_inicial || null });
      }
    } catch (error) {
      alert(error?.message || 'Erro ao salvar tela inicial');
    } finally {
      setSalvandoInicial(false);
    }
  }

  // Quantos ícones cabem sem espremer breadcrumb e botões de sistema:
  // a área flexível informa a largura que sobrou para a fileira.
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const largura = entries[0]?.contentRect?.width || 0;
      setCapacidade(Math.max(0, Math.floor((largura - LARGURA_ICONE) / LARGURA_ICONE)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const listener = (event) => setMobile(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Painel fecha com clique fora e Esc — hook compartilhado.
  useFecharAoSair(painelRef, painelAberto, () => setPainelAberto(false));

  useEffect(() => {
    setPainelAberto(false);
  }, [location.pathname]);

  if (carregando) return <div ref={areaRef} className="fx-atalhos-area" />;

  const visiveis = mobile ? [] : atalhos.slice(0, capacidade);
  const excedentes = atalhos.slice(visiveis.length);

  return (
    <div ref={areaRef} className="fx-atalhos-area">
      {telaAtual && (
        <button
          type="button"
          className={`fx-fixar-btn ${telaFixada ? 'fx-fixar-btn--ativo' : ''}`}
          onClick={() => alternar(telaAtual.id)}
          title={telaFixada ? 'Remover dos seus atalhos' : 'Fixar como atalho'}
          aria-label={telaFixada
            ? `Remover ${resolveLabel(telaAtual, user)} dos seus atalhos`
            : `Fixar ${resolveLabel(telaAtual, user)} como atalho`}
          aria-pressed={telaFixada}
        >
          {telaFixada ? <HiStar size={17} aria-hidden="true" /> : <HiOutlineStar size={17} aria-hidden="true" />}
        </button>
      )}

      {/* DEGRADAÇÃO (onda 2 do porte): as rotas /me/tela-inicial ainda não
          existem neste backend (pacote B5 da proposta). A casinha fica
          oculta até lá — religar trocando a constante. */}
      {TELA_INICIAL_DISPONIVEL && telaAtual && (
        <button
          type="button"
          className={`fx-fixar-btn fx-inicial-btn ${ehTelaInicial ? 'fx-inicial-btn--ativo' : ''}`}
          onClick={alternarTelaInicial}
          disabled={salvandoInicial}
          title={ehTelaInicial
            ? 'Esta é sua tela inicial — clique para voltar à Home'
            : 'Definir como minha tela inicial'}
          aria-label={ehTelaInicial
            ? `Deixar de entrar em ${resolveLabel(telaAtual, user)} ao abrir o sistema`
            : `Entrar em ${resolveLabel(telaAtual, user)} ao abrir o sistema`}
          aria-pressed={ehTelaInicial}
        >
          {ehTelaInicial ? <HiHome size={16} aria-hidden="true" /> : <HiOutlineHome size={16} aria-hidden="true" />}
        </button>
      )}

      {atalhos.length > 0 && <span className="fx-atalhos-divisor" aria-hidden="true" />}

      {visiveis.length > 0 && (
        <nav className="fx-atalhos-fileira" aria-label="Seus atalhos">
          {visiveis.map((item) => {
            const Icone = item.icon;
            const rotulo = resolveLabel(item, user);
            return (
              <Link
                key={item.id}
                to={item.to}
                className="fx-atalho-icone"
                style={{ '--atalho-cor': `var(--module-${item.moduleId}, var(--c-muted))` }}
                title={item.obrigatorio ? `${rotulo} (fixado pelo setor)` : rotulo}
                aria-label={rotulo}
              >
                {Icone && <Icone aria-hidden="true" />}
                {item.obrigatorio && (
                  <HiOutlineLockClosed className="fx-atalho-cadeado" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {excedentes.length > 0 && (
        <div className="fx-atalhos-mais-wrap" ref={painelRef}>
          <button
            type="button"
            className="fx-atalhos-mais"
            onClick={() => setPainelAberto((aberto) => !aberto)}
            aria-expanded={painelAberto}
            aria-haspopup="menu"
            title={`Mais ${excedentes.length} atalho(s)`}
            aria-label={`Mais ${excedentes.length} atalhos`}
          >
            <HiOutlineChevronDoubleRight size={15} aria-hidden="true" />
          </button>
          {painelAberto && (
            <div className="fx-atalhos-painel" role="menu" aria-label="Todos os seus atalhos">
              <ul>
                {excedentes.map((item) => {
                  const Icone = item.icon;
                  const rotulo = resolveLabel(item, user);
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        role="menuitem"
                        className="fx-atalhos-painel-item"
                        style={{ '--atalho-cor': `var(--module-${item.moduleId}, var(--c-muted))` }}
                        onClick={() => setPainelAberto(false)}
                      >
                        {Icone && <Icone aria-hidden="true" />}
                        <span>{rotulo}</span>
                        {item.obrigatorio && (
                          <HiOutlineLockClosed className="fx-atalho-cadeado-lista" aria-hidden="true" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                to="/"
                className="fx-atalhos-painel-gerenciar"
                onClick={() => setPainelAberto(false)}
              >
                Gerenciar atalhos
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
