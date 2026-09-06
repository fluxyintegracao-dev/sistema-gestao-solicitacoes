import { useState } from 'react';
import { TIPO_BLOCOS, usePreferenciaDeLista } from '../../contexts/PreferenciasContext';

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
 * chavePreferencia: liga o recolhimento à preferência do usuário no banco
 *   (tipo `blocos`). UMA prop, e o bloco passa a sobreviver ao F5 e a trocar
 *   de máquina; sem ela o comportamento é o de sempre. Ver o bloco datado
 *   dentro do componente.
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
  chavePreferencia,
  className = '',
  children,
  ...props
}) {
  /*
    RECOLHIMENTO CONTROLÁVEL DE FORA — E AGORA A PERSISTÊNCIA (05/09).

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

    A PERSISTÊNCIA ENTROU, E ELA É DE UMA PROP SÓ: `chavePreferencia`.

    Por que aqui e não na tela: são 39 arquivos de tela passando `recolhivel`
    (60 pontos medidos em 05/09). Se cada um tivesse de ler o contexto,
    guardar estado e passar DUAS props (`recolhido` + `aoAlternarRecolhido`),
    a fiação seria copiada 60 vezes e metade sairia errada ou nem sairia — o
    mecanismo existia desde a manhã e nenhuma tela o tinha ligado. Com a chave,
    a tela declara IDENTIDADE (o que este bloco é) e o componente resolve o
    resto: lê em render (`usePreferenciaDeLista`, síncrono, sem rede e sem
    piscar), grava com os mesmos 700ms de atraso e viaja para as outras
    máquinas do usuário.

    O QUE É GRAVADO É O DESVIO, NUNCA O ESTADO. `{ desvio: true }` significa
    "o oposto do que o código diz hoje" — e só existe registro quando o
    usuário de fato discorda do padrão. Duas consequências, as duas
    intencionais:
      - o dia em que `recolhidoPadrao` mudar no código, quem nunca mexeu
        acompanha a mudança (é a mesma regra do arranjo de blocos:
        `utils/layoutBlocos.js:23-24` — bloco novo entra visível, config
        antiga não manda no que ela não conhece);
      - voltar ao padrão APAGA o registro em vez de gravar o padrão, porque
        aí não há mais desvio nenhum a guardar. Apagar aqui é ato explícito
        do usuário, não limpeza automática.

    SEM CHAVE, NADA MUDA. `usePreferenciaDeLista('')` devolve `null` e não
    grava (o `identificar` do contexto recusa chave vazia): quem não passa
    chave continua com `useState` interno e `recolhidoPadrao` na montagem —
    byte a byte o que era antes. O hook é chamado SEMPRE, com chave ou sem
    ela, porque hook não pode ficar atrás de condição (R29).

    PRECEDÊNCIA: controle externo (`recolhido`) > preferência salva >
    `recolhidoPadrao`. Quem controla de fora não perde o controle por ter
    passado uma chave — e é o caso do `BlocosPersonalizaveis`, que arranja
    blocos com a preferência da TELA inteira.
  */
  const [recolhidoInterno, setRecolhidoInterno] = useState(recolhivel && recolhidoPadrao);
  const controlado = typeof recolhido === 'boolean';
  // Chave só tem sentido com `recolhivel`: bloco que não recolhe não tem
  // estado nenhum a guardar, e registrar a entrada criaria linha morta.
  const [preferencia, gravarPreferencia] = usePreferenciaDeLista(
    recolhivel && chavePreferencia ? chavePreferencia : '',
    TIPO_BLOCOS
  );
  const persistente = Boolean(recolhivel && chavePreferencia && !controlado);
  const padraoRecolhido = Boolean(recolhidoPadrao);
  const salvoRecolhido = preferencia?.desvio === true ? !padraoRecolhido : padraoRecolhido;
  const estaRecolhido = recolhivel && (
    controlado ? recolhido : (persistente ? salvoRecolhido : recolhidoInterno)
  );

  const alternarRecolhido = () => {
    const proximo = !estaRecolhido;
    // Sem controle externo o estado interno segue mandando (comportamento de
    // hoje). Com controle externo quem decide é quem controla — não guardamos
    // uma cópia local que possa divergir.
    if (persistente) gravarPreferencia(proximo === padraoRecolhido ? null : { desvio: true });
    else if (!controlado) setRecolhidoInterno(proximo);
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
