# Producao restrita eSocial

## Regra atual

Somente o ambiente `restrita` e permitido nesta fase.

```env
ESOCIAL_AMBIENTE=restrita
ESOCIAL_TRANSMISSAO_RESTRITA_ENABLED=false
ESOCIAL_TRANSMISSAO_PRODUCAO_ENABLED=false
```

## Para habilitar teste restrito

Ativar apenas em ambiente homologado:

```env
ESOCIAL_INTEGRACAO_ENABLED=true
ESOCIAL_TRANSMISSAO_RESTRITA_ENABLED=true
ESOCIAL_XML_SIGN_ENABLED=true
ESOCIAL_SOAP_ENABLED=true
```

## Producao oficial

Permanece bloqueada por regra de backend, mesmo que alguma configuracao seja alterada indevidamente.
