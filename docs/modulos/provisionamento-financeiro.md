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
- filtros avancados por obra, periodo, categoria, fornecedor, faixa de valor, prioridade e criador
- ordenacao direta pelos cabecalhos da tabela
- totalizador por valor filtrado
- contador de registros filtrados
- exportacao CSV da listagem filtrada
- persistencia local dos filtros por usuario
- ajuste de UX para valor previsto com mascara monetaria
- configuracao de obras permitidas com checklist multi-selecao
- selecao de previsoes na tabela com exportacao CSV apenas das selecionadas
- seletor de itens por pagina no rodape da tabela (`25`, `50`, `100`, `200`)
- seletor de colunas visiveis e filtros visiveis acima da tabela, no mesmo padrao operacional da tela de solicitacoes

## Escopo do Sprint 4
- transicoes formais de status para aprovacao, cancelamento e realizacao no backend
- auditoria especifica para mudancas de status
- acoes gerenciais no detalhe da provisao
- posteriormente, a interface web do modulo foi simplificada para acompanhamento, ocultando status e acoes de etapa

## Escopo do Sprint 5
- dashboard gerencial do modulo
- cards consolidados por periodo
- graficos agregados por mes, obra, categoria e status
- curva semanal de desembolso projetado
- alertas gerenciais
- visao global apenas para quem possui permissao de dashboard global
- demais usuarios enxergam dashboard restrito ao proprio escopo de obras
- refinamento visual com foco em leitura executiva e tomada de decisao

## Escopo do Sprint 6
- hardening de permissao por obra para usuarios comuns
- alinhamento do backend com paginação de ate `200` itens por pagina
- indices adicionais para consultas do modulo, regras de permissao e vinculos por obra
- checklist operacional e documentacao de deploy da etapa

## Regras de status
- o backend ainda preserva os estados internos do modulo para compatibilidade historica e futura
- a interface web operacional atual nao exibe status nem permite alteracao de etapa
- novos registros seguem fluxo simplificado de acompanhamento, sem escolha de status na tela

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
- para perfil `USUARIO`, o escopo final e intersectado com `usuarios_obras` quando esses vinculos existirem
- se o usuario nao possuir vinculos em `usuarios_obras`, prevalece o escopo configurado diretamente no modulo

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
  - `GET /provisoes-financeiras/dashboard/resumo`
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
- no Sprint 6, aplicar tambem `backend/migrations/add-provisionamento-financeiro-hardening-indexes.sql`

## Observacoes tecnicas
- o backend normaliza valor monetario aceitando tanto decimal puro (`1234.56`) quanto formato mascarado (`R$ 1.234,56`)
- o codigo segue `PREV{obra.codigo}-{sequencial}` com lock transacional por obra
- o campo operacional de classificacao na criacao/edicao passou a ser `Item Macro`, em texto livre curto
- quando um `Item Macro` novo e informado, o backend reutiliza ou cria automaticamente o registro correspondente em `provisao_categorias_macro`
- a tela de `Nova Provisao` nao exibe mais `Comentario inicial`; a `Descricao` cobre esse uso inicial
- a exportacao CSV respeita exatamente os filtros e a ordenacao aplicados na listagem
- a listagem usa ordenacao por clique no cabecalho; o codigo `PREVx-n` e ordenado pelo numero apos o `-`
- o dashboard usa o mesmo escopo de acesso do modulo e so amplia para visao global quando `pode_dashboard_global` estiver habilitado
- o frontend oculta o menu do dashboard para usuarios sem `pode_dashboard_global`
- o backend passou a aceitar ate `200` itens por pagina, alinhado ao frontend
