# Modulo - Provisionamento Financeiro

## Status

Modulo implementado no codigo, com backend, frontend, habilitacao por instalacao e integracao na matriz de permissoes por usuario.

Ja entregue:

- chave de modulo `PROVISOES` no catalogo central
- protecao de rotas por modulo no backend
- ocultacao de menu e rotas protegidas no frontend
- tabela `provisao_categorias_macro`
- tabela `provisoes_financeiras`
- tabela `provisao_financeira_historico`
- tabela `provisao_financeira_anexos`
- tabela `provisao_financeira_sequencias`
- tabela `solicitacao_provisao` para integracao futura com solicitacoes
- listagem de provisionamentos com filtros, ordenacao e colunas configuraveis
- tela `Nova Provisao`
- tela de detalhe da provisao com edicao, comentarios, anexos e historico
- `Dashboard de Previsao`
- gestao de categorias macro
- codigo sequencial por obra no padrao `PREV{obra}-{sequencia}`
- anexos permitidos ja na tela `Nova Provisao`
- escopo de acesso por obra baseado nas obras liberadas ao usuario
- permissao granular por area dentro de `Configuracoes -> Permissoes de Areas por Usuario`
- configuracao SUPERADMIN `Fluxo do Provisionamento`, com modo informativo por padrao

## Objetivo

Centralizar a previsao gerencial de desembolso por obra dentro do FLUXY, com leitura operacional, detalhamento por item macro, trilha de comentarios, anexos e indicadores consolidados.

O modulo nao substitui o financeiro central. Ele organiza a previsao e o acompanhamento do desembolso esperado antes da execucao financeira.

## Papel no produto

Quando habilitado na instalacao, o modulo deve cobrir:

- cadastro de provisoes por obra
- classificacao por categoria macro
- acompanhamento de prioridade
- dashboard gerencial de previsao
- anexos e comentarios por provisao
- trilha historica das mudancas

## Telas entregues

- `Dashboard de Previsao`
- `Provisionamentos`
- `Nova Provisao`
- `Detalhe da Provisao`
- `Categorias Macro`

## Regras-chave

- o modulo deve ser habilitado ou desabilitado por instalacao
- o acesso operacional deve respeitar a matriz de permissoes por usuario
- o recorte de obras deve respeitar as obras disponiveis ao usuario
- a criacao de provisao exige obra, data prevista, item macro, descricao e valor previsto
- anexos podem ser selecionados na criacao e enviados automaticamente apos salvar a provisao
- comentarios ficam concentrados no detalhe da provisao
- a trilha historica deve registrar criacao, edicao, anexos e comentarios
- o dashboard e a lista nao devem expor dados fora do escopo de obra do usuario
- nesta fase, o modulo nao expõe workflow de aprovacao na UX

## Matriz granular atual

## Integracao futura com solicitacoes

- a integracao com solicitacoes nasce desligada e so deve ser ativada pelo SUPERADMIN;
- enquanto o modo estiver como `INFORMATIVO`, o provisionamento serve para registro e leitura gerencial;
- quando a integracao for ativada, o usuario deve escolher explicitamente a provisao correta;
- o vinculo real fica registrado em `solicitacao_provisao`;
- o sistema nao deve deduzir sozinho qual provisao pertence a uma solicitacao.

Permissoes registradas no sistema:

- `provisoes.lista.visualizar`
- `provisoes.cadastro.criar`
- `provisoes.cadastro.editar`
- `provisoes.dashboard.visualizar`
- `provisoes.categorias.gerenciar`

Regras vigentes:

- `SUPERADMIN` e `ADMINISTRADOR` continuam com bypass total
- usuarios comuns dependem das permissoes explicitamente configuradas
- o modulo so aparece quando `PROVISOES` estiver habilitado na instalacao
- o cadastro de categorias macro exige permissao propria
- o dashboard exige permissao propria

## Estrutura tecnica principal

- migration base: [202604120002_provisionamento_financeiro_base.js](C:/Projetos/sistema_gestao_solicitacoes/backend/migrations/202604120002_provisionamento_financeiro_base.js)
- migration de integracao futura: [202605230001_solicitacao_provisao_config.js](C:/Projetos/sistema_gestao_solicitacoes/backend/migrations/202605230001_solicitacao_provisao_config.js)
- service principal: [provisaoFinanceiraService.js](C:/Projetos/sistema_gestao_solicitacoes/backend/src/services/provisaoFinanceiraService.js)
- service de configuracao: [provisionamentoFluxoConfigService.js](C:/Projetos/sistema_gestao_solicitacoes/backend/src/services/provisionamentoFluxoConfigService.js)
- rotas: [routes.js](C:/Projetos/sistema_gestao_solicitacoes/backend/src/routes.js)
- servico frontend: [provisoesFinanceiras.js](C:/Projetos/sistema_gestao_solicitacoes/frontend/src/services/provisoesFinanceiras.js)

## Proximo passo natural

Se o produto evoluir essa frente, o caminho coerente e:

1. integrar provisoes ao financeiro central quando houver regra de materializacao
2. habilitar, quando aprovado pela diretoria, a exigencia de provisao por tipo de solicitacao
3. ampliar dashboards por periodo, obra e categoria
4. consolidar indicadores comparando previsto x realizado
