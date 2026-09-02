# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · — N/A (motivo registrado).

- Verificação: **2026-09-02 18:35** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `df1db38f6e581d0352d05573546d13368ac4c734`
- Telas verificadas: 2 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, X1, X2, X3
- **Células FALHOU: 3** (justificativas abaixo)

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | X1 | X2 | X3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| financeiro-titulo-detalhe | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | — | — | — | — | ✅ | ✅ |
| tipos-solicitacao | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |

## FALHOU — cada célula, justificada

- **financeiro-titulo-detalhe · B3**: apoio da faixa repetido em bloco _(seletor: `main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > section.app-bloco.app-bloco--primario > p.app-bloco-lead`)_
- **financeiro-titulo-detalhe · M1**: 1 alvo(s) < 32px; primeiro: div.page.solicitacoes-page > section.app-bloco.app-bloco--primario > div.app-bloco-corpo > div > button.app-campos-toggle (179×18px)
- **financeiro-titulo-detalhe · M3**: contraste abaixo de AA: div.layout-content-shell > div.page.solicitacoes-page > div.app-stat-grid > div.app-stat > span.app-stat-label (4.50:1) | div.layout-content-shell > div.page.solicitacoes-page > div.app-stat-grid > div.app-stat > span.app-stat-label (4.50:1) | div.layout-content-shell > div.page.solicitacoes-page > div.app-stat-grid > div.app-stat > span.app-stat-label (4.50:1)

## N/A — motivos

- **financeiro-titulo-detalhe**: T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (ação principal não é cadastro ("Registrar baixa")); X1 (tela sem tabela/lista tabular)
- **tipos-solicitacao**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); T5 (tela sem coluna de identificação); T7 (nenhum valor monetário na tela); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); F3 (tela sem filtros marcáveis)
