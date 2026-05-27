# Assinatura XML eSocial

## Decisao

A assinatura XML nao deve ser simulada.

Se a flag estiver desligada, certificado ausente ou dependencia XMLDSig nao homologada, o backend retorna bloqueio controlado.

## Flag

```env
ESOCIAL_XML_SIGN_ENABLED=false
```

## Requisitos futuros

- Dependencia XMLDSig homologada.
- Certificado A1 real.
- Validacao de namespace e referencia do evento.
- Teste contra producao restrita.
