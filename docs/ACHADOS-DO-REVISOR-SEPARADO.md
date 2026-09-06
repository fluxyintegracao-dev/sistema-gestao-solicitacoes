# Achados do revisor separado — capturas do preview (06/09)

> **Quem olhou:** um revisor que **não escreveu nada deste código**. É a
> condição que o cliente pôs para fechar a leva, e ela se justificou: tudo
> aqui é coisa que **a matriz automática não pega por construção** — ela
> mede regras, o revisor enxerga a tela.

**Cobertura declarada:** 58 capturas (37 em 390px, 9 em 1366px, 12 em 1920px),
escolhidas por critério e não por varredura: telas mais usadas, peso em 390px,
preferência por telas que a matriz deu como **PASSOU**, e comparação lado a
lado entre telas irmãs. Mais uma medição programática da altura da barra do
topo nas **198 telas** em 390px, para saber onde olhar antes de olhar.

**O que ele não olhou, e disse:** o corpo inteiro das páginas longas (várias
com 15.000 a 155.000px de altura em 390px) e as camadas flutuantes — camada
fechada não se julga em captura estática.

---

## CERTO — confirmado por medição

### A1. Barra do topo sobreposta em 390px, em 28 telas

Medido nas 198 telas: **165 têm barra de duas linhas (118px), 28 têm uma linha
só (66px)** — e nessas os botões redondos se atravessam. Casinha sobre lua,
lupa sobre paleta, sino sobre casinha. **Ilegível e não clicável.** A trilha
some inteira. Em 1920 as mesmas barras estão corretas: é defeito de largura
estreita.

São as 28 telas do módulo de Compras/Cotações/Gestão: `compra-finalizada`,
`compras-delegacao`, as 11 `compras-rel-*`, `config-cotacao`,
`config-status-pedido-compra`, `cotacoes`, `gerenciar-cotacao`, as 5
`gestao-*`, `nova-compra-direta`, `nova-solicitacao-compra`,
`pedido-compra-detalhe`, `pedidos-compra`, `relatorios-administrativos`,
`solicitacao-compra-detalhe`, `solicitacoes-compra`.

**Encosta na leva:** é o item 7 (escala de camadas).

### A2. HTML cru na tela, em `comercial-unidades` (390 e 1366)

Faixa vermelha com `<!DOCTYPE html> … <pre>Cannot GET
/api/comercial/unidades-configuracao</pre>`. Em 390px ocupa 7 linhas.

**Correção ao enquadramento do revisor, medida por mim:** a rota **existe** no
backend (`backend/src/routes.js:1775`) e o front a chama certo
(`services/comercial.js:101`). O que falha é o **ambiente**: a API publicada
devolve **HTTP 404** nessa rota enquanto `/health` devolve 200. Não é código
faltando — é a API de desenvolvimento atrás do repositório.

O defeito de produto continua: **erro de servidor não pode chegar cru ao
usuário**, seja qual for a causa.

### A3. Datas em formato americano (`mm/dd/yyyy`)

Em todas as faixas de filtro com data, nas três larguras. São **124 campos**
`type="date"` no sistema. Numa empresa brasileira, é a primeira coisa que
alguém aponta.

### A4. Acentuação faltando, misturada com acentuação certa na mesma tela

Não é fonte nem renderização — é **literal de origem**, conferido no código:
`FinanceiroTitulos.jsx:137` traz `rotulo: 'Busca rapida'`. **129 arquivos** do
front têm literais assim. No `dashboard`, "AÇÕES" acentuado aparece ao lado de
"EXPOSICAO"; em `financeiro-titulos`, "Consulta de **titulos** a receber" logo
abaixo do título acentuado "Consulta de Títulos Financeiros".

Aparece também em telas irmãs de forma inconsistente: `compras-rel-ciclo` diz
"Atualizar **relatorio**" enquanto as outras cinco `*-rel-operacional` dizem
"Atualizar **relatório**".

### A5. Coluna STATUS truncada em `pedidos-compra` (1920 e 1366)

Todo pedido lê **"Fechado com"** — e a pílula fecha normalmente, então **não há
sinal de corte**: o texto parece completo e não faz sentido. Ao mesmo tempo,
FORNECEDOR sobra espaço e PEDIDO MINIMO mostra só "-".

### A6. Trilha cortada no meio da palavra em 390px

`dashboard`: "Início > Painel > **Das**"; `crm-dashboard`: "> **Dash**";
`sst-dashboard`: "> **Dashl**"; `fiscal-dashboard`: "> **Pain**". Em `obras` e
`usuarios` a trilha termina em "Início > Cadastros >" — separador solto, sem
nada depois. E `inicio`, `financeiro-titulos` e `solicitacao-detalhe` recolhem
certo com o botão `»`. **Três comportamentos diferentes para o mesmo estouro.**

### A7. Trilha ausente justamente na consulta de títulos

`financeiro-titulos` e `financeiro-titulo-detalhe` mostram só "Início", nas
três larguras — sem "Financeiro > …" e sem estrela de favorito. Mas
`financeiro-titulos--tipo-pagar`, que é **a mesma tela com query**, mostra
"Início > Financeiro > Contas a Pagar ☆ ⌂". A tela de detalhe fica sem caminho
de volta.

### A8. Etiqueta de status recortada em `solicitacao-compra-detalhe` (390px)

No cartão STATUS a pílula é cortada pela borda direita: lê-se "LIBERADO PARA
C". É o campo mais importante da tela.

### A9. Texto de apoio do cabeçalho da página corta com reticências em 390px

`solicitacoes`: "2003 solicitação(ões) · Fila de trabalh…". Em
`solicitacoes-rel-operacional` a linha está **sozinha** e mesmo assim corta —
então é clamp de uma linha, não falta de espaço.

**Encosta na leva:** o texto de apoio **do bloco** foi corrigido no item 8 e
quebra certo; o do **cabeçalho da página** não foi tocado.

### A10. Botão `»` sobrepondo o vizinho em 1366px

Em `gestao-insumos` e `pedidos-compra` ele é desenhado sobre o botão de tema;
em `dashboard` cobre o último ícone de atalho.

### A11. `rhdp-pessoal?aba=jornada` é uma tela de erro

E os botões de recuperação "Atualizar tela" e "Voltar" aparecem como **texto
puro, sem forma de botão**. Confirma as células B1/M1 conhecidas, e mostra que
o defeito é maior do que "alvo abaixo de 32px": **não parecem botões**.

### A12. E-mail quebrado no meio do token em `perfil` (390px)

"qa.visual@fluxy.**loc** / **al**".

---

## SUSPEITA — descrito, não confirmado

- **S1.** O módulo de Compras parece usar um **cabeçalho de página diferente**
  do resto: ~55px de altura em 1366 contra ~90px em `financeiro-titulos`, com
  ação "Atualizar" branca pequena onde as outras usam botão azul primário.
  Somado ao A1, sugere componente desatualizado nessas 28 telas.
- **S2.** `sst-rel-operacional` inverte a hierarquia dos irmãos: o azul é
  "Atualizar vencimentos" e "Atualizar relatorio" fica secundário.
- **S3.** `pedido-compra-detalhe` em 390px põe a ação principal na **segunda
  fila**, abaixo dos secundários.
- **S4.** `solicitacoes` em 390px: **nenhuma visão parece selecionada** — a
  faixa de chips rola na horizontal e o chip ativo fica fora da tela, sem pista
  de que há rolagem.
- **S5.** Vazios grandes em 1920: "Vencimento fim" sozinho com ~1.200px vazios
  à direita; "Colunas" sozinho numa linha acima da tabela — **o que contraria
  o item 3 da leva**, que subiu controles para a linha do título.
- **S6.** Grade de indicadores inconsistente em 390px: duas colunas em umas,
  uma coluna de largura cheia em outras.
- **S7.** Títulos repetidos na mesma tela: "Consulta de Titulos Financeiros" e,
  logo abaixo, "Consulta de titulos a receber".

---

## Falsos alarmes que o próprio revisor derrubou

Registrados porque mostram que ele conferiu em vez de acumular:

- "Filtros visiveis" sem acento em `pedidos-compra` — ampliado em resolução
  nativa, **está acentuado**; era artefato do recorte reduzido.
- Pílula do seletor "A receber / A pagar" vazando do contêiner em 1366 — em
  zoom nativo **está alinhada**.
- Tabelas vazias em várias telas — **falta de dado no preview, não defeito de
  layout**. Julgou o layout, que está correto.

---

## Onde isso se encaixa

Quase nada aqui é da leva de preferências. São defeitos que já existiam e que
ninguém tinha olhado com esse cuidado — e é exatamente por isso que a exigência
do revisor separado se pagou.

**Da leva, encostam apenas:** A1 (item 7), A9 (item 8) e a suspeita S5 (item 3).

**Decisão pendente do cliente:** atacar agora, ou tratar como levantamento novo
a priorizar depois.
