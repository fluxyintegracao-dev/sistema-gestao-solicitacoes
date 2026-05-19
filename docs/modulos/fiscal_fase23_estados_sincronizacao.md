# Modulo Fiscal - Fase 23 - Estados de sincronizacao

## Objetivo

Expor uma visao operacional dos estados de sincronizacao DFe por empresa fiscal, tipo documental e ambiente SEFAZ.

## Entrega

- Endpoint protegido `GET /api/fiscal/sync/states`.
- Consulta paginada de `fiscal_dfe_sync_states`.
- Validacao de filtros por empresa, status, tipo documental e ambiente.
- Pagina de logs fiscais ampliada para exibir estados de NSU.

## Regras mantidas

- Nenhuma consulta real a SEFAZ foi implementada.
- Nenhum job automatico foi ativado.
- O endpoint e somente leitura.
- A tentativa manual existente continua registrando probe controlado e atualizando estado sem baixar documentos.

## Campos exibidos

- Empresa fiscal.
- Tipo documental.
- Ambiente SEFAZ.
- Status.
- Ultimo NSU.
- Maximo NSU.
- Ultima tentativa.
- Proxima tentativa permitida.
- Ultimo erro.

## Proxima etapa sugerida

Criar o service de cliente SEFAZ em modo stub/testavel, com contrato de interface definido, antes de conectar certificado A1 e SOAP real.
