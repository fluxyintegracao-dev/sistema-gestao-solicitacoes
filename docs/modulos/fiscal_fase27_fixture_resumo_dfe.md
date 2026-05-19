# Modulo Fiscal - Fase 27 - Fixture de resumo DFe

## Objetivo

Cobrir o caso em que a SEFAZ retorna apenas o resumo da NF-e, sem XML completo.

## Entrega

- Fixture `nfeDistribuicaoNormalizada.fixture.js` ampliada com um segundo documento sem XML.
- Script `validarFiscalDfeProcessor.js` validando dois cenarios:
  - NF-e com XML completo;
  - NF-e somente resumo.

## Comportamento esperado para resumo

- `document_status`: `summary_received`.
- `xml_storage_key`: `null`.
- `parsed_xml_json`: `null`.
- Dados principais preenchidos a partir de `summary`.
- Documento segue pendente para manifestacao/download futuro.

## Como validar

```bash
cd backend
npm run test:fiscal-dfe-processor
```

## Proxima etapa sugerida

Criar fixture de evento fiscal isolado e depois preparar o job manual para chamar o contrato SEFAZ stub + processor sem habilitar SEFAZ real.
