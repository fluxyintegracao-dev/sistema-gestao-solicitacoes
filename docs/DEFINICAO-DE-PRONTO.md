# DEFINIÇÃO DE PRONTO (DoD) — por tela, verificável, sem interpretação

Criada em 02/09 por decisão do cliente, depois que "pronto" reportado em
mock local chegou com defeito no preview publicado.

**"PRONTO" significa UMA coisa só:** verificado NO PREVIEW PUBLICADO
(https://refactor-dev.jrfluxy.com.br), com dados REAIS, em TODAS as telas do
escopo, contra os itens abaixo, com evidência por tela (captura + resultado
PASSOU/FALHOU por item). Qualquer outra coisa é "em andamento".

- "Implementado no componente" NÃO é pronto — é capacidade, não cobertura.
  Só verificação NA TELA muda o estado de um item.
- Quem verifica é o harness `frontend/scripts/qa-preview/` (Playwright contra
  o preview real, logado com o usuário de QA), que gera a
  `docs/MATRIZ-COBERTURA.md` automaticamente. Matriz não se edita à mão.
- Quando o cliente aponta um defeito que a DoD não cobre, o item entra AQUI
  ANTES da correção, e a matriz roda de novo em todas as telas.

## Como cada item é verificado

Cada item recebe **PASSOU / FALHOU / SEM DADO / N/A** por tela. N/A só
quando o item não se aplica ao tipo da tela (ex.: C3 em listagem, X1 em tela
sem tabela) — e o motivo do N/A é registrado pelo harness. **SEM DADO** é
quando a tela TEM a capacidade e a base do preview não devolveu registro
para exercitá-la: não é aprovação, e não vira aprovação por equivalência com
outra tela. FALHOU vem com o seletor do elemento e a medida que reprovou.

---

## O QUE A VERIFICAÇÃO AUTOMÁTICA NÃO ALCANÇA (03/09)

**Esta é a seção mais importante deste documento, e ela existe porque um
defeito destrutivo passou por tudo.**

Todo check que construímos — os 34 itens desta DoD, o validador estático, o
harness contra o preview — mede **FORMA**:

- o elemento **existe** no DOM (C1, B1, A1);
- a medida **está** num degrau da escala (R10, M1);
- o alinhamento do `th` **é igual** ao do `td` (T1);
- o contraste **atinge** 4,5:1 (M3);
- a palavra **não** quebra ao meio (T6).

Todas essas perguntas têm resposta observável: aponta-se para o elemento e
mede-se. Um programa consegue fazer isso, e é por isso que conseguimos
automatizá-las.

**O defeito de 03/09 não era de forma. Era de SEMÂNTICA.**

O código estava assim:

```js
const ok = await confirmar({ titulo: 'Estornar título?' });
if (!ok) return;
estornar();
```

Ele **compila**. Passa no `eslint`. Passa no `npm run build`. Passa nos 34
itens da DoD. Passa no validador estático. Passa no harness contra o preview
publicado. A tela **renderiza corretamente**: a caixa de confirmação aparece
no lugar certo, com o texto certo, o botão "Cancelar" com o contorno certo e
o alvo de clique certo.

E faz **o oposto do que promete**: `confirmar()` devolve `{ ok, texto }`, e
objeto é sempre truthy — então `!ok` é sempre falso, o `return` nunca
acontece, e clicar em **"Cancelar" ESTORNA O TÍTULO**.

Nenhum check pega isso, e não é por descuido de quem os escreveu. Para pegar,
o verificador precisaria saber **o que a ação promete ao usuário** e
comparar com **o que ela faz**. Isso não é medição: é leitura.

### A regra que fica

> **Verificação automática cobre FORMA. SEMÂNTICA exige LEITURA.**
>
> Nenhuma quantidade de check verde prova que a tela faz o que diz. O
> revisor separado não é redundância nem cerimônia: é o único instrumento
> que temos para a classe de defeito em que o código está formalmente
> correto e semanticamente invertido.

**Por isso o revisor separado existe, e por isso ele lê o código e as
capturas — não os relatórios.** Um revisor que lê "34/34 PASSOU" e aprova
não está revisando: está repetindo o que o harness já disse.

### Os três defeitos graves desta reforma, e como cada um foi achado

| Defeito | Consequência | Achado por |
|---|---|---|
| `confirmar()` lido como booleano | "Cancelar" estornava título financeiro | **Leitura** |
| Contraste "4,92:1 com folga" que na tela era 4,50 | Texto no limite do ilegível, e um commit meu afirmando o contrário | **Leitura** (o token era sobrescrito em runtime) |
| Faixa fixa quebrada em nove telas de detalhe | Ação principal sumia ao rolar | **Leitura** (`overflow: hidden` num ancestral) |

**Nenhum dos três foi achado por check.** Todos os três viraram check
DEPOIS — R21, R24 e R18 — e é assim que tem de ser: a leitura acha, e o
check impede a volta. O caminho nunca é o inverso.

### O corolário incômodo

Quando um check vira verde, a pergunta certa não é "acabou?". É **"o que
este check NÃO estava olhando?"**. Nesta reforma, sete pontos cegos do
verificador foram achados assim — inclusive um caso em que **um check verde
provava que o outro estava certo**: a T3 passava porque a tabela não
redistribuía largura nenhuma, que era exatamente o defeito que a T4
apontava.

## CABEÇALHO

- **C1** Faixa fixa presente; ao rolar, gruda ENCOSTADA na topbar (top da
  faixa = base da topbar, sem folga), compacta sem sumir, e NENHUM conteúdo
  da lista fica visível entre a base da topbar e o topo da faixa (vão
  transparente é reprovação).
- **C2** Título em 22px; apoio (contagem + descrição) em UMA linha, sem
  quebra, na própria faixa; contagem junto do apoio.
- **C3** Seta de voltar à esquerda do cabeçalho — SÓ em tela de
  detalhe/registro (em listagem, N/A; seta presente em listagem também é
  defeito de R11).
- **C4** Em tela de detalhe: nome/identificação do registro com destaque
  (peso e escala de título). Número sem nome é defeito.
- **C5** Ações principais à direita: UM primário sólido, secundários em
  contorno, destrutiva apartada.
- **C6** Nenhum link de navegação disfarçado de ação (menu "⋯" e barra de
  ações sem navigate/Link de "ir para" — R11).
  **Escopo declarado**: a C6 pressupõe o shell (menu, breadcrumb, Ctrl+K).
  Em tela que renderiza FORA do `Layout` ela **se inverte** — o link de
  navegação é a única saída e é obrigatório. Ver a seção "TELAS FORA DO
  SHELL" abaixo e a R11 em `docs/REGRAS-LAYOUT.md`. Não é exceção de tela:
  é escopo da regra, e vale para qualquer tela futura fora do shell.

## TABELAS

- **T1** Título e conteúdo da coluna com o MESMO alinhamento (th × td).
- **T2** Menu de alinhamento no cabeçalho, com affordance VISÍVEL (cursor +
  ícone no hover + tooltip). Capacidade sem sinal não existe (R15).
- **T3** Redimensionamento arrastando muda SÓ a coluna arrastada e PERSISTE
  ao recarregar a página.
- **T4** Colunas proporcionais ao conteúdo — sem coluna sobrando enquanto
  outra espreme (a sobra vai para a coluna de conteúdo).
- **T5** Coluna de identificação exibida em MAIÚSCULAS; sublinha em caixa
  normal.
- **T6** O MAIOR nome real da base não corta feio (reticências no meio de
  palavra sem tooltip = FALHOU; truncar com title completo é aceitável para
  texto, nunca para valor).
- **T7** O MAIOR valor monetário real da base não vaza nem trunca — NUNCA.
  Largura da coluna de valor dimensionada pelo pior caso real.

## FILTROS E BUSCA

- **F1** UMA única caixa de busca no contexto, ocupando a largura da faixa
  (duas buscas no mesmo contexto = FALHOU — R16).
- **F2** Filtros marcáveis (checkbox, múltipla seleção); nenhum select de
  filtro (select de formulário e seletor de contexto seguem legítimos — R12).
- **F3** Etiquetas de filtro ativo visíveis e removíveis.
- **F4** Espaçamento entre a linha de filtros e a tabela vem da escala
  (16px), igual em toda tela — nem colado, nem sobrando.

## BLOCOS

- **B1** Fundo cinza-azulado (canvas) com blocos brancos flutuando.
- **B2** UM bloco principal com barra de cor; secundários neutros.
- **B3** Cada informação aparece UMA vez só na tela (mesma contagem/apoio na
  faixa E no bloco = FALHOU; segunda aparição com função diferente é
  exceção registrada).
- **B4** Campo vazio some, com contador "ver N campos vazios".
- **B5** Nenhum texto solto fora de bloco (todo texto tem superfície).

## MEDIDAS E CORES

- **M1** Alvo mínimo 32×32px desktop / 44×44px toque em todo botão e ícone
  clicável.
- **M2** Nenhuma medida fora da escala (4/8/12/16/24/32/48; tipo
  12/14/18/22) — exceção só com registro no manifesto.
- **M3** Contraste AA (4.5:1 corpo, 3:1 texto grande) em todo texto.
- **M4** Comparações: previsto AZUL × realizado VERMELHO, mesma cor da série
  no KPI, no gráfico e na tabela.

## FORMULÁRIOS

- **R1** Cadastro raro abre em MODAL, não inline na tela.
- **R2** Campos da mesma linha alinhados (mesma altura/baseline), largura
  por tipo de dado.
- **R3** (novo, 02/09 — decisão do cliente) **Nenhum `alert()`,
  `confirm()` ou `prompt()` do navegador.** Aviso de erro/sucesso usa `Avisos`/`useAvisos`
  (faixa dentro da página, tom semântico do sistema); confirmação usa
  `useConfirmacao` (modal do sistema, com o rótulo dizendo o que vai
  acontecer e a ação destrutiva em vermelho suave e apartada).
  Motivo: a caixa do navegador ignora tema, tipografia e tokens, bloqueia a
  página, não pode ser medida pelo harness e some sem deixar rastro no DOM.
  Confirmação que precisa de texto (justificativa de estorno, motivo de
  cancelamento) usa `campo` no `useConfirmacao` — não `window.prompt`.
  Verificação: **R19** no validador estático, valendo para o sistema
  inteiro, com o passivo herdado congelado em trinco (`scripts/trinco-dialogos.json`)
  que só pode diminuir; e no harness, um spy de `dialog` na página real que
  reprova a tela em que qualquer caixa do navegador dispara.

## ESTRUTURA E ACESSIBILIDADE

- **R18** Nenhum ancestral de faixa fixa, coluna fixa ou contêiner de
  rolagem de tabela usa `overflow: hidden` (que mata o `position: sticky`
  em silêncio). Corte com `overflow: clip`.
- **A1** Toda linha acionável tem caminho por TECLADO: `tabIndex` com
  Enter/Espaço, ou um link/botão focável dentro da linha que faça a mesma
  ação. N/A só em tela sem linha acionável.

## TELAS FORA DO SHELL — DoD própria (03/09)

Quatro telas renderizam **sem o `Layout`**: sem topbar, sem menu lateral,
sem breadcrumb — Login, Recuperar Senha, Definir Senha e a Cotação Pública
do fornecedor (a única que alguém **de fora da empresa** usa, por link com
token).

Medi-las com a régua das telas internas produz FALHOU que não significa
nada: metade dos itens pressupõe um shell que ali não existe. Então esta
seção declara o que vale, o que NÃO vale, e o que se INVERTE.

**Não se aplica (N/A registrado no manifesto, com este motivo):**
- **C1/C2** — não há faixa fixa presa à topbar, porque não há topbar. O
  título continua existindo e continua no degrau de 22px; o que sai é a
  exigência de faixa grudada.
- **C3** — não há tela de detalhe nem hierarquia de retorno.
- **X2** — idem C1: sem topbar, não há o que grudar.
- **F1–F4** — não há listagem com recorte.

**Inverte-se, e esta é a diferença que importa:**
- **C6 e R11** dizem que navegação não é ação e que "Voltar" redundante sai
  da tela, porque o breadcrumb e o menu resolvem. **Aqui não resolvem: não
  existem.** O link "Esqueci minha senha" no Login e o "Voltar ao login" no
  Recuperar Senha são a ÚNICA navegação disponível — são obrigatórios, não
  redundantes. Remover é deixar a pessoa presa.
  **Registrado como ESCOPO da R11, não como exceção destas quatro telas**
  (decisão do cliente, 03/09): qualquer tela futura que renderize fora do
  `Layout` já nasce sob esta leitura, sem precisar pedir exceção. Exceção é
  permissão que alguém tem de lembrar de pedir, e o que não é pedido escapa
  — foi assim que a R11 comeu a seta de voltar em 02/09.

**Vale integralmente, e sem desconto:**
- **M1–M4** (medidas, cores por token, contraste AA, alvo de clique) —
  contraste importa MAIS aqui: a tela de login costuma ser vista em
  monitor ruim, luz forte, celular na obra.
- **R1–R3** (formulário; nenhuma caixa do navegador). A Cotação Pública tem
  **14** delas hoje, e é a tela de um terceiro: `alert()` do Chrome numa
  página que representa a empresa para o fornecedor é o pior lugar do
  sistema para isso.
- **B1–B5**, **X1**, **X3**, **R18**, **A1**, **T1–T7** onde houver tabela
  (a Cotação Pública tem uma).

**Uma exigência a mais, que só existe aqui:** estas telas são a primeira
coisa que o usuário vê e, na Cotação, a única. Erro de rede, token
inválido, sessão expirada e link vencido precisam de mensagem que diga **o
que fazer**, não só o que falhou — não há menu para onde escapar.

## MOBILE (390px)

- **X1** Tabela vira cards legíveis (mesmas colunas, um markup).
- **X2** Faixa fixa funciona (gruda, compacta, não some, sem vão).
- **X3** Nada estoura a largura da viewport (sem scroll horizontal da
  página; tabela rola dentro do próprio contêiner).

## Evidência exigida por entrega

1. `docs/MATRIZ-COBERTURA.md` completa (todas as telas entregues, não só as
   novas — regressão é obrigatória), com data da verificação e cada FALHOU
   justificado.
2. Capturas do preview real por tela em 1920 / 1366 / 390.
3. Relatório de falhas com item da DoD + seletor do elemento.
4. Lista de decisões pendentes do cliente.

Narrativa de "gate passou" sem matriz, captura de mock e "implementado no
componente" NÃO são evidência.

## Por que o preview real — casos registrados (02/09)

Quatro defeitos desta rodada eram **código "correto" que não produzia o
elemento (ou o sinal) no DOM** — a classe de defeito que NENHUMA validação
em mock/código pega, e que o harness contra o preview real existe para
pegar:

1. **Seta de voltar removida por regra.** A R11 (sem escopo declarado) foi
   aplicada ao pé da letra e o código ficou "conforme a regra" — mas o DOM
   da tela de detalhe perdeu a affordance primária de retorno. Nenhum teste
   de código reprova a AUSÊNCIA de um elemento que a regra mandou remover;
   só a DoD (C3) medida na tela real reprova.
2. **Menu de alinhamento invisível.** A capacidade existia, publicada e
   funcional — e clicar no cabeçalho não tinha NENHUM sinal (cursor, ícone,
   tooltip). "Implementado e testado" era verdade; "existe para o usuário"
   era falso. Virou a R15: capacidade sem sinal não existe. Só um check que
   passa o mouse no DOM real (T2) enxerga isso.
3. **Seletor morto de topbar.** O `Pagina` media `.topbar-shell` — um
   seletor que NÃO EXISTE no DOM real (a topbar é `.fx-topbar`) — e caía
   num fallback que criava o vão transparente. No mock, com o shell
   simplificado, a medida nunca era exercitada de verdade; o código lia
   como certo e o defeito só existia no ambiente real. O mesmo vale para a
   faixa que nascia compactada (sentinela com margem fixa): só rolagem numa
   janela real, com a topbar real, revela.
4. **Nove telas de detalhe com a faixa fixa quebrada desde o início.** Ao
   varrer o sistema atrás de `overflow: hidden` sequestrando sticky (R18),
   apareceram NOVE telas de detalhe cuja faixa do topo nunca grudou — não
   foi regressão de uma leva, estava assim desde que a tela existe. O
   componente `PageHeader` estava certo, o CSS da faixa estava certo, o
   `position: sticky` estava lá: um ancestral da tela (`.rhdp-page`,
   `.ao-financial` e afins) criava scrollport com `overflow: hidden` e a
   faixa passava a grudar nele — ou seja, em lugar nenhum visível. Zero
   erro no console, zero falha de build, zero reprovação no validador.
   Nenhum check pegou porque o único check existente era estático, e
   estaticamente TUDO estava conforme: o defeito só existe na composição
   dos três arquivos, dentro de uma janela que rola.

Moral operacional: **mock valida lógica; só o preview publicado valida
EXISTÊNCIA e SINAL** — elemento presente, affordance visível, medida feita
sobre o DOM que o usuário vê. Por isso a matriz só aceita verificação no
preview.

Consequência do 4º caso, que vale para o processo daqui pra frente: **toda
regra nova nasce com PROVA NO HARNESS, não só com check estático.** Check
estático mede um arquivo; o defeito mora na composição de vários, no
navegador, depois da rolagem. A R18 só virou regra de verdade quando ganhou
a prova de runtime — rolar a tela real e medir se o elemento fixo continua
no lugar. Regra que só tem check estático é regra que ainda não sabe se
funciona.
