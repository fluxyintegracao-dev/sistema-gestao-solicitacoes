# Provisionamento Financeiro

## Objetivo
Modulo novo e isolado para previsao gerencial de desembolso por obra.

Nao substitui:
- solicitacoes
- solicitacoes de compra
- contas a pagar
- financeiro realizado

## Escopo do Sprint 1
- base de banco
- models Sequelize
- geracao segura de codigo por obra
- gate de permissao do modulo
- tela inicial de configuracao para SUPERADMIN

Nesta etapa o modulo ainda nao aparece no menu principal para usuarios comuns.

## Escopo do Sprint 2
- CRUD basico da provisao financeira
- cadastro de categorias macro
- listagem inicial do modulo
- tela de detalhe
- historico basico de criacao, edicao, comentarios e anexos
- upload e listagem de anexos
- exibicao do modulo no menu apenas para usuarios com acesso

## Escopo do Sprint 3
- filtros avancados por obra, periodo, categoria, status, fornecedor, faixa de valor, prioridade e criador
- ordenacao configuravel
- totalizador por valor filtrado
- contador de registros filtrados
- exportacao CSV da listagem filtrada
- persistencia local dos filtros por usuario
- ajuste de UX para valor previsto com mascara monetaria
- configuracao de obras permitidas com checklist multi-selecao
- selecao de previsoes na tabela com exportacao CSV apenas das selecionadas
- seletor de itens por pagina no rodape da tabela (`25`, `50`, `100`, `200`)

## Escopo do Sprint 4
- transicoes formais de status para aprovacao, cancelamento e realizacao
- auditoria especifica para mudancas de status
- acoes gerenciais no detalhe da provisao

## Regras de status
- criacao aceita `previsto` ou `em_analise`
- edicao manual continua limitada a `previsto` e `em_analise`
- aprovacao: somente `em_analise -> aprovado`
- cancelamento:
  - `previsto -> cancelado`
  - `em_analise -> cancelado`
  - `aprovado -> cancelado` apenas para `SUPERADMIN`
- realizacao: somente `aprovado -> realizado`

## Codigo da previsao
Formato:
- `PREV{obra.codigo}-{sequencial}`

Exemplo:
- `PREV7-1`
- `PREV7-2`

Regra tecnica:
- a sequencia e controlada por obra
- a geracao usa transacao e lock de linha
- nao pode usar `COUNT(*) + 1`

## Permissoes
O modulo usa regra propria, separada das permissoes atuais de solicitacoes.

Escopos aceitos:
- `USUARIO`
- `SETOR`
- `PERFIL`

Acoes controladas:
- `pode_acessar`
- `pode_criar`
- `pode_aprovar`
- `pode_dashboard_global`

Restricao por obra:
- sem obras vinculadas na regra: acesso global dentro do escopo da regra
- com obras vinculadas: acesso limitado as obras selecionadas

`SUPERADMIN` continua com acesso total por regra implicita.

## Tabelas-base
- `provisoes_financeiras`
- `provisao_categorias_macro`
- `provisao_financeira_historico`
- `provisao_financeira_anexos`
- `provisao_financeira_permissoes`
- `provisao_financeira_permissao_obras`
- `provisao_financeira_sequencias`

## Ponto de entrada atual
- backend:
  - `GET /provisoes-financeiras/contexto`
  - `GET /provisoes-financeiras`
  - `GET /provisoes-financeiras/exportar`
  - `GET /provisoes-financeiras/:id`
  - `POST /provisoes-financeiras`
  - `PUT /provisoes-financeiras/:id`
  - `POST /provisoes-financeiras/:id/aprovar`
  - `POST /provisoes-financeiras/:id/cancelar`
  - `POST /provisoes-financeiras/:id/realizar`
  - `GET /provisoes-financeiras/:id/historico`
  - `POST /provisoes-financeiras/:id/comentarios`
  - `POST /provisoes-financeiras/:id/anexos`
  - `GET /provisoes-financeiras/:id/anexos`
  - `GET /provisoes-financeiras/categorias`
  - `POST /provisoes-financeiras/categorias`
  - `PUT /provisoes-financeiras/categorias/:id`
  - `GET /configuracoes/provisoes-financeiras/permissoes`
  - `PATCH /configuracoes/provisoes-financeiras/permissoes`
- frontend:
  - `Configuracoes -> Provisionamento Financeiro`
  - `Provisionamento -> Provisionamentos`
  - `Provisionamento -> Nova Provisao`
  - `Provisionamento -> Categorias Macro` para `SUPERADMIN`

## Observacoes de implantacao
- subir primeiro schema e models
- manter modulo restrito ao SUPERADMIN na configuracao inicial
- nao liberar menu operacional antes do CRUD estar pronto

## Observacoes tecnicas
- o backend normaliza valor monetario aceitando tanto decimal puro (`1234.56`) quanto formato mascarado (`R$ 1.234,56`)
- o codigo segue `PREV{obra.codigo}-{sequencial}` com lock transacional por obra
- a exportacao CSV respeita exatamente os filtros e a ordenacao aplicados na listagem
