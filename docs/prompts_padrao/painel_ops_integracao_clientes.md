# Prompt - Painel Ops e Integracao com Instalacoes de Clientes

## Objetivo

Este prompt deve ser usado em um novo chat com IA para desenhar e implementar o `Painel Ops FLUXY`, que sera o sistema interno de operacao, telemetria, controle comercial e acompanhamento das instalacoes de clientes do FLUXY.

O objetivo nao e mexer no produto do cliente de forma manual a cada nova empresa, e sim criar uma arquitetura que permita:

- acompanhar todas as empresas ativas
- controlar modulos habilitados por empresa
- medir usuarios cadastrados e acessos simultaneos
- monitorar storage e crescimento de uso
- sugerir upgrade de plano com base em concorrencia e custo
- manter o produto principal comercializavel sem virar uma operacao artesanal

## Contexto do Produto Atual

O FLUXY ja existe e esta em producao.

Stack atual:

- backend Node.js + Express + Sequelize + MySQL
- frontend React + Vite
- single-tenant por instalacao
- uma base de dados por cliente
- frontend hospedado na Vercel
- backend hospedado em AWS EC2 com PM2 + Nginx
- anexos em S3

O sistema atual ja possui:

- solicitacoes
- compras
- cotacoes
- pedidos de compra
- parceiros
- financeiro
- conciliacao OFX
- gestao de obras
- configuracao de modulos por instalacao
- perfis `SUPERADMIN` e `ADMINISTRADOR`

Decisoes ja fechadas:

- o produto do cliente continua single-tenant por instalacao
- o `SUPERADMIN` e um papel de suporte/operacao da plataforma
- o `ADMINISTRADOR` e o gestor interno da empresa cliente
- modulos podem ser habilitados e desabilitados por instalacao
- `cadastro basico de obras` faz parte do core
- `gestao de obras` e um modulo opcional

## Decisao Arquitetural Principal

O `Painel Ops FLUXY` deve ser um sistema separado do FLUXY do cliente.

Ele nao deve ficar dentro de uma instalacao de cliente.

Ele sera o `control plane` da operacao, enquanto cada FLUXY de cliente continua sendo o `application plane`.

## Resposta Objetiva Sobre GitHub e Vercel

### GitHub

Nem toda instalacao de cliente deve virar um repositorio proprio no GitHub.

Recomendacao:

- manter **um repositorio principal do produto** como fonte canonica do FLUXY
- criar **um repositorio separado para o Painel Ops**
- evitar um repo por cliente enquanto a instalacao puder ser resolvida por:
  - variaveis de ambiente
  - configuracao da instalacao
  - modulos habilitados
  - dominio
  - banco proprio

So criar fork, branch permanente ou repo separado por cliente quando existir:

- customizacao de codigo exclusiva
- obrigacao contratual de isolamento de codigo
- stack ou ciclo de release diferente do produto padrao

### Vercel

Para o frontend, o mais recomendado e **um projeto Vercel por instalacao de cliente**.

Motivos:

- dominio proprio por cliente
- variaveis de ambiente isoladas
- rollback isolado
- observabilidade separada
- menor risco operacional

Entao:

- **um unico repo do frontend pode gerar varios projetos na Vercel**
- **nao precisa um repo GitHub por cliente para isso**

### Backend

Para o backend, cada cliente deve ter:

- instalacao propria
- `.env` proprio
- banco proprio
- storage proprio ou prefixo proprio
- endpoint proprio

Isso pode ser em:

- processo PM2 separado
- container separado
- service separado

## Estrutura Recomendada de Repositorios

### 1. Produto principal

Repositorio atual:

- `fluxy-core`

Responsavel por:

- backend do cliente
- frontend do cliente
- modulos do produto
- documentacao funcional e tecnica

### 2. Painel Ops

Novo repositorio:

- `fluxy-ops`

Responsavel por:

- cadastro de empresas
- acompanhamento de instalacoes
- monitoramento de uso
- configuracao de plano
- historico de excedencia
- storage por empresa
- observacoes comerciais e operacionais

## Objetivo do Painel Ops

O Painel Ops precisa permitir:

- ver todas as empresas ativas
- saber quais modulos estao habilitados por empresa
- saber qual plano cada empresa usa
- controlar usuarios cadastrados
- controlar usuarios simultaneos
- medir pico de simultaneidade
- medir banco em GB
- medir anexos em GB
- estimar custo por empresa
- detectar crescimento fora do esperado
- recomendar upgrade de plano

## Regra Comercial Importante

Nao cobrar por usuario cadastrado.

Cobrar por:

- plano base
- modulos habilitados
- volume de acesso simultaneo
- eventualmente faixa de storage

Regra sugerida:

- cada plano possui `limite_simultaneo`
- quando a empresa ultrapassar esse limite por um numero recorrente de janelas no mes, marcar `upgrade_sugerido`
- nao fazer aumento automatico sem regra contratual clara

## O que Deve Ser Automatico

Cada instalacao do FLUXY deve enviar para o Painel Ops, automaticamente:

- empresa
- instalacao
- versao backend
- versao frontend
- modulos habilitados
- usuarios cadastrados
- usuarios ativos 30 dias
- simultaneos atuais
- pico diario
- pico mensal
- excedencias do mes
- total de solicitacoes
- total de titulos
- total de pedidos
- total de parceiros
- tamanho logico do banco
- tamanho de anexos
- ultima atividade
- status de saude

## O que Pode Continuar Manual

No Painel Ops, apenas dados comerciais e administrativos:

- responsavel comercial
- observacoes
- status de cobranca
- renovacao
- excecoes de contrato
- limite negociado manualmente

## Modelo de Dados Sugerido para o Painel Ops

Criar pelo menos estas entidades:

### `empresas`

- id
- nome_fantasia
- razao_social
- cnpj
- slug
- dominio_principal
- status
- data_ativacao

### `instalacoes`

- id
- empresa_id
- ambiente
- api_url
- frontend_url
- versao_backend
- versao_frontend
- ultimo_heartbeat
- status_saude

### `planos`

- id
- nome
- limite_simultaneo
- limite_storage_gb
- valor_base
- descricao

### `empresa_planos`

- id
- empresa_id
- plano_id
- limite_simultaneo_override
- limite_storage_override_gb
- upgrade_sugerido
- motivo_upgrade

### `empresa_modulos`

- id
- empresa_id
- modulo
- habilitado

### `usuarios_metricas`

- id
- empresa_id
- usuarios_cadastrados
- usuarios_ativos_30d
- data_referencia

### `concorrencia_metricas`

- id
- empresa_id
- simultaneos_atual
- pico_dia
- pico_mes
- excedencias_mes
- data_referencia

### `uso_armazenamento`

- id
- empresa_id
- banco_gb
- anexos_gb
- total_gb
- custo_estimado
- data_referencia

### `uso_operacional`

- id
- empresa_id
- solicitacoes_total
- titulos_total
- pedidos_total
- parceiros_total
- data_referencia

### `eventos_ops`

- id
- empresa_id
- tipo_evento
- severidade
- mensagem
- payload_json
- criado_em

### `observacoes_comerciais`

- id
- empresa_id
- tipo
- texto
- usuario_ops
- criado_em

## Integracao Entre Instalacao do Cliente e Painel Ops

Usar estrategia `push`.

Cada backend do cliente deve enviar metricas para o Painel Ops.

Rotas sugeridas no Painel Ops:

- `POST /ops/heartbeat`
- `POST /ops/metricas/uso`
- `POST /ops/metricas/concorrencia`
- `POST /ops/metricas/storage`

Autenticacao sugerida:

- `OPS_CLIENT_ID`
- `OPS_API_KEY`
- envio por header

## Variaveis de Ambiente Sugeridas no FLUXY Cliente

Adicionar no backend do FLUXY cliente:

- `OPS_ENABLED=true|false`
- `OPS_BASE_URL`
- `OPS_CLIENT_ID`
- `OPS_API_KEY`
- `OPS_HEARTBEAT_MINUTES=5`
- `OPS_METRICS_CRON=*/15 * * * *`

## Medicao de Simultaneidade

Implementar sessao ativa real.

Regras recomendadas:

- login cria sessao
- frontend envia heartbeat periodico
- backend considera online se houve heartbeat nos ultimos 3 minutos
- varias abas do mesmo usuario nao devem contar como usuarios distintos sem controle
- guardar pico diario e pico mensal
- registrar excedencias

## Medicao de Storage

Separar:

- `banco_gb`
- `anexos_gb`
- `total_gb`

Fontes:

- MySQL por schema da empresa
- S3 por bucket ou prefixo da empresa

## Estrategia de AWS

No inicio, pode ficar tudo na mesma conta AWS.

Padrao recomendado nesta fase:

- uma conta AWS
- uma instalacao por cliente
- tags obrigatorias:
  - `client_id`
  - `client_name`
  - `product=fluxy`
  - `environment`
  - `plan`

Mais para frente, migrar para estrategia multi-account se:

- houver crescimento forte
- houver clientes maiores
- houver necessidade contratual de isolamento

## Escopo do Trabalho para a IA

Quero que voce desenhe e implemente a base do `Painel Ops FLUXY` e a integracao com as instalacoes de clientes.

### Objetivos tecnicos

1. Criar a arquitetura do `Painel Ops` como sistema separado.
2. Definir o modelo de dados.
3. Criar os models, migrations, controllers, services e rotas.
4. Criar a autenticacao entre o FLUXY cliente e o Painel Ops.
5. Criar as rotas de telemetria.
6. Implementar no backend do FLUXY cliente o envio automatico das metricas.
7. Implementar medicao de simultaneidade por sessao ativa.
8. Implementar coleta de storage logico.
9. Criar telas no Painel Ops para listar empresas, planos, modulos, uso e alertas.
10. Documentar o processo completo.

### Regras obrigatorias

- o Painel Ops e separado do sistema do cliente
- o backend continua sendo a autoridade
- nao quebrar o modelo single-tenant do produto principal
- modulos continuam sendo habilitados por instalacao
- evitar acoplamento forte entre o produto do cliente e o Painel Ops
- toda integracao deve ser resiliente a falhas temporarias do Painel Ops
- se o Painel Ops cair, o FLUXY do cliente deve continuar operando normalmente

### O que nao fazer

- nao transformar o FLUXY do cliente em multi-tenant agora
- nao exigir preenchimento manual de metricas operacionais
- nao criar um repo por cliente sem necessidade real
- nao depender da Vercel para armazenar estado do Painel Ops

### Entregaveis esperados

- desenho arquitetural
- backlog por fases
- estrutura de banco
- payloads de integracao
- regras de concorrencia
- regras de upgrade sugerido
- plano de deploy
- estrategia GitHub + Vercel + AWS por cliente
- documentacao operacional

## Estrategia Recomendada de Deploy por Cliente

### Produto

- um repo principal do FLUXY
- um repo separado do Painel Ops

### Frontend cliente

- um projeto Vercel por cliente
- dominio proprio por cliente
- variaveis de ambiente por cliente

### Backend cliente

- instalacao separada por cliente
- processo separado
- `.env` separado
- banco separado

### Banco

- uma base de dados por cliente

### Storage

- um bucket por cliente ou prefixo isolado por cliente

## Pergunta de validacao que a IA deve responder

Ao final, a IA deve deixar claro:

1. o que fica no repo `fluxy-core`
2. o que fica no repo `fluxy-ops`
3. o que e automatico
4. o que e manual
5. como cada cliente sera implantado sem duplicar codigo desnecessariamente

## Observacao Final

Se houver duvida entre:

- um repo por cliente
- ou um produto central com multiplas instalacoes

preferir:

- **um produto central**
- **varias instalacoes**
- **um projeto Vercel por cliente**
- **um backend por cliente**
- **um banco por cliente**

e evitar duplicacao de repositorio enquanto a personalizacao puder ser resolvida por configuracao.
