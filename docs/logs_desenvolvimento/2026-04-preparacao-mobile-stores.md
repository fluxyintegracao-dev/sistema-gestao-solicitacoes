# 2026-04 - Preparacao Mobile para Apple e Google

## Objetivo
Preparar a base do app mobile do FLUXY para publicacao em lojas, reduzindo risco de rejeicao por permissoes desnecessarias, ausencia de links legais e configuracao insegura.

## Alteracoes aplicadas
- ajuste de permissoes e descricoes no `mobile/app.json`
- limpeza de permissoes Android desnecessarias em `mobile/android/app/src/main/AndroidManifest.xml`
- links internos de politica e termos no perfil do app
- paginas publicas:
  - `frontend/public/legal/fluxy-mobile-privacy.html`
  - `frontend/public/legal/fluxy-mobile-terms.html`
- documentacao operacional em `docs/arquitetura/publicacao-mobile-stores.md`

## Observacoes
- ainda e necessario revisar os textos legais com os dados finais da empresa operadora antes da submissao oficial
- a App Store exige build iOS assinado e resposta do formulario de privacidade
- a Google Play exige Data safety, classificacao indicativa e politica publica
