# Publicacao Mobile em Lojas

## Objetivo
Checklist operacional para preparar o app mobile do FLUXY para distribuicao na Apple App Store e Google Play Store sem alterar as regras do backend em producao.

## O que ja foi preparado no codigo
- `mobile/app.json`
  - `bundleIdentifier` e `package` definidos
  - `ios.buildNumber` e `android.versionCode` definidos
  - descricoes de permissao para camera e fotos
  - bloqueio explicito de permissoes desnecessarias no Android
- `mobile/android/app/src/main/AndroidManifest.xml`
  - removidos `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` e `SYSTEM_ALERT_WINDOW`
  - `usesCleartextTraffic` ajustado para `false`
  - permissao de `CAMERA` mantida para anexos iniciados pelo usuario
- `mobile/app/(tabs)/perfil.tsx`
  - links de Politica de Privacidade e Termos de Uso dentro do app
- `frontend/public/legal/`
  - paginas publicas para politica e termos
- `mobile/app/anexo.tsx`
  - visualizacao interna de anexos no app

## Pendencias manuais antes da publicacao
1. Confirmar dados legais da empresa operadora do app:
   - nome juridico
   - canais de contato
   - responsavel por privacidade
2. Revisar os textos em:
   - `frontend/public/legal/fluxy-mobile-privacy.html`
   - `frontend/public/legal/fluxy-mobile-terms.html`
3. Publicar o frontend atualizado para expor os links legais em producao
4. Definir versao final:
   - `mobile/app.json`
   - `mobile/android/app/build.gradle`
5. Gerar build assinado de producao:
   - Android: preferencialmente `AAB`
   - iOS: `IPA` assinado com conta Apple Developer

## Checklist Apple
1. Conta Apple Developer ativa
2. Nome do app, subtitulo e descricao
3. Screenshots reais do app em iPhone
4. URL da Politica de Privacidade
5. Respostas do formulario de App Privacy no App Store Connect
6. Informar que o app usa camera/fotos apenas para anexos iniciados pelo usuario
7. Confirmar que o app nao usa localizacao nem microfone
8. Build iOS com `bundleIdentifier` definitivo
9. Teste via TestFlight antes da submissao final

## Checklist Google Play
1. Conta Google Play Console ativa
2. Nome do app, descricao curta e completa
3. Icone, feature graphic e screenshots
4. URL da Politica de Privacidade
5. Formulario de Data safety preenchido de acordo com o backend e o app
6. Classificacao indicativa
7. App bundle (`.aab`) assinado
8. Teste interno ou fechado antes da publicacao em producao

## Observacoes sobre dados e permissoes
- O app usa:
  - autenticacao
  - nome/e-mail/perfil/setor do usuario
  - comentarios, historicos e anexos
  - camera e galeria apenas sob acao direta do usuario
- O app nao usa:
  - microfone
  - localizacao
  - rastreamento publicitario

## Resultado esperado
- Base mobile pronta para build de loja
- Permissoes alinhadas ao uso real do app
- Links legais acessiveis dentro do aplicativo
- Menor risco de rejeicao por permissao desnecessaria ou ausencia de politica/termos
