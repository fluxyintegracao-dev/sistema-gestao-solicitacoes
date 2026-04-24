# Modulo - Integracao SIENGE

## Status

Blocos 7 e 8 implementados no codigo.

Ja entregue:

- chave de modulo `INTEGRACAO_SIENGE`
- protecao de rotas por instalacao no backend
- regra de acesso propria no backend e no frontend
- base `sienge_integracao_config`
- base `sienge_integracao_fila`
- base `sienge_integracao_logs`
- base `sienge_integracao_mapeamentos`
- tela web de configuracao local da instalacao
- avaliacao de prontidao tecnica da integracao
- fila persistida por `TituloFinanceiro`
- payload snapshot auditavel por item da fila
- logs de preparacao e envio
- reprocessamento manual da fila
- envio tecnico via backend com autenticacao por `Bearer` ou `Basic`, usando variaveis do `backend/.env`
- exposicao do status da fila SIENGE dentro do detalhe e da listagem do `FINANCEIRO`
- operacao direta da fila a partir do detalhe do titulo financeiro, sem informar `titulo_financeiro_id` manualmente
- exposicao do status da fila SIENGE no detalhe dos fechamentos do `RH_DP`
- envio e reprocessamento direto de titulos gerados pelo fechamento do RH/DP
- fundacao de mapeamento local do `creditorId` do SIENGE por parceiro interno
- rotas de contexto e vinculacao manual de credor por parceiro
- sincronizacao do `external_creditor_id` conhecido para o payload e para a fila de envio
- busca operacional de credor no SIENGE via `GET /creditors`, com paginacao controlada e matching exato por documento/nome
- vinculo automatico opcional somente quando houver match exato unico
- tela administrativa inicial para pesquisar parceiro interno, consultar candidatos no SIENGE e gravar `creditorId`
- politica de automacao de credor por instalacao, desligada por padrao
- auto vinculacao opcional por busca exata antes de preparar/enviar a fila, quando a configuracao permitir
- `POST /creditors` manual a partir do parceiro interno, com persistencia do `external_creditor_id`
- criacao automatica opcional de credor antes do envio do titulo, somente quando a instalacao habilitar esse comportamento

Ainda nao entregue:

- cadastro definitivo de credor no SIENGE
- mapeamento final homologado do payload de contas a pagar
- reprocessamento em lote
- regras especificas por cliente ou convenio

## Objetivo

Ser o gateway tecnico compartilhado do FLUXY para integracoes financeiras com o SIENGE, sem acoplar RH/DP, Financeiro ou outros modulos diretamente a uma API externa.

## Papel no produto

Fluxo correto:

1. O modulo funcional gera ou atualiza o `TituloFinanceiro` central.
2. A Integracao SIENGE prepara o payload e registra a fila.
3. O envio externo e os logs ficam isolados na camada tecnica.
4. Falhas externas nao quebram o fluxo central do produto.

## Escopo atual

Nesta fase, a integracao trabalha sobre titulos financeiros centrais e prepara ou envia apenas titulos `PAGAR` elegiveis.

O modulo cobre:

- configuracao local da instalacao
- leitura de prontidao
- preparo de fila por `titulo_financeiro_id`
- persistencia de payload e resposta
- logs operacionais
- reprocessamento
- consumo operacional da fila diretamente pelas telas de `FINANCEIRO` e `RH_DP`

## Variaveis de ambiente previstas

Adicionar no `backend/.env` quando a instalacao estiver pronta para testes reais:

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
- `SIENGE_TOKEN`
- `SIENGE_REQUEST_TIMEOUT_MS`

Regras:

- `SIENGE_API_BASE_URL` pode definir a base tecnica pronta
- se `SIENGE_API_BASE_URL` nao for informada, o backend monta a base com `SIENGE_API_HOST` + `SIENGE_API_SUBDOMAIN` + `SIENGE_API_BASE_PATH`
- `SIENGE_ENDPOINT_TITULOS` pode definir o endpoint padrao de envio de titulos no ambiente
- `SIENGE_ENDPOINT_CREDORES` fica reservado para busca e inclusao de credores
- `SIENGE_ENDPOINT_CREDOR_DETALHE` fica reservado para consulta e atualizacao de um credor especifico
- `SIENGE_ENDPOINT_CREDOR_BANK_INFORMATIONS` fica reservado para dados bancarios do credor
- `SIENGE_ENDPOINT_CREDOR_PIX_INFORMATIONS` fica reservado para dados PIX do credor
- `SIENGE_USERNAME` + `SIENGE_PASSWORD` habilitam autenticacao `Basic`
- `SIENGE_TOKEN` habilita autenticacao `Bearer`
- a tela do modulo pode fazer override local de `base_url` e `endpoint_titulos` quando uma instalacao precisar fugir do padrao
- a ordem de precedencia atual e: override local -> `.env` explicito -> `.env` composto
- a automacao de credor e sempre opcional por instalacao
- `auto_vincular_credor_busca_exata` pode tentar localizar e vincular automaticamente um credor ja existente no SIENGE
- `auto_cadastrar_credor_quando_ausente` pode tentar cadastrar o credor via `POST /creditors` antes do envio do titulo, mas permanece desligado por padrao

## Payload de credor no estado atual

Como o schema detalhado do `POST /creditors` e parcialmente dinamico na documentacao publica, o FLUXY trabalha com duas camadas:

- `siengeCredorTemplate` em `payload_defaults`
- `siengeCredorDefaults` em `payload_defaults`

O gateway resolve placeholders do parceiro interno dentro do template. Exemplo de estrutura suportada:

```json
{
  "siengeCredorTemplate": {
    "name": "{{parceiro.nome}}",
    "cpfCnpj": "{{parceiro.cpf_cnpj_numeros}}",
    "municipalityId": 12345,
    "address": "{{parceiro.endereco}}",
    "number": "{{parceiro.numero}}",
    "district": "{{parceiro.bairro}}",
    "zipCode": "{{parceiro.cep_numeros}}",
    "email": "{{parceiro.email}}"
  }
}
```

Validacao minima atual no gateway antes de tentar o `POST /creditors`:

- `name`
- algum campo de documento entre `cpfCnpj`, `documentNumber`, `document` ou `taxNumber`
- `municipalityId` ou equivalente configurado no payload final

## Endpoints oficiais mapeados para a proxima fase

Com base na documentacao operacional confirmada para o ambiente SIENGE:

- `GET /creditors`
- `POST /creditors`
- `GET /creditors/{creditorId}`
- `PATCH /creditors/{creditorId}`
- `POST /creditors/{creditorId}/bank-informations`
- `GET /creditors/{creditorId}/bank-informations`
- `POST /creditors/{creditorId}/pix-informations`
- `GET /creditors/{creditorId}/pix-informations`

No FLUXY, `creditorId` deve ser tratado como identificador externo do credor no SIENGE, vinculado ao cadastro interno por tabela de mapeamento, nunca como campo hardcoded.

## Regras-chave

- a integracao nao cria um titulo paralelo
- a fila sempre aponta para o `TituloFinanceiro` central
- falha de envio nao invalida o titulo financeiro nem o fechamento de RH/DP
- a integracao nao deve depender de HTML standalone ou proxy local
- o envio real depende de configuracao ativa, endpoint definido e credenciais validas no `backend/.env`
- nesta fase, a auto vinculacao por busca exata ja pode ser habilitada por instalacao
- o cadastro automatico de credor agora existe como capacidade opcional da instalacao e nao deve ser presumido como ativo so porque o modulo SIENGE foi contratado
- `creditorId` e sempre tratado como identificador externo do SIENGE vinculado ao `Parceiro` interno por tabela tecnica de mapeamento

## Rotas tecnicas ja abertas para a fase de credores

- `GET /integracoes/sienge/credores/parceiros/:parceiroId/contexto`
- `POST /integracoes/sienge/credores/parceiros/:parceiroId/buscar`
- `POST /integracoes/sienge/credores/parceiros/:parceiroId/cadastrar`
- `PATCH /integracoes/sienge/credores/parceiros/:parceiroId/mapeamento`

Essas rotas ainda nao finalizam o cadastro de credor no SIENGE. Elas servem para:

- avaliar se o parceiro interno tem dados minimos para busca ou vinculacao
- consultar `GET /creditors` no SIENGE com paginação e matching controlado
- visualizar o catalogo efetivo de endpoints de credor
- persistir manualmente o `external_creditor_id` quando ele ja for conhecido

## Relacao com RH/DP e Financeiro

- `RH_DP` produz fechamentos e gera titulos `PAGAR` no financeiro central
- `FINANCEIRO` continua sendo dono do titulo, baixa, estorno e auditoria
- `INTEGRACAO_SIENGE` consome o titulo financeiro central, nao a apuracao crua do RH/DP
- a visibilidade do gateway e das colunas de status no `FINANCEIRO` e no `RH_DP` depende de capacidades granulares por usuario
- reprocessamento e envio manual de fila dependem da capacidade `integracao_sienge_retry`
- alteracao de endpoint e defaults locais depende da capacidade `integracao_sienge_config_manage` ou de bypass administrativo

## Referencia principal

Ver o plano detalhado em:

- [PLANO_MODULO_RH_DP_E_INTEGRACAO_SIENGE.md](C:/Projetos/sistema_gestao_solicitacoes/docs/PLANO_MODULO_RH_DP_E_INTEGRACAO_SIENGE.md)
