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

## R11 — Navegação não é ação (02/09; ESCOPO corrigido em 02/09 após defeito)

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
- O verificador reprova item de `mais`/`itens` com `navigate(`/`to:`/`Link` —
  e o harness reprova tela de detalhe SEM a seta (DoD C3).

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
