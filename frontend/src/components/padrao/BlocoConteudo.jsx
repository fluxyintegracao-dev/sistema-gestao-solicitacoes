import { useState } from 'react';

function Seta() {
  return (
    <svg className="app-bloco-recolher-seta" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * BLOCO DE CONTEÚDO — a superfície padrão sobre o canvas acinzentado.
 * variante="primario": branco + barra de cor à esquerda (`cor` recebe um
 *   token, ex. 'var(--sem-info)' ou 'var(--module-financeiro)').
 *   UM primário por tela — é ele que responde a pergunta central.
 * variante="secundario": branco rebaixado (--ui-surface-2), recua sozinho.
 * recolhivel: histórico/auditoria/raros nascem recolhidos (recolhidoPadrao),
 *   mas o usuário sabe que existem — o título fica sempre à vista.
 * contagem/descricao: o texto de apoio vive AQUI, ancorado ao título do
 *   bloco a que se refere — nunca solto na faixa entre a topbar e o
 *   primeiro bloco (regra do cliente, 02/09).
 */
export default function BlocoConteudo({
  titulo,
  contagem,
  descricao,
  variante = 'neutro',
  cor,
  acoes,
  recolhivel = false,
  recolhidoPadrao = false,
  className = '',
  children,
  ...props
}) {
  const [recolhido, setRecolhido] = useState(recolhivel && recolhidoPadrao);

  const classes = [
    'app-bloco',
    variante === 'primario' && 'app-bloco--primario',
    variante === 'secundario' && 'app-bloco--secundario',
    recolhido && 'app-bloco--recolhido',
    !titulo && 'app-bloco--sem-titulo',
    className
  ].filter(Boolean).join(' ');

  const cabecalho = titulo ? (
    <>
      <h2 className="app-bloco-titulo">{titulo}</h2>
      <span className="app-bloco-acoes" onClick={(e) => recolhivel && e.stopPropagation()}>
        {acoes}
        {recolhivel ? <Seta /> : null}
      </span>
    </>
  ) : null;

  return (
    <section
      className={classes}
      style={cor ? { '--bloco-cor': cor } : undefined}
      {...props}
    >
      {titulo && recolhivel ? (
        <button
          type="button"
          className="app-bloco-recolher"
          aria-expanded={!recolhido}
          onClick={() => setRecolhido((atual) => !atual)}
        >
          {cabecalho}
        </button>
      ) : titulo ? (
        <div className="app-bloco-head">{cabecalho}</div>
      ) : null}
      {(contagem || descricao) ? (
        <p className="app-bloco-lead">
          {contagem ? <strong>{contagem}</strong> : null}
          {contagem && descricao ? ' · ' : ''}
          {descricao}
        </p>
      ) : null}
      {!recolhido && <div className="app-bloco-corpo">{children}</div>}
    </section>
  );
}
