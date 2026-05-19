# Modulo Fiscal - Fase 29 - Orquestracao de sync stub

## Objetivo

Separar a orquestracao da sincronizacao fiscal em um service proprio, preparando o caminho para o job real sem ativar consulta externa.

## Entrega

- Service `backend/src/modules/fiscal/services/fiscalDfeSyncJobService.js`.
- `FiscalSyncLogService` passou a delegar a tentativa manual para esse orquestrador.
- A tentativa manual agora usa o contrato SEFAZ stub quando `FISCAL_SEFAZ_ENABLED=true`.

## Comportamento atual

- `FISCAL_SEFAZ_ENABLED=false`:
  - registra log `skipped`;
  - atualiza `last_attempt_at`;
  - mantem estado `idle`.
- `FISCAL_SEFAZ_ENABLED=true`:
  - registra log `blocked`;
  - chama o contrato SEFAZ stub;
  - registra erro controlado `FISCAL_SEFAZ_STUB`;
  - nao executa SOAP real.

## Regras mantidas

- Nenhum job automatico foi ativado.
- Nenhuma chamada externa real foi feita.
- Nenhum documento fiscal e criado pela tentativa manual nesta fase.
- Nenhum modulo externo e alterado.

## Proxima etapa sugerida

Adicionar lock controlado no sync state antes da chamada real para impedir duas sincronizacoes simultaneas do mesmo CNPJ/tipo documental.
