# Modulo Fiscal - Fase 25 - Processor DFe normalizado

## Objetivo

Criar o service responsavel por transformar um retorno normalizado da futura consulta SEFAZ em registros internos do modulo Fiscal.

## Entrega

- Service `backend/src/modules/fiscal/services/fiscalDfeProcessorService.js`.
- Processamento idempotente por `access_key`.
- Suporte a documento com XML completo ou apenas resumo.
- Salvamento de XML no S3 fiscal quando `xml` estiver presente.
- Registro de eventos fiscais normalizados.
- Atualizacao opcional de `fiscal_dfe_sync_states`.
- Atualizacao opcional de `fiscal_sync_logs`.

## Contrato esperado

O processor recebe um objeto normalizado:

```js
{
  fiscalCompanyId,
  syncStateId,
  syncLogId,
  documentType: 'nfe',
  response: {
    ult_nsu: '123',
    max_nsu: '150',
    response_code: '138',
    response_message: 'Documento localizado',
    documents: [
      {
        nsu: '123',
        access_key: '...',
        xml: '<nfeProc>...</nfeProc>',
        summary: {},
        events: []
      }
    ]
  }
}
```

## Regras mantidas

- Nenhuma chamada externa a SEFAZ foi implementada.
- Nenhum job automatico foi ativado.
- Nenhuma integracao com financeiro, pedidos ou recebimentos foi criada.
- O processamento apenas grava/atualiza tabelas fiscais.

## Observacoes de seguranca

- XML completo nao deve ser logado em console.
- XML, quando presente, e armazenado no S3 fiscal privado.
- A idempotencia usa `access_key`, evitando duplicacao do documento.

## Proxima etapa sugerida

Criar fixtures locais e testes unitarios do processor antes de conectar o cliente SOAP real.
