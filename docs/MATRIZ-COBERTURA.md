# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · — N/A (motivo registrado).

- Verificação: **2026-09-02 18:09** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `sem marca`
- Telas verificadas: 2 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, X1, X2, X3
- **Células FALHOU: 8** (justificativas abaixo)

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | X1 | X2 | X3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| obras | ❌ | ❌ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ❌ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ❌ | ✅ |
| empresas-grupo | ❌ | ❌ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ❌ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ❌ | ✅ |

## FALHOU — cada célula, justificada

- **obras · C2**: título em 37.6px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header`)_
- **obras · B1**: canvas (rgba(0, 0, 0, 0)) não se distingue do bloco (rgb(255, 255, 255))
- **obras · C1**: topbar ou faixa ausente
- **obras · X2**: topbar ou faixa ausente
- **empresas-grupo · C2**: título em 37.6px (esperado 22px) _(seletor: `div.layout-shell.fluxy-app-shell > main.layout-main.flex-1 > div.layout-content-shell > div.page.solicitacoes-page > header.app-page-header`)_
- **empresas-grupo · B1**: canvas (rgba(0, 0, 0, 0)) não se distingue do bloco (rgb(255, 255, 255))
- **empresas-grupo · C1**: topbar ou faixa ausente
- **empresas-grupo · X2**: topbar ou faixa ausente

## N/A — motivos

- **obras**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B2 (tela de registro com composição própria (sem blocos padrão)); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
- **empresas-grupo**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B2 (tela de registro com composição própria (sem blocos padrão)); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); R2 (tela sem formulário visível (cadastro em modal é medido ao abrir)); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
