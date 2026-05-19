# Modulo Fiscal - Fase 3 Banco Complementar

Data: 2026-05-19

## Objetivo entregue

Complementar a base de banco do modulo Fiscal com tabelas estruturais que serao usadas nas fases de certificado, eventos fiscais e exportacao contabil, sem ativar nenhum processamento real.

## Migration criada

- `backend/migrations/202605190006_fiscal_complemento.js`

## Tabelas adicionadas

### `fiscal_certificates`

Guarda somente metadados e campos criptografados do certificado A1.

Regras preservadas:

- Sem upload de certificado nesta fase.
- Sem senha em texto puro.
- Model com `defaultScope` excluindo campos sensiveis:
  - `certificate_path_encrypted`
  - `certificate_s3_key_encrypted`
  - `password_encrypted`

### `fiscal_dfe_events`

Base para eventos de NF-e/CT-e vinculados a documentos fiscais.

### `fiscal_accounting_batches`

Base futura para lotes mensais de exportacao contabil.

### `fiscal_accounting_batch_items`

Itens dos lotes contabeis, com vinculo aos documentos fiscais.

## Models adicionados

- `FiscalCertificate`
- `FiscalDfeEvent`
- `FiscalAccountingBatch`
- `FiscalAccountingBatchItem`

## Arquivo alterado

- `backend/src/models/index.js`

Associacoes adicionadas:

- empresa fiscal x certificados
- documento fiscal x eventos
- empresa fiscal x lotes contabeis
- lote contabil x itens
- documento fiscal x itens de lote contabil

## O que nao foi implementado ainda

- Upload/validacao real de certificado A1.
- Descriptografia de segredo.
- Consulta SEFAZ.
- Manifestacao fiscal.
- Exportacao contabil real.
- Jobs automaticos.
- Qualquer integracao automatica com financeiro, pedidos ou compras.

## Comandos DEV

```bash
cd backend
npm run migrate
```

## Checklist manual

- Confirmar que a migration roda em DEV.
- Confirmar tabelas novas no MySQL.
- Confirmar que o backend sobe sem erro ao carregar `models/index.js`.
- Confirmar que as rotas da Fase 2 continuam respondendo.

## Proxima fase sugerida

Fase 4/5 controlada:

1. Criar service de criptografia fiscal.
2. Criar service de certificado apenas para validar arquivo local seguro em DEV.
3. Criar endpoints administrativos que nunca retornem path/senha.
4. Evoluir `fiscalS3Service` para upload/presign real de XML/DANFE.
