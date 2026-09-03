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

