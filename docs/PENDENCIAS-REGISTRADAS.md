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
