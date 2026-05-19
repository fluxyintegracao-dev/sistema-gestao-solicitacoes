# Modulo Fiscal - Fase 30 - Lock de sincronizacao DFe

## Objetivo

Adicionar bloqueio operacional por empresa fiscal e tipo documental para evitar duas sincronizacoes simultaneas do mesmo CNPJ.

## Entrega

- `fiscalDfeSyncJobService` passou a adquirir lock antes da tentativa controlada com SEFAZ habilitada.
- Lock gravado em `fiscal_dfe_sync_states`:
  - `status = syncing`
  - `lock_token`
  - `locked_until`
- TTL configuravel por `FISCAL_SEFAZ_LOCK_TTL_SECONDS`.
- Tentativa concorrente retorna log `skipped` com `FISCAL_SYNC_LOCKED`.
- Tentativa antes da janela permitida retorna log `skipped` com `FISCAL_SYNC_THROTTLED`.

## Comportamento atual

- Ainda nao existe chamada SOAP real.
- Com `FISCAL_SEFAZ_ENABLED=false`, o fluxo segue como probe seguro e nao usa lock.
- Com `FISCAL_SEFAZ_ENABLED=true`, o lock protege a tentativa stub e e liberado ao registrar erro controlado.

## Variavel nova

```env
FISCAL_SEFAZ_LOCK_TTL_SECONDS=900
```

## Proxima etapa sugerida

Criar um endpoint administrativo de diagnostico do modulo fiscal que mostre storage, crypto, feature flags e sync sem expor segredos.
