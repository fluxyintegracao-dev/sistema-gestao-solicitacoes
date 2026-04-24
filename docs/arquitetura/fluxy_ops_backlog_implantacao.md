# Backlog de Implantacao - FLUXY Ops

## Objetivo

Este backlog organiza a construcao do `fluxy-ops`, o sistema interno de controle operacional e comercial das instalacoes do FLUXY.

O `fluxy-ops` deve ser um sistema separado do produto do cliente.

## Escopo do FLUXY Ops

O sistema deve permitir:

- cadastrar e acompanhar empresas
- acompanhar instalacoes ativas
- controlar plano por empresa
- controlar modulos habilitados por empresa
- medir usuarios cadastrados
- medir acessos simultaneos
- medir pico de uso
- medir banco em GB
- medir anexos em GB
- estimar custo
- registrar alertas e sugestoes de upgrade

## Fora de Escopo da V1

- billing automatico
- mudanca automatica de plano sem regra contratual
- multi-tenant no FLUXY principal
- repo separado por cliente como regra
- customizacoes exclusivas por cliente

## Fase 0 - Fundacao do novo repositorio

### Objetivos

- criar repositorio `fluxy-ops`
- definir stack
- criar estrutura inicial
- importar documentacao de contexto

### Entregaveis

- `README.md`
- `.env.example`
- estrutura de backend e frontend
- documentacao de contexto em `docs/referencia_fluxy`

### Criterios de aceite

- repositorio sobe localmente
- documentacao de referencia esta disponivel
- arquitetura da aplicacao foi definida

## Fase 1 - Dominio central do Ops

### Objetivos

Criar as entidades principais do control plane.

### Entidades minimas

- `empresas`
- `instalacoes`
- `planos`
- `empresa_planos`
- `empresa_modulos`
- `observacoes_comerciais`

### Entregaveis

- migrations
- models
- services
- controllers
- rotas CRUD

### Criterios de aceite

- criar empresa
- vincular plano
- registrar modulos habilitados
- listar instalacoes por empresa

## Fase 2 - Telemetria e autenticacao entre sistemas

### Objetivos

Criar a integracao segura entre cada instalacao do FLUXY e o Painel Ops.

### Escopo

- `OPS_CLIENT_ID`
- `OPS_API_KEY`
- endpoints de `heartbeat`
- endpoints de metricas
- retry seguro no cliente
- falha do Ops nao derruba o FLUXY do cliente

### Rotas minimas

- `POST /ops/heartbeat`
- `POST /ops/metricas/uso`
- `POST /ops/metricas/concorrencia`
- `POST /ops/metricas/storage`

### Criterios de aceite

- instalacao autenticada envia heartbeat
- metricas sao persistidas
- falha de envio nao afeta operacao do cliente

## Fase 3 - Concorrencia e sessoes ativas

### Objetivos

Medir simultaneidade real para base comercial.

### Escopo

- sessao ativa por usuario/dispositivo
- heartbeat periodico
- expiracao de sessao inativa
- pico diario
- pico mensal
- excedencias por janela

### Entregaveis

- tabela de sessoes ativas
- rotina de limpeza
- contadores agregados
- regras de excedencia

### Criterios de aceite

- sistema sabe quantos usuarios estao simultaneos
- sistema registra picos e excedencias
- dashboard mostra consumo contra limite

## Fase 4 - Uso de storage e custo

### Objetivos

Medir crescimento e custo operacional por empresa.

### Escopo

- tamanho logico do banco
- tamanho de anexos
- total em GB
- custo estimado
- historico por periodo

### Fontes

- MySQL por schema
- S3 por bucket ou prefixo

### Criterios de aceite

- painel mostra uso atual
- painel mostra historico
- painel marca alerta quando ultrapassar limite

## Fase 5 - Dashboard do Ops

### Objetivos

Criar a visao executiva do provedor.

### Telas minimas

- lista de empresas
- detalhe da empresa
- instalacoes
- planos
- modulos
- simultaneidade
- storage
- alertas
- observacoes comerciais

### Criterios de aceite

- operador localiza qualquer empresa rapidamente
- operador ve risco de custo e upgrade
- operador entende saude e uso da instalacao

## Fase 6 - Integracao gradual com o FLUXY cliente

### Objetivos

Adicionar ao FLUXY atual o envio de telemetria sem quebrar a operacao.

### Escopo

- config por `.env`
- heartbeat periodico
- coleta de usuarios
- coleta de simultaneidade
- coleta de storage
- envio resumido de modulos habilitados

### Criterios de aceite

- instalacao envia metricas automaticas
- operacao do cliente nao depende do Ops
- logs registram falhas de integracao sem derrubar fluxo

## Fase 7 - Regras de plano e upgrade sugerido

### Objetivos

Traduzir uso tecnico em criterio comercial.

### Escopo

- limite de simultaneidade por plano
- limite de storage por plano
- alertas por recorrencia
- upgrade sugerido
- overrides manuais por empresa

### Criterios de aceite

- sistema mostra empresas com risco comercial
- regras podem ser ajustadas sem mexer em codigo

## Fase 8 - Operacao e deploy

### Objetivos

Deixar o `fluxy-ops` pronto para producao.

### Escopo

- deploy
- `.env.example`
- healthcheck
- logs
- backup
- restore
- rotina de atualizacao

### Criterios de aceite

- ambiente sobe com checklist reproduzivel
- logs e backups estao definidos

## Ordem recomendada de execucao

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 5
6. Fase 4
7. Fase 7
8. Fase 6
9. Fase 8

## Observacao importante

Nao copiar o backend e o frontend atuais do FLUXY para dentro do `fluxy-ops`.

O novo repositorio deve nascer separado e receber apenas:

- documentacao de contexto
- prompt de arquitetura
- backlog

O codigo do FLUXY cliente continua no repositorio principal.
