# Colaboracao em Workspace Multirrepositorio

## Objetivo

Definir como sessoes e chats podem trabalhar de forma coordenada entre mais de um repositorio dentro do mesmo workspace, sem perder contexto, sem sobrescrever trabalho e sem quebrar integracoes.

Este documento complementa:

- `AGENTS.md`
- `docs/COLABORACAO_CODEX.md`

## Escopo

Este modo deve ser usado quando houver trabalho coordenado entre:

- `fluxy-core`
- `fluxy-ops`
- arquivos de contexto mantidos no workspace

## Regra principal

E permitido editar arquivos fora deste repositorio somente quando:

1. a sessao foi aberta explicitamente para o workspace compartilhado
2. o repositorio alvo faz parte do mesmo workspace
3. o `AGENTS.md` do repositorio alvo foi lido
4. o ownership dos arquivos foi registrado
5. o handoff foi mantido atualizado

Se qualquer uma dessas condicoes nao estiver clara, voltar ao modo de um repositorio por sessao.

## Recomendacao operacional

### Melhor pratica

- uma sessao por repositorio para implementacao
- uma sessao na raiz do workspace apenas para auditoria, comparacao e coordenacao

### Quando usar uma sessao na raiz do workspace

Usar somente para:

- revisar contratos de integracao
- comparar documentacao dos dois lados
- coordenar backlog
- gerar handoff entre repositorios

## Estrutura recomendada do contexto compartilhado

### No workspace

Criar uma pasta central de contexto, por exemplo:

```text
C:\Projetos\_workspace_contexto\
  README.md
  REPOSITORIOS.md
  OWNERSHIP_ATIVO.md
  HANDOFF_GLOBAL.md
  INTEGRACOES_ATIVAS.md
  SESSOES_ATIVAS.md
```

### Em cada repositorio

Manter uma pasta espelho:

```text
docs/workspace/
  README.md
  REPO_CONTEXTO.md
  INTEGRACOES_ATIVAS.md
  OWNERSHIP_ATIVO.md
  HANDOFF_GLOBAL.md
  PROMPT_SESSAO_WORKSPACE.md
```

## Ownership

Antes de editar qualquer arquivo, registrar ownership.

Formato recomendado:

```md
## Ownership ativo
- Sessao A
  - repositorio: fluxy-core
  - arquivos:
    - backend/src/services/opsService.js
    - backend/server.js
- Sessao B
  - repositorio: fluxy-ops
  - arquivos:
    - backend/src/routes/opsRoutes.js
    - backend/src/controllers/OpsTelemetryController.js
```

Regras:

- nenhum arquivo pode estar reservado por duas sessoes ao mesmo tempo
- ownership deve ser liberado ao final
- se houver colisao, parar e renegociar

## Handoff

Ao concluir uma etapa, registrar:

- escopo concluido
- arquivos alterados
- validacao executada
- riscos conhecidos
- proximos passos

## Contratos de integracao

Toda integracao entre repositorios deve ser documentada em ambos os lados.

No caso atual, o contrato principal entre `fluxy-core` e `fluxy-ops` inclui:

- endpoints de telemetria
- headers de autenticacao
- payloads esperados
- politicas de resiliencia

## Regra de seguranca

Se houver duvida entre conveniencia e seguranca operacional:

- preferir separar por sessao
- preferir documentar antes de integrar
- preferir ownership explicito

## Regra final

Workspace compartilhado nao significa liberdade irrestrita.

Significa:

- mais contexto
- mais rastreabilidade
- mais coordenacao

e nunca menos controle.
