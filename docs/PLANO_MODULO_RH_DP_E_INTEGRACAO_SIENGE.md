# Plano - Modulo RH/DP e Integracao SIENGE

## Objetivo

Planejar a implementacao do modulo `RH_DP` e do modulo `INTEGRACAO_SIENGE` no `sistema_gestao_solicitacoes` sem quebrar os fluxos atuais do produto, mantendo:

- backend como fonte da verdade
- modularidade por instalacao
- financeiro como motor central de titulos
- separacao de responsabilidades entre dominio funcional e integracao externa
- rastreabilidade, auditoria e seguranca desde a base

O objetivo da primeira linha de entrega e substituir planilhas soltas e documentos dispersos por um fluxo estruturado de:

- base de colaboradores
- pasta documental digital
- importacoes assistidas
- apuracao por competencia
- conferencia e fechamento
- geracao de obrigacoes financeiras internas
- envio opcional ao SIENGE via modulo tecnico separado

## Alinhamento com o desenho atual do FLUXY

Este plano precisa respeitar o modelo real ja usado hoje no produto:

- `fluxy-core` e single-tenant por instalacao
- modulos sao habilitados ou desabilitados por instalacao
- `fluxy_ops` e o control plane do provedor
- `SUPERADMIN` governa a habilitacao inicial conforme contrato
- o modulo `FINANCEIRO` continua como motor central de titulos, movimentos, baixa, estorno e auditoria
- integracoes externas nao devem contaminar a regra central dos modulos

Consequencia pratica:

- `RH_DP` deve ser um modulo habilitavel por instalacao
- `INTEGRACAO_SIENGE` deve ser um modulo habilitavel por instalacao
- o RH/DP pode operar varias empresas do grupo dentro da mesma instalacao
- a contratacao do modulo continua sendo no nivel da instalacao, e nao no nivel de empresa interna
- mesmo quando `INTEGRACAO_SIENGE` estiver habilitado, automacoes de credor devem ser opt-in por configuracao da instalacao

## Escopo funcional do RH/DP

O modulo RH/DP deve nascer como um dominio proprio no produto, cobrindo:

- cadastro centralizado de colaboradores
- separacao de vinculos `CLT` e `NAO_CLT`
- dados de pagamento
- gestao documental por colaborador
- importacao de colaboradores
- importacao de jornadas, eventos e descontos
- apuracao por competencia
- conferencia e ajustes auditados
- fechamento da competencia
- geracao de obrigacoes internas para o financeiro

## Escopo funcional da Integracao SIENGE

O modulo `INTEGRACAO_SIENGE` deve nascer como gateway tecnico compartilhado, apto a ser consumido pelo RH/DP e pelo Financeiro.

Ele deve cobrir:

- configuracao da integracao na instalacao
- autenticacao
- fila de envio
- persistencia de payload e resposta
- logs e erros
- reprocessamento
- status operacional da integracao

## O que os arquivos externos do SIENGE representam

Os arquivos externos enviados como referencia sao apenas modelos funcionais de fluxo.

Eles ajudam a entender:

- configuracao da API
- autenticacao
- importacao de planilha
- envio de titulos
- log operacional

Eles nao devem ser portados literalmente para o FLUXY.

No FLUXY, a implementacao deve ser:

- backend-first
- persistida em banco
- protegida por modulo e permissao
- auditavel
- integrada ao padrao atual de Node.js + Express + Sequelize + MySQL + React

## Decisoes arquiteturais obrigatorias

### 1. RH/DP nao fala diretamente com o SIENGE

Fluxo correto:

1. RH/DP gera apuracoes e fecha a competencia.
2. O fechamento gera obrigacoes financeiras internas.
3. O Financeiro cria ou vincula os titulos centrais.
4. A Integracao SIENGE consome os titulos elegiveis e executa o envio externo.

### 2. O Financeiro continua sendo o motor central

O RH/DP nao deve criar um "financeiro paralelo".

Ele deve gerar metadados e origem financeira estruturada para o modulo central de titulos.

### 3. O cadastro de credor no SIENGE fica preparado, mas nao fechado agora

Nesta fase, a integracao deve ser preparada para evoluir depois com:

- `external_creditor_id`
- `external_title_id`
- `payload_snapshot`
- `response_snapshot`
- `integration_status`
- `last_error`

Mas sem engessar desde ja uma implementacao fixa de cadastro de credor.

### 4. O modulo precisa nascer invisivel quando desligado

Se `RH_DP` estiver desligado:

- nao aparece no menu
- rotas nao ficam acessiveis
- paginas nao devem carregar
- jobs e servicos especificos nao devem rodar

O mesmo vale para `INTEGRACAO_SIENGE`.

## Modelo de dados recomendado

### RH/DP

- `rh_colaboradores`
- `rh_colaborador_pagamentos`
- `rh_documentos_tipos`
- `rh_documentos`
- `rh_importacoes`
- `rh_importacao_linhas`
- `rh_regras_apuracao`
- `rh_apuracoes`
- `rh_apuracao_eventos`
- `rh_fechamentos`
- `rh_fechamento_itens`
- `rh_auditoria`

### Integracao com Financeiro

- `rh_fechamento_titulos`
  - vinculo entre item fechado de RH/DP e `TituloFinanceiro`
  - evita criar motor financeiro paralelo

### Integracao SIENGE

- `integracao_sienge_config`
- `integracao_sienge_fila`
- `integracao_sienge_logs`
- `integracao_sienge_mapeamentos`

## Regras de negocio centrais

1. Todo colaborador deve possuir `empresa_id` e `tipo_vinculo`.
2. A empresa do grupo e obrigatoria no dominio RH/DP.
3. O tipo de vinculo deve ser tratado como variavel critica do calculo.
4. O checklist documental deve poder variar por tipo de vinculo.
5. Nenhuma competencia deve fechar sem:
   - empresa definida
   - tipo de vinculo definido
   - dados minimos de pagamento
   - validacoes impeditivas resolvidas
6. O fechamento deve congelar os dados da competencia.
7. Integracao externa so pode ocorrer sobre registros fechados.
8. Falha no SIENGE nao pode invalidar o fechamento do RH/DP nem quebrar o Financeiro.
9. Cadastro automatico de credor no SIENGE nunca deve ser presumido; deve depender de configuracao explicita da instalacao e permanecer desligado por padrao.
10. Sempre que houver automacao de cadastro de credor, o gateway deve tentar evitar duplicidade primeiro por busca exata antes de executar `POST /creditors`.

## Permissoes e modelo de acesso

O modulo nao deve depender de um novo perfil fixo chamado `CONTABILIDADE`.

Recomendacao:

- manter os perfis oficiais do produto
- adicionar capacidades granulares dentro do modulo
- permitir que o `ADMINISTRADOR` monte usuarios de RH ou contabilidade com o escopo exato necessario

Capacidades recomendadas:

- `rh_dp_dashboard_view`
- `rh_dp_colaboradores_view`
- `rh_dp_colaboradores_edit`
- `rh_dp_documentos_view`
- `rh_dp_documentos_manage`
- `rh_dp_importacoes_execute`
- `rh_dp_apuracao_view`
- `rh_dp_apuracao_edit`
- `rh_dp_fechamento_execute`
- `rh_dp_fechamento_reopen`
- `rh_dp_obrigacoes_view`
- `integracao_sienge_view`
- `integracao_sienge_retry`
- `integracao_sienge_config_manage`

Isso permite, por exemplo:

- usuario de RH com acesso total ao modulo
- usuario de contabilidade com leitura de apuracoes, obrigacoes e fila do SIENGE
- usuario de contabilidade com permissao de reprocessar fila, mas sem editar colaboradores

## Blocos de implementacao

## Progresso atual dos blocos

Blocos implementados no codigo:

- bloco 1: fundacao modular e chaves de modulo
- bloco 2: base de empresas do grupo, colaboradores e pagamentos
- bloco 3: documentos por colaborador
- bloco 4: importacoes operacionais
- bloco 5: apuracao por competencia
- bloco 6: fechamento com geracao central de `TituloFinanceiro`
- bloco 7: fundacao tecnica da `INTEGRACAO_SIENGE`
- bloco 8: consumo operacional da fila SIENGE a partir do `FINANCEIRO` e do `RH_DP`, sem exigir digitacao manual de `titulo_financeiro_id`
- bloco 9: matriz granular de permissoes para RH, contabilidade e operacao da Integracao SIENGE

Estado atual do bloco 9:

- configuracao persistida por usuario em `ConfiguracaoSistema`
- sessao autenticada agora recebe capacidades granulares de `RH_DP` e `INTEGRACAO_SIENGE`
- rotas backend do RH/DP e do gateway SIENGE passaram a validar capacidade por acao
- frontend passou a esconder menus, rotas, botoes e acoes operacionais conforme a capacidade recebida
- `Empresas do grupo` continua administrativa e permanece restrita a `SUPERADMIN` e `ADMINISTRADOR`
- equipe de contabilidade pode ser montada com perfil base do produto mais capacidades especificas, sem novo perfil textual hardcoded

### Bloco 0 - alinhamento e inventario seguro

Objetivo:

- registrar o modulo oficialmente na documentacao
- inventariar pontos ja existentes com referencia a SIENGE no codigo atual
- garantir que a nova arquitetura nao reutilize de forma incorreta os campos antigos de integracao em compras

Entregas:

- documentacao do modulo RH/DP
- documentacao da Integracao SIENGE
- inventario tecnico dos pontos atuais de "numero_sienge" e "integrado_sienge"
- definicao de nomenclatura oficial das chaves de modulo

Criterio de aceite:

- nada no produto atual muda de comportamento
- o time sabe exatamente onde a nova camada nao deve interferir

### Bloco 1 - fundacao modular

Objetivo:

- criar a fundacao de modulos `RH_DP` e `INTEGRACAO_SIENGE`

Entregas:

- novas chaves no catalogo central de modulos
- protecao de rotas com `requireEnabledModule`
- helpers de acesso no frontend
- menu condicional
- documentacao do contrato de habilitacao por instalacao

Criterio de aceite:

- sistema continua operando igual com os modulos desligados
- backend sobe sem regressao
- frontend builda sem regressao

### Bloco 2 - base cadastral de colaboradores

Objetivo:

- criar a base de pessoas do modulo

Entregas:

- migrations de `rh_empresas_grupo`, `rh_colaboradores` e `rh_colaborador_pagamentos`
- models, services, validators e controllers
- telas web de listagem, detalhe e cadastro
- importacao inicial de colaboradores por planilha

Criterio de aceite:

- e possivel cadastrar e importar colaboradores com empresa, obra e tipo de vinculo

Status atual:

- implementado no codigo com permissao de leitura conservadora para administracao da instalacao e usuarios com acesso financeiro
- escrita inicial restrita a `SUPERADMIN` e `ADMINISTRADOR`

### Bloco 3 - gestao documental

Objetivo:

- resolver o problema documental sem depender ainda de apuracao

Entregas:

- tipos de documento
- upload via S3
- checklist por tipo de vinculo
- aba de documentos no detalhe do colaborador
- painel geral de documentos
- busca por nome, CPF e matricula
- filtros server-side e paginacao
- URLs assinadas

Criterio de aceite:

- usuario autorizado localiza rapidamente os documentos de um colaborador e ve pendencias e vencimentos

Status atual:

- implementado no codigo com:
  - `rh_documentos_tipos` e `rh_documentos`
  - tipos padrao de documento por vinculo
  - painel geral de documentos RH/DP no frontend
  - secao documental no detalhe do colaborador
  - busca server-side por colaborador, CPF, matricula, arquivo e observacao
  - filtros por empresa, obra, vinculo, tipo, status e validade
  - links assinados para abertura segura
  - substituicao com historico encadeado

### Bloco 4 - importacoes operacionais

Objetivo:

- transformar planilhas em fluxo controlado

Entregas:

- templates de importacao
- upload e validacao de jornadas
- upload e validacao de eventos e descontos
- preview de importacao
- log de erros por linha
- confirmacao explicita

Criterio de aceite:

- importacoes deixam rastreabilidade e nao alteram dados sem confirmacao

Status atual:

- implementado no codigo com:
  - `rh_importacoes` e `rh_importacao_linhas`
  - suporte a `JORNADA`, `EVENTO_VARIAVEL` e `DESCONTO`
  - preview persistido no backend
  - validacao por linha com colaborador resolvido por CPF ou matricula
  - confirmacao explicita do lote
  - modelos CSV locais no frontend
  - tela operacional de importacoes com detalhe do preview e erros

### Bloco 5 - apuracao por competencia

Objetivo:

- gerar pre-folha estruturada

Entregas:

- regras de apuracao por tipo de vinculo
- apuracao por competencia, empresa, obra e vinculo
- cards de resumo
- tela de conferencia
- ajustes manuais auditados

Criterio de aceite:

- competencia pode ficar em rascunho e ser revisada antes do fechamento

Status atual:

- implementado no codigo
- usa `rh_apuracoes` e `rh_apuracao_eventos`
- conserva o desenho de gerar rascunho, ajustar item a item e marcar como `CONFERIDA`
- bloqueia nova geracao no mesmo recorte quando ja existe apuracao `CONFERIDA`

### Bloco 6 - fechamento e geracao de titulos centrais

Objetivo:

- fechar a competencia sem criar motor financeiro paralelo

Entregas:

- validacoes impeditivas
- congelamento da competencia
- vinculo entre fechamento e titulos financeiros centrais
- metadados de origem `RH_DP` nos titulos gerados
- tela de obrigacoes geradas

Criterio de aceite:

- competencia fechada gera obrigacoes financeiras rastreaveis usando o modulo central do Financeiro

Status atual:

- implementado no codigo
- usa `rh_fechamentos` e `rh_fechamento_titulos`
- o fechamento so e permitido para apuracao `CONFERIDA` sem fechamento previo
- cada item elegivel gera um `TituloFinanceiro` do tipo `PAGAR`
- o favorecido do colaborador e sincronizado com `parceiros` para manter aderencia ao motor financeiro existente
- o frontend ganhou formulario de fechamento dentro da apuracao e tela dedicada de fechamentos RH/DP
- o fechamento depende explicitamente do modulo `FINANCEIRO` habilitado na instalacao

### Bloco 7 - fundacao da Integracao SIENGE

Objetivo:

- criar o gateway tecnico compartilhado

Entregas:

- tabelas de configuracao, fila, logs e mapeamentos
- service de autenticacao
- service de montagem de payload
- service de envio
- fila de reprocessamento
- tela administrativa de configuracao
- tela de fila e erros

Criterio de aceite:

- o sistema consegue enfileirar e processar titulos elegiveis, mantendo log e status

Status atual:

- implementado no codigo com configuracao local da instalacao, leitura de prontidao, fila por `TituloFinanceiro`, logs, reprocessamento e envio tecnico via backend
- o cadastro definitivo de credor e o payload homologado continuam para a proxima fase

### Bloco 8 - consumo da integracao por RH/DP e Financeiro

Objetivo:

- expor a visao operacional da integracao sem acoplar modulos

Entregas:

- tela de status de integracao dentro do RH/DP para leitura
- integracao com telas do Financeiro para reenvio e auditoria
- filtros por competencia, empresa, status e origem

Criterio de aceite:

- RH/DP enxerga o resultado do envio
- Financeiro opera a fila tecnica

### Bloco 9 - hardening e piloto

Objetivo:

- deixar o modulo pronto para piloto controlado

Entregas:

- revisao final de permissao
- auditoria de exportacoes e downloads
- documentacao de implantacao do modulo
- documentacao de configuracao da integracao
- registro de riscos residuais

Criterio de aceite:

- modulo apto a ser ligado em instalacao piloto sem afetar os demais fluxos

## Ordem recomendada de execucao

1. Bloco 0
2. Bloco 1
3. Bloco 2
4. Bloco 3
5. Bloco 4
6. Bloco 5
7. Bloco 6
8. Bloco 7
9. Bloco 8
10. Bloco 9

## O que nao deve ser feito agora

- criar `CNAB240` dentro do FLUXY
- copiar a interface HTML standalone para o produto
- depender de proxy local no navegador
- amarrar a integracao SIENGE apenas ao RH/DP
- fechar desde ja o cadastro de credor sem definicao funcional da operacao
- criar um perfil fixo `CONTABILIDADE` hardcoded no sistema

## Onde os dados de conexao do SIENGE entram depois

### Backend `.env`

Para segredos tecnicos globais, por exemplo:

- `SIENGE_API_BASE_URL`
- `SIENGE_API_HOST`
- `SIENGE_API_SUBDOMAIN`
- `SIENGE_API_BASE_PATH`
- `SIENGE_ENDPOINT_TITULOS`
- `SIENGE_ENDPOINT_CREDORES`
- `SIENGE_ENDPOINT_CREDOR_DETALHE`
- `SIENGE_ENDPOINT_CREDOR_BANK_INFORMATIONS`
- `SIENGE_ENDPOINT_CREDOR_PIX_INFORMATIONS`
- `SIENGE_USERNAME`
- `SIENGE_PASSWORD`
- `SIENGE_REQUEST_TIMEOUT_MS`

Regra de precedencia recomendada:

1. override local salvo na configuracao da instalacao
2. `SIENGE_API_BASE_URL`
3. composicao por `SIENGE_API_HOST` + `SIENGE_API_SUBDOMAIN` + `SIENGE_API_BASE_PATH`

Exemplo de composicao para o recurso de credores:

- base composta: `https://api.sienge.com.br/constsulcapixaba/public/api/v1`
- endpoint de credores: `creditors`
- url final: `https://api.sienge.com.br/constsulcapixaba/public/api/v1/creditors`

Endpoints confirmados para a futura fase de credores:

- `GET /creditors`
- `POST /creditors`
- `GET /creditors/{creditorId}`
- `PATCH /creditors/{creditorId}`
- `POST /creditors/{creditorId}/bank-informations`
- `GET /creditors/{creditorId}/bank-informations`
- `POST /creditors/{creditorId}/pix-informations`
- `GET /creditors/{creditorId}/pix-informations`

No desenho do FLUXY, `creditorId` deve ser persistido como identificador externo do SIENGE e vinculado ao cadastro mestre interno via mapeamento tecnico.

Fundacao ja aberta no codigo:

- contexto tecnico por parceiro para avaliar prontidao de credor
- vinculacao manual do `external_creditor_id` por parceiro
- propagacao do `external_creditor_id` conhecido para a fila e para o payload do gateway
- busca operacional no SIENGE por `GET /creditors`, com paginação e matching exato controlado
- vinculo automatico apenas quando houver correspondencia unica e confiavel

### Banco de dados

Para configuracao funcional da instalacao:

- se a integracao esta ativa
- defaults de payload
- regras locais da instalacao
- retries e comportamentos de fila

O frontend nao deve receber segredo tecnico do SIENGE.

## Resumo executivo

O caminho seguro para o FLUXY e:

- `RH_DP` como modulo funcional do `fluxy-core`
- `INTEGRACAO_SIENGE` como modulo tecnico compartilhado
- `FINANCEIRO` como motor central de titulos
- `fluxy_ops` como control plane da habilitacao por instalacao

Isso preserva o padrao atual do produto, reduz risco de regressao e mantem a arquitetura pronta para crescimento futuro.
