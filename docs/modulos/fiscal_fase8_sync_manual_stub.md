# Modulo Fiscal - Fase 8 Sync manual controlada

## Escopo entregue

- Endpoint protegido para registrar tentativa manual de sincronizacao fiscal.
- Botao em Logs de Sincronizacao para disparar a tentativa manual.
- Criacao de registros em `fiscal_sync_logs`.
- Atualizacao controlada de `fiscal_dfe_sync_states.last_attempt_at`.
- Auditoria em `security_event_logs`.

## Rota adicionada

- `POST /api/fiscal/sync/run-manual`

Payload aceito:

```json
{
  "company_id": 1,
  "document_type": "nfe"
}
```

`company_id` e opcional. Sem ele, a tentativa e registrada para todas as empresas fiscais ativas e habilitadas.

## Comportamento atual

Esta fase ainda nao consulta SEFAZ.

Quando `FISCAL_SEFAZ_ENABLED=false`:

- cria log com `status=skipped`;
- informa que a sincronizacao SEFAZ esta desabilitada;
- nao marca erro no estado de NSU.

Quando `FISCAL_SEFAZ_ENABLED=true` antes da implementacao real:

- cria log com `status=blocked`;
- informa que a integracao real ainda nao foi implementada;
- marca o estado como `blocked` para evitar falsa sensacao de sincronizacao real.

## Permissao adicionada

- `fiscal.sync.run`

SUPERADMIN/ADMIN continuam com acesso administrativo por regra geral.

## Ainda pendente

- Implementar `sefazDfeDistributionService`.
- Implementar lock real de processamento SEFAZ.
- Implementar consulta `distNSU`.
- Processar XML/resumos retornados.
- Ativar scheduler somente apos validacao manual em DEV.
