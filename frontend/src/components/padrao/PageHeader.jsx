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
 * CABEÇALHO DE PÁGINA — três pesos de botão, todos visíveis:
 * UMA ação primária sólida; secundárias em contorno; destrutiva em vermelho
 * suave e APARTADA (margin-left auto); ações raras no MenuMais.
 * Links para telas irmãs NÃO entram aqui: menu lateral e Ctrl+K já resolvem
 * (decisão do cliente, 02/09 — remover a navegação duplicada dos cabeçalhos).
 */
export default function PageHeader({
  titulo,
  subtitulo,
  contagem,
  acaoPrincipal,
  secundarias = [],
  destrutiva,
  mais = [],
  children
}) {
  return (
    <header className="app-page-header">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">{titulo}</h1>
          {/* R5: texto de apoio ancorado — contagem em strong, apoio muted,
              sempre aqui dentro (parágrafo solto na página é reprovado). */}
          {(contagem || subtitulo) ? (
            <p className="app-page-lead">
              {contagem ? <strong>{contagem}</strong> : null}
              {contagem && subtitulo ? ' · ' : ''}
              {subtitulo}
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
  );
}
