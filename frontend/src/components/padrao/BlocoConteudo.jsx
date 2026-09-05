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
 *
 * O APOIO AGORA CARREGA `title` — E É ISSO QUE DESTRAVA O CSS (05/09).
 *
 * Medido: `.app-bloco-lead` tinha `max-width: 78ch`, que num bloco de 1843px
 * corta em 607px enquanto o texto pede 647px — quebra por 40px e deixa
 * 1236px de linha vazios. O irmão `.app-page-lead` já resolve isso com uma
 * linha só + reticências, e o que torna a truncagem honesta é o tooltip: o
 * `PageHeader` passa `title={textoApoio}`, então o texto inteiro continua
 * alcançável. Aqui essa metade não existia — o `<p>` saía SEM `title` —, e
 * por isso o CSS não podia mudar sozinho: `nowrap` sem tooltip é remover
 * capacidade. Com o `title` abaixo, o par fica completo e o CSS trunca.
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
  recolhido,
  aoAlternarRecolhido,
  className = '',
  children,
  ...props
}) {
  /*
    RECOLHIMENTO CONTROLÁVEL DE FORA — PREPARO, AINDA NÃO A PERSISTÊNCIA (05/09).

    Medido: este `useState` era a única memória do recolhimento e NENHUMA linha
    o gravava. O usuário recolhia, dava F5 e voltava tudo aberto — em
    39 arquivos de tela que passam `recolhivel` (40 pontos com este componente).
    A única tela onde recolher sobrevive ao F5 é o detalhe da solicitação, e
    sobrevive porque ela NÃO usa este recolhimento: desenha o bloco por conta
    própria e grava pelo `salvarListaPreferencias`
    (`src/services/listasPreferencias.js`). São dois recolhimentos no sistema, e
    o que as 39 telas usam é justamente o que não guarda.

    O que mudou agora: `recolhido` + `aoAlternarRecolhido` deixam o estado ser
    CONTROLADO DE FORA. Quem não passa nada continua exatamente como antes —
    estado interno, `recolhidoPadrao` na montagem, nada gravado.

    O QUE FALTA, E QUEM LIGA: a persistência em si NÃO entra aqui. O mecanismo
    de preferências está sendo migrado para o banco nesta mesma rodada; ligar os
    dois agora criaria conflito. Quem ligar deve, na TELA (ou num hook de
    preferências), ler o estado salvo e passar `recolhido` +
    `aoAlternarRecolhido` — o componente já está pronto para receber.
  */
  const [recolhidoInterno, setRecolhidoInterno] = useState(recolhivel && recolhidoPadrao);
  const controlado = typeof recolhido === 'boolean';
  const estaRecolhido = recolhivel && (controlado ? recolhido : recolhidoInterno);

  const alternarRecolhido = () => {
    const proximo = !estaRecolhido;
    // Sem controle externo o estado interno segue mandando (comportamento de
    // hoje). Com controle externo quem decide é quem controla — não guardamos
    // uma cópia local que possa divergir.
    if (!controlado) setRecolhidoInterno(proximo);
    if (aoAlternarRecolhido) aoAlternarRecolhido(proximo);
  };

  const classes = [
    'app-bloco',
    variante === 'primario' && 'app-bloco--primario',
    variante === 'secundario' && 'app-bloco--secundario',
    estaRecolhido && 'app-bloco--recolhido',
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

  // Mesmo texto que o `<p>` mostra, inteiro — o que a linha truncada esconde
  // continua alcançável no tooltip (idêntico ao `textoApoio` do PageHeader).
  // Só texto vira tooltip: `title` é atributo de string, e um nó React viraria
  // "[object Object]". Hoje todas as 427 chamadas passam string, mas se alguém
  // passar JSX o apoio sai INTEIRO (`--integral`) em vez de truncado sem
  // tooltip — truncar sem o texto alcançável é que seria perda.
  const soTexto = (v) => v == null || v === false || typeof v === 'string' || typeof v === 'number';
  const apoioEhTexto = soTexto(contagem) && soTexto(descricao);
  const textoApoio = apoioEhTexto
    ? [contagem, descricao].filter(Boolean).join(' · ')
    : '';

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
          aria-expanded={!estaRecolhido}
          onClick={alternarRecolhido}
        >
          {cabecalho}
        </button>
      ) : titulo ? (
        <div className="app-bloco-head">{cabecalho}</div>
      ) : null}
      {(contagem || descricao) ? (
        <p
          className={`app-bloco-lead${apoioEhTexto ? '' : ' app-bloco-lead--integral'}`}
          title={textoApoio || undefined}
        >
          {contagem ? <strong>{contagem}</strong> : null}
          {contagem && descricao ? ' · ' : ''}
          {descricao}
        </p>
      ) : null}
      {!estaRecolhido && <div className="app-bloco-corpo">{children}</div>}
    </section>
  );
}
