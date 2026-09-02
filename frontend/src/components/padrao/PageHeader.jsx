import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MenuMais from './MenuMais';

function BotaoAcao({ acao, classe }) {
  const conteudo = (
    <>
      {acao.icone}
      {acao.rotulo}
    </>
  );
  if (acao.to) {
    return (
      <Link className={classe} to={acao.to} title={acao.title}>
        {conteudo}
      </Link>
    );
  }
  return (
    <button
      type={acao.type || 'button'}
      className={classe}
      onClick={acao.onClick}
      disabled={acao.desabilitada}
      title={acao.title}
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
 */
export default function PageHeader({
  titulo,
  contagem,
  descricao,
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
  // Compacta quando a sentinela (logo acima da faixa) sai da tela — ou seja,
  // quando a faixa de fato grudou.
  useEffect(() => {
    if (!sentinelaRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observador = new IntersectionObserver(
      ([entrada]) => setCompacto(!entrada.isIntersecting),
      { rootMargin: '-120px 0px 0px 0px' }
    );
    observador.observe(sentinelaRef.current);
    return () => observador.disconnect();
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
