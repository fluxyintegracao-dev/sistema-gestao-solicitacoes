# Quadro de Agentes

## Objetivo

Painel operacional para coordenar trabalhos simultaneos de agentes neste repositorio.

Todo agente deve atualizar este arquivo ao iniciar, pausar, finalizar ou transferir uma tarefa.

## Status Atual

- Nenhum trabalho ativo registrado.

## Sessoes Ativas

| Sessao | Responsavel | Escopo | Status | Inicio | Observacoes |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - |

## Ownership Ativo

| Arquivo | Sessao | Responsavel | Escopo | Status |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

## Trabalhos em Andamento

```md
## Trabalho em andamento

- id:
  sessao:
  responsavel:
  status:
  escopo:
  arquivos:
    - 
  feito:
    - 
  pendencias:
    - 
  validacao:
    - 
  observacoes:
    - 
```

## Trabalhos Finalizados

```md
## Trabalho finalizado

- id:
  sessao:
  responsavel:
  finalizado_em:
  escopo concluido:
    - 
  arquivos alterados:
    - 
  validacao executada:
    - 
  pendencias deixadas:
    - 
  commit:
    - 
```

## Bloqueios e Pendencias Globais

| Data | Responsavel | Bloqueio/Pendencia | Impacto | Proximo passo |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

## Como Usar

1. Ao iniciar uma tarefa, substitua o status atual e registre a sessao.
2. Adicione os arquivos em `Ownership Ativo`.
3. Registre o trabalho em `Trabalhos em Andamento`.
4. Durante a tarefa, atualize `feito`, `pendencias` e `validacao`.
5. Ao finalizar, mova o item para `Trabalhos Finalizados`.
6. Libere os arquivos em `Ownership Ativo`.
7. Atualize tambem:
   - `docs/workspace/OWNERSHIP_ATIVO.md`
   - `docs/workspace/HANDOFF_GLOBAL.md`
   - `docs/workspace/SESSOES_ATIVAS.md`
