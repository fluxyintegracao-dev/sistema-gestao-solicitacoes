# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · ⚠ SEM DADO (a tela tem a
> capacidade, a base do preview não deu registro para exercitá-la — NÃO PROVADA)
> · — N/A (a regra não se aplica; motivo registrado).

- Verificação: **2026-09-05 04:15** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `0654ce367f01eabf46b25e82f8f9c7fbd6f15840`
- Telas verificadas: 16 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, R3, X1, X2, X3, R18, A1
- **Células FALHOU: 7** (justificativas abaixo)
- **Células SEM DADO: 56** — capacidade NÃO PROVADA por falta de registro na base (lista abaixo)

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | R3 | X1 | X2 | X3 | R18 | A1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| crm-dashboard | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| crm-dashboard-gerencial | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-dashboard-sla | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ❌ | ✅ | — |
| crm-dashboard-distribuicao | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-relatorio-executivo | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — |
| crm-leads | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| crm-novo-lead | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| crm-lead-detalhe | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-carteira | ✅ | ✅ | — | — | — | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-kanban | ✅ | ✅ | — | — | ✅ | ❌ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — |
| crm-tarefas | ✅ | ✅ | — | — | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| crm-inbox | ✅ | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| crm-automacoes | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-admin-canais | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-admin-numeros | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| crm-admin-integracoes | ✅ | ❌ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |

## FALHOU — cada célula, justificada

- **crm-dashboard-gerencial · F3**: remover uma etiqueta levou 1 para 1 — deveria tirar exatamente uma
- **crm-dashboard-sla · X3**: A.text-[var(--c-primary)].hover:underline vai até 497px numa viewport de 390px — o transbordo é RECORTADO por overflow-x: clip, então some sem rolagem
- **crm-relatorio-executivo · F3**: remover uma etiqueta levou 1 para 1 — deveria tirar exatamente uma
- **crm-lead-detalhe · C2**: apoio (contagem/descrição) ausente na faixa _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header`)_
- **crm-kanban · C6**: link de navegação como ação: "Lista" → /crm/leads _(seletor: `div.page.solicitacoes-page > header.app-page-header > div.app-page-header-row > div.app-actionbar > a.btn.btn-outline`)_
- **crm-tarefas · C6**: link de navegação como ação: "Dashboard" → /crm/dashboard _(seletor: `div.page.solicitacoes-page > header.app-page-header > div.app-page-header-row > div.app-actionbar > a.btn.btn-outline`)_
- **crm-admin-integracoes · C2**: contagem ausente no apoio _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header`)_

## SEM DADO — capacidades que NÃO foram provadas

A tela tem a capacidade e o harness a exercitaria; a base do preview não
devolveu registro para exercitá-la. **Não é aprovação e não vira aprovação
por equivalência com outra tela** (decisão do cliente, 03/09). Para fechar,
é preciso registro na base — o harness é SOMENTE LEITURA e não cria nenhum.

- **crm-dashboard-gerencial** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum dado disponivel neste recorte.") — capacidade NÃO PROVADA
- **crm-dashboard-distribuicao** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum responsavel com carteira ativa no periodo.") — capacidade NÃO PROVADA
- **crm-lead-detalhe** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhuma tarefa criada.") — capacidade NÃO PROVADA
- **crm-carteira** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum lead na sua carteira Ajuste a busca e os filtros — ou peca a di") — capacidade NÃO PROVADA
- **crm-automacoes** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhuma automacao cadastrada Cadastre a primeira regra para padronizar") — capacidade NÃO PROVADA
- **crm-admin-canais** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum canal cadastrado Cadastre o primeiro canal para o CRM passar a ") — capacidade NÃO PROVADA
- **crm-admin-numeros** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum numero cadastrado Cadastre o primeiro numero para separar insti") — capacidade NÃO PROVADA
- **crm-admin-integracoes** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum evento registrado Assim que o webhook receber o primeiro evento") — capacidade NÃO PROVADA

## N/A — motivos

- **crm-dashboard**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T5 (tela sem coluna de identificação); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro)
- **crm-dashboard-gerencial**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar"))
- **crm-dashboard-sla**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Atualizar"))
- **crm-dashboard-distribuicao**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Atualizar"))
- **crm-relatorio-executivo**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **crm-leads**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); R1 (cadastro em página própria (rota dedicada))
- **crm-novo-lead**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **crm-lead-detalhe**: T3 (tabela com menos de 2 colunas); F1 (tela sem busca); F4 (tela sem linha de filtros); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Editar"))
- **crm-carteira**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T3 (tabela com menos de 2 colunas); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **crm-kanban**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("+ Novo Lead")); X1 (tela sem tabela/lista tabular)
- **crm-tarefas**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **crm-inbox**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); X1 (tela sem tabela/lista tabular)
- **crm-automacoes**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Executar ciclo"))
- **crm-admin-canais**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável)
- **crm-admin-numeros**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável)
- **crm-admin-integracoes**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro)
