# ADR - eSocial em producao restrita antes da producao oficial

## Decisao

O FLUXY permite preparar transmissao eSocial apenas em producao restrita nesta fase.

## Motivos

- Evitar envio oficial acidental.
- Validar XML, assinatura, certificado, SOAP e retornos com menor risco.
- Preservar rastreabilidade antes de ativar rotina governamental.

## Consequencias

- `ESOCIAL_AMBIENTE=producao` e bloqueado por backend.
- Producao oficial exigira nova decisao arquitetural e homologacao formal.
- A operacao pode evoluir tecnicamente sem expor a empresa a transmissao indevida.
