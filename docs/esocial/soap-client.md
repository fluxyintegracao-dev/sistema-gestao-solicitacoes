# SOAP client eSocial

## Objetivo

Preparar envio e consulta de lotes em producao restrita sem ativar producao oficial.

## Flags

- `ESOCIAL_INTEGRACAO_ENABLED`
- `ESOCIAL_TRANSMISSAO_RESTRITA_ENABLED`
- `ESOCIAL_SOAP_ENABLED`

## URLs

- `ESOCIAL_RESTRITA_ENVIO_URL`
- `ESOCIAL_RESTRITA_CONSULTA_URL`

## Comportamento seguro

Sem flag ou sem endpoint, o envio e bloqueado e registrado em log tecnico.
