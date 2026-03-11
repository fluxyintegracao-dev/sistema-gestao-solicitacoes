# Colaboracao entre Codex

## Objetivo

Padrao operacional para permitir que dois agentes trabalhem no mesmo repositorio sem quebrar o sistema em producao e sem editar o mesmo arquivo ao mesmo tempo.

Este documento e complementar ao `AGENTS.md` e deve ser lido antes de qualquer tarefa compartilhada.

---

## 1. Principios obrigatorios

- O sistema esta em producao. Prioridade maxima para seguranca operacional.
- Mudancas devem ser pequenas, rastreaveis e reversiveis.
- Nenhum agente deve assumir comportamento do outro sem verificar ownership atual de arquivos.
- Sempre preferir separar trabalho por modulo, fluxo ou conjunto de arquivos.
- Nunca trabalhar em paralelo no mesmo arquivo.
- Nunca fazer mudanca destrutiva sem pedido explicito.

---

## 2. Estrutura minima de colaboracao

Quando houver dois agentes ativos, usar esta divisao:

- `Agente A`
  - assume um escopo funcional fechado
  - exemplo: frontend de solicitacoes, filtros, layout

- `Agente B`
  - assume outro escopo funcional fechado
  - exemplo: backend de solicitacoes, permissao, upload, contratos

Se a tarefa exigir frontend e backend ao mesmo tempo, um agente deve ficar responsavel pelo fluxo completo ou os arquivos precisam ser repartidos sem sobreposicao.

---

## 3. Regra de ownership de arquivos

Antes de editar, o agente deve declarar quais arquivos vai reservar.

Formato recomendado:

```md
## Ownership ativo
- Agente A
  - frontend/src/pages/Solicitacoes/index.jsx
  - frontend/src/pages/Solicitacoes/Filtros.jsx
- Agente B
  - backend/src/controllers/SolicitacaoController.js
  - backend/src/routes.js
```

Regras:
- ownership e temporario
- ownership vale ate commit, cancelamento da tarefa ou liberacao explicita
- se um arquivo estiver reservado, o outro agente nao edita
- se surgir necessidade de editar arquivo reservado, parar e renegociar ownership antes

---

## 4. Regra para evitar conflito no mesmo arquivo

Se dois trabalhos tocam o mesmo arquivo, usar apenas uma destas abordagens:

### Opcao A
- apenas um agente faz todas as mudancas naquele arquivo

### Opcao B
- dividir por turnos
- o primeiro agente termina, commita e libera
- o segundo agente puxa a ultima versao e so entao continua

### Opcao C
- extrair a mudanca para outro arquivo, quando tecnicamente possivel
- exemplo:
  - novo service
  - novo componente
  - nova utilidade
  - novo documento

---

## 5. Fluxo operacional padrao

### Etapa 1. Abrir a tarefa
- definir escopo exato
- identificar se a mudanca e:
  - somente frontend
  - somente backend
  - full stack
  - apenas documentacao

### Etapa 2. Reservar arquivos
- registrar ownership dos arquivos previstos
- evitar arquivos compartilhados de alto risco, por exemplo:
  - `backend/src/controllers/SolicitacaoController.js`
  - `backend/src/routes.js`
  - `frontend/src/layout/Layout.jsx`
  - `frontend/src/pages/Solicitacoes/index.jsx`

### Etapa 3. Implementar
- fazer mudanca minima necessaria
- nao aproveitar a tarefa para "arrumar outras coisas"
- manter coerencia com as regras existentes do sistema

### Etapa 4. Validar
- frontend: `npm run build`
- backend: validacao de sintaxe e testes rapidos do fluxo alterado
- revisar impacto em:
  - permissao
  - filtros
  - status
  - uploads
  - historico

### Etapa 5. Encerrar ownership
- commitar
- liberar arquivos
- registrar breve resumo do que foi alterado

---

## 6. Padrao de branch

Para trabalho em dupla, usar branches separadas por escopo.

Formato sugerido:
- `feat/frontend-filtros-nome-da-tarefa`
- `feat/backend-status-nome-da-tarefa`
- `fix/frontend-layout-nome-da-tarefa`
- `fix/backend-upload-nome-da-tarefa`
- `docs/colaboracao-e-regras`

Regras:
- nao trabalhar os dois diretamente em `main`
- merge para `main` apenas depois de validacao
- se os dois trabalhos dependem entre si, integrar primeiro em branch comum de validacao

---

## 7. Checklist antes de merge

Todo agente deve conferir:

- a mudanca respeita regras do SUPERADMIN
- nao abriu permissao indevida
- nao alterou comportamento de setor sem necessidade
- nao quebrou upload, anexo ou presign
- nao alterou fluxo de solicitacao fora do escopo
- frontend buildando
- backend sem erro de sintaxe
- documentacao atualizada, se a regra mudou

---

## 8. Arquivos de alto risco

Os arquivos abaixo exigem cuidado adicional e ownership exclusivo:

- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/controllers/DashboardController.js`
- `backend/src/routes.js`
- `backend/src/app.js`
- `backend/src/config/uploadComprovantes.js`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/pages/NovaSolicitacao.jsx`
- `frontend/src/pages/Solicitacoes/index.jsx`
- `frontend/src/pages/SolicitacaoDetalhe/index.jsx`
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/contexts/ThemeContext.jsx`

Se a tarefa tocar qualquer um deles, o outro agente deve evitar esse arquivo ate a liberacao.

---

## 9. Estrategia recomendada de divisao

### Melhor divisao por modulo
- Agente A:
  - frontend
  - componentes
  - layout
  - filtros
  - experiencia visual

- Agente B:
  - backend
  - controllers
  - models
  - regras de permissao
  - regras de negocio

### Melhor divisao por fluxo
- Agente A:
  - fluxo de solicitacoes

- Agente B:
  - fluxo de comunicacao interna

### Melhor divisao por risco
- Agente A:
  - tarefas documentais e componentes novos

- Agente B:
  - arquivos centrais e regras sensiveis

---

## 10. Modelo de handoff entre agentes

Formato sugerido ao finalizar uma tarefa:

```md
## Handoff
- Escopo concluido:
  - ajuste do filtro de obra com multisselecao
- Arquivos alterados:
  - frontend/src/pages/Solicitacoes/Filtros.jsx
  - frontend/src/pages/Solicitacoes/index.jsx
- Validacao executada:
  - npm run build
- Riscos conhecidos:
  - nenhum identificado no escopo
- Ownership liberado:
  - frontend/src/pages/Solicitacoes/Filtros.jsx
  - frontend/src/pages/Solicitacoes/index.jsx
```

---

## 11. Regra de documentacao

Sempre atualizar documentacao quando houver:

- nova regra de permissao
- novo modulo
- nova automacao
- nova restricao de upload
- alteracao de fluxo entre setores
- mudanca de comportamento em tela critica

Arquivos sugeridos:
- `AGENTS.md`
- `docs/COLABORACAO_CODEX.md`
- `docs/RELATORIO_FUNCIONALIDADES_REGRAS_E_VALOR.md`

---

## 12. Regra final

Se houver duvida entre velocidade e seguranca, escolher seguranca.

Se houver risco de dois agentes mexerem no mesmo arquivo, parar, redistribuir o escopo e continuar somente depois do ownership estar claro.
