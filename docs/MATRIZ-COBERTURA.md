# MATRIZ DE COBERTURA — TELA × ITEM DA DoD

> **GERADA AUTOMATICAMENTE** pelo harness `frontend/scripts/qa-preview/verificar.mjs`
> contra o PREVIEW PUBLICADO. Nunca editar à mão — só verificação na tela real
> altera célula. Legenda: ✅ PASSOU · ❌ FALHOU · 🚫 NAO ABRIU · ⚠ SEM DADO (a tela tem a
> capacidade, a base do preview não deu registro para exercitá-la — NÃO PROVADA)
> · — N/A (a regra não se aplica; motivo registrado).

- Verificação: **2026-09-05 05:07** · preview: https://refactor-dev.jrfluxy.com.br · build servido: `e93bb7b3c796a3ab28dc0d43e6f840955b2e79dd`
- Telas verificadas: 1 · Itens: C1, C2, C3, C4, C5, C6, T1, T2, T3, T4, T5, T6, T7, F1, F2, F3, F4, B1, B2, B3, B4, B5, M1, M2, M3, M4, R1, R2, R3, X1, X2, X3, R18, A1
- **Células FALHOU: 0**
- **Células SEM DADO: 0**
- Matriz 100% PASSOU, sem lacuna de evidência.

| Tela | C1 | C2 | C3 | C4 | C5 | C6 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | F1 | F2 | F3 | F4 | B1 | B2 | B3 | B4 | B5 | M1 | M2 | M3 | M4 | R1 | R2 | R3 | X1 | X2 | X3 | R18 | A1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fiscal-diagnostico | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |

## FALHOU — cada célula, justificada

_Nenhuma célula FALHOU nesta verificação._

## SEM DADO — capacidades que NÃO foram provadas

A tela tem a capacidade e o harness a exercitaria; a base do preview não
devolveu registro para exercitá-la. **Não é aprovação e não vira aprovação
por equivalência com outra tela** (decisão do cliente, 03/09). Para fechar,
é preciso registro na base — o harness é SOMENTE LEITURA e não cria nenhum.

_Nenhuma lacuna de evidência nesta verificação._

## N/A — motivos

- **fiscal-diagnostico**: C3 (listagem — seta só em detalhe/registro); C4 (não é tela de detalhe); C5 (tela sem ações no cabeçalho); T1 (tela sem tabela visível); T2 (tela sem tabela visível); T3 (tela sem tabela visível); T4 (tela sem tabela visível); T5 (tela sem tabela visível); T6 (tela sem tabela visível); T7 (tela sem tabela visível); F1 (tela sem busca); F4 (tela sem linha de filtros); B4 (não é tela de detalhe); M4 (tela sem comparação previsto × realizado); A1 (tela sem linha acionável); F3 (tela sem filtros marcáveis); R1 (tela sem ação principal de cadastro); X1 (tela sem tabela/lista tabular)
