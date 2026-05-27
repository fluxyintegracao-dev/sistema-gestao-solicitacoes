# Integracao eSocial real controlada

## Estrategia

O FLUXY mantém o dominio operacional separado do contrato externo do eSocial:

```text
Dominio SST
-> mapper/builder versionado
-> XML oficial
-> lote
-> transmissao restrita
```

## Controles

- Producao oficial bloqueada nesta fase.
- Transmissao restrita exige flags especificas.
- XML assinado somente com flag, certificado e signer homologado.
- Logs nao armazenam senha, token ou caminho bruto do certificado.

## Eventos SST prioritarios

- S-2210: CAT.
- S-2220: monitoramento da saude.
- S-2240: exposicao a riscos.

## Status de lote

- `RASCUNHO`
- `VALIDADO`
- `PRONTO_ENVIO_RESTRITA`
- `ENVIADO_RESTRITA`
- `PROCESSADO_RESTRITA`
- `REJEITADO_RESTRITA`
- `ERRO_TECNICO`
