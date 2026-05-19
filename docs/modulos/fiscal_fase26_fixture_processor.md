# Modulo Fiscal - Fase 26 - Fixture do processor DFe

## Objetivo

Adicionar um teste local simples para validar o contrato de mapeamento do processor DFe sem depender de SEFAZ, banco de dados real ou S3.

## Entrega

- Fixture normalizada:
  - `backend/src/modules/fiscal/services/sefaz/fixtures/nfeDistribuicaoNormalizada.fixture.js`
- Script de validacao:
  - `backend/scripts/validarFiscalDfeProcessor.js`
- NPM script:
  - `npm run test:fiscal-dfe-processor`

## O que o teste valida

- parse do XML de NF-e;
- chave de acesso;
- CNPJ/nome do emitente;
- CNPJ/nome do destinatario;
- numero, serie, valor total;
- status `xml_downloaded` quando ha XML e storage;
- origem `sefaz_distribution`;
- estrutura basica de `parsed_xml_json`.

## Regras mantidas

- Nenhuma chamada externa a SEFAZ.
- Nenhum acesso a S3.
- Nenhuma escrita em banco.
- Nenhum uso de certificado A1.

## Como rodar

```bash
cd backend
npm run test:fiscal-dfe-processor
```

## Proxima etapa sugerida

Criar testes/fixtures para resumo sem XML completo e para evento fiscal isolado antes de ligar o processor ao job real.
