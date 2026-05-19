# Fiscal - Fase 41 - Preflight Endpoint SEFAZ

## Objetivo

Melhorar o diagnostico antes da ativacao real da SEFAZ, validando configuracoes essenciais sem enviar nenhuma requisicao externa.

## Entregue

- O preflight fiscal agora valida:
  - `FISCAL_SEFAZ_DFE_DISTRIBUTION_URL`;
  - se o endpoint usa HTTPS;
  - `FISCAL_SEFAZ_REQUEST_TIMEOUT_MS`;
  - montagem local do SOAP `distNSU` por empresa monitorada.
- O diagnostico fiscal passa a exibir:
  - endpoint de distribuicao mascarado;
  - status HTTPS do endpoint;
  - timeout configurado.

## Segurança

- O endpoint e mascarado na resposta de diagnostico.
- Nenhum XML SOAP e enviado ao frontend.
- Nenhuma consulta externa e feita nesta fase.
- O preflight continua servindo apenas como validacao administrativa.

## Proxima etapa sugerida

Antes de ligar `FISCAL_SEFAZ_ENABLED=true`, validar no ambiente DEV:

1. bucket fiscal DEV;
2. `FISCAL_CRYPTO_KEY`;
3. certificado ativo e validado;
4. endpoint HTTPS correto da SEFAZ;
5. preflight sem checks `ERROR`.
