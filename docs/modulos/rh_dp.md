# Modulo - RH/DP

## Status

Blocos 1, 2, 3, 4, 5, 6, 7 e 8 implementados no codigo.

Ja entregue:

- chave de modulo `RH_DP`
- chave de modulo `INTEGRACAO_SIENGE`
- base de ocultacao de menu no frontend
- base de protecao de rotas no frontend
- base de protecao por modulo no backend
- paginas placeholder para marcar a area reservada
- dimensao `rh_empresas_grupo` para representar empresas operacionais do grupo dentro da instalacao
- base `rh_colaboradores`
- base `rh_colaborador_pagamentos`
- CRUD web inicial de empresas do grupo
- CRUD web inicial de colaboradores
- importacao inicial de colaboradores por planilha
- base `rh_documentos_tipos`
- base `rh_documentos`
- tipos padrao de documento por vinculo
- painel geral web de documentos RH/DP
- secao documental no detalhe do colaborador
- upload via S3/local fallback no padrao ja usado pelo produto
- links assinados para abertura segura dos arquivos
- substituicao com historico encadeado do documento
- resumo documental com checklist por vinculo, vencidos e obrigatorios pendentes
- instrucao explicita no cadastro do colaborador informando que o envio de documentos so libera apos o primeiro salvamento
- envio de documentos concentrado apenas na pagina de colaboradores para evitar duplicacao operacional
- base `rh_importacoes`
- base `rh_importacao_linhas`
- preview persistido de importacoes de jornada, evento variavel e desconto
- validacao por linha com colaborador, CPF ou matricula
- confirmacao explicita do lote antes de seguir para apuracao
- telas web de importacoes com modelos CSV, lista de lotes e detalhe do preview
- base `rh_apuracoes`
- base `rh_apuracao_eventos`
- geracao de apuracao por competencia usando apenas lotes `CONFIRMADA`
- consolidacao por colaborador de jornada, evento variavel e desconto
- separacao de regra de calculo entre `CLT` e `NAO_CLT`
- tela web de pre-folha com filtros, detalhe e ajustes manuais por item
- conferencia da apuracao com bloqueio enquanto existirem itens pendentes
- base `rh_fechamentos`
- base `rh_fechamento_titulos`
- fechamento da competencia com geracao central de titulos `PAGAR` no modulo `FINANCEIRO`
- pagina web de fechamentos RH/DP com detalhe do lote e link para os titulos financeiros gerados
- vinculo rastreavel entre item da apuracao, parceiro favorecido e `TituloFinanceiro`
- sincronizacao automatica do favorecido com o cadastro mestre `parceiros` para manter a camada financeira coerente
- fundacao operacional do modulo `INTEGRACAO_SIENGE` com configuracao local, prontidao, fila por `TituloFinanceiro`, logs e reprocessamento
- status da fila SIENGE visivel no detalhe do fechamento RH/DP por titulo gerado
- envio e reprocessamento direto do gateway SIENGE a partir do detalhe do fechamento, sem informar titulo manualmente
- leitura liberada para administracao da instalacao e usuarios com acesso financeiro
- escrita inicial restrita a `SUPERADMIN` e `ADMINISTRADOR`

Ainda nao entregue:

- cadastro definitivo de credor no SIENGE

## Objetivo

Centralizar a gestao operacional de colaboradores, documentos, importacoes, apuracao por competencia e fechamento do RH/DP dentro do FLUXY, sem criar um sistema paralelo fora do produto.

## Papel no produto

O RH/DP deve ser um modulo habilitavel por instalacao, seguindo o mesmo padrao de `COMERCIAL`, `FINANCEIRO`, `OBRAS` e demais modulos do FLUXY.

Quando estiver habilitado, deve cobrir:

- base de colaboradores
- empresas do grupo
- separacao de vinculos `CLT` e `NAO_CLT`
- dados de pagamento
- gestao documental por colaborador
- importacoes assistidas
- apuracao por competencia
- conferencia e fechamento
- geracao de obrigacoes financeiras internas

## Relacao com o Financeiro

O RH/DP nao deve criar um financeiro paralelo.

Fluxo correto:

1. RH/DP gera apuracao.
2. RH/DP fecha a competencia.
3. O fechamento gera obrigacoes rastreaveis para o modulo central `FINANCEIRO`.
4. O Financeiro continua sendo dono dos titulos, movimentos, baixa, estorno e auditoria financeira.

## Relacao com a Integracao SIENGE

O RH/DP nao deve falar diretamente com o SIENGE.

O modulo `INTEGRACAO_SIENGE` deve ser responsavel por:

- autenticacao
- fila
- envio
- log
- retry
- status operacional

Nesta fase, a fundacao desse gateway ja existe no produto, mas o mapeamento definitivo do payload e o cadastro de credor continuam como evolucao futura.

O RH/DP apenas produz dados financeiros elegiveis, e a integracao externa ocorre em camada separada.

## Regras-chave

- o modulo deve suportar multiplas empresas do grupo dentro da mesma instalacao
- `empresa_grupo_id` e `tipo_vinculo` sao obrigatorios no dominio
- calculo deve sempre respeitar o tipo de vinculo
- checklist documental pode variar por vinculo
- apuracao so pode consumir lotes `CONFIRMADA`
- apuracao `CONFERIDA` nao pode ser sobrescrita por nova geracao no mesmo recorte
- nenhuma competencia pode ser fechada com pendencias impeditivas
- fechamento depende do modulo `FINANCEIRO` habilitado, porque gera titulos centrais e nao obrigacoes paralelas
- downloads e visualizacao de documentos devem respeitar permissao e auditoria

## Matriz granular atual

O acesso ao RH/DP deixou de herdar o financeiro por regra ampla. A partir desta etapa, o modulo passa a obedecer capacidades granulares por usuario, sem criar perfil hardcoded novo para contabilidade.

Capacidades ativas no produto:

- `rh_dp_dashboard_view`
- `rh_dp_colaboradores_view`
- `rh_dp_colaboradores_edit`
- `rh_dp_documentos_view`
- `rh_dp_documentos_manage`
- `rh_dp_importacoes_execute`
- `rh_dp_apuracao_view`
- `rh_dp_apuracao_edit`
- `rh_dp_fechamento_execute`
- `rh_dp_obrigacoes_view`
- `integracao_sienge_view`
- `integracao_sienge_retry`
- `integracao_sienge_config_manage`

Regras vigentes:

- `SUPERADMIN` e `ADMINISTRADOR` continuam com bypass total
- `RH_DP` e `INTEGRACAO_SIENGE` seguem habilitacao por instalacao
- `ADMIN`, `USUARIO` e `FINANCEIRO` passam a depender de capacidade granular explicita
- a tela administrativa para montar a matriz por usuario fica em `Configuracoes -> Permissoes RH/DP e SIENGE`
- `Empresas do grupo` segue restrita a `SUPERADMIN` e `ADMINISTRADOR`
- `Fechamentos` dependem de `FINANCEIRO` habilitado e da capacidade `rh_dp_obrigacoes_view` ou `rh_dp_fechamento_execute`

## Dependencias esperadas

- `FINANCEIRO` para geracao central de titulos
- `INTEGRACAO_SIENGE` quando houver envio externo
- infraestrutura de arquivos do produto para documentos
- configuracao de modulos habilitados por instalacao

## Referencia principal

Ver o plano detalhado em:

- [PLANO_MODULO_RH_DP_E_INTEGRACAO_SIENGE.md](C:/Projetos/sistema_gestao_solicitacoes/docs/PLANO_MODULO_RH_DP_E_INTEGRACAO_SIENGE.md)
