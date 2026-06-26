# Publicacao Mobile em Lojas

## Objetivo
Checklist operacional para publicar a V1 mobile do FLUXY na Apple App Store e Google Play Store sem alterar a versao web e sem ampliar regras do backend em producao.

## Escopo da V1 mobile
Entram na primeira versao:
- autenticacao, MFA, sessao segura e logout
- home operacional
- lista, busca e filtros de solicitacoes
- criacao de solicitacao
- detalhe de solicitacao
- historico, comentarios, mencoes e anexos
- upload por camera, galeria e documento, sempre iniciado pelo usuario
- notificacoes de mencoes
- perfil, senha, MFA, Politica de Privacidade e Termos de Uso

Ficam fora da primeira versao:
- financeiro completo, baixas, boletos, CNAB e SIENGE
- compras, cotacoes/RFQ e pedidos
- comercial/CRM
- fiscal, SST, RH/DP
- configuracoes administrativas
- relatorios
- provisionamento financeiro, ate validacao funcional especifica para mobile

## Estado preparado no codigo
- `mobile/app.json`
  - `bundleIdentifier`: `br.com.fluxy.core`
  - `package`: `br.com.fluxy.core`
  - `ios.buildNumber`: `1`
  - `android.versionCode`: `1`
  - descricoes iOS para camera e biblioteca de fotos
  - bloqueio Android para `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` e `SYSTEM_ALERT_WINDOW`
  - plugins Expo declarados para `expo-image-picker`, `expo-document-picker`, `expo-secure-store` e `expo-font`
- `mobile/eas.json`
  - perfil `production` com `EXPO_PUBLIC_API_URL=https://api.jrfluxy.com.br/api`
  - Android de producao configurado como `app-bundle`
- Projeto EAS
  - conta: `jrvjunior`
  - projeto: `@jrvjunior/fluxy-mobile`
  - projectId: `c8c2e65d-b16b-4f96-9259-946e20d04ea4`
- `mobile/package.json`
  - dependencias alinhadas ao Expo SDK 54
  - `react-dom`, `expo-font`, `expo-constants` e `react-native-webview` declarados para evitar falhas de build
- `mobile/src/providers/AppProviders.tsx`
  - `ModulesProvider` conectado para evitar crash em rotas internas que usam contexto de modulos
- `mobile/app/(tabs)/perfil.tsx`
  - links legais exibidos dentro do app usando `mobile/src/config/legal.ts`
- `mobile/src/config/legal.ts`
  - Politica de Privacidade: `https://www.jrfluxy.com.br/legal/fluxy-mobile-privacy.html`
  - Termos de Uso: `https://www.jrfluxy.com.br/legal/fluxy-mobile-terms.html`
- `mobile/src/services/api/types.ts`
  - contratos mobile de Provisionamento tipados para manter a esteira de build estavel, mesmo com o modulo fora da V1

## Validacoes executadas
Executado em `mobile/`:
- `npm install`
- `npm run typecheck`
- `npx expo install --check`
- `npx expo-doctor`
- `EXPO_PUBLIC_API_URL=https://api.jrfluxy.com.br/api EXPO_PUBLIC_APP_ENV=production npx expo export --platform android --output-dir dist-android`
- `EXPO_PUBLIC_API_URL=https://api.jrfluxy.com.br/api EXPO_PUBLIC_APP_ENV=production npx expo export --platform ios --output-dir dist-ios`
- `EXPO_PUBLIC_API_URL=https://api.jrfluxy.com.br/api EXPO_PUBLIC_APP_ENV=production npx expo config --type public`
- `EXPO_PUBLIC_API_URL=https://api.jrfluxy.com.br/api EXPO_PUBLIC_APP_ENV=production npx expo prebuild --platform android --clean --no-install`

Resultado:
- TypeScript sem erros
- dependencias Expo compatíveis
- Expo Doctor com 18/18 checks aprovados
- bundle/export Android e iOS gerados com sucesso
- Manifest Android temporario confirmou remocao de permissoes sensiveis via `tools:node="remove"`
- URLs legais canonicas com `www` retornam HTTP 200
- `npm audit --omit=dev --audit-level=high` nao aponta vulnerabilidades altas/criticas; restam vulnerabilidades moderadas em dependencias transitivas do toolchain Expo/React Native
- Build Android de producao finalizado no EAS:
  - Build ID: `5868e576-27fa-468d-9ce4-873fa1ce9ff4`
  - AAB: `https://expo.dev/artifacts/eas/grbB5OZsqMUdNIFMxfJDq2uw256_Yjsapz2aEWQEjxc.aab`
  - logs: `https://expo.dev/accounts/jrvjunior/projects/fluxy-mobile/builds/5868e576-27fa-468d-9ce4-873fa1ce9ff4`

## Pendencias antes da submissao
1. Configurar credenciais iOS em modo interativo:
   - `cd C:\Fluxy\mobile`
   - `npx eas-cli build --platform ios --profile production`
   - permitir que o EAS gerencie/crie certificados e provisioning profiles
2. Confirmar dados legais da empresa operadora do app:
   - nome juridico
   - CNPJ, se aplicavel
   - canal de suporte
   - contato de privacidade
3. Gerar e testar builds assinados:
   - Android: ja gerado em 2026-06-23
   - iOS: pendente por configuracao interativa de credenciais Apple
4. Testar em dispositivos reais:
   - login e MFA
   - criacao de solicitacao
   - detalhe de solicitacao
   - anexos por camera, galeria e documento
   - comentarios e mencoes
   - links legais no Perfil
5. Capturar screenshots reais para as lojas.

## Observacoes sobre vulnerabilidades npm
- Foi tentado `npm audit fix` sem `--force`, mas a arvore resultante introduziu duplicidade nativa de `react-native`.
- A instalacao foi regenerada a partir do `package.json` compatível com Expo SDK 54, restaurando `npx expo-doctor` para 18/18 checks aprovados.
- Nao executar `npm audit fix --force` nesta V1, pois o proprio npm indica upgrades quebrantes para `react-native@0.86.0` e `expo@56.0.12`.
- Reavaliar essas vulnerabilidades ao planejar upgrade controlado para uma versao futura do Expo SDK.

## Checklist Apple
1. Conta Apple Developer ativa
2. Bundle ID `br.com.fluxy.core` criado/configurado
3. App no App Store Connect
4. Nome do app, subtitulo, categoria e descricao
5. URL da Politica de Privacidade publica
6. Respostas do formulario App Privacy
7. Informar que camera/fotos/documentos sao usados apenas para anexos iniciados pelo usuario
8. Confirmar que o app nao usa localizacao, microfone nem rastreamento publicitario
9. Build iOS enviado ao TestFlight
10. Teste TestFlight concluido antes da revisao publica

## Checklist Google Play
1. Conta Google Play Console ativa
2. App criado com package `br.com.fluxy.core`
3. Nome do app, descricao curta, descricao completa e categoria
4. Icone, feature graphic e screenshots
5. URL da Politica de Privacidade publica
6. Formulario Data Safety preenchido conforme o uso real
7. Classificacao indicativa
8. App bundle `.aab` enviado para teste interno ou fechado
9. Teste interno/fechado concluido antes da publicacao em producao

## Dados e permissoes
O app usa:
- autenticacao e token de sessao
- nome, e-mail, perfil, setor e modulos habilitados do usuario
- solicitacoes, comentarios, historicos, mencoes e anexos
- camera, galeria e documentos apenas sob acao direta do usuario
- internet e vibracao/notificacoes nativas quando aplicavel

O app nao usa:
- localizacao
- microfone
- permissao Android de overlay/sobreposicao
- leitura/escrita legada de storage Android
- rastreamento publicitario
- coleta de dados para publicidade

## Observacoes
- O projeto mobile usa Expo gerenciado; nao ha `mobile/android/` ou `mobile/ios/` versionados.
- Alteracoes nativas devem ser feitas via `mobile/app.json`, plugins Expo e EAS.
- A versao web nao e parte da publicacao mobile, exceto se as paginas legais forem hospedadas no frontend web em alguma rodada futura.
