# Fiscal - Fase 39 - Adaptador HTTP mTLS SEFAZ

## Objetivo

Preparar um adaptador isolado para envio SOAP via HTTPS/mTLS, sem ligar o job fiscal ao envio real ainda.

## Entregue

- Criado `backend/src/modules/fiscal/services/sefaz/sefazDfeHttpClientService.js`.
- O adaptador:
  - exige endpoint `https://`;
  - exige certificado fiscal ativo carregado previamente pelo service fiscal;
  - aceita apenas `storage_type=local_secure_path` nesta fase;
  - monta `https.Agent` com PFX e senha em memoria;
  - envia SOAP por `POST`;
  - retorna status HTTP, headers sanitizados, corpo e tempo de resposta;
  - nao registra certificado, senha ou XML completo no console.

## Importante

O adaptador nao esta conectado ao job `syncDFeJob` nesta fase. A sincronizacao continua bloqueada/stubada enquanto `FISCAL_SEFAZ_ENABLED` nao for ativado e enquanto o cliente real nao for plugado de ponta a ponta.

## Proxima etapa sugerida

Criar uma funcao controlada em `sefazDfeDistributionService` para:

1. buscar certificado ativo;
2. montar SOAP com `sefazDfeSoapBuilderService`;
3. enviar com `sefazDfeHttpClientService`;
4. salvar request/response brutos no S3 fiscal;
5. processar retorno com `sefazDfeResponseParserService`;
6. manter tudo atras de feature flag e preflight.
