import { useEffect, useState } from 'react';
import ModalPortal from './ModalPortal';

/**
 * Casca de modal do sistema: centraliza sobre a AREA DE CONTEUDO e resolve o empilhamento.
 *
 * Nasceu depois de o mesmo defeito aparecer em dois modais (termo aditivo e Gerar conta), por duas
 * causas que `z-index` nao resolve:
 *
 *   1) `main.layout-main` tem `position: relative; z-index: 1`, o que CRIA UM CONTEXTO DE
 *      EMPILHAMENTO. Dentro dele o modal so disputa entre irmaos do main — e o main inteiro vale 1
 *      contra a sidebar, que vale 40. Nenhum valor resolveria: o teto e o do ancestral.
 *   2) `responsive-system.css` tem `.layout-main :where(..., .card, ...) { max-width: 100% }`.
 *      O `:where()` zera a propria especificidade, mas o `.layout-main` nao: a regra EMPATA com o
 *      utilitario de largura e vence pela ordem de importacao, esticando o painel.
 *
 * As duas somem quando o modal sai do `.layout-main` — e e o `ModalPortal` que faz isso.
 *
 * E centraliza sobre o CONTEUDO, nao sobre a viewport: o menu ocupa ~286px que nao sao area util, e
 * centralizar na viewport inteira deixa o painel visivelmente deslocado para a esquerda. O recuo e
 * MEDIDO do `.layout-main` — o menu recolhe, e no celular vira gaveta comecando em zero.
 *
 * ---
 *
 * ## Por que compoe o `ModalPortal` em vez de repetir o que ele faz
 *
 * Na consolidacao com a `dev-v2` (20/08) apareceram duas solucoes para o mesmo problema: este
 * componente e o `ModalPortal` de la, que trava a rolagem do documento, trata `Escape` e devolve o
 * foco — mas nao lida com empilhamento nem com a centralizacao.
 *
 * A primeira tentativa foi COPIAR a trava de rolagem para ca. Errado: a trava conta modais abertos
 * numa variavel de modulo, e duas copias sao **dois contadores**. Com um modal de cada familia
 * aberto ao mesmo tempo — a tela de Compras usa `ModalPortal` direto —, cada um se acharia dono do
 * `body.style` e o primeiro a fechar destravaria a rolagem com o outro ainda aberto. E exatamente o
 * caso que o contador existe para evitar.
 *
 * Entao: uma implementacao so. `ModalPortal` e a base (portal, rolagem, Escape, foco);
 * `OverlayModal` e a casca por cima dela (fundo, centralizacao sobre o conteudo, largura, painel).
 */
export default function OverlayModal({
  aberto = true,
  largura = 'var(--modal-max-w-lg, 860px)',
  rotulo,
  onFechar,
  fecharComEscape = true,
  children
}) {
  const [recuoConteudo, setRecuoConteudo] = useState(0);

  useEffect(() => {
    if (!aberto || typeof document === 'undefined') return undefined;
    const medir = () => {
      const principal = document.querySelector('.layout-main');
      setRecuoConteudo(principal ? Math.max(0, Math.round(principal.getBoundingClientRect().left)) : 0);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [aberto]);

  if (!aberto || typeof document === 'undefined') return null;

  return (
    <ModalPortal onClose={onFechar} closeOnEscape={fecharComEscape && Boolean(onFechar)}>
      <div
        className="fixed inset-0 flex items-center justify-center py-6"
        style={{
          zIndex: 'var(--z-modal, 50)',
          background: 'var(--modal-overlay, rgba(15, 23, 42, 0.48))',
          paddingLeft: `calc(${recuoConteudo}px + 1rem)`,
          paddingRight: '1rem'
        }}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
      >
        <div
          className="card overflow-hidden"
          style={{
            width: `min(100%, ${largura})`,
            maxHeight: 'min(88vh, 920px)',
            display: 'flex',
            flexDirection: 'column',
            padding: 0
          }}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}
