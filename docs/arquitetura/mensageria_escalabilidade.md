# Mensageria e Escalabilidade

## Objetivo

Registrar as diretrizes tecnicas para o crescimento dos modulos com troca intensa de mensagens no FLUXY, principalmente:

- `COMUNICACAO_INTERNA`
- `CRM` inbox
- futuros modulos em formato chat

Este documento existe para evitar repeticao do problema ja observado de pressao excessiva no banco por consultas pesadas, polling agressivo e carregamento integral de historicos.

---

## Estado atual

### CRM

O inbox do CRM foi endurecido com:

- paginação de mensagens por conversa
- carregamento incremental de historico
- indices compostos em `crm_messages`, `crm_conversations` e `crm_conversation_participants`
- rastreabilidade de eventos de integracao ate `lead`, `conversation` e `message`

### Comunicacao interna

O modulo de comunicacao interna ainda precisa de remodelagem estrutural para um modelo de chat.

Risco identificado:

- consultas que carregam historico completo
- filtros e contagens feitos em memoria
- potencial de crescimento linear com o numero de usuarios e mensagens

Por isso, qualquer evolucao desse modulo deve seguir obrigatoriamente as regras abaixo.

---

## Regras obrigatorias para qualquer modulo de chat

### 1. Nunca carregar historico completo por padrao

Toda tela de detalhe deve abrir somente a janela mais recente.

Padrao recomendado:

- carregar ultimas `30` a `50` mensagens
- carregar mensagens anteriores apenas sob demanda
- usar cursor por `id` ou `createdAt`

Nao usar:

- `findAll` sem `limit`
- tela que traz toda a conversa inteira desde a origem

### 2. Nunca calcular resumo do inbox varrendo todas as mensagens

Resumos de inbox devem usar:

- `last_message_at`
- `last_message_preview`
- `unread_count`
- tabelas de participante/leitura

Esses campos precisam ser atualizados na escrita, nao recalculados na leitura em massa.

### 3. Polling curto deve ser evitado

Nao usar polling de 2s, 3s ou 5s para caixas com muitos usuarios.

Padrao recomendado enquanto nao houver realtime:

- polling manual por botao
- refresh automatico moderado, acima de `20s` ou `30s`
- endpoint leve de resumo, separado do endpoint pesado de detalhe

### 4. Separar endpoints de lista e detalhe

Uma rota de lista nao deve trazer:

- historico completo
- anexos completos
- participantes detalhados em excesso

Uma rota de detalhe nao deve ser usada para listar dezenas de conversas.

### 5. Indexacao deve acompanhar o modelo

Toda entidade de mensagem precisa ter indices aderentes aos filtros reais da aplicacao.

Minimo esperado:

- `conversation_id + id`
- `conversation_id + createdAt`
- `assigned_user_id + status + last_message_at`
- `user_id + conversation_id` nas tabelas de participacao

### 6. Escrita deve atualizar agregados operacionais

Ao gravar mensagem, o sistema deve atualizar no mesmo fluxo:

- ultima atividade da conversa
- preview
- contadores de nao lida
- ultima atividade do lead, quando aplicavel

Isso desloca custo para a escrita e reduz dramaticamente a carga de leitura.

### 7. Anexo nao pode passar pelo banco como blob

Anexos devem continuar fora do MySQL:

- S3
- metadados no banco
- links assinados para acesso

### 8. Auditoria e observabilidade

Mensageria de alto volume precisa ter metrica operacional minima:

- total de mensagens por minuto
- tempo medio de resposta do endpoint
- erro por rota
- consultas lentas
- volume por modulo

Sem isso, o aumento de infraestrutura vira tentativa e erro.

---

## Arquitetura recomendada para o novo chat interno

### Fase 1. Banco e API corretos

- modelo de conversa
- modelo de mensagem
- tabela de participantes
- contador de nao lidas por participante
- detalhe paginado por cursor
- lista leve de conversas

### Fase 2. Entrega quase em tempo real

Antes de adotar WebSocket para tudo, validar:

- SSE ou polling moderado
- endpoint de delta leve
- cache de resumo

### Fase 3. Realtime robusto

Quando o volume justificar:

- WebSocket ou gateway realtime dedicado
- Redis para presence, fanout leve e desacoplamento
- fila para eventos secundarios

### Fase 4. Hardening operacional

- particionamento logico por tenant/modulo
- retention/archive de mensagens antigas
- dashboards de uso

---

## Infraestrutura AWS recomendada

### Antes de subir infraestrutura

Primeiro medir:

- CPU do backend
- memoria do backend
- conexoes simultaneas MySQL
- latencia media das rotas de inbox/chat
- consultas lentas no MySQL

Se o desenho da consulta estiver errado, aumentar EC2 so mascara o problema.

### Ordem recomendada de evolucao

1. Corrigir modelo e indices
2. Reduzir polling e payload
3. Ajustar pool de conexoes
4. Subir instancia de banco se ainda necessario
5. Adicionar Redis se houver realtime/fanout

### Sinais claros para subir infra

- CPU do banco sustentada alta mesmo apos indices e paginacao
- alto volume de conexoes simultaneas
- fila de requests acumulando no backend
- picos de latencia por horarios de uso

### Candidatos naturais de evolucao

- RDS com classe maior
- read replica, se houver leitura muito acima da escrita
- ElastiCache Redis para presenca, fila curta e pub/sub
- backend separado para realtime, se o modulo de chat crescer muito

---

## Regra pratica para o workspace

Se outro agente for remodelar `COMUNICACAO_INTERNA`, ele deve:

- ler este documento antes
- evitar qualquer solucao baseada em carregar tudo e filtrar depois
- partir de API paginada e incremental
- tratar realtime como etapa posterior, nao como primeiro passo

---

## Conclusao

O FLUXY pode suportar mensageria intensa, mas isso depende mais de desenho de leitura/escrita e indexacao do que de aumento bruto de infraestrutura.

Infra da AWS deve entrar como reforco depois do acerto de arquitetura, nao como substituto de modelagem correta.
