# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · — N/A (motivo registrado).

- Verificação: **2026-09-02 18:22** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `affcbedde6ae00f54d5c8e5d13d9841df3cde52c`
- Telas verificadas: 22 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, X1, X2, X3
- **Células FALHOU: 58** (justificativas abaixo)

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | X1 | X2 | X3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| usuarios | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ |
| usuario-novo | ✅ | ❌ | ✅ | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | ✅ | ✅ |
| parceiros | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ |
| parceiro-categorias | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| financeiro-titulo-detalhe | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| obras | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ❌ | — | ✅ | ✅ | ✅ |
| obra-gestao | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ |
| obra-tipo-apropriacao | ✅ | ❌ | — | — | — | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ❌ | — | — | — | — | ✅ | ✅ |
| setores | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| tipos-solicitacao | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| tipos-sub-contrato | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ |
| empresas-grupo | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| areas-obra | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| setores-visiveis-usuario | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| tipos-solicitacao-por-setor | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| tipos-compartilhados-setor | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| setores-criacao-todas-obras | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| setores-acesso-todas-obras | ✅ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| usuarios-envio-qualquer-setor | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ |
| usuarios-acesso-financeiro | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ |
| usuarios-acesso-prioridade-diretoria | ✅ | ❌ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ |
| usuarios-permissoes-rh-dp | ❌ | ❌ | — | — | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ❌ | ✅ |

## FALHOU — cada célula, justificada

- **usuarios · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **usuario-novo · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **parceiros · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **parceiro-categorias · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **financeiro-titulo-detalhe · C1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · C2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · C3**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · C4**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · C5**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · C6**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T3**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T4**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T5**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T6**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · T7**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · F1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · F2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · F3**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · F4**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · B1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · B2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · B3**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · B4**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · B5**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · M1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · M2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · M3**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · M4**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · R1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · R2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · X1**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · X2**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **financeiro-titulo-detalhe · X3**: tela não verificada: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
- **obras · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **obras · R1**: "Novo cadastro" abriu formulário INLINE, não em modal (R9)
- **obra-tipo-apropriacao · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **obra-tipo-apropriacao · M3**: contraste abaixo de AA: div > table.table > thead > tr > th (4.23:1) | div > table.table > thead > tr > th (4.23:1) | div > table.table > thead > tr > th (4.23:1)
- **setores · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **setores · T6**: texto cortado sem tooltip: "Setor GEO / processos…" _(seletor: `div.resizable-table-scroll > table.resizable-table > tbody > tr.app-tabela-linha.app-tabela-linha--clicavel > td`)_
- **tipos-solicitacao · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **tipos-solicitacao · T6**: texto cortado sem tooltip: "Mostrar valorExigir valorMostrar descricaoExigir d…" _(seletor: `div.resizable-table-scroll > table.resizable-table > tbody > tr.app-tabela-linha.app-tabela-linha--clicavel > td`)_
- **tipos-sub-contrato · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **empresas-grupo · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **areas-obra · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **setores-visiveis-usuario · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **tipos-solicitacao-por-setor · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **tipos-compartilhados-setor · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **setores-criacao-todas-obras · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **setores-acesso-todas-obras · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **usuarios-envio-qualquer-setor · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **usuarios-acesso-financeiro · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **usuarios-acesso-financeiro · T6**: texto cortado sem tooltip: "Ja liberado…" _(seletor: `div.resizable-table-scroll > table.resizable-table > tbody > tr.app-tabela-linha > td`)_
- **usuarios-acesso-prioridade-diretoria · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **usuarios-permissoes-rh-dp · C2**: título em 14px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header.app-page-header--compacto`)_
- **usuarios-permissoes-rh-dp · C1**: faixa sumiu na rolagem; faixa sobrepõe a topbar em 511.4px
- **usuarios-permissoes-rh-dp · X2**: faixa sumiu na rolagem

## N/A — motivos

- **usuarios**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (cadastro em página própria (rota dedicada))
- **usuario-novo**: C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (formulário de criação não tem campos de leitura vazios a recolher); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis); R1 (cadastro de usuário é fluxo frequente com página própria (decisão registrada)); X1 (tela sem tabela/lista tabular)
- **parceiros**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (cadastro de uso FREQUENTE mantém painel acima da lista (decisão registrada em R9))
- **parceiro-categorias**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis)
- **obras**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis)
- **obra-gestao**: C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B2 (tela de registro com composição própria (sem blocos padrão)); B4 (tela sem grid de campos); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **obra-tipo-apropriacao**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (pivô de colunas dinâmicas — exceção registrada no manifesto (decisão do cliente pendente)); T3 (pivô de colunas dinâmicas — exceção registrada no manifesto (decisão do cliente pendente)); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **setores**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis)
- **tipos-solicitacao**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T5 (tela sem coluna de identificação); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis)
- **tipos-sub-contrato**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis); X1 (tela sem tabela/lista tabular)
- **empresas-grupo**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado)
- **areas-obra**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar")); X1 (tela sem tabela/lista tabular)
- **setores-visiveis-usuario**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar")); X1 (tela sem tabela/lista tabular)
- **tipos-solicitacao-por-setor**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar configuração")); X1 (tela sem tabela/lista tabular)
- **tipos-compartilhados-setor**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar configuracao")); X1 (tela sem tabela/lista tabular)
- **setores-criacao-todas-obras**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar")); X1 (tela sem tabela/lista tabular)
- **setores-acesso-todas-obras**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar")); X1 (tela sem tabela/lista tabular)
- **usuarios-envio-qualquer-setor**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar"))
- **usuarios-acesso-financeiro**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar"))
- **usuarios-acesso-prioridade-diretoria**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T7 (nenhum valor monetário na tela); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar configuracao"))
- **usuarios-permissoes-rh-dp**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Salvar matriz de permissoes")); X1 (tela sem tabela/lista tabular)
