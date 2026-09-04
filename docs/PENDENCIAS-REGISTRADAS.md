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

---

## Defeitos de CSS de SISTEMA — afetam tela que nenhuma leva tocou

Achados de 03/09, nas telas fora do shell. Nenhum é do arquivo da tela: os
três estão no CSS de sistema e a correção vale para o produto inteiro. Não
foram corrigidos porque `src/index.css` não pertence a leva de tela nenhuma
e mexer nele no meio de uma leva quebra a R21 pelo mesmo motivo que mudar
contrato de componente quebra.

### S1 — `Avisos` e `Alert` não têm superfície fora do `Layout`
- **Onde**: `frontend/src/index.css`, blocos por volta de 6870–6960 e
  9010–9040.
- **O que acontece**: TODAS as regras de `.alert` (fundo, cor semântica,
  raio, respiro, ícone) existem apenas sob `.layout-shell` ou `.login-card`.
  **Não há regra `.alert` sem escopo.** Fora do `Layout`, `Avisos` renderiza
  texto e ícone soltos — sem faixa, sem cor, sem respiro. O aviso existe no
  DOM e quase não existe para o usuário, que é exatamente a R15.
- **Por que é grave**: a DoD das telas fora do shell **obriga** a usar
  `useAvisos`. O padrão manda usar uma peça que o CSS do padrão não veste.
  Os dois agentes da leva chegaram, independentemente, ao mesmo contorno.
- **Contorno em uso**: um `<div className="layout-shell">` envolvendo **só**
  a pilha de avisos, em `RecuperarSenha.jsx`, `DefinirSenha.jsx` e
  `CotacaoFornecedorPublica.jsx`, com comentário no código. **Efeito
  colateral que sobra**: `.layout-shell` também pinta
  `background: var(--ui-canvas)`, então os cantos arredondados da faixa
  deixam ver um fio de canvas.
- **Conserto certo**: desescopar `.alert*`, ou escopar para
  `:where(.layout-shell, .login-card, .app-avisos)`.

### S2 — Placeholder de campo reprova AA no sistema inteiro
- **Onde**: `frontend/src/index.css:640-643` —
  `:root:not(.dark) input::placeholder { color: #94a3b8 }`.
- **Medido**: **2,56:1** sobre superfície branca. O mínimo AA é 4,5:1.
- **Por que é a R24 ao contrário**: o sistema **já tem** o token certo
  (`--input-placeholder`, com piso garantido pelo `garantirContraste` do
  `ThemeContext`) aplicado em `.input::placeholder` na linha 619 — e essa
  regra crua, mais específica, o anula. O token existe, tem piso, e não
  chega à tela.
- **Consequência**: em monitor ruim ou sob luz forte (obra), "seu@email.com.br"
  e "Digite sua senha" somem. Vale para todo campo do sistema, não só as
  telas de senha.

### S3 — Placeholder do Login, mesmo defeito, mais escuro ainda
- **Onde**: `frontend/src/index.css:7000-7010` —
  `.login-input::placeholder { color: #8395b0 !important }`.
- **Medido**: **2,94:1** sobre `#f8fbff`. O `!important` fecha a porta para
  qualquer token.

### S4 — CSS morto com uma bomba R18 armada
- **Onde**: `frontend/src/index.css`, por volta de 4204–4400.
- **O que acontece**: `.cotacao-publica-table-input`, `-textarea`, `-check`,
  `-cell-ref`, `-table-shell`, `-context`, `-summary-*` e `-alert` ficaram
  sem consumidor depois da migração da Cotação Pública.
- **Por que registrar em vez de só apagar**: `.cotacao-publica-context` tem
  `overflow: hidden` — quem reusar a classe volta a sequestrar faixa fixa e
  coluna fixa sem saber por quê. É a R18 esperando a próxima vítima.

---

## Decisões do cliente sobre as telas fora do shell

### F1 — Título do Login em 30–37px, não no degrau de 22px
- **Onde**: `.login-heading` em `frontend/src/index.css:6851` —
  `clamp(1.85rem, 3vw, 2.3rem)`.
- **A DoD fora-do-shell diz** que o título continua no degrau de 22px. O
  Login não está.
- **Por que não corrigimos**: só dá para mexer no CSS de sistema ou
  desmontando a intro da tela de marca — e o Login é a única tela com
  identidade visual própria aprovada.
- **Decisão pendente**: o Login mantém o título de marca como exceção
  declarada, ou desce para 22px como as duas irmãs?

### F2 — "2 horas" escrito na interface
- **Onde**: constante `VALIDADE_DO_LINK` em `RecuperarSenha.jsx` e
  `DefinirSenha.jsx`.
- **O que acontece**: o prazo real vem de `DEFAULT_EXPIRES_HOURS`
  (`backend/src/services/passwordResetService.js:13`) e **a API não o
  devolve**. O número na tela está acoplado a uma constante do backend por
  cópia — se mudar lá, a tela mente.
- **Decisão pendente**: tirar o número da tela, ou o backend passar a
  devolvê-lo.

### F3 — Identidade visual da família de autenticação
- O Login tem fundo escuro com skyline e cartão próprio; Recuperar e Definir
  Senha ficaram no canvas claro do sistema, que é o que já eram.
- **Decisão pendente**: unificar as três é decisão de design, não de layout.
  A leva não fez por conta própria.

### F4 — Senha fraca não bloqueia o envio
- **Onde**: `frontend/src/pages/DefinirSenha.jsx`.
- **O que acontece**: o botão "Definir senha" continua habilitado com senha
  fraca; quem envia leva uma ida ao servidor para descobrir. As etiquetas já
  mostram ao vivo o que falta, e o erro do servidor agora aponta para elas.
- **Por que não corrigimos**: bloquear o envio é mudança de fluxo.

---

## Decisões do cliente sobre a Cotação Pública

### G1 — Confirmação nova no "Enviar resposta"
- **O que é**: acréscimo da leva, não substituiu diálogo nenhum. A ação é
  irreversível para o fornecedor: depois do envio o formulário inteiro trava
  e correção passa a depender da equipe de compras.
- **Decisão pendente**: se o cliente preferir envio sem fricção, são 8 linhas
  a remover.

### G2 — O fornecedor não tem canal de socorro na tela
- **O que acontece**: `serializarCotacaoPublica` **não traz nome, e-mail nem
  telefone do comprador**. Por isso todo texto de erro manda "responda o
  e-mail em que você recebeu este link" — é o único canal que o fornecedor
  comprovadamente tem.
- **Decisão pendente**: colocar telefone ou e-mail da equipe de compras
  nesses textos exige campo novo no backend.

### G3 — A tela estreitou de 1312px para 1100px
- **Por quê**: o `Pagina` traz `.page { max-width: 1100px }` (a R10 manda o
  ritmo vir do componente); o invólucro antigo dava `82rem`.
- **Impacto medido**: a tabela tem 12 colunas e já rolava na horizontal
  antes, então não há corte de dado — mas são 212px a menos.
- **Conserto**: uma linha em `compras-responsive.css`, mesmo padrão do
  `.rhdp-page { max-width: 1480px }`. É CSS de sistema, então é decisão.

### G4 — Sem faixa fixa, o "Enviar resposta" só existe no topo
- **O que acontece**: C1/C2 são N/A fora do shell, então não há cabeçalho
  grudado. Numa cotação de 40 itens o fornecedor rola até o fim e precisa
  voltar ao topo para enviar.
- **Por que não inventamos um segundo botão**: a B3 proíbe a mesma ação duas
  vezes na tela.

---

## Regra de negócio da Cotação Pública — para o responsável

### H1 — Item com preço e sem quantidade vira "não tenho" EM SILÊNCIO
- **Onde**: `CotacaoFornecedorPublica.jsx`, no monte do payload —
  `disponivel = quantidadeDisponivel > 0 && preco > 0`.
- **O que acontece**: o fornecedor que digita o preço e esquece a quantidade
  tem o item enviado como **indisponível**, sem nenhum alerta.
- **Por que é o mais grave da tela**: perde-se o item na concorrência e
  **ninguém percebe dos dois lados** — nem o fornecedor, que acha que
  cotou, nem o comprador, que acha que ele não tinha.

### H2 — Erro de CPF/CNPJ do transportador mente sobre a causa
- **O que acontece**: `getCpfCnpjError` lança de dentro do monte do payload.
  O `Error` sai sem `status`, cai no ramo de rede, e o fornecedor lê *"o
  navegador não conseguiu falar com o servidor"* quando o problema é o
  documento que ele digitou.
- **Por que não corrigimos**: a correção certa é validar o campo no
  formulário, o que é mudança de fluxo — maquiar o `catch` esconderia o
  defeito em vez de resolvê-lo.

### H3 — O payload ignora se é rascunho ou envio final
- **O que acontece**: `montarPayloadResposta` recebe `{ finalizar }` e nunca
  usa. Rascunho e envio final montam payload idêntico.
- **Consequência hoje**: nenhuma. Mas qualquer regra futura de "só valida no
  envio" nasce quebrada.

### H4 — `quantidade_minima_item` vai cru para o payload
- Ao contrário de todos os campos vizinhos, não passa por
  `sanitizarDecimalInput`.

### H5 — `respostaFinalizada` pode não cobrir todos os estados
- Olha só `RESPONDIDO` e `FINALIZADA`. O backend usa também `VISUALIZADO`, e
  reescreve o status no `show`. O conjunto completo de estados não foi
  auditado.

---

## Mais lacunas do padrão (R21: registradas, componente não estendido)

### L4 — Não existe componente de campo de senha
- Cada tela reinventa o par input + botão de olho. Falta um `CampoSenha` que
  carregue o recuo do campo, o alvo de clique e o `aria-pressed`.

### L5 — `Pagina` não serve tela fora do shell
- Traz `.page` com `max-width: 1100px` e mede `.fx-topbar`, que não existe
  ali. E como o degrau de 22px do título só sai de `.app-pagina > .page-title`,
  cada agente teve de aplicar a classe direto no cartão. Falta uma variante
  (`<Pagina foraDoShell>` ou um `MolduraPublica`).

### L6 — `CampoForm` não aceita `placeholder` nem slot de sufixo
- O botão do olho entra como filho dentro do `<label>`, o que não é o ideal
  em acessibilidade.

### L7 — Não existe etiqueta de "requisito atendido"
- A `DefinirSenha` usou `fx-badge--success/--neutral`, que são etiquetas de
  **status de registro**. Serve, mas o papel semântico é outro.

### L8 — `useConfirmacao` não tem tom para ação irreversível não-destrutiva
- O envio da cotação não é destruição, mas também não é rotina. Hoje só
  existem `primary` e `btn-perigo-suave`.

### L9 — `BlocoConteudo` não tem lugar para condição fixa
- As faixas de "cotação encerrada" e "resposta já enviada" não são aviso (não
  fecham) e não são `descricao`. A leva criou um `Condicao` local. Se
  aparecer numa terceira tela, é candidato a componente padrão.

### L10 — `TabelaPadrao` não tem coluna de formulário
- As 8 colunas editáveis da Cotação Pública usam `tipo: 'valor'`/`'numero'`
  com `<input>` dentro do `render`. Funciona, mas o tipo descreve o dado
  exibido, não um campo.

---

## Família "existia e ninguém sabia" — índices de navegação fora da fonte única

Terceiro achado da mesma família (os dois primeiros: as telas compartilhadas
órfãs e as rotas sem porta de entrada). O padrão se repete: **um pedaço da
interface existe, funciona, e nenhum processo o alcança porque ninguém sabe
que ele está ali.**

### V1 — 26 arquivos montam lista de destino à mão, sem passar pelo `navigationConfig`

Medido em 03/09 pelo `frontend/scripts/validarNavegacao.mjs`. São **176
destinos** escritos à mão fora da fonte única. Os maiores:

- `src/pages/ModuloRelatorios.jsx` — **54** destinos
- `src/pages/Configuracoes.jsx` — **43** destinos
- `src/pages/FinanceiroTitulos.jsx` — **7** destinos
- `src/modules/crm/pages/CrmDashboardGerencial.jsx` — **4** destinos
- `src/modules/crm/pages/CrmDashboardSla.jsx` — **4** destinos
- `src/pages/FinanceiroTituloDetalhe.jsx` — **4** destinos
- `src/modules/crm/pages/CrmCarteira.jsx` — **3** destinos
- `src/modules/crm/pages/CrmDashboardDistribuicao.jsx` — **3** destinos
- `src/modules/crm/pages/CrmKanban.jsx` — **3** destinos
- `src/modules/crm/pages/CrmLeads.jsx` — **3** destinos
- `src/modules/fiscal/pages/FiscalDashboard.jsx` — **3** destinos
- `src/modules/fiscal/pages/FiscalOperationalReport.jsx` — **3** destinos
- `src/modules/provisionamento-financeiro/pages/ProvisionamentoRelatorioOperacional.jsx` — **3** destinos
- `src/pages/ComercialRelatorioOperacional.jsx` — **3** destinos
- `src/pages/ComprasRelatorioComprasDiretas.jsx` — **3** destinos
- `src/pages/ComprasRelatorioComprasFornecedor.jsx` — **3** destinos
- `src/pages/ComprasRelatorioDemandaPedidos.jsx` — **3** destinos
- `src/pages/CrmRelatorioExecutivo.jsx` — **3** destinos
- `src/pages/Dashboard.jsx` — **3** destinos
- `src/pages/FinanceiroBaixas.jsx` — **3** destinos
- `src/pages/FinanceiroConciliacao.jsx` — **3** destinos
- `src/pages/FinanceiroFaturasCartao.jsx` — **3** destinos
- `src/pages/FinanceiroFinanciamentosBancarios.jsx` — **3** destinos
- `src/pages/FinanceiroPagamentos.jsx` — **3** destinos
- `src/pages/FinanceiroRelatorios.jsx` — **3** destinos
- `src/pages/SolicitacoesRelatorioOperacional.jsx` — **3** destinos

**Por que importa, com consequência já medida:**

- **A D7 não chegou lá.** Os nove títulos "Relatórios de X" da
  `ModuloRelatorios` sobreviveram à decisão do cliente por uma leva inteira,
  porque a lista estava dentro do arquivo e ninguém sabia que existia.
- **A permissão é reavaliada por conta própria.** Cada uma dessas listas
  refaz o cálculo de visibilidade com regra local. Duas fontes de verdade
  para "esta pessoa pode ver isto" divergem em silêncio, e o sintoma é a
  pessoa clicar e levar "acesso negado" — ou pior, ver o que não devia.
- **Renomeação não propaga.** Destino renomeado na fonte única continua
  velho na lista à mão. Ninguém vê até alguém clicar e cair em tela branca:
  a aplicação não tem rota curinga.

**O que foi feito**: um check no `validarNavegacao.mjs`, em forma de
**trinco** (`frontend/scripts/trinco-navegacao.json`). Ele reprova arquivo
NOVO que monte três ou mais destinos sem importar a fonte única, e reprova
contagem que SOBE num arquivo já congelado. O número só desce.

Três ou mais porque uma tela de detalhe legitimamente aponta para uma ou
duas rotas vizinhas; três já é um índice, e índice é papel da fonte única.
O roteador (`App.jsx`) e os guardas de rota ficam de fora — eles existem
para declarar rota e para mandar o usuário embora, não para oferecer
caminho.

**Decisão pendente**: os 26 não foram migrados. O trinco garante que o
problema não cresça; esvaziá-lo é trabalho de leva, módulo por módulo,
conforme cada um for reformado.

**Provado que morde** (03/09): um arquivo novo com três `<Link>` reprova; e
acrescentar dois destinos ao `Dashboard.jsx`, já congelado em 3, reprova com
"subiu de 3 para 5".

---

## Varredura do cancelamento — o que a medição disse, contra a suspeita

Pedido do cliente em 03/09: varrer todo o frontend atrás do idioma
`if (!confirm(...)) return;`, para listar **onde o cancelamento não
cancela**. A premissa era que o defeito ainda existisse nas telas não
migradas, já que restavam ~700 chamadas congeladas.

**A medição diz que não existe nenhum.** Ferramenta:
`frontend/scripts/varreduraCancelamento.mjs` (AST, não grep), rodando em
todo o `src/`.

O que explica a diferença entre a suspeita e o número:

- O passivo congelado de **726** chamadas é `alert` + `confirm` + `prompt`
  somados. A quebra real é **643 `alert`**, **64 `confirm`** e **19
  `prompt`**. `alert()` não tem cancelamento para quebrar.
- Os **64 `confirm()`** restantes são todos NATIVOS, e todos no idioma
  `if (!window.confirm(...)) return;` — que está **correto**: o `confirm`
  nativo devolve booleano de verdade. É feio (é caixa do navegador, R19),
  mas o "Cancelar" cancela.
- Os quatro casos quebrados que existiram eram do `confirmar()` do
  `useConfirmacao`, que devolve `{ ok, texto }` — e existiram porque a leva
  trocou o contrato de retorno no meio do caminho. Foi o que deu origem à
  R21.

**A varredura é CHECK BLOQUEANTE, sem trinco** (decisão do cliente, 03/09),
dentro do `npm run test:responsive`. Sem trinco de propósito: os outros
passivos herdados (R19, fonte única) são congelados porque ali o defeito é
de ESTILO — caixa do navegador é feia, índice à mão é frágil, e nenhum dos
dois faz o sistema mentir. Aqui o defeito é o código fazer o OPOSTO do que
promete, e não existe número aceitável disso. Qualquer ocorrência, em
arquivo novo ou antigo, reprova.

**Provado nos dois sentidos** (03/09): com o código como está, sai 0; com um
único `confirm('Apagar tudo?')` de retorno ignorado num arquivo de prova,
sai 1, e o `test:responsive` inteiro reprova junto. Ela distingue duas famílias e não mistura: (A) o
`confirmar()` do sistema lido como booleano; (B) `confirm()` nativo com o
retorno ignorado. O idioma nativo correto NÃO entra na lista — misturá-lo
faria o defeito real se perder no meio de setenta linhas certas.

### Duas lacunas da própria varredura, achadas ao revisitá-la

1. **Ela não cobria `prompt()`.** Só `confirm`. São 19 chamadas que nunca
   tinham sido examinadas — e `prompt` é a mesma classe de defeito com um
   agravante: devolve `null` no "Cancelar" e a string no "OK", então quem
   não testa manda `null` para o serviço. Cobertas agora, em duas famílias
   próprias (retorno ignorado; guardado e nunca testado).
2. **Ela dava falso positivo em `if (!motivo?.trim()) return;`** — o pai
   imediato da referência ali é um `OptionalMemberExpression`, não o `!`.
   Falso positivo numa lista de defeito destrutivo é caro: manda o leitor
   conferir código que está certo e corrói a confiança no resto da lista.
   Passou a subir pela cadeia de acesso e chamada antes de julgar.

Verificação extra, para o zero não depender de uma ferramenta só: as **82**
chamadas nativas de `confirm`/`prompt` foram varridas atrás de guarda dentro
de callback de iteração (`forEach`, `map`, `some`…), onde o `return` do
guarda interrompe o callback e NÃO a ação de fora. **Nenhuma.**

**Provada contra caso conhecido** antes de se acreditar no zero: uma
fixture com cinco formas ruins e quatro corretas. A primeira versão da
varredura pegou três das quatro e **deixou passar justamente a que causou o
estorno** — `const ok = await confirmar(...)` seguido de `if (!ok) return;`
duas linhas abaixo — porque olhava só o pai imediato da chamada. Passou a
seguir a ligação da variável. Um scanner que só olha o pai pega as formas
espalhafatosas e deixa passar a discreta, que é a que aparece no código de
verdade.

---

## A classe de defeito mais grave: consentimento obtido sob informação falsa

Registro próprio, a pedido do cliente (03/09), porque **não é a mesma coisa
que cancelamento ignorado** e merece nome separado.

### O que é

A confirmação e a ação operam sobre **coleções diferentes**. O sistema
pergunta "Descartar 3 rascunhos?", a pessoa lê, entende, clica em
Confirmar — e o sistema apaga 47, porque a mensagem cita
`selecionados.length` e a ação percorre `todos`.

**Aqui o cancelamento FUNCIONA.** Clicar em "Cancelar" cancela. O defeito é
outro e é pior: o sistema **mente sobre o que vai fazer**, e a pessoa
autoriza uma coisa enquanto outra acontece. Ela não tem como perceber — a
confirmação apareceu, ela leu, ela consentiu. A trilha de auditoria vai
registrar um consentimento válido para um estrago que ninguém autorizou.

### O check (família D da varredura)

`frontend/scripts/varreduraCancelamento.mjs`, bloqueante como o resto.
Numa função que contém confirmação cuja mensagem cita `ALGO.length`, a ação
depois do guarda tem de percorrer ou receber essa **mesma** coleção. Se ela
toca outra do escopo e não toca a citada, reprova.

**Provado nos dois sentidos** (03/09): pega uma fixture que pergunta sobre
`selecionados` e apaga `todos`; e libera as duas formas corretas — a que
percorre a coleção citada diretamente, e a que a passa por uma chamada
(`apagarLote(montarLote(selecionados))`).

Ele segue **um nível de chamada** dentro do arquivo. Sem isso ele acusava a
Cotação Pública, onde a mensagem cita `itens.length` e a ação chama
`montarPayloadResposta()`, que percorre `itens` lá dentro — falso positivo.
Numa lista de defeito destrutivo, falso positivo é caro: manda conferir
código correto e corrói a confiança no resto da lista.

### O LIMITE do check, declarado — e o que fica com o revisor

Isto é análise estática de **nome**, não de **valor**. Ela pega o caso em
que os identificadores diferem, que é o caso real e o que dá para provar.

**Ela NÃO pega**, e nenhuma análise estática razoável pegaria:

1. **Mesmo nome, conteúdo diferente.** A coleção foi refiltrada, reordenada
   ou recarregada entre a pergunta e a ação. Os dois lados se chamam
   `selecionados`; o conteúdo mudou.
2. **Mensagem sem número.** "Descartar os rascunhos desta obra?" seguido de
   uma ação que apaga os de todas as obras. Não há `.length` para o check
   ancorar.
3. **A coleção certa, o critério errado.** A ação percorre a coleção citada
   e aplica um filtro diferente do que a mensagem descreve.

**Item de leitura obrigatória do revisor** — entra na DoD:

> Em toda confirmação de ação destrutiva, ler os dois lados juntos e
> responder: **o que a mensagem promete é exatamente o que a ação faz?**
> Não basta a coleção ter o mesmo nome — é preciso ser o mesmo conjunto, no
> mesmo momento, com o mesmo critério. Um número na mensagem que não venha
> da coleção que a ação percorre é reprovação imediata.

### O que a varredura encontrou hoje

**Nada.** As duas telas suspeitas foram lidas linha a linha:

- **`ObraTipoApropriacao.jsx`** — a confirmação nomeia um tipo e uma obra, e
  a ação chama `salvarObraTipoApropriacao({ obra_id, tipo_solicitacao_id })`
  com exatamente esses dois. É um vínculo, não uma lista. **Correto.**
- **`CrPlanejamentoView.discardLocalDraft`** — a confirmação fala "desta obra
  e competência" e a ação percorre `allDraftKeys`. O nome assusta, mas
  `allDraftKeys` é `Object.values(draftKeys)`, e `draftKeys` é construído com
  `(userId, obra.id, competencia)`: são as **três seções** desta obra e
  competência, e nenhuma outra. **Correto.**

O texto dessa confirmação **foi ajustado** pela regra do cliente: passou a
nomear as três seções e a dizer que a ação não pode ser desfeita. "Descartar"
sozinho deixa a pessoa supor que dá para recuperar.

**Regra do cliente que vale para todo lote destrutivo, registrada aqui**: se
a pessoa cancelar no meio de um lote, o que já foi descartado **fica
descartado** — não se tenta desfazer. E o texto da confirmação declara a
irreversibilidade antes, não depois.

---

## Quarto caso de "existia e ninguém sabia": o passo que só existia no hábito

Os três primeiros foram telas: as compartilhadas órfãs, as rotas sem porta de
entrada, os índices de navegação fora da fonte única. **Este é um passo do
PROCESSO**, e por isso é o mais incômodo dos quatro.

### O que aconteceu

Durante todas as levas eu conferia cor crua por `grep`, agente por agente:
`grep -E "text-slate-|bg-slate-|border-slate-"` entrava na lista de gates de
cada agente e no meu relatório. Funcionou — enquanto eu lembrei.

A `FinanceiroTituloDetalhe` entrou no manifesto, fechou matriz de cobertura,
foi entregue — e carrega **64 cores cruas**. Entre elas 29 `text-slate-500`,
que é `#64748b`: **4,34:1** de contraste sobre fundo claro, contra o mínimo
AA de 4,5:1. **A mesma cor que a leva das telas fora do shell mediu e
reprovou na `DefinirSenha`** — corrigida lá, intacta aqui.

Nada falhou. O `validarLayout` passou, o harness passou, a matriz fechou. O
passo que teria pegado isso **não estava em lugar nenhum a não ser no meu
hábito de rodar um grep**.

### A regra

> **O que não é conferido por check não é conferido.** Passo de verificação
> que existe só no hábito de alguém não existe: ele funciona até a primeira
> vez que a pessoa está cansada, com pressa, ou delegando — e falha em
> silêncio, porque não há nada para ficar vermelho.

E o corolário, que vale para a leitura do revisor tanto quanto para o grep:
**se um passo é obrigatório, ele é escrito e é executável.** Se não puder ser
executável, é escrito como item explícito da DoD, com nome, para poder ser
cobrado. Um passo que depende de alguém lembrar é uma promessa, não um
processo.

### O que foi feito

- **R25** no `validarLayout.mjs`, sem trinco: paleta crua, hexadecimal,
  `rgb()`/`hsl()` e cor arbitrária reprovam em qualquer tela do manifesto.
  Fecha a família inteira, não só o `slate` — decisão do cliente.
- **Provado nos dois sentidos**: com o código limpo passa; com um
  `text-slate-500` e um `#ff0000` plantados numa tela do manifesto, reprova
  as duas coisas e o validador sai com código 1.
- As três telas devedoras: `Parceiros` (3, faixa de atenção em amber cru →
  família semântica `--sem-warning`), `ObraGestao` (1, fundo de modal em
  `bg-slate-950/45` → `--modal-overlay`, o mesmo do `OverlayModal` e da
  paleta de comandos) e `FinanceiroTituloDetalhe` (64).

### Dois defeitos do próprio check, achados antes de confiar nele

1. **Ele nunca rodou.** A primeira versão usava `manifesto` e `RAIZ`, nomes
   que não existem naquele escopo — e devolveu **zero achados** num arquivo
   com 35 classes cruas. Foi pego porque o resultado foi conferido contra
   dado conhecido antes de ser aceito. Sozinho, o zero parecia aprovação.
2. **O comentário que explicava a regra reprovava o arquivo.** A remoção de
   comentários era linha a linha, e o comentário da R25 numa tela é um bloco
   JSX de várias linhas que cita as classes proibidas. Passou a cortar
   comentários no arquivo inteiro, trocando-os por espaço para o número da
   linha continuar batendo.

   E a primeira tentativa desse conserto **quebrou o validador**: o
   comentário que explicava o problema dos comentários escrevia o
   delimitador de fechamento de bloco como exemplo, e fechou a si mesmo.

### O que a R25 destravou: um defeito de contraste no tema escuro, no SISTEMA

Assim que a `FinanceiroTituloDetalhe` saiu da paleta crua e passou a usar as
famílias semânticas, apareceu um defeito que estava atrás dela: **três pares
do tema escuro reprovavam AA**.

O cabeçalho do `frontend/src/styles/design-tokens.css` afirmava que "todos os
pares texto/fundo foram validados WCAG AA nos dois temas". Medido em 03/09:

| Par (escuro) | Medido | |
|---|---|---|
| `--sem-danger` sobre `--sem-danger-bg` | **4,42:1** | reprova |
| `--sem-success` sobre `--sem-success-bg` | **4,46:1** | reprova |
| `--sem-info` sobre `--sem-info-bg` | **4,49:1** | reprova por 0,01 |

Atinge o sistema inteiro — o `StatusBadge`, as `.fx-badge--*`, toda etiqueta
de estado no tema escuro — não só a tela que expôs.

**A afirmação estava no comentário; a verificação não estava em lugar
nenhum.** É a mesma família, de novo, e desta vez num arquivo que se
declarava validado.

**Corrigido**: os três clareados um passo, com folga deliberada até 4,6:1
para não voltarem a raspar o limite — `danger` 4,42→**4,65**, `success`
4,46→**4,62**, `info` 4,49→**4,66**. O comentário do arquivo também estava
errado no MÉTODO: dizia medir contra a superfície escura da página, quando o
texto aparece sobre o fundo da própria família.

**E virou prova executável**: `frontend/scripts/provas/contrasteDosTokens.mjs`,
dentro do `test:responsive`. Mede os 10 pares nos dois temas e reprova
qualquer um abaixo de 4,5:1. Provada nos dois sentidos — com os valores
corrigidos passa; devolvendo `--sem-info` ao valor antigo, reprova com o
número na tela e sai com código 1.

### Pendências que a leva do Financeiro herda desta tela

1. **`StatusBadge` seria o destino certo em três selos** da
   `FinanceiroTituloDetalhe` (status da intenção de pagamento, do lote e do
   evento de auditoria). Ficaram com token porque a troca mexeria na
   marcação além de cor, e num deles o texto é `Lote {status}` — prefixo que
   o `StatusBadge` não aceita sem mudança de contrato (R21). **Consequência
   aceita e registrada: nesses três a cor continua sozinha, sem ícone — não
   comunicam para daltônico.**
2. **`bg-white` cru dentro de painéis semânticos** (9 campos e uma faixa a
   70% na mesma tela). A R25 permite `-white` por não ser degrau de paleta,
   mas no tema escuro esses campos ficam brancos dentro de painel escuro, e
   a faixa a 70% combina fundo branco com `--c-muted`, que no escuro é
   claro — contraste desprezível. É defeito de tema, não de paleta crua.
3. **`garantirContraste()` do `ThemeContext` NÃO cobre os `--sem-*`.** Ele
   aplica piso em `--c-muted`, `--input-placeholder`, `--card-muted` e
   afins, mas as famílias semânticas passam direto. Hoje elas estão certas
   no arquivo e a prova nova as segura; mas um tema customizado por setor
   que sobrescreva um `--sem-*` não passa por piso nenhum.

---

## SEXTA família: CAPACIDADE ÓRFÃ — viva, funcional e inalcançável

Distinta das cinco anteriores, e vale nome próprio:

- **não é código morto** — a tela existe, compila e funciona;
- **não é capacidade sem sinal** (R15) — o sinal existiria, o *caminho* é que
  não existe;
- é **capacidade órfã**: código completo, condicionado a uma rota ou a um
  ponto de entrada que sumiu do sistema.

Apagar uma dessas é destruir capacidade por acidente de histórico. Mantê-las
sem decidir é carregar código que ninguém sabe se deve existir.

### A varredura (04/09)

Critério: tela em `pages/` que exporta componente, **não é importada pelo
`App.jsx`** (logo não tem rota própria) e **não é importada por nenhuma
outra tela** (logo não é subcomponente).

**30 telas não têm rota própria**; dessas, **20 são subcomponentes
legítimos** (`SolicitacaoDetalhe/*`, `Solicitacoes/*`, `RhDpApuracao`…),
importados por uma tela que tem rota. Sobram **10 verdadeiramente órfãs**:

| Linhas | Arquivo |
|---|---|
| 573 | `modules/provisionamento-financeiro/pages/ConfiguracaoProvisionamentoFinanceiro.jsx` |
| 487 | `pages/ConversasEntrada.jsx` |
| 484 | `pages/ConversaDetalhe.jsx` |
| 261 | `pages/ConversasSaida.jsx` |
| 128 | `pages/SetoresSemAlteracaoStatus.jsx` |
| 118 | `pages/AprovacaoDiretoria.jsx` |
| 80 | `pages/SolicitacaoDetalhe/InfoCard.jsx` |
| 55 | `pages/SolicitacaoDetalhe/Pedido.jsx` |
| 16 | `pages/SolicitacaoDetalhe/StatusArea.jsx` |
| 1 | `pages/EtapasSetor.jsx` (arquivo de 1 linha) |

**2.203 linhas** nas seis maiores.

As três de conversa já estavam registradas como E4 — e ali o diagnóstico
ficou mais completo: elas navegam para `/conversas/:id`, que é a **rota
quebrada** do E3. São capacidade órfã *e* apontam para caminho quebrado.

**Decisão pendente, uma a uma**: cada arquivo desta lista ou **ganha rota e
ponto de entrada**, ou é **removido com aprovação explícita**. Nenhum dos
dois é decisão de leva de layout. O que a leva faz é não deixar a lista
implícita.

**O que este check ainda NÃO cobre**: tela que tem rota em `App.jsx` mas
cuja rota não é alcançável por menu, hub ou link — essa é a família E1/E2
(porta de entrada ausente), já registrada. As duas juntas descrevem o
caminho inteiro: existe rota? existe caminho até a rota?

---

## O MAPA DO QUE É DE FATO ALCANÇÁVEL

Duas perguntas, e só as duas juntas descrevem o caminho inteiro até uma
tela. Cada uma tem a sua varredura, e cada uma pega uma família diferente:

| | Pergunta | Quem responde | O que pega quando falha |
|---|---|---|---|
| **1** | **Existe rota?** | varredura de órfãs (04/09) | **capacidade órfã** — a tela existe, funciona, e nenhuma rota a alcança. 10 encontradas, 2.203 linhas nas seis maiores. |
| **2** | **Existe caminho até a rota?** | inventário de portas de entrada (E1/E2) | **porta de entrada ausente** — a rota existe e nada no sistema linka para ela. `usuarios-permissoes-rh-dp` e `/configuracoes-contrato-alertas`: só por URL digitada. |

**Passar numa e falhar na outra é o caso comum, e cada combinação é um
defeito diferente:**

- rota **sim**, caminho **não** → a tela está publicada e ninguém chega
  (E1/E2). Parece entregue e não está.
- rota **não**, caminho **não** → capacidade órfã. Parece código morto e
  não é: é código bom, desligado.
- rota **não**, caminho **sim** → o pior dos três: existe link, menu ou
  atalho apontando para lugar nenhum. Tela branca silenciosa, porque a
  aplicação não tem rota curinga. É o caso do `/conversas/:id` (E3) e das
  três telas que navegam para ele (E4).

**Por isso o E3 e o E4 são UMA decisão, não duas** (decisão do cliente,
04/09): consertar a rota `/conversas/:id` ou remover o conjunto inteiro —
as três telas órfãs e a rota quebrada juntas. Decidir só um lado deixa o
outro pendurado: consertar a rota sem as telas mantém três órfãs; remover
as telas sem a rota mantém uma rota que mostra caixa vazia.

**Nenhuma das 10 órfãs foi removida** (decisão do cliente, 04/09). Elas
voltam no fechamento da leva com o que cada uma FAZ e o que se PERDE ao
apagá-la — porque a pergunta não é "está sendo usada?", é "esta capacidade
deve existir?", e essa não é decisão de leva de layout.

---

## Para o responsável — Financeiro, fatia 2 (04/09)

Todos verificados no código antes de virarem item, nenhum corrigido.

### P1 — Falha de rede na consulta de saúde rebaixa o envio para MOCK, em silêncio
- **Onde**: `frontend/src/pages/FinanceiroPagamentos.jsx`, por volta de 365 e 393.
- **O que acontece**: `getBbPaymentsHealth().catch(() => null)` **engole o
  erro**. Sem resposta, a flag de provedor real fica `false`.
- **Consequência**: a pastilha passa a dizer **"MOCK"**, o botão vira "Enviar
  mock", e ele chama **outro endpoint de envio**. Uma falha de rede na
  verificação de saúde **muda o caminho de envio de um lote de pagamento**,
  sem nenhuma mensagem.
- **Por que é a pior classe**: o operador lê "MOCK", acredita que está
  testando — e nem ele nem a trilha registram que aquela informação era um
  erro de rede, não um estado do sistema.

### P2 — `isBbSandbox` significa o OPOSTO do nome
- Ela é `true` quando o **provedor real** está habilitado. Governa
  exatamente a fronteira entre "sai dinheiro de verdade" e "não sai": o
  rótulo, o botão de envio e a habilitação do "Sincronizar BB". Renomear
  mexe em 12 pontos numa tela de dinheiro.

### P3 — Os totais do resumo de baixas mentem acima de 200 registros
- **Onde**: `FinanceiroBaixas.jsx` — o filtro nasce com `limit: 200` e
  **não há controle na tela para elevá-lo** (o "Por página" só fatia no
  cliente). O resumo (Valor base, Valor quitação, Estornadas) é reduzido
  sobre as **primeiras 200** e apresentado como total do recorte.
- Um recorte com 260 baixas mostra um "Valor quitação" **silenciosamente
  menor que o real**. O CSV exportado tem o mesmo teto. A leva qualificou os
  rótulos com "do recorte"; o número certo pede paginação de servidor.

### P4 — Três ações que movimentam caixa não confirmam nada
- **"Enviar ao BB"** é o passo em que o dinheiro sai. A única barreira é o
  campo de MFA — que é preenchimento de campo, **não consentimento sobre um
  valor**: no momento do clique o operador não vê o código do lote, nem a
  quantidade de itens, nem o total.
- **"Confirmar baixa"** grava movimento financeiro num clique; desfazer
  exige estorno.
- **"Gerar boletos em lote"** não declara que, interrompido no meio, o que
  já foi gerado fica gerado.
- Acrescentar guarda em ação de caixa é decisão de negócio, não de layout.

### P5 — Justificativa obrigatória?
- Em três das quatro confirmações a leva manteve `obrigatorio: false`,
  porque o `prompt` aceitava vazio e o payload caía numa justificativa
  padrão — exigir agora **mudaria o payload possível**. Numa tela que
  movimenta caixa, a resposta provavelmente é "sim, obrigatória". É decisão
  do responsável.

---

## O DEFEITO MAIS CARO DA LEVA: total que soma só a página, em tela de decisão

**Quatro ocorrências independentes**, todas em `backend/src/services/relatorioFinanceiroService.js`,
todas com a mesma forma: `findAll({ limit })` e **depois** somar o resumo
sobre o que voltou. Verificadas no código, nenhuma corrigida — é agregação
de dinheiro em backend.

### T1 — `FinanceiroIntercompany`: o usuário acha que pagina e está mudando o total
- **O pior dos quatro**, porque o teto é um **select visível** rotulado
  "Limite" com "100 / 500 / 1000 registros". Trocar 1000 por 100 **muda o
  valor previsto na manchete**. O rótulo faz parecer paginação de exibição;
  é escolha de quanto do universo será somado.
- A leva reescreveu o rótulo para "Teto de registros lidos" e avisa quando a
  lista volta no teto. **O número continua parcial.**

### T2 — `FinanceiroEndividamento`: a manchete subestima a dívida
- O frontend pedia `limit: 500`, **metade do teto do backend**, e mostrava o
  resultado sob o rótulo **"Endividamento aberto"**. Acima de 500 títulos em
  aberto, a manchete subestima a dívida do grupo — e a abertura por empresa
  **some com empresas inteiras**.

### T3 — `FinanceiroRelatorioAnalitico`: total das 500 mais antigas
- `limit: 500` na consulta ordenada por vencimento, e os totais somados
  sobre esse recorte. Acima de 500 linhas, o total é o das 500 de vencimento
  mais antigo.

### T4 — `FinanceiroExecutivoGrupo`: herda T2 e T3, e vira RISCO
- O painel executivo chama endividamento e entre-empresas sem `limit`
  (default 1000 cada) e publica os resumos truncados. Pior: um deles vira
  **cartão de risco executivo**.
- **Consequência**: quem decide vê a dívida dos 1000 vencimentos mais
  antigos como dívida do grupo, e um risco calculado sobre leitura parcial.

### Mais duas, fora do serviço de relatórios
- **`FinanceiroObras`** — limite padrão de **1000** movimentos, e os três
  cartões de topo somam sobre as linhas truncadas. O acumulado da coluna
  "Saldo" começa em zero na primeira linha **sobrevivente**, e o CSV exporta
  só o truncado.
- **`FinanceiroFinanciamentosBancarios`** — "Total contratado" soma no
  máximo **200** contratos.

### O que a leva fez, e o que ela NÃO fez
Nenhuma fórmula, agregação ou payload mudou. O que mudou foi o **rótulo
parar de afirmar o que o número não sustenta**: cada tela detecta em runtime
se a lista voltou no teto e, só nesse caso, troca o título ("Total das linhas
trazidas", "Endividamento aberto (lido)") e avisa no apoio.

**Isso é mitigação, não conserto.** Um número marcado como parcial ainda é
um número parcial em tela de decisão. O conserto é agregar no banco (`SUM`
sobre o recorte) em vez de somar o que a página trouxe.

---

## Achados de sistema da fatia 3

### S5 — `.app-input`, `.app-button`, `.app-card`: a `FinanceiroBancos` inteira era crua
Três classes fantasma, 26 usos. O que a tela **parecia** ter e o que tinha:

| Classe | Parecia | Era |
|---|---|---|
| `.app-card` | superfície branca com contorno e sombra | `<div>` **transparente** — título, métricas e as 7 seções eram **texto solto sobre o canvas** |
| `.app-button` | alvo de 32/44px, tom por token, foco visível | `<button>` **cru**, ~21px de altura — incluindo o que **gera a remessa CNAB240** |
| `.app-input` | altura, borda, raio, anel de foco | `<input>` **cru**, 15 campos sem nada |

**O denominador**: classe fantasma **parece intenção**. Não há nada errado
para ver — só uma coisa ausente que o olho preenche. Por isso atravessou
todas as revisões.

### S6 — `.link` e `.link-primary` numa tela JÁ ENTREGUE
Fantasmas em `FinanceiroDda` (manifesto, matriz fechada) e em
`ComprasRelatorioComprasDiretas`. Escapavam porque `link-` não estava na
lista de prefixos do check — **a lição do rótulo, aplicada a prefixo**.
Prefixo acrescentado; o limite continua existindo.

### S7 — `overflow: hidden` no `index.css`, 39 seletores
A R18 varria só `componentes-padrao.css` e os CSS de módulo. O `index.css`
tem 11.800 linhas de CSS **de tela** — e é lá que o mecanismo mais mora.
Entre os 39: `.financeiro-report-card` (ancestral de duas tabelas),
`.app-dense-table-card`, `.financeiro-relatorios-page` (ancestral da faixa
fixa) e `.modal-dialog`.
**A regra nasceu de nove telas com a faixa fixa quebrada e não cobria o
arquivo onde o defeito mais aparece.** Agora cobre, com trinco.


---

## D19 / D20 — DONO DECLARADO: o que NÃO é órfão, e por que não volta na varredura

Decisão do cliente, 04/09, ao fechar a fatia 4. Três conjuntos apareceram
nas varreduras deste ciclo como se fossem candidatos do Financeiro. Não
são — têm dono, e o dono está registrado aqui e em
`frontend/scripts/telas-reformadas.json` (bloco `donos_declarados`), para
que a próxima varredura os leia como **atribuídos**, não como achados.

| Conjunto | Onde vive | Dono declarado |
|---|---|---|
| **D19a — Provisionamento Financeiro** | `src/modules/provisionamento-financeiro/**` | leva do módulo Provisões |
| **D19b — Custos e Recebíveis** | `src/modules/custosRecebiveis/**`, `pages/CustosRecebiveis.jsx` | leva do módulo Custos e Recebíveis |
| **D20 — Painel de Solicitações** | `pages/Solicitacoes/**`, `pages/SolicitacaoDetalhe/**` | leva do módulo Solicitações |

**Por que eles apareciam.** Cada um tem parentesco de vocabulário com o
Financeiro — provisão é dinheiro, recebível é dinheiro, e o
`SolicitacaoDetalhe/FinanceiroCard.jsx` tem 3.051 linhas com "Financeiro"
no nome. Parentesco de nome não é pertencimento de módulo: o card financeiro
é um bloco DENTRO do detalhe da solicitação, importado só por
`SolicitacaoDetalhe/index.jsx`, e some junto com aquela tela.

**O que a declaração de dono NÃO faz**: não os declara prontos, não os
tira de nenhuma regra e não os isenta de leva. Ela só responde à pergunta
"de quem é isto?" — que era a pergunta que fazia a mesma tela reaparecer
como achado a cada varredura nova.

**Regra que fica**: toda varredura que produza lista de candidatos precisa
cruzar com `donos_declarados` antes de reportar. Achado com dono declarado
é ruído; o valor da varredura está no que ainda não tem dono.

---

## FATIA 4 — cadastros e comprovantes: o que a medição encontrou

A fatia nasceu com uma lista candidata pequena e terminou menor ainda,
porque a medição desmontou a lista:

| Destino do menu Financeiro | Arquivo | Situação em 04/09 |
|---|---|---|
| Cadastros Financeiros | `FinanceiroCadastros.jsx` | já no manifesto (fatia 3) |
| Comprovantes Pendentes | `ComprovantesPendentes.jsx` | já no manifesto (fatia 1) |
| **Upload Comprovantes** | **`UploadComprovantes.jsx`** | **única tela nova da fatia** |

As 17 rotas do módulo Financeiro e as 32 rotas de `/financeiro/*` +
`/comprovantes/*` do `App.jsx` foram conferidas uma a uma contra o
manifesto: **restava exatamente uma**. O manifesto fecha a leva em **68
telas**.

### Dois arquivos que a varredura devolveu e não entram

- **`SolicitacaoDetalhe/FinanceiroCard.jsx`** (3.051 linhas) — importado
  por `SolicitacaoDetalhe/index.jsx`. D20: módulo de Solicitações.
- **`SolicitacaoDetalhe/Comprovantes.jsx`** — **arquivo de 0 bytes, sem
  nenhum import em todo o `src/`**. Não é órfã (órfã tem código); é resto.
  Registrado para remoção junto com o `EtapasSetor.jsx` na decisão das dez.

### O que mudou na `UploadComprovantes.jsx`

Antes: `<h1>` solto num card, texto de apoio miúdo, e as duas mensagens de
retorno pintadas **à mão, em hexadecimal, nos dois tons de azul**.

| Achado | Regra | O que era | O que é |
|---|---|---|---|
| Título solto no card | R5/R13/C1 | `<h1 class="page-title">` + `<p class="page-subtitle">` dentro de um `.card` | `Pagina` + `PageHeader` com contagem e apoio na faixa fixa |
| `#1d4ed8` / `#1e40af` | R25 | cor de mensagem em hexadecimal | `Avisos`/`Alert` do sistema, tom semântico |
| `text-blue-600` | R25 | classe de paleta crua no botão Remover | corrigida **no padrão do componente** (abaixo) |

### O achado de semântica: o erro estava pintado de sucesso

Duas linhas, lado a lado:

```jsx
{message && <p className="text-sm" style={{ color: '#1d4ed8' }}>{message}</p>}
{error   && <p className="text-sm" style={{ color: '#1e40af' }}>{error}</p>}
```

`#1d4ed8` e `#1e40af` são dois azuis quase iguais. Erro e confirmação
saíam com a **mesma leitura visual** — e nenhuma delas com a cor de erro
do sistema.

Pior que a cor, o caminho: o retorno de recusa do servidor não ia para o
`error`, ia para o `message`.

```jsx
if (result.message)      setMessage(result.message);
else if (result.error)   setMessage(result.error);   // recusa entrando pelo canal do sucesso
```

Recusa do servidor chegava ao usuário pelo canal do sucesso, com a cor do
sucesso. É a **classe SIGNIFICADO** já registrada nesta ficha: nenhum
check de forma pega isso — as duas linhas têm elemento, texto e cor. Só a
leitura pega.

Agora `result.error` vai para `avisar.erro` e os arquivos **ficam na tela**,
porque não há o que confirmar.

### R25 tem um ponto cego estrutural: o PADRÃO do componente compartilhado

`PendingAttachmentsList` trazia isto na assinatura:

```js
removeButtonClassName = 'text-blue-600 font-semibold px-2'
```

Paleta crua morando no **valor padrão** de um componente compartilhado. Uma
tela que só usa o padrão herda a dívida **sem uma linha de paleta crua no
próprio arquivo** — e a R25 lê os arquivos das telas. O check passa, a cor
não acompanha o tema escuro.

Corrigido no padrão (`var(--c-primary)`), que é onde a correção vale para
todos. **Seis chamadas ainda passam a classe crua explicitamente** —
`GestaoContratos` (2), `SolicitacaoDetalhe/Conversa`, `ConversaDetalhe`,
`ConversasEntrada`, `NovaSolicitacao` —, todas fora do manifesto. Serão
pegas pela R25 quando as levas dos módulos delas chegarem; ficam
registradas aqui para não dependerem de alguém lembrar.

**A lição, generalizada**: um check que lê o arquivo da tela não enxerga o
que a tela herda. Todo componente compartilhado que aceita classe por prop
carrega, no seu valor padrão, uma decisão de estilo que nenhuma leva
inspeciona.

---

## DOIS DEFEITOS DOS MEUS PRÓPRIOS INSTRUMENTOS, ACHADOS NO FECHAMENTO

### I1 — `tokensExistem` lia PROSA como lista de classe

A varredura de fantasmas lê qualquer literal de string com cara de lista
de classes, e frase em português também é literal de string. Uma mensagem
de erro que diz `toque em "Enviar link" de novo` virou o fantasma
**`.link"`** — com a aspa dentro do nome.

Nome com aspa ou ponto não é identificador CSS: **nunca poderia existir no
CSS**, logo nunca sairia do trinco por correção nenhuma. Ficaria lá para
sempre inflando o número, e um número que não pode descer é um trinco que
não trava nada.

Dois cortes: o candidato tem de ser identificador CSS válido, e o prefixo
`link` passou a valer só exato ou seguido de hífen (antes, `linkado` e
`links` entravam). Trinco: **39 → 36**. Provado nos dois sentidos —
`.app-fantasma-plantado` continua reprovando.

Junto saiu o fantasma real que motivou tudo: `.link link-primary` na
`FinanceiroDda.jsx`, **tela já entregue com matriz fechada**. Nenhuma das
duas classes existe: o único caminho da linha do DDA até o título
renderizava como texto preto comum, sem parecer clicável.

### I2 — exceção registrada que não cobre nada é licença em branco

`FinanceiroDre.jsx` tinha exceção de R10 registrada — "geometria de
gráfico de barras" — e o validador **não emitia um aviso sequer** para ela.
A medida à mão saiu do arquivo numa fatia anterior; a exceção ficou.

Exceção nessas condições não é inofensiva. No dia em que alguém puser uma
medida à mão nessa tela, a violação **nasce rebaixada a aviso** e o gate
passa verde. É o inverso exato do trinco: em vez de congelar o passivo,
abre crédito para o futuro.

O validador agora exige que toda exceção registrada **prove que cobre
algo**; se não cobre, reprova pedindo a remoção da linha. Provado nos dois
sentidos na mesma execução: a exceção vazia da `FinanceiroDre` reprovou, e
as duas da `ObraTipoApropriacao` — que cobrem violações reais — passaram.

**A regra**: exceção é dívida declarada, e dívida quitada se dá baixa.
Exceção que sobrevive ao motivo vira permissão.

---

## AS DEZ ÓRFÃS — o que cada uma FAZ e o que se PERDE ao apagá-la

Trazidas ao fechamento da leva conforme a decisão do cliente de 04/09.
Nenhuma foi removida. A pergunta não é "está sendo usada?" — nenhuma está,
é a definição de órfã — é **"esta capacidade deve existir?"**.

### Antes da lista: duas delas nem funcionariam se alguém chegasse lá

Conferindo os imports nomeados de cada uma contra os exports reais dos
módulos que elas importam:

| Órfã | Import quebrado |
|---|---|
| `ConfiguracaoProvisionamentoFinanceiro.jsx` | `getProvisionamentoFinanceiroPermissoes`, `salvarProvisionamentoFinanceiroPermissoes` — **não existem** em `services/provisoesFinanceiras.js` |
| `SetoresSemAlteracaoStatus.jsx` | `getSetoresSemAlteracaoStatus`, `salvarSetoresSemAlteracaoStatus` — **não existem** em `services/configuracoesSistema.js` |

**Por que o build passa**: as duas não são importadas pelo `App.jsx`. O
Vite nunca as inclui no bundle, então nunca resolve os imports delas. É a
consequência escondida da capacidade órfã: **código inalcançável é código
não construído**, e portanto código onde a quebra se acumula sem sinal. As
duas voltariam a existir quebradas no dia em que alguém lhes desse rota.

Isso muda a natureza da decisão nas duas: não é "religar capacidade que
funciona", é "terminar o que nunca chegou a ser ligado ponta a ponta".

### A lista

| # | Órfã | O que FAZ | O que se PERDE ao apagar |
|---|---|---|---|
| 1 | `ConfiguracaoProvisionamentoFinanceiro.jsx` (572) | Editor de regras de permissão do provisionamento, por escopo (usuário/setor/obra) e perfil | **Nada em operação** — o serviço que ela chama não existe. Perde-se o desenho da tela de permissões do módulo Provisões |
| 2 | `ConversasEntrada.jsx` (486) | Caixa de entrada de conversas internas: lista, filtro por setor, nova conversa com anexos | A entrada da comunicação interna por conversa. **Ver E3/E4** |
| 3 | `ConversaDetalhe.jsx` (483) | Thread de uma conversa: mensagens, anexos com preview, adicionar participantes | O detalhe da conversa. **Navega para `/conversas/:id`, rota que não existe** |
| 4 | `ConversasSaida.jsx` (260) | Caixa de saída das conversas enviadas | O outro lado da caixa de entrada |
| 5 | `SetoresSemAlteracaoStatus.jsx` (127) | Marca setores que **não exibem** o botão "Alterar status" no detalhe da solicitação | **Nada em operação** — sem serviço no front e **sem rota no backend**, apesar de existir `services/solicitacao/setoresSemAlteracaoStatus.js` lá, também sem consumidor. Perde-se o único desenho dessa regra |
| 6 | `AprovacaoDiretoria.jsx` (117) | Define **qual diretoria recebe a solicitação primeiro** conforme obra pública ou privada | **O caso mais grave da lista — ver abaixo** |
| 7 | `SolicitacaoDetalhe/InfoCard.jsx` (79) | Card "Dados da Solicitação" (obra, setor, tipo, valores) | Nada: o detalhe vivo monta esses dados por outro caminho |
| 8 | `SolicitacaoDetalhe/Pedido.jsx` (54) | Grava o **número do pedido** da solicitação (`PATCH /solicitacoes/:id/pedido`) | **A única forma de preencher um campo que as listas exibem — ver abaixo** |
| 9 | `SolicitacaoDetalhe/StatusArea.jsx` (15) | Caixa com status e área responsável, fundo `#f5f5f5` fixo | Nada. Ignora tema e tokens; o detalhe vivo já mostra os dois |
| 10 | `EtapasSetor.jsx` (1) | `return <div>EtapasSetor</div>` | Nada. É um esqueleto que nunca ganhou corpo |

### #6 `AprovacaoDiretoria` — a configuração que o sistema OBEDECE e ninguém pode mudar

O endpoint está vivo nos dois verbos:

```
GET   /configuracoes/aprovacao-diretoria
PATCH /configuracoes/aprovacao-diretoria   (allowConfiguracoesStatusVinculos)
```

E o valor é **consumido em produção**: `SolicitacaoController.js:802` e
`PrioridadeDiretoriaController.js:565` decidem o roteamento por
`fluxo_aprovacao_diretoria`; o `SolicitacaoDetalhe` tem bloco próprio
`aprovacao_diretoria`; o `blocosDetalhe.js` o lista como "Aprovação por
diretoria".

`AprovacaoDiretoria.jsx` é a **única** tela do frontend que chama
`salvarAprovacaoDiretoria`.

Ou seja: **o sistema roteia solicitações por uma regra que ninguém consegue
alterar pela interface.** O que está no banco hoje é o que vale, para
sempre, até alguém mexer por fora. Apagar a tela transforma um problema de
caminho em decisão permanente e invisível.

### #8 `Pedido` — a coluna que mostra o que nada preenche

`PATCH /solicitacoes/:id/pedido` existe, valida corpo
(`validateSolicitacaoPedidoBody`) e **grava auditoria**
(`SOLICITACAO_PEDIDO_UPDATED`). Nenhum `service` do frontend chama essa
rota; a busca por quem escreve `numero_pedido` no frontend inteiro devolve
**só esta órfã**.

Enquanto isso, `Solicitacoes/index.jsx` e `LinhaSolicitacao.jsx` **exibem**
`numero_pedido` em coluna e em tooltip. A coluna existe, a auditoria
existe, a validação existe — e o campo só se preenche por integração
externa ou banco.

### Agrupando para decidir

| Grupo | Órfãs | Decisão que faz sentido |
|---|---|---|
| **Restos** | 7, 9, 10 (e o `SolicitacaoDetalhe/Comprovantes.jsx` de 0 bytes) | Remover. Nada se perde; a #9 ainda ignora o tema |
| **Capacidade viva sem porta** | 6, 8 | **Dar rota e ponto de entrada.** Nos dois o backend está em uso e a interface é o único elo faltando |
| **Nunca ligado ponta a ponta** | 1, 5 | Terminar (front + rota) **ou** remover as duas pontas juntas — a tela e o serviço backend sem consumidor |
| **Conjunto das conversas** | 2, 3, 4 | **E3 + E4, uma decisão só** (ver abaixo) |

### E3 e E4 continuam sendo UMA decisão

Reafirmado com a medição desta fatia. As três telas de conversa navegam
para `/conversas/:id`, que **não tem rota** — e a aplicação não tem rota
curinga, então o destino é tela branca silenciosa.

- Consertar a rota sem as telas → uma rota que abre caixa vazia.
- Remover as telas sem a rota → uma rota quebrada a menos e três telas a
  menos, mas o módulo de Comunicação Interna fica só com a
  `ComunicacaoInterna.jsx`, que é outra coisa.

A pergunta única: **o sistema deve ter conversa por thread com caixa de
entrada e saída, ou a comunicação interna é só a tela que já existe?** As
três telas e a rota seguem juntas a resposta, qualquer que seja.


---

## Para o responsável — Financeiro, fatia 4: o upload de comprovantes (04/09)

Achados de **backend**, medidos no fechamento da leva. Nenhum foi
corrigido: são regra e dado, não layout. `ComprovanteController.uploadMassa`
e a rota `POST /comprovantes/upload-massa`.

### U1 — O VALOR do comprovante é inventado a partir do nome do arquivo

```js
const valor = nome.match(/\d+([.,]\d{2})?/);
if (valor) result.valor = valor[0].replace(',', '.');
```

**O primeiro número que aparecer no nome do arquivo vira o valor monetário
do comprovante.** Rodado sobre nomes reais:

| Nome do arquivo | Solicitação achada | **Valor gravado** |
|---|---|---|
| `SOL-12.pdf` — *o exemplo da própria tela* | SOL-12 | **12** |
| `SOL-000123.pdf` | SOL-000123 | **000123** |
| `comprovante 1.234,56 SOL-45.pdf` | SOL-45 | **1.23** |
| `NF 8899 OBRA-A1.pdf` | — | **8899** |

Duas coisas ao mesmo tempo:

1. **A convenção que a tela ensina fabrica dinheiro.** Quem seguir a
   instrução `SOL-12.pdf` grava um comprovante de valor 12 que ninguém
   digitou.
2. **Quando o valor está mesmo no nome, ele sai errado.** `1.234,56` vira
   `1.23` — a expressão pára no primeiro `.` e o `,56` é descartado. Erro
   de três ordens de grandeza, para menos.

O campo é `Comprovante.valor` e alimenta a conferência de comprovantes.

**Sugestão, para decisão de quem manda**: não inferir valor de nome de
arquivo. Um valor inventado é pior que valor ausente — ausente se vê,
inventado se confere.

### U2 — "Upload realizado com sucesso" para dois desfechos diferentes

O controlador termina sempre igual:

```js
return res.json({ message: 'Upload concluido' });
```

Arquivo com `SOL-nn` no nome → `status: 'VINCULADO'`, com histórico na
solicitação. Arquivo sem → `status: 'PENDENTE'`, esperando vínculo manual.
**Os dois recebiam a mesma frase.**

Mitigado no front nesta fatia — a tela agora conta antes do envio quantos
arquivos não têm o código, e depois do envio diz quantos ficaram pendentes.
**É mitigação, não conserto**: quem conhece o desfecho de cada arquivo é o
servidor, e a resposta continua não dizendo.

### U3 — Falha no meio do lote grava metade e responde erro total

O laço não tem proteção por arquivo. Se o sétimo de dez falhar no envio ao
S3, os seis primeiros **já estão gravados** e a resposta é `500 Erro no
upload`. A pessoa reenvia os dez, e **`Comprovante.create` não tem nenhuma
chave de idempotência** — os seis primeiros duplicam.

Combinado com U1, cada duplicata carrega o mesmo valor inventado.

### U4 — Nome com `OBRA-<n>` cai em `findByPk` do id interno

```js
obra = await Obra.findOne({ where: { codigo: String(info.obra).toUpperCase() } });
if (!obra && String(info.obra).match(/^\d+$/)) obra = await Obra.findByPk(info.obra);
```

Não achando pelo código, procura pelo **id interno** da tabela. Um arquivo
chamado `OBRA-3 comprovante.pdf`, numa base onde não exista obra de código
"3", é vinculado à obra **cujo id é 3** — que pode ser qualquer uma.
Convenção de nome de arquivo alcançando a chave primária do banco.

---

## A TERCEIRA CATEGORIA QUE A REGRA DE NAVEGAÇÃO NÃO COBRE (04/09)

A regra registrada hoje em `REGRAS-LAYOUT.md` separa duas coisas:

| Isto é… | Mora em |
|---|---|
| Ação sobre esta tela | barra de ações; as raras, no menu "⋯" |
| Caminho para outra tela | hub do módulo, breadcrumb, Ctrl+K |

A varredura que a regra pediu (toda `secundarias`/`acaoPrincipal`/
`destrutiva`/`mais` do `PageHeader` com `to:`) devolveu **dois** destinos no
sistema inteiro:

1. **`FinanceiroTitulos` · "Novo título" → `/financeiro/titulos/novo`** —
   não é defeito. Sub-rota da própria listagem: criar registro é AÇÃO,
   mesmo abrindo outra rota. A C6 já sabe disso e tem prova de que não
   acusa `/usuarios/12/editar` na barra de ações.

2. **`FinanceiroTituloDetalhe` · "Abrir solicitação" →
   `/solicitacoes/:id`** — o item 5 das decisões pendentes, hoje tolerado
   por exceção declarada no `telas.mjs`.

### Por que o segundo não se resolve com a regra nova

Ele não é atalho de módulo. É **link para o REGISTRO RELACIONADO**, seguindo
uma relação do dado — e nenhum dos três lugares da regra consegue hospedá-lo:

- o **hub** não sabe a qual solicitação *este* título pertence;
- o **breadcrumb** devolve à hierarquia do próprio módulo, não à de outro;
- o **Ctrl+K** acha telas por nome, não o registro ligado ao que está aberto.

É uma terceira categoria, e ela precisa de lugar declarado:

| Categoria | Mora em |
|---|---|
| Ação sobre esta tela | barra de ações / menu "⋯" |
| Caminho para outra tela | hub, breadcrumb, Ctrl+K |
| **Link para o registro relacionado** | **em aberto** |

### As duas saídas honestas

**(a) No corpo da tela, junto do campo que o origina** — "Solicitação:
SOL-1957" com o código clicável, onde o vínculo é lido. Recomendada: o link
ao lado do dado explica POR QUE ele existe; na barra de ações ele fica sem
contexto, e é justamente essa falta de contexto que a C6 chama de
"navegação vestida de ação".

**(b) Declarar a categoria como pertencente à barra de ações por natureza**,
e ensinar a C6 a distinguir "outra rota do módulo" de "registro relacionado
a este".

**Decisão do cliente, pendente.** Enquanto ela não vem, a exceção segue
declarada no `telas.mjs` — declarada, nunca silenciosa.

### O que este caso ensina sobre regras

A regra de hoje nasceu de um conflito real e resolveu-o. Na primeira
varredura que ela mesma pediu, apareceu um caso que ela não prevê. **Isso
não a invalida: mostra que ela tem alcance conhecido.** Regra que parece
cobrir tudo é regra que ninguém testou contra o sistema inteiro.

## DECISÃO DE ESCOPO: `GestaoContratos` sai da rodada 2 e vai para a de Contratos (04/09)

**Decidido por mim**, pelas regras de ritmo: é escolha de onde a tela é
medida, reversível e sem mudar comportamento.

`/gestao-contratos` aparece no hub de Configurações, seção "Cadastros", e por
isso entrou no escopo da rodada 2. O levantamento mostrou por que ela não
cabe ali:

- **1.900+ linhas**, duas instâncias de `TabelaPadrao` em ramos exclusivos;
- **38 caixas do navegador** — 33 `alert`, 4 `confirm`, 1 `prompt`. É o maior
  passivo isolado do sistema, e o número bate exatamente com o congelado no
  trinco;
- um modal de anexos feito à mão, com o rodapé saindo da vista quando o
  conteúdo passa do teto — o defeito que a R27 fecha;
- `overflow: hidden` em `.contratos-table-card`, que é regra de `index.css` e
  não da tela.

**Por assunto ela é de Contratos, não de Configurações** — o hub apenas a
alcança. Uma tela desse tamanho medida de raspão no fim de uma rodada de 33 é
o tipo de coisa que passa verde por cansaço.

Vai para a **rodada 3 (CRM + Comercial + Contratos)**, onde tem espaço para
ser uma fatia própria. Rodada 2 fecha em **33 telas**.

**O critério que fica**: hub que alcança não define dono. Dono é o assunto.
