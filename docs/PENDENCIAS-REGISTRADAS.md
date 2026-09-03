# Pendências registradas — o que NÃO foi corrigido, e por quê

Achados que apareceram durante as levas e ficaram deliberadamente de fora do
escopo, por decisão do cliente. Este arquivo existe para que nenhum deles se
perca no meio de um relatório antigo.

---

## Para o responsável pela REGRA DE NEGÓCIO (não é decisão de layout)

Decisão do cliente em 02/09: registrar e levar ao responsável; **não
corrigir**, porque é regra dele.

### N1 — `data_admissao` sobrescreve `data_inicio` ao salvar colaborador
- **Onde**: `frontend/src/pages/RhDpColaboradores.jsx`, função `buildPayload`.
- **O que acontece**: o payload preenche `data_inicio` com
  `form.data_admissao`, ignorando `form.data_inicio`. O `toFormData` carrega
  os dois campos separadamente e o `onChange` da data de admissão escreve nos
  dois; então um registro que venha do banco com `data_inicio ≠
  data_admissao` **perde a data de início em silêncio** no primeiro salvar.
- **Desde quando**: anterior à leva do RH/DP. Nada nesta leva mudou o
  comportamento.
- **Por que não corrigimos**: qual das duas datas manda é regra de negócio.

### N2 — `codigo_ref` não existe no modelo de linha de importação
- **Onde**: `frontend/src/pages/RhDpImportacoes.jsx`, `getLinhaColaboradorCodigo`
  lê `linha?.codigo_ref`.
- **O que acontece**: `backend/src/models/RhImportacaoLinha.js` só tem
  `matricula_ref`, `cpf_ref` e `nome_ref`. Não quebra nada (há cadeia de
  fallback), mas é campo morto — ou o modelo deveria ter o campo, ou a
  leitura sobra.

### N3b — Status `SUBSTITUIDA` existe no banco e não pode ser filtrado
- **Onde**: `backend/src/services/rhJornadaFormularioService.js` grava
  `status: 'SUBSTITUIDA'` em `rh_importacoes`, mas `RH_STATUS_IMPORTACAO`
  (`backend/src/validators/rhValidators.js`) só aceita
  `PREVIEW | CONFIRMADA | CANCELADA` na consulta.
- **O que acontece**: existe lote que APARECE na lista e **não pode ser
  filtrado** — acrescentar a opção ao filtro faria o servidor recusar a
  consulta. A tela trata `SUBSTITUIDA` só na exibição.
- **Precisa de decisão**: ou o validador passa a aceitar `SUBSTITUIDA`, ou o
  formulário de jornada grava outro valor. É contrato de API, não layout.

### N3 — Líquido apurado maior que o bruto (a conferir)
- **Onde**: aba Apuração do Pessoal, ladrilhos de resumo. No preview de
  02/09: **BRUTO FILTRADO R$ 13.710,97** e **LÍQUIDO FILTRADO R$ 15.070,97**.
- **Status**: não sei dizer se é defeito ou se o "líquido" soma algo que o
  "bruto" não contém. Nada nesta leva tocou o cálculo. Precisa de quem
  conhece a regra da folha.

---

## Para uma LEVA PRÓPRIA de texto e consolidação

Decisão do cliente em 02/09: registrar; não tocar agora.

### T1 — Quatro textos diferentes para o mesmo evento
As telas de configuração de setores dizem, todas para o mesmo "salvou":
- "Configuracao salva com sucesso" (AreasObra, SetoresVisiveisUsuario)
- "Configuracao salva com sucesso." (TiposCompartilhadosSetor)
- "Configuração salva com sucesso." (SetoresCriacaoTodasObras)
- "Configuração salva." (TiposSolicitacaoPorSetor)

Com e sem acento, com e sem ponto. Padronizar o TEXTO vem antes de pensar em
componente compartilhado.

### T2 — Quatro telas de setores são quase o mesmo arquivo
`AreasObra`, `SetoresVisiveisUsuario`, `SetoresCriacaoTodasObras` e
`TiposCompartilhadosSetor` têm a mesma estrutura: `PageHeader` com ação
"Salvar" + `BlocoConteudo` com grade de caixas de setores, cada uma com sua
própria normalização `String(x).toUpperCase()`. Se sair um componente
compartilhado, é **"seleção de setores com salvar"** — não um invólucro só
de aviso.

### T3 — Acentuação ausente em textos visíveis, módulo RH/DP
Vários rótulos e mensagens do módulo estão sem acento ("Solicitacoes",
"Apuracao", "Matricula", "Observacoes"). A leva corrigiu apenas onde já
estava reescrevendo a linha; o resto ficou.

---

### T3b — CSS órfão deixado pelas migrações
Classes sem nenhum consumidor no JSX, sobradas da troca por
`BlocoConteudo`/`TabelaPadrao`/`StatGrid`. Não apagadas porque o `index.css`
não era escopo de nenhum agente da leva:
- `frontend/src/index.css` ~10327-10435: `.rhdp-importacoes-list-card`,
  `.rhdp-importacoes-detail-card`, `.rhdp-importacoes-lotes-wrapper`,
  `.rhdp-importacoes-lotes-table` (com cinco `nth-child` de largura),
  `.rhdp-importacoes-lote-file`, `.rhdp-importacao-summary-grid`,
  `.rhdp-importacao-preview-table`.
- `frontend/src/index.css` ~9966-10150: bloco `.rhdp-apuracao-*`.
- `frontend/src/index.css` ~11869-11899: `.rh-pessoal-alerta*`.
- `frontend/src/index.css`: `.rh-colaboradores-filter-card`,
  `.rh-colaboradores-actions`, `.rh-colaborador-form-card`,
  `.rh-colaboradores-table thead th`.
  **Atenção**: `.rh-colaboradores-filter-grid` continua VIVA (Jornada e
  Pessoal ainda a usam) — não apagar essa junto.

### T4 — `ModuloRelatorios.jsx` nunca foi migrada (hub de TODOS os módulos)
- **Rota que a expõe no RH/DP**: `/rh-dp/relatorios`.
- **O que é**: hub de cartões compartilhado por SEIS módulos (solicitações,
  financeiro, CRM, SST, comercial e RH/DP), cada um com seu bloco de
  configuração dentro do mesmo arquivo.
- **Estado**: fora do padrão — não usa `Pagina`, `PageHeader` nem
  `.app-bloco`; é Tailwind à mão. A faixa não gruda (X2), o cabeçalho não é
  `.app-page-header` (C1/C2/C5) e não há bloco padrão (B1).
- **Por que saiu do manifesto do harness em 02/09**: eu a coloquei lá por
  engano ao abrir a Etapa B — a rota começa com `/rh-dp`, mas o arquivo não
  é do RH/DP e ninguém o reescreveu nesta leva. As cinco células FALHOU que
  ela gerava não pertenciam à leva, e a matriz as apresentava como se
  pertencessem. Retirada com justificativa, por decisão do cliente.
- **Achado extra**: o título renderiza **"Relatorios de RH/DP"** — o prefixo
  que a D7 mandou tirar sobrevive aqui porque a tela está fora do escopo.
- **Quando volta**: na leva que reescrever o hub de relatórios. Aí ela
  volta ao manifesto e a D7 se aplica a todos os módulos de uma vez.
- **RESOLVIDO em 03/09**, na leva das telas compartilhadas. Ela entrou no
  manifesto, e a D7 caiu nos NOVE títulos de uma vez (eram nove módulos, não
  seis: a contagem original subestimava). Este achado foi o que expôs o ponto
  cego do inventário e deu origem à categoria `telas_compartilhadas`.

---

## Achado que a leva corrigiu e vale registrar: contraste nunca medido no escuro

Ao perseguir uma célula M3 marginal (4,4996:1 contra o mínimo de 4,5), o
que apareceu foi maior que o sintoma:

1. **Dois tokens para o mesmo papel, com valores diferentes.**
   `--app-muted-color` (#64748b, o slate-500 do Tailwind) e `--c-muted`
   (#5f6e83, o do sistema). O primeiro dava 4,51:1 — passava por 0,01 e
   reprovava assim que a superfície mudava um fio. Unificados no valor do
   sistema (4,92:1). É a R16 outra vez: um dono por responsabilidade.
2. **`--app-subtle-color` reprovava o AA nos DOIS temas, e é usado em
   texto.** Claro: 3,81:1. **Escuro: 3,02:1** — pior, e ninguém tinha
   medido o tema escuro até aqui. Corrigidos para 4,63 e 5,12.

**A lacuna de processo que isto expõe**: o harness roda só no tema claro.
Um token pode passar no claro e reprovar no escuro sem que a matriz saiba —
foi exatamente o caso do `--app-subtle-color`. Medir o M3 nos dois temas é
trabalho para a próxima leva do harness.

## Perdas declaradas nesta leva

### P1 — "Todas as obras que eu enxergo"
O select de obra do Pessoal tinha uma opção vazia com esse rótulo, que
explicava que a lista é limitada pela permissão do usuário. A `BarraFiltros`
não mostra etiqueta quando nada está marcado, então o texto não tem onde
morar sem inventar um bloco. **Informação perdida**, registrada aqui.

### P2 — Tamanho dos contadores do Pessoal
Os contadores de alerta usavam `1.6rem` escrito à mão no `index.css`. Ao
virarem `StatGrid`/`StatTile`, passaram ao degrau do padrão. Decisão do
cliente em 02/09: **mantém o padrão**; se sentir falta no uso, revê.

---

## Telas sem porta de entrada, e rotas que apontam para o lugar errado

Achados da leva das telas compartilhadas (03/09). Nenhum é de layout: são
rotas e caminhos de chegada. Precisam de decisão do cliente — ou a tela
ganha entrada, ou a rota sai, ou vira redirecionamento (R20).

### E1 — `usuarios-permissoes-rh-dp` não tem entrada nenhuma na interface
- **Onde**: a rota existe em `frontend/src/App.jsx`. Só isso.
- **O que acontece**: não está no menu lateral, não está no hub de
  Configurações, e nenhuma tela do sistema linka para ela. Pelo Ctrl+K é
  impossível achar, porque a paleta é alimentada pelo mesmo
  `getVisibleItems(user)` do menu. A única forma de chegar é digitar a URL.
- **Consequência**: a tela foi migrada e está no manifesto, mas nenhum
  usuário chega nela pela interface.
- **Decisão pendente**: ganha entrada no menu ou no hub de Configurações, ou
  é código morto e sai junto com a rota.

### E2 — `/configuracoes-contrato-alertas` também só existe por URL
- **Onde**: rota em `frontend/src/App.jsx`. O menu
  (`navigationConfig.jsx`) e o hub (`Configuracoes.jsx`) apontam **só** para
  `/configuracoes-formas-pagamento-solicitacao`.
- **O que acontece**: alcançável apenas por URL digitada ou favorito antigo.
  Até esta leva, quem chegava por ela lia o título da OUTRA configuração — o
  título do `<h1>` era fixo. Isso a leva corrigiu; a falta de entrada, não.
- **Decisão pendente**: ganha entrada, ou vira `<Navigate>` para a outra
  (R20).

### E3 — `/conversas/:id` ignora o `:id` e nunca abre a conversa
- **Onde**: `frontend/src/App.jsx` manda `/comunicacao-interna`,
  `/conversas/entrada`, `/conversas/saida` e `/conversas/:id` para o MESMO
  componente, sem prop nenhuma. `ComunicacaoInterna.jsx` não importa
  `useLocation`, `useParams` nem `useNavigate`.
- **O que acontece**: abrir `/conversas/123` mostra a caixa vazia com
  "Selecione uma conversa". **O link não abre conversa nenhuma.** Entrada e
  saída também são idênticas entre si.
- **Decisão pendente**: ou a tela lê a rota (abrir a conversa do `:id`,
  recortar entrada e saída), ou as três rotas de `/conversas/*` saem do
  `App.jsx`.

### E4 — Três telas de conversa órfãs, e uma navega para a rota quebrada
- **Onde**: `frontend/src/pages/ConversasEntrada.jsx`, `ConversasSaida.jsx` e
  `ConversaDetalhe.jsx`. Compilam, e não estão em rota nenhuma — zero
  referências no projeto inteiro.
- **O que acontece**: `ConversasEntrada.jsx` e `ConversasSaida.jsx` fazem
  `navigate('/conversas/' + id, { state: { origemConversa } })`, e o `state`
  que `ConversaDetalhe.jsx` espera nunca é lido por ninguém. É o par do E3:
  alguém trocou a implementação e deixou as rotas velhas apontando para a
  tela nova.
- **Decisão pendente**: são código morto (e saem junto com o E3), ou a
  implementação a manter é esta e a `ComunicacaoInterna` é que sobra.

### E5 — O "painel administrativo" exige o módulo Compras habilitado
- **Onde**: `frontend/src/App.jsx` — as duas rotas
  (`/relatorios/administrativos` e `/compras/relatorios/auditoria`) têm o
  MESMO par de guardas: `<ModuloComprasRoute><ComprasRelatoriosRoute>`.
- **O que acontece**: `/relatorios/administrativos`, que se apresenta como
  painel central do administrador, não abre para quem não tem Compras.
- **Decisão pendente**: é permissão, não layout. Precisa do responsável.

### E6 — Duas rotas sem nó de menu, logo sem breadcrumb
- **Onde**: `/relatorios/administrativos` e `/compras/relatorios/auditoria`
  não têm nó em `navigationConfig.jsx`, então `findActiveNode` devolve `null`
  e o breadcrumb para em "Início".
- **Por que importa**: o argumento da D7 (remover o prefixo do módulo do
  título porque "o breadcrumb já situa") **não vale nestas duas** — não há
  breadcrumb. Por isso o assunto ficou explícito no apoio da faixa.
- **Decisão pendente**: registrar os nós de menu, ou aceitar o apoio da faixa
  como o sinal permanente.

---

## Nomes e agrupamentos que a leva não quis decidir sozinha

### A1 — "Relatórios Administrativos" mostra só auditoria de compras
- **Onde**: `frontend/src/pages/RelatoriosAdministrativos.jsx`.
- **O que acontece**: quem chega pelo cartão "Auditoria de compras" lê
  "Relatórios Administrativos". O conteúdo é **só** auditoria de itens de
  pedido de compra, mas o texto original diz que esta é "a primeira entrega"
  de um painel maior — renomear fecharia esse escopo.
- **Decisão pendente**: (a) renomear para "Auditoria de compras" e criar
  depois o painel administrativo de verdade; ou (b) manter o nome e registrar
  os nós de menu do E6.

### A2 — Quatro assuntos numa tela de configuração só
- **Onde**: `frontend/src/pages/ConfiguracoesContratoAlertasEFormas.jsx`.
- **O que acontece**: a tela reúne limite jurídico do contrato, alerta de
  saldo do contrato, limites da Despesa Eventual e formas de pagamento. O
  comentário do arquivo justifica dois ("mesma natureza"), mas "Limites da
  Despesa Eventual" não é configuração de contrato nem forma de pagamento.
- **Decisão pendente**: separar ou manter. A leva só nomeou os assuntos.

### A3 — Ordem dos blocos por rota de entrada
- **Onde**: mesma tela do A2.
- **O que acontece**: chegando pela rota do menu ("Formas da Nova
  Solicitação"), o bloco de formas é o **4º de 4** — era justamente isso que
  o botão "Ir para formas de pagamento" contornava, e esse botão saiu por
  R11/D6. A barra de cor agora marca o bloco certo, mas ele continua embaixo.
- **Decisão pendente**: reordenar por rota é arranjo por tela, e a leva não
  inventa arranjo. É decisão do cliente.

### A4 — Eyebrow com o nome do módulo na `ModuloRelatorios`
- **Onde**: `frontend/src/pages/ModuloRelatorios.jsx`.
- **O que acontece**: era um `<p>` em caixa alta acima do `<h1>`. O
  `PageHeader` não tem slot de eyebrow, e `children` renderizariam uma
  segunda linha que a faixa compacta não comporta (C2). O texto foi para o
  apoio da faixa e continua visível, inclusive compactado.
- **Proposta da leva**: remover de vez — com a D7 aplicada, é literalmente a
  mesma informação do breadcrumb, e `modulo` viraria só chave interna.
- **Decisão pendente**: do cliente.

### A5 — Grupo "Próximas visões" de Compras nasce vazio
- **Onde**: `frontend/src/pages/ModuloRelatorios.jsx`, `itens: []`.
- **O que acontece**: antes renderizava um bloco em branco com "0 visoes".
  Agora mostra a razão dentro do bloco ("Nenhuma visão disponível para o seu
  acesso neste grupo."), o que também cobre o caso de perfil sem permissão.
- **Decisão pendente**: esconder grupo sem item, ou preencher com o que está
  planejado para Compras.

---

## Comportamentos que a leva encontrou e deixou como estavam

### C1 — Cor da etiqueta derivada da rota, não do status
- **Onde**: `frontend/src/pages/ModuloRelatorios.jsx`.
- **O que acontecia**: a cor era "verde se tem rota" (`item.to`), não
  `item.status`. Nos nove módulos os dois coincidem hoje, então não havia
  sintoma — mas o primeiro item com `status: 'Disponivel'` e rota ainda não
  publicada sairia errado. A leva tornou a derivação explícita e nomeada.
- **Decisão pendente**: trocar a fonte da verdade para `status` é mudança de
  comportamento, e não foi feita por conta própria.

### C2 — `carregarLista` engole todo erro em silêncio
- **Onde**: `frontend/src/pages/ComunicacaoInterna.jsx` — `catch {}` em
  `carregarLista`, `abrirConversa` e `carregarMais`.
- **O que acontece**: se a API cair, a tela mostra "Nenhuma conversa" —
  indistinguível de caixa vazia de verdade.
- **Decisão pendente**: avisar em falha de carga, ou seguir silencioso no
  polling e avisar só na carga inicial. Com `useAvisos` já na tela, é uma
  linha.

### C3 — Anexo enviado não aparece até recarregar
- **Onde**: `frontend/src/pages/ComunicacaoInterna.jsx`, `enviar()`.
- **O que acontece**: a mensagem otimista é montada com `anexos: []` fixo,
  mesmo tendo acabado de subir os arquivos. Quem anexa vê a própria mensagem
  sem o anexo até o polling ou o reload.
- **Por que não corrigimos**: é regra de serviço, não de layout.

---

## Lacunas do padrão que a leva relatou e não mexeu (R21)

### L1 — `BlocoConteudo` deixa corpo vazio e achata a hierarquia
- Com `titulo`/`descricao` e sem `children`, ainda renderiza um
  `div.app-bloco-corpo` vazio com `margin-top: var(--esp-3)` — 12px sobrando
  no rodapé de cada cartão. E o `titulo` do bloco é sempre `<h2>`, então
  cartão-dentro-de-seção fica com dois `<h2>` aninhados (hierarquia achatada
  para leitor de tela).

### L2 — `BarraFiltros.campos` não tem `placeholder`
- Custo já pago: os exemplos "Ex.: 12" e "Ex.: 381" dos campos Pedido e Item
  da `RelatoriosAdministrativos` sumiram. É acréscimo aditivo (não muda
  assinatura nem retorno), mas contrato de componente não muda no meio da
  leva.

### L3 — Não existe medida de layout de trabalho em duas colunas
- A coluna da lista da `ComunicacaoInterna` está escrita como
  `calc(var(--esp-4) * 20)` (= 320px, 20 degraus) e a altura útil é medida em
  JS. Nenhum componente padrão cobre "painel que ocupa a altura útil da
  janela": `BlocoConteudo` traz padding e não tem trilha de rolagem.
- **Proposta**: vira um `PainelTrabalho` numa leva própria, com o check
  nascendo junto.
