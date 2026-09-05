# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · ⚠ SEM DADO (a tela tem a
> capacidade, a base do preview não deu registro para exercitá-la — NÃO PROVADA)
> · — N/A (a regra não se aplica; motivo registrado).

- Verificação: **2026-09-05 04:37** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `f3d5acb669fc0589e2f6a51cc5ebd45968687046`
- Telas verificadas: 34 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, R3, X1, X2, X3, R18, A1
- **Células FALHOU: 428** (justificativas abaixo)
- **Células SEM DADO: 28** — capacidade NÃO PROVADA por falta de registro na base (lista abaixo)

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | R3 | X1 | X2 | X3 | R18 | A1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| crm-dashboard-gerencial | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-dashboard-sla | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| crm-relatorio-executivo | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — |
| crm-lead-detalhe | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-kanban | ✅ | ✅ | — | — | ✅ | ❌ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — |
| crm-tarefas | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| crm-admin-integracoes | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| compras-rel-categorias-insumos | ❌ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-ciclo | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-compras-diretas | ❌ | ✅ | ❌ | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| compras-rel-compras-fornecedor | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-demanda-pedidos | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-economia-cotacoes | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-evolucao | ❌ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-fornecedores | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-pendencias-cotacoes | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-rel-precos-insumos | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| gestao-categorias | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| gestao-unidades | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| gestao-apropriacoes | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| sst-dashboard | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-rel-operacional | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-executivo | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-centro-operacional | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-heatmap | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-observabilidade | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-producao | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-observabilidade-avancada | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-timeline | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-esocial | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-configuracoes | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sst-crud | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| solicitacoes | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ❌ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| nova-solicitacao | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |

## FALHOU — cada célula, justificada

- **crm-kanban · C6**: link de navegação como ação: "+ Novo Lead" → /crm/leads/novo _(seletor: `div.page.solicitacoes-page > header.app-page-header > div.app-page-header-row > div.app-actionbar > a.btn.btn-primary`)_
- **compras-rel-categorias-insumos · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-categorias-insumos · C1**: faixa compacta com 94px de altura (muito vazio para uma linha)
- **compras-rel-ciclo · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-ciclo · T3**: coluna arrastada mudou 0px (esperado ~64px)
- **compras-rel-compras-diretas · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-compras-diretas · C1**: faixa compacta com 94px de altura (muito vazio para uma linha)
- **compras-rel-compras-fornecedor · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-compras-fornecedor · T3**: coluna arrastada mudou 0px (esperado ~64px)
- **compras-rel-demanda-pedidos · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-economia-cotacoes · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-economia-cotacoes · T7**: valor truncado: "09.016.666 LEANDRO REBOLI DE LYRIO · R$ 5,00" (largura 166px < conteúdo 280px) _(seletor: `tbody > tr.app-tabela-linha > td.celula-valor > div.app-celula-dupla > span.app-celula-dupla-sub`)_
- **compras-rel-evolucao · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-evolucao · T7**: valor monetário QUEBRADO em 3 linhas: "05/2026: R$ 150,00 | 06/2026: R$ 5.132.627,00 | 07/2026: R$ 10.919,30" (145px de largura) _(seletor: `table.resizable-table > tbody > tr.app-tabela-linha > td > span.text-xs.text-[var(--c-muted)]`)_
- **compras-rel-evolucao · C1**: faixa compacta com 94px de altura (muito vazio para uma linha)
- **compras-rel-fornecedores · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-pendencias-cotacoes · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **compras-rel-precos-insumos · C3**: seta de voltar em tela de LISTAGEM (R11: redundante)
- **gestao-apropriacoes · C2**: contagem ausente no apoio _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell.compras-responsive-scope > div.page.solicitacoes-page > header.app-page-header`)_
- **sst-dashboard · C1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · C2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · C3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · C4**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · C5**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · C6**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T4**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T5**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T6**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · T7**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · F1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · F2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · F3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · F4**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · B1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · B2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · B3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · B4**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · B5**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · M1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · M2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · M3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · M4**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · R1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · R2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · R3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · X1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · X2**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · X3**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · R18**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-dashboard · A1**: tela não verificada: redirecionada de /sst para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · C1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · C2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · C3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · C4**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · C5**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · C6**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T4**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T5**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T6**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · T7**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · F1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · F2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · F3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · F4**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · B1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · B2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · B3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · B4**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · B5**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · M1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · M2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · M3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · M4**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · R1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · R2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · R3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · X1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · X2**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · X3**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · R18**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-rel-operacional · A1**: tela não verificada: redirecionada de /sst/relatorios/operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · C1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · C2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · C3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · C4**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · C5**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · C6**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T4**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T5**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T6**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · T7**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · F1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · F2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · F3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · F4**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · B1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · B2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · B3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · B4**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · B5**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · M1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · M2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · M3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · M4**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · R1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · R2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · R3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · X1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · X2**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · X3**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · R18**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-executivo · A1**: tela não verificada: redirecionada de /sst/relatorios/executivo para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · C1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · C2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · C3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · C4**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · C5**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · C6**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T4**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T5**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T6**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · T7**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · F1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · F2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · F3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · F4**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · B1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · B2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · B3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · B4**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · B5**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · M1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · M2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · M3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · M4**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · R1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · R2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · R3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · X1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · X2**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · X3**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · R18**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-centro-operacional · A1**: tela não verificada: redirecionada de /sst/relatorios/centro-operacional para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · C1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · C2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · C3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · C4**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · C5**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · C6**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T4**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T5**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T6**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · T7**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · F1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · F2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · F3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · F4**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · B1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · B2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · B3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · B4**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · B5**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · M1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · M2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · M3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · M4**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · R1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · R2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · R3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · X1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · X2**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · X3**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · R18**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-heatmap · A1**: tela não verificada: redirecionada de /sst/relatorios/heatmap para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · C1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · C2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · C3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · C4**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · C5**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · C6**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T4**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T5**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T6**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · T7**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · F1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · F2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · F3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · F4**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · B1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · B2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · B3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · B4**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · B5**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · M1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · M2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · M3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · M4**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · R1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · R2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · R3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · X1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · X2**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · X3**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · R18**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade · A1**: tela não verificada: redirecionada de /sst/observabilidade para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · C1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · C2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · C3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · C4**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · C5**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · C6**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T4**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T5**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T6**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · T7**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · F1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · F2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · F3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · F4**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · B1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · B2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · B3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · B4**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · B5**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · M1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · M2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · M3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · M4**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · R1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · R2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · R3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · X1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · X2**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · X3**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · R18**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-producao · A1**: tela não verificada: redirecionada de /sst/producao para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · C1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · C2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · C3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · C4**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · C5**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · C6**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T4**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T5**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T6**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · T7**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · F1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · F2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · F3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · F4**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · B1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · B2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · B3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · B4**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · B5**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · M1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · M2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · M3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · M4**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · R1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · R2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · R3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · X1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · X2**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · X3**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · R18**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-observabilidade-avancada · A1**: tela não verificada: redirecionada de /sst/observabilidade-avancada para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · C1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · C2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · C3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · C4**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · C5**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · C6**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T4**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T5**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T6**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · T7**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · F1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · F2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · F3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · F4**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · B1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · B2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · B3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · B4**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · B5**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · M1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · M2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · M3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · M4**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · R1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · R2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · R3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · X1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · X2**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · X3**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · R18**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-timeline · A1**: tela não verificada: redirecionada de /sst/timeline para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · C1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · C2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · C3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · C4**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · C5**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · C6**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T4**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T5**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T6**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · T7**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · F1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · F2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · F3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · F4**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · B1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · B2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · B3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · B4**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · B5**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · M1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · M2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · M3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · M4**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · R1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · R2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · R3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · X1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · X2**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · X3**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · R18**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-esocial · A1**: tela não verificada: redirecionada de /sst/esocial para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · C1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · C2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · C3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · C4**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · C5**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · C6**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T4**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T5**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T6**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · T7**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · F1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · F2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · F3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · F4**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · B1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · B2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · B3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · B4**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · B5**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · M1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · M2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · M3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · M4**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · R1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · R2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · R3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · X1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · X2**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · X3**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · R18**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-configuracoes · A1**: tela não verificada: redirecionada de /sst/configuracoes para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · C1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · C2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · C3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · C4**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · C5**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · C6**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T4**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T5**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T6**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · T7**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · F1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · F2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · F3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · F4**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · B1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · B2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · B3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · B4**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · B5**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · M1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · M2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · M3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · M4**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · R1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · R2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · R3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · X1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · X2**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · X3**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · R18**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **sst-crud · A1**: tela não verificada: redirecionada de /sst/colaboradores para /sst/pgr — acesso/política bloqueando o usuário de QA
- **solicitacoes · M1**: 2 alvo(s) < 32px; primeiro: div.la-root > div.la-nivel1 > div.la-vis-controles > div.la-modo > button.ativo (81×30px)

## SEM DADO — capacidades que NÃO foram provadas

A tela tem a capacidade e o harness a exercitaria; a base do preview não
devolveu registro para exercitá-la. **Não é aprovação e não vira aprovação
por equivalência com outra tela** (decisão do cliente, 03/09). Para fechar,
é preciso registro na base — o harness é SOMENTE LEITURA e não cria nenhum.

- **crm-dashboard-gerencial** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum dado disponivel neste recorte.") — capacidade NÃO PROVADA
- **crm-lead-detalhe** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhuma tarefa criada.") — capacidade NÃO PROVADA
- **crm-admin-integracoes** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum evento registrado Assim que o webhook receber o primeiro evento") — capacidade NÃO PROVADA
- **compras-rel-compras-diretas** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Sem dados no periodo.") — capacidade NÃO PROVADA

## N/A — motivos

- **crm-dashboard-gerencial**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar"))
- **crm-dashboard-sla**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Atualizar"))
- **crm-relatorio-executivo**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **crm-lead-detalhe**: T3 (tabela com menos de 2 colunas); F1 (tela sem busca); F4 (tela sem linha de filtros); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Editar"))
- **crm-kanban**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("+ Novo Lead")); X1 (tela sem tabela/lista tabular)
- **crm-tarefas**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **crm-admin-integracoes**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro)
- **compras-rel-categorias-insumos**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-ciclo**: C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-compras-diretas**: C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-compras-fornecedor**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-demanda-pedidos**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-economia-cotacoes**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-evolucao**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-fornecedores**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-pendencias-cotacoes**: C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **compras-rel-precos-insumos**: C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatorio"))
- **gestao-categorias**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis)
- **gestao-unidades**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis)
- **gestao-apropriacoes**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); X1 (tela sem tabela/lista tabular)
- **solicitacoes**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **nova-solicitacao**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
