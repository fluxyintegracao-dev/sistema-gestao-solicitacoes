# eSocial no FLUXY

## Objetivo

Esta pasta documenta a camada tecnica de integracao do FLUXY com o eSocial.

O objetivo atual nao e transmitir eventos ao governo. O objetivo e preparar a arquitetura correta para que o FLUXY consiga, no futuro, gerar, validar, assinar, enviar e auditar eventos sem acoplar o dominio operacional ao XML oficial.

## Fonte oficial analisada

Pasta:

```text
SST ARQUIVOS/2026-04-27_esquemas_xsd_v_s_01_03_00
```

Versao identificada:

- layout: `S-1.3`
- schema: `v_s_01_03_00`

Arquivos prioritarios analisados:

- `evtCAT.xsd` - base do evento `S-2210`
- `evtMonit.xsd` - base do evento `S-2220`
- `evtExpRisco.xsd` - base do evento `S-2240`
- `tipos.xsd` - tipos compartilhados
- `xmldsig-core-schema.xsd` - assinatura XML futura
- `evtTabEstab.xsd`, `evtTabLotacao.xsd`, `evtAdmissao.xsd`, `evtTSVInicio.xsd` - dependencias auxiliares para empregador, lotacao e vinculo

## Estrutura implementada

```text
backend/src/modules/esocial/
  constants/
  layouts/
    s1_3/
    s1_4/
  mappings/
    s1_3/
  models/
  services/
```

## O que esta liberado agora

- Registrar metadados de layout.
- Registrar eventos preparados.
- Manter mapeadores versionados.
- Documentar campos criticos.
- Apontar pendencias operacionais.

## O que permanece bloqueado

- Transmissao real.
- SOAP.
- Assinatura digital.
- Certificado digital.
- Lotes reais.
- Ambiente de producao restrita ou producao.
- Retorno oficial do governo.

## Regra central

O eSocial e contrato externo. O dominio operacional do FLUXY e a fonte interna de verdade.
