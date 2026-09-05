# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · 🚫 NAO ABRIU · ⚠ SEM DADO (a tela tem a
> capacidade, a base do preview não deu registro para exercitá-la — NÃO PROVADA)
> · — N/A (a regra não se aplica; motivo registrado).

- Verificação: **2026-09-05 06:49** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `3f2d6ffbb4b4e70854db10e649307cbc0ab8d623`
- Telas verificadas: 28 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, R3, X1, X2, X3, R18, A1
- **TELAS QUE NÃO ABRIRAM: 4** — nada nelas foi medido, e rodada com tela que não abre NÃO fecha:
  - `undefined` — redirecionada de /solicitacoes-compra/revisar para /solicitacoes-compra/nova — acesso/política bloqueando o usuário de QA
  - `undefined` — redirecionada de /solicitacoes-compra-direta/revisar para /solicitacoes-compra-direta/nova — acesso/política bloqueando o usuário de QA
  - `undefined` — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
  - `undefined` — page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **Células FALHOU: 25** (justificativas abaixo)
- **Células SEM DADO: 27** — capacidade NÃO PROVADA por falta de registro na base (lista abaixo)

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | R3 | X1 | X2 | X3 | R18 | A1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sst-crud | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| fiscal-rel-operacional | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| fiscal-diagnostico | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| provisoes-dashboard | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| provisao-nova | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| governanca-auditoria | ✅ | ✅ | — | — | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | — | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| custos-recebiveis | ❌ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ❌ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — |
| solicitacao-detalhe | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — |
| dashboard | ❌ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ❌ | — | ✅ | — | ✅ | ❌ | ✅ | ✅ | — | — | — | ✅ | — | ❌ | ✅ | — | — |
| treinamento | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ❌ | ✅ | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| prioridades-diretoria | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| perfil | ✅ | ✅ | ❌ | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| arquivos-modelos | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| solicitacoes-rel-operacional | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| contratos-rel-operacional | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| comercial-rel-operacional | ✅ | ✅ | — | — | ✅ | ✅ | ⚠ | ⚠ | — | ⚠ | ⚠ | ⚠ | ⚠ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ⚠ | ✅ | ✅ | ✅ | — |
| solicitacoes-compra | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| cotacoes | ❌ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ❌ | ✅ | ❌ | — |
| pedidos-compra | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| compras-delegacao | ✅ | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | — | ✅ | ✅ | ❌ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| gestao-fornecedores | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| gestao-insumos | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| nova-solicitacao-compra | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| nova-compra-direta | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| revisar-solicitacao-compra | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| revisar-compra-direta | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| solicitacao-compra-detalhe | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| gerenciar-cotacao | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

## FALHOU — cada célula, justificada

- **fiscal-rel-operacional · T3**: coluna arrastada mudou 0px (esperado ~64px)
- **provisoes-dashboard · T3**: coluna arrastada mudou 0px (esperado ~64px)
- **governanca-auditoria · T1**: section.app-bloco.app-bloco--secundario > div.app-bloco-corpo > div.app-table-shell.app-tabela > div.resizable-table-scroll > table.resizable-table col 1: th=center td=left
- **governanca-auditoria · T3**: coluna arrastada mudou 0px (esperado ~64px)
- **custos-recebiveis · C2**: contagem ausente no apoio _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header`)_
- **custos-recebiveis · B1**: nenhum bloco na tela
- **custos-recebiveis · C1**: faixa compacta com 118px de altura (muito vazio para uma linha)
- **solicitacao-detalhe · C6**: link de navegação como ação: "Ver titulos" → /financeiro/titulos _(seletor: `section.app-bloco.app-bloco--secundario > div.app-bloco-head > span.app-bloco-acoes > span.app-actionbar > a.btn.btn-outline`)_
- **dashboard · C2**: faixa .app-page-header ausente
- **dashboard · B1**: nenhum bloco na tela
- **dashboard · M1**: 4 alvo(s) < 32px; primeiro: div.hub-bloco > section.hub-atalhos > ul.hub-atalhos-grid > li.hub-atalho-card > button.hub-atalho-remover (20×20px)
- **dashboard · C1**: faixa .app-page-header ausente
- **dashboard · X2**: faixa ausente dentro de .layout-main no 390 — 0 .app-page-header no documento inteiro, .layout-main existe, contêineres: main.layout-main.flex-1 | div.layout-content-shell; começo da página: "Início L local ADMINISTRATIVO SUAS PENDÊNCIAS 11 solicitações paradas no seu setor 33 títu"
- **treinamento · R1**: "Novo guia" abriu formulário INLINE sem declarar `cadastroInline` — pela R9 revista (04/09) inline é o arranjo certo em tela que existe PARA cadastrar, mas a decisão precisa estar escrita: declare o motivo em telas.mjs, ou mova o cadastro para modal.
- **perfil · C3**: tela de detalhe/registro sem a seta de voltar à esquerda
- **solicitacoes-rel-operacional · T3**: coluna arrastada mudou 0px (esperado ~64px)
- **contratos-rel-operacional · T6**: texto cortado sem tooltip: "CONTRATO DE PRESTAÇÃO DE SERVIÇO DE RETROESCAVADEI…" _(seletor: `div.resizable-table-scroll > table.resizable-table > tbody > tr.app-tabela-linha > td.celula-identidade`)_
- **cotacoes · R18**: overflow hidden mata o sticky: div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell.compras-responsive-scope > div.page.solicitacoes-page (overflow hidden) sobre a faixa fixa main.layout-main.flex-1 > div.layout-content-shell.compras-responsive-scope > div.page.solicitacoes-page > header.app-page-header — use overflow: clip _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell.compras-responsive-scope > div.page.solicitacoes-page (overflow hidden) sobre a faixa fixa main.layout-main.flex-1 > div.layout-content-shell.compras-responsive-scope > div.page.solicitacoes-page > header.app-page-header`)_
- **cotacoes · C1**: faixa sumiu na rolagem; faixa sobrepõe a topbar em 493.4px
- **cotacoes · X2**: faixa sumiu na rolagem
- **compras-delegacao · B2**: 0 bloco(s) primário(s) visível(is) (esperado 1)
- **revisar-solicitacao-compra · C1**: a tela NÃO ABRIU: redirecionada de /solicitacoes-compra/revisar para /solicitacoes-compra/nova — acesso/política bloqueando o usuário de QA
- **revisar-compra-direta · C1**: a tela NÃO ABRIU: redirecionada de /solicitacoes-compra-direta/revisar para /solicitacoes-compra-direta/nova — acesso/política bloqueando o usuário de QA
- **solicitacao-compra-detalhe · C1**: a tela NÃO ABRIU: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **gerenciar-cotacao · C1**: a tela NÃO ABRIU: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================

## SEM DADO — capacidades que NÃO foram provadas

A tela tem a capacidade e o harness a exercitaria; a base do preview não
devolveu registro para exercitá-la. **Não é aprovação e não vira aprovação
por equivalência com outra tela** (decisão do cliente, 03/09). Para fechar,
é preciso registro na base — o harness é SOMENTE LEITURA e não cria nenhum.

- **sst-crud** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum registro encontrado.") — capacidade NÃO PROVADA
- **solicitacao-detalhe** — T1, T2, T4, T5, T6, T7: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum titulo financeiro foi gerado para esta solicitacao.") — capacidade NÃO PROVADA
- **treinamento** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum conteudo encontrado Nenhum conteudo para os filtros atuais. Lim") — capacidade NÃO PROVADA
- **comercial-rel-operacional** — T1, T2, T4, T5, T6, T7, X1: a tela TEM tabela, mas a base do preview não devolveu nenhuma linha (mostrou "Nenhum contrato encontrado no período.") — capacidade NÃO PROVADA

## N/A — motivos

- **sst-crud**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **fiscal-rel-operacional**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatório"))
- **fiscal-diagnostico**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **provisoes-dashboard**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); R1 (ação principal não é cadastro ("Atualizar"))
- **provisao-nova**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **governanca-auditoria**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T5 (tela sem coluna de identificação); T7 (nenhum valor monetário na tela); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Exportar CSV"))
- **custos-recebiveis**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B2 (tela de registro com composição própria (sem blocos padrão)); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **solicitacao-detalhe**: T3 (tabela com menos de 2 colunas); F1 (tela sem busca); F4 (tela sem linha de filtros); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **dashboard**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B2 (tela de registro com composição própria (sem blocos padrão)); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); R18 (tela sem elemento fixo (faixa, tabela ou coluna fixa)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **treinamento**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável)
- **prioridades-diretoria**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R1 (tela sem ação principal de cadastro)
- **perfil**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **arquivos-modelos**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T5 (tela sem coluna de identificação); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro)
- **solicitacoes-rel-operacional**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatório"))
- **contratos-rel-operacional**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatório"))
- **comercial-rel-operacional**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T3 (tabela com menos de 2 colunas); F1 (tela sem busca); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (ação principal não é cadastro ("Atualizar relatório"))
- **solicitacoes-compra**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (cadastro em página própria (rota dedicada))
- **cotacoes**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **pedidos-compra**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); A1 (tela sem linha acionável); R1 (tela sem ação principal de cadastro)
- **compras-delegacao**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **gestao-fornecedores**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado)
- **gestao-insumos**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado)
- **nova-solicitacao-compra**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **nova-compra-direta**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
