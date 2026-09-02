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
| Valor monetário | **150px**, alinhado à direita, `tabular-nums` |
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

## R4 — Respiro do topo

- Token **`--respiro-topbar: 24px`** entre a barra fixa e o primeiro conteúdo
  da página, aplicado no `.app-page-header` (margin-top). A auditoria runtime
  mede o vão real e reprova < 24px.

## R5 — Texto de apoio ancorado

- O texto de apoio NUNCA é um parágrafo solto: entra no `PageHeader` via
  props **`contagem`** (número/resumo, renderizado em `<strong>` com cor de
  texto) e **`subtitulo`** (peso 500, 0.9rem, `--c-muted`, máx 78ch),
  empilhados sob o título com margem definida (4px). `page-subtitle` fora do
  PageHeader em tela do manifesto é REPROVADO pelo verificador estático.

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

## R8 — Contraste em comparações

- Séries comparadas (orçado × executado etc.): **uma neutra + uma saturada**
  — neutra = `--ui-border-strong` (cinza), destaque = `--c-primary`. NUNCA
  dois tons da mesma família. Vale para barras, linhas e legendas.

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
