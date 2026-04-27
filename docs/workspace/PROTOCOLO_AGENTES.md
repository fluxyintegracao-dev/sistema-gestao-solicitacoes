# Protocolo de Trabalho com Multiplos Agentes

## Objetivo

Este arquivo define o processo obrigatorio para dois ou mais agentes trabalharem no sistema sem editar os mesmos arquivos ao mesmo tempo, sem perder contexto e sem deixar tarefas pela metade.

Use este protocolo sempre que houver mais de um usuario/agente atuando no repositorio, mesmo que as tarefas parecam independentes.

## Arquivos de Controle

Os agentes devem usar estes arquivos como fonte de verdade:

- `docs/workspace/QUADRO_AGENTES.md`: painel diario com sessoes, ownership, andamento, finalizados e pendencias.
- `docs/workspace/OWNERSHIP_ATIVO.md`: lista objetiva dos arquivos reservados no momento.
- `docs/workspace/HANDOFF_GLOBAL.md`: resumo final de cada entrega para continuidade.
- `docs/workspace/SESSOES_ATIVAS.md`: registro de sessoes/chats abertos.

Se houver divergencia entre arquivos, o agente deve parar e pedir alinhamento antes de editar codigo.

## Regra Principal

Nenhum agente edita arquivo sem antes registrar ownership.

Um arquivo so pode ter um dono ativo por vez. Se outro agente precisar mexer no mesmo arquivo, deve negociar a transferencia ou esperar o dono atual finalizar e liberar.

## Fluxo Obrigatorio

### 1. Antes de comecar

O agente deve:

1. Rodar `git status`.
2. Ler `AGENTS.md`.
3. Ler `docs/COLABORACAO_CODEX.md`.
4. Ler `docs/workspace/QUADRO_AGENTES.md`.
5. Ler `docs/workspace/OWNERSHIP_ATIVO.md`.
6. Registrar a sessao em `docs/workspace/SESSOES_ATIVAS.md`.
7. Reservar arquivos em `docs/workspace/OWNERSHIP_ATIVO.md`.
8. Registrar o plano em `docs/workspace/QUADRO_AGENTES.md`.

### 2. Durante o trabalho

O agente deve manter o quadro atualizado quando:

- iniciar implementacao;
- mudar escopo;
- adicionar arquivo novo ao ownership;
- encontrar bloqueio;
- concluir uma etapa relevante;
- deixar pendencia para outro agente.

Nao e permitido fazer refatoracao fora do escopo registrado.

### 3. Antes de editar arquivo compartilhado

Se o arquivo esta em `OWNERSHIP_ATIVO.md` para outra sessao:

1. nao editar;
2. registrar necessidade no `QUADRO_AGENTES.md`;
3. aguardar liberacao ou combinar transferencia.

Arquivos sensiveis exigem ownership exclusivo:

- `backend/src/routes.js`
- `backend/src/app.js`
- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/services/comercialService.js`
- `backend/src/services/tituloFinanceiroService.js`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/pages/ComercialContratos.jsx`
- `frontend/src/pages/FinanceiroBoletos.jsx`
- `frontend/src/pages/NovaSolicitacao.jsx`
- `frontend/src/pages/Solicitacoes/index.jsx`

### 4. Ao finalizar

O agente deve:

1. Rodar as validacoes adequadas.
2. Atualizar `docs/workspace/HANDOFF_GLOBAL.md`.
3. Atualizar `docs/workspace/QUADRO_AGENTES.md`.
4. Remover/liberar ownership em `docs/workspace/OWNERSHIP_ATIVO.md`.
5. Informar arquivos alterados e pendencias.

## Padrao de Status

Use somente estes status no quadro:

- `planejado`: escopo definido, ainda sem edicao.
- `em_andamento`: agente editando ou validando.
- `bloqueado`: precisa de decisao, credencial, ambiente ou liberacao de arquivo.
- `validando`: codigo pronto, em build/teste/revisao.
- `finalizado`: entregue e ownership liberado.
- `cancelado`: trabalho interrompido sem entrega.

## Padrao de Ownership

```md
## Ownership ativo

- sessao: agente-ricardo-2026-04-27-comercial
  responsavel: Ricardo / Agente 1
  escopo: Ajustes no modulo comercial
  iniciado_em: 2026-04-27 14:30
  arquivos:
    - frontend/src/pages/ComercialContratos.jsx
    - backend/src/services/comercialService.js
  status: em_andamento
  observacoes:
    - Nao editar estes arquivos ate liberacao.
```

## Padrao de Registro no Quadro

```md
## Trabalho em andamento

- id: 2026-04-27-comercial-conjuge
  sessao: agente-ricardo-2026-04-27-comercial
  responsavel: Ricardo / Agente 1
  status: em_andamento
  escopo: Criar cadastro de conjuge no cliente comercial.
  arquivos:
    - frontend/src/pages/ComercialContratos.jsx
    - backend/src/models/Parceiro.js
  feito:
    - Campo conjuge removido como texto simples.
  pendencias:
    - Rodar migration em staging.
  validacao:
    - npm run build: pendente
  observacoes:
    - Depende de backend atualizado na EC2 dev.
```

## Padrao de Handoff

```md
## Handoff

- data: 2026-04-27
  sessao: agente-ricardo-2026-04-27-comercial
  status: finalizado
  escopo concluido:
    - Cadastro de conjuge criado como segunda pessoa.
  arquivos alterados:
    - frontend/src/pages/ComercialContratos.jsx
    - backend/src/models/Parceiro.js
  validacao executada:
    - npm run build
    - node --check backend/src/models/Parceiro.js
  pendencias:
    - Aplicar migration na EC2 dev.
  ownership liberado:
    - frontend/src/pages/ComercialContratos.jsx
    - backend/src/models/Parceiro.js
```

## Regras de Commit

- Commits pequenos por escopo.
- Nao misturar frontend, backend e documentacao quando forem assuntos diferentes.
- Nunca commitar `.env`, `.agents/`, chaves, tokens ou arquivos temporarios.
- Antes do commit:
  - `git status`
  - revisar arquivos staged
  - confirmar que ownership foi atualizado

## Regra Final

Se o agente nao souber se pode editar um arquivo, ele deve assumir que nao pode ate verificar o ownership.

Rastreabilidade vem antes de velocidade.
