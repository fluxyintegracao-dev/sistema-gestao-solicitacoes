import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuMais from './MenuMais';

/*
  A AÇÃO PODE TER ESTADO, E O ESTADO TEM DE CHEGAR AO DOM (05/09).

  O botão aqui recebia rótulo, ícone, título e clique — e mais nada. Isso
  bastou até a Home migrar: o "Personalizar" dela é um botão de LIGA/DESLIGA
  e carregava `aria-pressed` no arranjo antigo. Ao virar ação secundária da
  faixa, o atributo simplesmente não tinha por onde passar, e quem usa
  leitor de tela deixou de saber se o modo estava ligado. Perda silenciosa
  de capacidade causada pela padronização — exatamente o que a marca de
  componente compartilhado não garante sozinha.

  `pressionada` é opcional: ação sem estado continua sem `aria-pressed`, que
  é o certo (um `aria-pressed="false"` num botão comum anuncia um
  liga/desliga que não existe). `classe` acrescenta, nunca substitui.
*/
function BotaoAcao({ acao, classe }) {
  const conteudo = (
    <>
      {acao.icone}
      {acao.rotulo}
    </>
  );
  const classeFinal = acao.classe ? `${classe} ${acao.classe}` : classe;
  if (acao.to) {
    return (
      <Link className={classeFinal} to={acao.to} title={acao.title} aria-label={acao.rotuloAcessivel}>
        {conteudo}
      </Link>
    );
  }
  return (
    <button
      type={acao.type || 'button'}
      className={classeFinal}
      onClick={acao.onClick}
      disabled={acao.desabilitada}
      title={acao.title}
      aria-label={acao.rotuloAcessivel}
      aria-pressed={typeof acao.pressionada === 'boolean' ? acao.pressionada : undefined}
    >
      {conteudo}
    </button>
  );
}

/**
 * CABEÇALHO DE PÁGINA — FAIXA FIXA (R13, 02/09): título, contagem/apoio e
 * ações ficam presos abaixo da topbar durante a rolagem, numa superfície
 * própria; ao rolar a faixa compacta (título menor), mas nunca some.
 *
 * Apoio (R5, revisto em 02/09): `contagem` + `descricao` moram AQUI, em uma
 * linha só com escala de título — trunca com reticências e o texto completo
 * vai no tooltip. Não é texto miúdo nem flutua sobre o fundo.
 *
 * Três pesos de botão, todos visíveis: UMA ação primária sólida;
 * secundárias em contorno; destrutiva em vermelho suave e APARTADA; ações
 * raras no MenuMais — que NUNCA contém navegação (R11).
 *
 * `voltar` (R11 revisto, 02/09): em tela de DETALHE/REGISTRO a seta de
 * voltar à esquerda do cabeçalho é a affordance primária de retorno e FICA
 * SEMPRE — a R11 vale para menus de ações e "Voltar" redundantes em
 * LISTAGENS, nunca para esta seta. `voltar={{ to }}` ou `{{ onClick }}`.
 */
function SetaVoltar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="20" height="20">
      <path d="M11.5 4.5L6 10l5.5 5.5M6.5 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PageHeader({
  titulo,
  contagem,
  descricao,
  voltar,
  acaoPrincipal,
  secundarias = [],
  destrutiva,
  mais = [],
  children
}) {
  const headerRef = useRef(null);
  const sentinelaRef = useRef(null);
  const [compacto, setCompacto] = useState(false);

  // A posição da faixa (--pos-cabecalho-fixo) vem do Pagina, que mede a
  // topbar real — aqui só a compactação.
  // Compacta pela POSIÇÃO DE ROLAGEM, nunca por sentinela com margem fixa:
  // a versão com IntersectionObserver (rootMargin -120px) compactava JÁ NO
  // CARREGAMENTO (o topo do conteúdo fica a menos de 120px da janela) e
  // toda tela nascia com título de 14px — o "cabeçalho pequeno" de 02/09.
  useEffect(() => {
    let raf = null;
    const medir = () => {
      raf = null;
      setCompacto(window.scrollY > 24);
    };
    const agendar = () => { if (raf == null) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener('scroll', agendar, { passive: true });
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', agendar);
    };
  }, []);

  const textoApoio = [contagem, descricao].filter(Boolean).join(' · ');

  return (
    <>
      <span ref={sentinelaRef} aria-hidden="true" />
      <header
        ref={headerRef}
        className={`app-page-header${compacto ? ' app-page-header--compacto' : ''}`}
      >
        <div className="app-page-header-row">
          {voltar ? (
            voltar.to ? (
              <Link
                className="btn btn-outline app-voltar"
                to={voltar.to}
                title={voltar.title || 'Voltar'}
                aria-label={voltar.title || 'Voltar'}
              >
                <SetaVoltar />
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-outline app-voltar"
                onClick={voltar.onClick}
                title={voltar.title || 'Voltar'}
                aria-label={voltar.title || 'Voltar'}
              >
                <SetaVoltar />
              </button>
            )
          ) : null}
          <div>
            <h1 className="page-title">{titulo}</h1>
            {(contagem || descricao) ? (
              <p className="app-page-lead" title={textoApoio}>
                {contagem ? <strong>{contagem}</strong> : null}
                {contagem && descricao ? ' · ' : ''}
                {descricao}
              </p>
            ) : null}
          </div>
          <div className="app-actionbar">
            {secundarias.filter(Boolean).map((acao) => (
              <BotaoAcao key={acao.rotulo} acao={acao} classe="btn btn-outline" />
            ))}
            <MenuMais itens={mais} />
            {acaoPrincipal ? (
              <BotaoAcao acao={acaoPrincipal} classe="btn btn-primary" />
            ) : null}
            {destrutiva ? (
              <span className="app-actionbar-apartada">
                <BotaoAcao acao={destrutiva} classe="btn btn-outline btn-perigo-suave" />
              </span>
            ) : null}
          </div>
        </div>
        {children}
      </header>
    </>
  );
}
