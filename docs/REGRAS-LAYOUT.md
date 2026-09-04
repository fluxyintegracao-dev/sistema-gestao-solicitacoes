# Regras mecânicas de layout — números, não adjetivos

Criadas em 02/09 depois que a Leva 1 repetiu defeitos de medida em série.
Toda regra tem NÚMERO, vive implementada nos componentes padrão
(`frontend/src/components/padrao/` + `componentes-padrao.css`) e é cobrada
pelo verificador (`frontend/scripts/validarLayout.mjs`, que roda dentro do
`test:responsive`, + auditoria runtime nas capturas). Tela reformada entra no
manifesto `frontend/scripts/telas-reformadas.json` e passa a ser reprovada
automaticamente se sair do padrão.

## R1 — Colunas de tabela

| Tipo de coluna | Largura |
|---|---|
| Ação | o necessário para os botões, **máx 320px**; botões nunca quebram linha (`nowrap`) |
| Status (badge) | **96px** fixos |
| Data | **110px** |
| Valor monetário | **190px** (cabe `R$ 9.999.999.999,99` no corpo 14px), alinhado à direita, `tabular-nums`; é também o **mínimo de arrasto** — valor NUNCA trunca (DoD T7) |
| Conteúdo textual | **mín 160px**; TODA largura sobrante do card vai para elas |

- A distribuição da sobra é AUTOMÁTICA: na `TabelaPadrao`, coluna com
  `flex: true` (padrão: a coluna-título) absorve `container − Σ(fixas)`.
- TODA tabela do sistema é redimensionável arrastando a borda do cabeçalho
  (ResizableTable/ListaAvancada), com largura salva por usuário. `<table>`
  crua é REPROVADA pelo verificador em tela do manifesto.

## R2 — Alvo de clique

- Botão/ícone clicável: **mín 32×32px no desktop**, **44×44px no toque**
  (`pointer: coarse`). Imposto por CSS em `.btn` — sair disso exige burlar a
  classe, e o verificador runtime mede `getBoundingClientRect` de todo
  `button/a.btn` e reprova < 32.
- Ícone dentro de botão: **mín 18×18px** (20px no toque). Imposto por
  `.btn svg { min-width/min-height }`.

## R3 — Busca e filtros ocupam a faixa

- Campo de busca em cabeçalho de bloco usa a classe **`.app-busca`**:
  `flex: 1`, **mín 220px, máx 480px** — cresce até o limite, nunca largura
  fixa pequena com vazio ao lado. O verificador estático REPROVA `w-[NNNpx]`
  em `<input` de tela do manifesto (largura de campo vem de classe, não de
  número solto).

## R4 — Respiro do topo (revisto 02/09 — vão transparente era defeito)

- No estado NORMAL (sem rolagem): vão de **24px** (`--respiro-topbar`) entre
  a topbar e o primeiro conteúdo, como MARGEM do conteúdo (margin-top da
  faixa) — nunca como folga no `top` do sticky.
- Na ROLAGEM: a faixa fixa gruda **encostada** na topbar (top = base real da
  topbar, sem folga) — folga aqui virava vão transparente com o conteúdo
  rolando por trás. O harness reprova qualquer conteúdo visível entre a base
  da topbar e o topo da faixa (DoD C1).

## R5 — Texto de apoio na FAIXA FIXA do topo (revisão final, 02/09)

- O incômodo original era o apoio parecer texto sem estilo flutuando sobre
  o fundo — não a posição. Forma final: **contagem + apoio voltam ao topo**,
  nas props **`contagem`/`descricao` do `PageHeader`**, com:
  - **escala de título** (18px, peso 500; contagem em `<strong>`), não
    texto miúdo;
  - **superfície própria**: a faixa fixa do cabeçalho (R13) tem fundo,
    contorno e sombra — nada flutua sobre o canvas;
  - **UMA linha só**: trunca com reticências e o texto completo vai no
    tooltip (a auditoria runtime reprova quebra de linha).
- `BlocoConteudo` mantém `contagem`/`descricao` para apoio DE BLOCO
  específico (ex.: regra de um bloco secundário); o apoio DA TELA mora no
  cabeçalho. A prop antiga `subtitulo` não existe — o verificador reprova.

## R6 — Campo monetário dimensionado pelo pior caso

- Classe **`.input-moeda`**: **mín 180px** (cabe `R$ 9.999.999.999,99`),
  alinhado à direita, `font-variant-numeric: tabular-nums`. Vale para
  qualquer input de dinheiro; a auditoria runtime mede e reprova < 180px.
- Célula/har de VALOR exibido: `tabular-nums` sempre (números alinham).

## R7 — Alinhamento na mesma linha

- Campos na mesma linha compartilham altura: **min-height 44px** (`.input`) e
  a MESMA linha de base (o `form-grid` alinha por `start`; label sempre acima
  do campo, nunca dentro de um e fora do outro).
- Em linha de tabela editável: coluna de valor com largura FIXA da coluna
  (150–200px), texto longo fica com a sobra (R1).

## R8 — Comparação é SEMÂNTICA: previsto azul × realizado vermelho (revisto em 02/09)

- Em TODA comparação do sistema (barras, gráficos, KPIs, tabelas
  comparativas): **ORÇADO/PREVISTO = azul** (`--comp-previsto`, =
  `--c-primary`) e **REALIZADO/EXECUTADO/PAGO = vermelho**
  (`--comp-realizado`). Nunca dois tons da mesma família, nunca cinza ×
  azul: a distinção é de significado, não de intensidade.
- Classes utilitárias: `.serie-prevista`/`.serie-realizada` (fundos de
  barra) e `.texto-previsto`/`.texto-realizado` (números e legendas — a
  legenda carrega a MESMA cor da série).
- **A cor é da SÉRIE, não do componente** (02/09): dentro da mesma tela,
  KPI, gráfico, tabela e legenda que representam a mesma série compartilham
  a mesma cor — um card azul e a tabela vermelha para o MESMO custo é
  defeito. KPI que não pertence a nenhuma série (eficiência, saldo
  derivado) fica NEUTRO (cor de texto).

## R9 — Cadastro raro abre em MODAL

- Formulário de uso esporádico (empresas do grupo, setores, tipos,
  categorias) NÃO mora na tela: abre em modal (`OverlayModal`) pelo botão de
  ação; a tela inteira fica com a listagem.
- Cadastro de uso FREQUENTE no fluxo (pessoas/parceiros) mantém o padrão de
  painel acima da lista (decisão registrada — reversível).

## R10 — Escala como única fonte de medida (e conforto de leitura)

- **Critério que governa (decisão do cliente, 02/09): CONFORTO E CLAREZA DE
  LEITURA, não densidade máxima.** Quando "cabe mais informação" briga com
  "lê-se melhor", vence a leitura — mais rolagem é aceitável, apertar os
  olhos não. O sistema é usado o dia inteiro.
- A escala mora em `frontend/src/styles/escala.css` e é a ÚNICA fonte de
  medida das telas reformadas:
  - **Espaço**: 4/8/12/16/24/32/48px (`--esp-1/2/3/4/6/8/12`; em Tailwind,
    só os degraus `1/2/3/4/6/8/12` e o `0`).
  - **Tipo**: 12/14/18/22px com papel fixo — detalhe/rótulo (12,
    lh 1.45), corpo/célula/botão (14, lh 1.5), título de bloco (18),
    título de página (22, no `Pagina`/`PageHeader`). Nada abaixo de 12px em
    conteúdo; em Tailwind, só `text-xs`/`text-sm`/`text-lg`.
  - **Raios**: 8/12/14px (`--raio-1/2/3`).
  - **Linha de tabela com respiro**: célula 14px/lh 1.5 com padding de um
    degrau (12px) — imposto pelo CSS da TabelaPadrao, não pela tela.
- **Tela não escreve medida.** Nenhum px em `style` inline, nenhum
  `*-[NNNpx]`, nenhuma largura/altura utilitária fora dos degraus, nenhuma
  `largura`/`minWidth` em coluna de TabelaPadrao (declare o **`tipo`** da
  coluna: `texto`/`codigo`/`valor`/`numero`/`data`/`status`/`badge` — a
  medida é do componente). Ritmo vertical da tela vem do componente
  **`Pagina`** (vão de 16px entre blocos), não de `space-y-*` na raiz.
- Exceção só com REGISTRO: `excecoes_medidas` no manifesto
  (`telas-reformadas.json`), com justificativa — o verificador rebaixa para
  AVISO e o aviso aparece em todo teste.

## R11 — Navegação não é ação (02/09; ESCOPO corrigido em 02/09 e ampliado em 03/09)

- **Onde vale**: menus de ações (MenuMais "⋯", barra de ações do PageHeader)
  e botões "Voltar" REDUNDANTES em telas de LISTAGEM (onde menu, breadcrumb
  e Ctrl+K já resolvem). Exemplo: "Ir para categorias" dentro do "⋯" de
  Parceiros — sai.
- **Onde NÃO vale**: em tela de DETALHE/REGISTRO, a **seta de voltar à
  esquerda do cabeçalho é a affordance primária de retorno e FICA — sempre,
  em todas**. Exemplo: a seta da gestão da obra (ObraGestao), do título
  financeiro, do formulário de usuário. Removê-la por esta regra foi o
  defeito de 02/09: generalização sem julgamento.
- Padrão: prop `voltar` do `PageHeader` (ou botão `.app-voltar` em cabeçalho
  custom).
- **Onde se INVERTE — telas fora do shell (03/09)**: nas telas que renderizam
  **sem o `Layout`** (Login, Recuperar Senha, Definir Senha, Cotação Pública
  do fornecedor) **não existe menu, não existe breadcrumb e não existe
  Ctrl+K**. O pressuposto inteiro da regra — "o shell já resolve o retorno" —
  é falso ali. Então o link de navegação **não é redundante: é a única saída,
  e é obrigatório**. O "Esqueci minha senha" no Login e o "Voltar ao login"
  no Recuperar Senha **têm de existir**; removê-los por esta regra deixa a
  pessoa presa na tela.
  Isto é **escopo declarado da regra**, não exceção de tela: qualquer tela
  futura que renderize fora do `Layout` nasce sob esta leitura, sem precisar
  pedir exceção. A lista de telas fora do shell vive em
  `frontend/scripts/telas-reformadas.json`, em `telas_compartilhadas.fora_do_shell`.
- **Por que escopo e não exceção** (Parte 5): exceção é permissão pontual que
  alguém precisa lembrar de pedir — e o que não é pedido escapa. Escopo é
  parte da regra: quem ler a R11 lê junto onde ela não vale. O defeito de
  02/09 (a seta de voltar comida pela regra) nasceu exatamente de uma regra
  sem escopo declarado, aplicada ao pé da letra.
- O verificador reprova item de `mais`/`itens` com `navigate(`/`to:`/`Link` —
  e o harness reprova tela de detalhe SEM a seta (DoD C3). **Nas telas fora
  do shell o harness NÃO reprova o link de navegação**, porque a DoD própria
  delas (`docs/DEFINICAO-DE-PRONTO.md`, seção "TELAS FORA DO SHELL") declara
  a inversão.

## R12 — Filtro é marcação, nunca lista suspensa (02/09)

- **Nenhum filtro de lista é select de escolha única.** Todo filtro é botão
  com menu de MARCAÇÃO (checkbox, múltipla seleção) e os valores escolhidos
  ficam visíveis como etiquetas removíveis — o padrão da barra de filtros
  das Solicitações. Motivo: com select o estado do filtro é invisível; com
  marcação ele é legível de imediato e combinável.
- A faixa de filtros de toda tela segue a estrutura das Solicitações:
  **busca única em cima ocupando a largura** e, abaixo, a linha de filtros
  marcáveis. Nada de campo de busca solto ao lado de select.
- Componente: **`BarraFiltros`** (componentes padrão), que REAPROVEITA o
  `FiltroRapido` da ListaAvancada — não recriar.
- Select de FORMULÁRIO (entrada de dado) e seletor de CONTEXTO (escolher
  QUAL registro/conjunto se edita, quando novos registros herdam a escolha)
  continuam legítimos.

## R13 — Cabeçalho FIXO na rolagem (02/09)

- O cabeçalho da tela (título, contagem/apoio e ações) **permanece fixo**
  logo abaixo da topbar durante a rolagem, numa superfície própria (fundo,
  contorno, sombra). Ao rolar ele **compacta** (título menor, paddings
  menores, ações intactas) — **nunca some**. Em página longa, a ação
  principal está sempre a um clique.
- Implementação: `.app-page-header` sticky com `--pos-cabecalho-fixo`
  (altura real da topbar, medida pelo `Pagina`); compactação por sentinela
  no `PageHeader`. Cabeçalho custom de tela de registro usa a MESMA classe
  (ex.: gestão da obra). Verificador estático garante o sticky no CSS;
  a auditoria runtime rola a página e mede a faixa.
- **Tela de REGISTRO** (detalhe): o cabeçalho exibe o **NOME/identificação
  do registro com destaque** (peso e escala de título); código e
  localização são informação secundária ao lado ou abaixo. Número sem nome
  é defeito.

## R14 — Alinhamento de coluna: por tipo, e do usuário (02/09)

- **Título e conteúdo da coluna compartilham o MESMO alinhamento**, por
  padrão definido pelo tipo: texto/identidade/código/data à esquerda,
  valor/número à direita, status/badge centralizados. Título centralizado
  sobre conteúdo à esquerda é defeito (auditoria runtime compara th × td).
- O usuário pode trocar o alinhamento de qualquer coluna **clicando no
  título** (esquerda/centro/direita); a escolha aplica a título E conteúdo
  e é salva por usuário e por lista (localStorage, como a largura). O
  alinhamento-check do roteiro de capturas prova aplicação e persistência.

## R14b — Ordenar × alinhar no mesmo cabeçalho (02/09, leva do componente)

- **O clique no título ORDENA** (coluna com `ordenavel`); o menu de
  alinhamento vira **ícone próprio**, ancorado à direita do cabeçalho e
  revelado no hover/foco (a affordance da R15).
- **Por que ancorado e não lado a lado**: numa coluna de status (96px,
  ~72px úteis) o título com o indicador de ordem já ocupa ~54px e o alvo
  mínimo do ícone é 32px (R2) — não cabem em linha. Ancorado sobre a borda
  direita, com fundo próprio, o título trunca atrás dele. É o arranjo do
  Excel e do Planilhas.
- **Coluna sem `ordenavel` não vira botão**: o título fica texto, sem
  cursor nem realce. Sinal sem capacidade é o mesmo defeito da R15 ao
  contrário.
- Ordenação é **opt-in por coluna**: ligar em todas de uma vez mudaria o
  comportamento de 108 telas em silêncio. Ciclo de três estados —
  crescente, decrescente, e de volta à ordem que a tela definiu.
- **Lista PAGINADA NO SERVIDOR ordena NO SERVIDOR** (`aoOrdenar`): ordenar
  só a página carregada faz o usuário ler "os maiores do conjunto" quando
  são apenas os maiores daqueles 25 — **mentira pior que a ausência da
  ordenação**. Com `aoOrdenar` a tela reconsulta (e volta à página 1); sem
  ele, o componente ordena o que recebeu, o que só vale para lista
  completa em memória. Tela paginada que não puder ordenar no servidor
  NÃO declara `ordenavel`.

## R15 — Toda capacidade interativa precisa de affordance VISÍVEL (02/09)

- **Capacidade sem sinal não existe para o usuário.** Toda interação
  disponível precisa de pelo menos: cursor adequado + sinal visual ao passar
  o mouse (ícone/realce) + tooltip curto nomeando a capacidade.
- **Onde vale**: qualquer interação "escondida" — clique no cabeçalho de
  coluna (alinhamento: ícone discreto no hover + tooltip
  "Alinhar / redimensionar"), alça de redimensionar (linha visível no
  hover, cursor col-resize), linha clicável (cursor pointer), bloco
  recolhível (seta).
- **Onde NÃO vale**: atalhos de teclado e gestos avançados podem viver só na
  documentação/Ctrl+K — desde que exista caminho visível equivalente.
  Exemplo: setas do teclado redimensionam coluna (avançado), mas a alça de
  arrasto visível é o caminho primário.
- Verificação: DoD T2 no harness (affordance do alinhamento visível).

## R16 — Cada responsabilidade tem UM dono na tela (02/09)

- **UMA busca, UM bloco de filtros, UM cabeçalho por contexto.** Quando um
  componente padrão traz a responsabilidade embutida (ex.: `BarraFiltros`
  traz a busca), a versão antiga da tela SAI no mesmo commit — coexistência
  é defeito (caso real: duas caixas de busca em Empresas do Grupo).
- **Onde vale**: qualquer duplicação de responsabilidade no mesmo contexto
  visual — dois campos de busca, dois cabeçalhos, dois blocos de filtro.
- **Onde NÃO vale**: contextos independentes na MESMA tela (ex.: busca da
  lista principal + busca interna de um modal aberto) são donos diferentes;
  cada contexto continua com no máximo um de cada.
- Verificação automática: o harness reprova dois campos de busca / dois
  blocos de filtro / dois cabeçalhos no mesmo contexto (DoD F1).

## R16b — O padrão cobre o caso, ou o caso vira exceção declarada (02/09)

- **Regra com vinte exceções não é regra** (decisão do cliente). Quando um
  conjunto de telas não cabe no componente padrão, a resposta é ESTENDER o
  componente — não acumular exceção.
- As cinco capacidades que a leva de 02/09 trouxe para a `TabelaPadrao`,
  todas **opt-in** (tabela que não as declara se comporta como antes):
  1. **Ordenação** no cabeçalho (`ordenavel` + `valorOrdenacao` na coluna);
  2. **Colunas escolhidas pelo usuário** (`colunasConfiguraveis`): mostrar,
     esconder e reordenar, salvo por lista — a coluna de identidade não
     pode ser escondida;
  3. **Seleção em lote** (`selecao`) com "todos" no cabeçalho, incluindo o
     estado indeterminado;
  4. **Linha expansível** (`linhaExpansivel`) e **agrupadora**
     (`agruparPor`);
  5. **Coluna fixa** (`fixa` na coluna): gruda à esquerda na rolagem
     horizontal, com fundo opaco e borda de limite — em tabela larga é o
     que diz de qual linha se está lendo o número.
- Exceção que sobra depois disso precisa de motivo técnico verificado no
  código e registro no manifesto — nunca "não deu".

## R17 — Toda tabela DECLARA suas colunas (02/09, decisão do cliente)

- **Onde vale**: todo arquivo que usa `TabelaPadrao` — manifesto ou não. O
  verificador estático (`validarLayout.mjs`, por AST) reprova ANTES de a
  tela chegar ao preview:
  1. coluna sem `tipo` (sem papel = sem medida nem alinhamento);
  2. coluna cujo `render` formata dinheiro sem `tipo: 'valor'` (é o que
     garante o T7 — valor nunca trunca — em tela que nem estreou);
  3. tabela sem coluna `tipo: 'identidade'` E sem a marca `semIdentidade`
     na `<TabelaPadrao>` — a ausência de identidade precisa ser DECLARADA,
     nunca silenciosa. Exemplo legítimo de `semIdentidade`: tabela de
     arquivos (nome de arquivo preserva caixa/extensão).
- **Onde NÃO vale**: tabelas fora do componente padrão (exceções
  registradas, ex.: pivô do ObraTipoApropriacao) — cobertas pelos seus
  próprios registros no manifesto.
- Motivo (defeito de 02/09): telas com coluna de identidade não declarada
  passavam no componente e falhavam T5/T6/T7 só no preview — a lacuna
  agora reprova na origem e some da matriz e da próxima leva ao mesmo
  tempo.

## R18 — `overflow: hidden` nunca em ancestral de sticky (02/09)

- **O problema**: `overflow: hidden` cria um contexto de rolagem, e todo
  `position: sticky` dentro dele passa a grudar NELE em vez de grudar na
  janela. O elemento simplesmente para de funcionar — **sem erro no
  console, sem falhar o build, sem aparecer em teste de unidade**. É a
  classe de defeito que só o DOM real denuncia.
- **Onde vale**: qualquer ancestral de faixa fixa (`.app-page-header`),
  coluna fixa (`tipo` com `fixa`), contêiner de rolagem de tabela
  (`.resizable-table-scroll`) ou cabeçalho grudado.
- **Onde NÃO vale (1) — `overflow-x: auto` / `scroll` no contêiner de
  rolagem** (aprovado pelo cliente em 02/09): só `hidden` sequestra sticky.
  `auto`/`scroll` é a forma CORRETA de rolar a tabela na horizontal, e é
  exatamente o scrollport ao qual a coluna fixa PRECISA grudar. Exemplo que
  vale: `.resizable-table-scroll { overflow-x: auto }` — a coluna com
  `fixa` gruda nele, que é o comportamento desejado. Proibir aqui seria
  proibir a solução certa.
- **Onde NÃO vale (2)**: elementos pequenos que só recortam forma —
  avatar redondo, barra de progresso, miniatura. Ali `hidden` é inofensivo
  porque nada dentro precisa grudar.
- **Onde NÃO vale (3)**: o idioma de truncamento `overflow: hidden` +
  `text-overflow: ellipsis` / `white-space: nowrap` numa célula ou rótulo.
  Não é ancestral de nada fixo; o check estático inspeciona o BLOCO da
  regra e ignora esse par (regra que vira ruído deixa de ser lida).
- **O que usar quando precisa cortar**: `overflow: clip`. Corta igual e
  NÃO cria scrollport, então preserva o sticky.
- **Histórico** (por isso a regra existe): `.rhdp-page` derrubou a faixa do
  topo; `.ao-financial` derrubou a coluna fixa da auditoria; a varredura
  completa achou NOVE telas de detalhe com a faixa fixa quebrada desde o
  início. Sempre o mesmo mecanismo, sempre com o código parecendo certo.
- **Verificação**: check estático no `validarLayout.mjs` (CSS dos
  componentes padrão e dos módulos com tela reformada) + **prova no
  harness**, que rola a tela real e mede se o elemento fixo continuou no
  lugar, andando a cadeia de ancestrais até o scrollport PRETENDIDO — a
  janela, no caso da faixa; o `.resizable-table-scroll`, no caso da coluna
  fixa — e nomeia o culpado. Sem a prova de runtime o check estático dá
  falso "conforme": foi assim que as nove telas passaram anos aprovadas.

## A1 — Linha acionável alcançável por TECLADO (02/09)

- Linha que responde a clique precisa de caminho por teclado: `tabIndex`
  próprio com Enter/Espaço **ou** um controle focável dentro dela (link ou
  botão) que faça a mesma ação. Foco visível é obrigatório.
- **Por que virou item da DoD**: a migração do GestaoContratos removeu o
  `tabIndex` da linha e ninguém percebeu — quem não usa mouse perdia a
  ação inteira. Compilava, passava no validador, parecia certo.
- **Onde NÃO vale**: tela sem linha acionável (N/A registrado na matriz).
- Verificação: item **A1** da DoD, cobrado pelo harness em toda tela.

## R19 — nada de caixa do navegador (02/09)

- **O problema**: `window.alert()`, `window.confirm()` e `window.prompt()`
  desenham uma caixa do Chrome, não do sistema. Ela ignora tema, tipografia e tokens; bloqueia
  a página inteira; o harness não consegue medi-la (não existe no DOM); e
  ela some sem deixar rastro. Dá o mesmo peso a "salvo com sucesso" e a
  "estornar o fechamento".
- **O que usar**: `Avisos` + `useAvisos` para aviso (faixa dentro da
  página, com o tom semântico e fechável; sucesso some sozinho em 6s) e
  `useConfirmacao` para confirmação (modal do sistema, rótulo dizendo o que
  vai acontecer, destrutiva em vermelho suave e apartada). Quando a
  confirmação precisa de um TEXTO — justificativa de estorno, motivo de
  cancelamento —, `useConfirmacao` recebe `campo: { rotulo, obrigatorio,
  multilinha }` e devolve `{ ok, texto }`. Ambos em `components/padrao`.
- **`prompt` entrou depois, no mesmo dia.** A primeira versão da regra só
  bania `alert` e `confirm`; o estorno do RhDpFechamentos pedia a
  justificativa em `window.prompt` e passava batido no check — a MESMA
  caixa, pelos mesmos motivos. Regra tem de cobrir a família inteira, não
  os dois casos que estavam à vista: o componente cresceu (R16b) e a regra
  fechou o buraco no mesmo movimento. São 27 chamadas de `prompt` em 14
  arquivos, agora dentro do trinco.
- **Onde vale**: TODO o `frontend/src` — decisão do cliente em 02/09, ao ver
  que 51 chamadas num módulo só indicavam o mesmo em todos os outros.
- **Onde NÃO vale**: nada. Não há exceção declarada; se aparecer um caso
  que o componente não atende, o componente cresce (R16b), a regra não abre.
- **O trinco** (por que a regra não reprova 857 arquivos hoje): a varredura
  achou **857 chamadas em 122 arquivos**, passivo de anos que nenhuma leva
  zera de uma vez, e reprovar tudo hoje pararia o build — regra que vira
  ruído deixa de ser lida (lição da R18). Então o passivo está congelado em
  `frontend/scripts/trinco-dialogos.json`, com a contagem de cada arquivo na
  data em que a regra nasceu:
  - arquivo NOVO com `alert`/`confirm`/`prompt` → **FALHA**;
  - arquivo do trinco cuja contagem SOBE → **FALHA**;
  - contagem que cai → passa, e o trinco aperta (aviso pedindo a atualização).
  O número só anda para baixo. Cada leva zera os arquivos que tocar; a leva
  do RH/DP tirou 51 dele.
- **Verificação**: `validarLayout.mjs`, provado nos três sentidos — arquivo
  novo com `alert()` reprova, arquivo novo com `prompt()` reprova, e arquivo
  do trinco que aumenta de 4 para 5 reprova nomeando os dois números. Mais a
  prova de runtime no harness (item **R3** da matriz): um spy de `dialog` na
  página real reprova a tela em que qualquer caixa dispara.

## R24 — token que o tema sobrescreve não se corrige na folha (03/09)

- **O problema**: o `ThemeContext` escreve dezenas de variáveis como estilo
  INLINE no `:root` (`setCssVar(root, '--c-muted', palette.muted)`). Estilo
  inline vence qualquer folha de estilo. Corrigir o valor no `index.css`
  **não chega à tela** — e nada avisa.
- **O que aconteceu (é o motivo da regra)**: em 02/09 corrigi o contraste do
  texto secundário no `index.css`, publiquei, e escrevi no commit "4,92:1
  com folga". O valor efetivo continuou `#5f7496` = **4,50:1**, idêntico ao
  que a matriz reprovava antes. O número que eu afirmei era o do token que
  nunca chega à tela. Uma correção publicada, uma afirmação falsa no
  registro, e a mesma célula reprovando.
- **A regra**: antes de corrigir um token, verifique se o `ThemeContext` o
  escreve. Se escreve, o conserto é lá — no ponto em que o valor é DECIDIDO,
  não onde ele está declarado.
- **E, para os tons de texto, o conserto certo não é trocar a cor**: é um
  PISO. O tom é configurável pelo tenant, então o sistema garante o mínimo
  (`garantirContraste` no ThemeContext escurece/clareia até passar do AA e
  deixa intacta a cor que já passa). O tenant escolhe; o sistema garante que
  é legível.
- **Lição de método, que vale além do contraste**: uma correção só está
  provada quando é medida ONDE O USUÁRIO VÊ. "Editei o token" não é prova;
  "medi a cor computada no preview" é.

## R23 — filtro aplica ao marcar; consulta cara confirma (02/09)

Decisão do cliente, com critério explícito **de propósito**: sem número, isso
vira julgamento tela a tela, e aí duas telas irmãs se comportam diferente
sem ninguém saber dizer por quê.

- **Regra**: marcar um filtro **aplica na hora**. A etiqueta que aparece na
  faixa afirma o que está filtrando; se ela aparecer antes de a lista
  mudar, a etiqueta mente (F3).
- **Exceção — consulta cara**: a tela mantém um botão explícito
  ("Atualizar relatório") e as marcas viram RASCUNHO até o clique, quando
  qualquer um destes for verdade:
  - montar o recorte dispararia **mais de 3 requisições** (ou seja, a tela
    tem 4+ dimensões que o usuário costuma combinar); **ou**
  - a consulta leva **mais de 2 segundos** para responder no ambiente de
    dev com dados reais.
- **Quando a exceção vale, ela é declarada na tela**: o botão diz o que faz
  ("Atualizar relatório", não "Aplicar filtros") e o texto de apoio avisa
  que o recorte só vale no clique. Sem isso, a etiqueta continua mentindo —
  só que mais devagar.
- **Onde vale hoje**: lista aplica ao marcar (Documentos, Fechamentos,
  Colaboradores, Importações, Apuração, Pessoal); o **Relatório
  Operacional** é a exceção — 6 dimensões e agregação pesada.
- **Onde NÃO vale**: busca textual, que sempre tem espera de digitação
  (350ms) e nunca botão; e filtro de uma dimensão só, que não chega perto
  do critério.

## R22 — hook usado é hook importado (02/09)

- **O problema**: `useRef` (ou qualquer hook) usado sem estar no `import`.
  O `npm run build` **PASSA** — o bundler não resolve identificadores
  globais — e a tela quebra com `ReferenceError` só quando renderiza. Tela
  branca em produção, silêncio no CI.
- **Onde vale**: todo o `frontend/src`, para os hooks do React e para os
  hooks próprios do projeto (`useAvisos`, `useConfirmacao`). O check aceita
  `React.useState(...)` e hooks declarados no próprio arquivo.
- **História**: aconteceu numa correção do próprio orquestrador em 02/09, e
  o processo inteiro usava "o build passou" como prova de que a tela estava
  de pé. Nenhum dos outros checks via essa classe.
- **A lição maior**: **`npm run build` não é prova de que a tela funciona.**
  Ele prova que o código compila e empacota — nada mais. Toda vez que um
  contrato de agente disser "o build tem de passar", isso é o piso, nunca o
  teto; a prova de verdade é o harness contra o preview.
- **Verificação**: `validarLayout.mjs`, provado no ponto exato onde importa
  — com o defeito plantado, o build sai 0 e o validador sai 1.

## R21 — retorno de `confirmar()` se desestrutura (02/09)

- **O problema**: `useConfirmacao().confirmar()` devolve `{ ok, texto }` — e
  **objeto é sempre truthy**. `const ok = await confirmar({...}); if (!ok)
  return;` compila, roda, e faz o botão **"Cancelar" seguir com a ação**.
  Calado.
- **A forma certa**: `const { ok } = await confirmar({ ... }); if (!ok) return;`
  (ou `const { ok, texto } =` quando a confirmação pede justificativa).
- **Onde vale**: todo o `frontend/src`.
- **História, e é o motivo da regra**: o hook nasceu devolvendo booleano. No
  meio da leva do RH/DP ele ganhou o `campo` (justificativa de estorno), que
  precisa devolver o texto junto — então o retorno virou objeto. Quatro
  telas JÁ ESCRITAS ficaram lendo objeto como booleano, uma delas no
  **estorno de fechamento**, que cancela títulos no financeiro. Passou pelo
  build e por todos os outros checks; quem achou foi um agente de outra
  tela, lendo o código das irmãs.
- **A lição maior**: mudar o CONTRATO DE RETORNO de um componente padrão no
  meio de uma leva **não é mudança compatível** — quem já escreveu continua
  compilando e passa a fazer outra coisa. Ou o check nasce junto com a
  mudança, ou a mudança espera a leva acabar.
- **Verificação**: `validarLayout.mjs`, provado nos dois sentidos. O check
  ignora comentários: a própria documentação do `Confirmacao.jsx` mostra a
  forma errada para explicar por que é errada, e marcá-la seria ruído.

## R20 — tela que sai do menu declara o redirecionamento (02/09)

- **O problema**: quando uma tela sai do menu por decisão do cliente, o
  destino antigo continua vivo em favorito, link salvo, atalho e card de
  hub. Sumir com a rota quebra todos eles em silêncio — a pessoa clica no
  favorito e cai numa tela em branco.
- **A regra**: toda rota retirada da navegação vira
  `<Route path="X" element={<Navigate to="Y" replace />} />`. Redirecionar,
  nunca apagar.
- **Onde NÃO vale**: rota que nunca esteve na navegação e nunca teve
  chegada nenhuma (código morto de verdade) — essa some mesmo.
- **Verificação**: `validarNavegacao.mjs` lê os `<Navigate>` do próprio
  `App.jsx` e trata o destino como PRESERVADO, imprimindo para onde ele vai.
  Leitura automática de propósito: lista de exceção escrita à mão envelhece
  e vira mentira; assim, apagar o redirecionamento faz o destino voltar a
  acusar perda no mesmo instante. Provado nos dois sentidos.
- **História, que é o motivo da regra existir**: a leva do RH/DP tirou
  `/rh-dp` e `/rh-dp/apuracao` do menu (D1/D3) e o `validarNavegacao.mjs`
  acusou os dois. Duas lições:
  1. Um agente relatou que "já falhava antes da leva" — não falhava. A
     verificação certa é rodar o check no commit anterior, não confiar no
     relato.
  2. **O check existia e não estava ligado a nenhum `npm run`.** Ninguém o
     executava. Passou a rodar dentro do `test:responsive` — check que
     ninguém executa não é check, é arquivo.

## Disciplina de regras (02/09 — vale para toda regra nova e existente)

1. **Escopo explícito obrigatório**: toda regra declara onde vale, onde NÃO
   vale, e um exemplo de cada. Regra sem exceção declarada não é regra, é
   armadilha (foi assim que a R11 comeu a seta de voltar).
2. **Remover elemento visível exige aprovação do cliente**, a não ser que a
   remoção esteja explicitamente autorizada na própria regra. Recolher e
   reorganizar é livre; REMOVER não.
3. **Defeito apontado que a DoD não cobre**: o item entra em
   `docs/DEFINICAO-DE-PRONTO.md` ANTES da correção, e a matriz roda de novo
   em todas as telas.
4. **Regra nova nasce com prova no harness**, não só com check estático.
   Check estático mede um arquivo; o defeito costuma morar na composição de
   vários, no navegador, depois da rolagem. A R18 é o caso-testemunha: nove
   telas de detalhe estavam com a faixa fixa quebrada desde o início e
   nenhum check estático poderia ter pego, porque cada arquivo, isolado,
   estava conforme. Regra que só tem check estático é regra que ainda não
   sabe se funciona.

## Verificação

1. **Estática** (`validarLayout.mjs`, dentro do `npm run test:responsive`):
   roda sobre as telas do manifesto e reprova — `<table` crua; `w-[NNNpx]` em
   input; `page-subtitle`/parágrafo de apoio fora do PageHeader;
   `larguraAcoes` > 320; botão com classe de altura < h-8 (32px);
   subtítulo com contagem embutida em vez da prop `contagem`; e TODA medida
   à mão (R10): px em style inline, `*-[NNNpx]`, espaçamento/dimensão fora
   dos degraus, `largura`/`minWidth` em coluna, `text-base`/`text-xl`+.
2. **Runtime** (auditoria embutida no roteiro de capturas): mede alvo de
   clique < 32px, `.input-moeda` < 180px, vão topbar < 24px, tabela sem
   alças de redimensionamento, overflow horizontal da página.
3. Capturas de leva: SEMPRE em 1920/1366/390, com dados de pior caso (nome
   60+ chars, razão social longa, valor em bilhões com centavos, linha com
   todos os campos e o máximo de botões), e o resultado da auditoria junto.

## R25 — Cor de tela vem de TOKEN, nunca de paleta crua (03/09)

- **O que reprova**: classe de paleta crua do Tailwind com degrau numérico
  (`text-slate-500`, `bg-emerald-100`, `border-amber-200`…), cor em
  hexadecimal, `rgb()`/`rgba()`/`hsl()`, e cor arbitrária entre colchetes
  (`text-[#64748b]`). Vale para toda tela do manifesto, sem trinco.
- **De onde a cor vem**: token (`--c-*`, `--ui-*`, `--sem-*`) ou classe do
  sistema que aponta para token (`text-muted`, `badge-*`, `btn-*`,
  `StatusBadge`).
- **Por que**: paleta crua não tem par definido no tema escuro e **não passa
  pelo piso de contraste** que o `ThemeContext` aplica (R24). `text-slate-500`
  é `#64748b`: **4,34:1** sobre fundo claro, contra o mínimo AA de 4,5:1.
- **O que continua permitido**: `var(--...)`, `currentColor`, `transparent`,
  `inherit`, e as classes sem degrau de paleta (`text-white`, `bg-black`),
  cujo uso legítimo é sobre superfície semântica já declarada.
- **Por que nasceu tarde, e o que isso custou**: a M2 e a M3 existem na DoD
  desde o começo e o harness mede contraste no preview real — mas **nenhum
  check estático olhava a CLASSE de cor**. Durante as levas isso era
  conferido por `grep` manual, agente por agente. A `FinanceiroTituloDetalhe`
  entrou no manifesto, fechou matriz e ficou com **64 cores cruas**,
  incluindo a que reprova AA.

## R26 — Ação confirmada opera sobre referência FIXADA antes do `await` (04/09)

- **A regra**: o handler captura o registro numa `const` **antes** de abrir a
  confirmação, e a ação usa essa `const`. Nunca relê o estado da tela depois
  do `await`.

  ```js
  const lote = selectedBatch;              // fixa ANTES
  const { ok, texto } = await confirmar({ mensagem: `Cancelar ${lote.codigo}?` });
  if (!ok) return;
  await cancelar(lote.id, texto);          // MESMA referência
  ```

- **Por que ela nasceu agora, e não antes**: com `window.prompt` a página
  fica **bloqueada** — nada podia mudar entre a pergunta e a ação, e o
  defeito era impossível. O modal do sistema **não bloqueia**: a tela segue
  montada e clicável. Numa lista lateral, clicar noutro registro enquanto o
  modal está aberto faz a tela **perguntar sobre o lote A e cancelar o lote
  B**.

- **É a classe CONSENTIMENTO** da DoD, na sua forma mais traiçoeira: a
  trilha de auditoria registra um consentimento **válido** — a pessoa leu o
  código do lote A e confirmou — para uma ação sobre o lote B. Ninguém
  descobre pelo log.

- **Nenhum check pega, e não é descuido**: o identificador é o mesmo nos dois
  lados (`selectedBatch` na mensagem e na ação); o que muda é o **conteúdo**
  entre a leitura e o uso. É exatamente o "mesmo nome, conteúdo diferente"
  que a DoD já declara como escape por construção da família D. **Leitura
  obrigatória do revisor.**

- **Alcance**: vale para toda migração de `prompt`/`confirm` para o modal do
  sistema. Restam ~700 chamadas congeladas no trinco — cada uma que migrar
  abre esta janela onde antes não havia. **Trocar a caixa do navegador pelo
  componente não é só trocar a aparência: muda o modelo de concorrência da
  ação.**
