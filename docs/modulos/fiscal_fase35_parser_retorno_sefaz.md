# Modulo Fiscal - Fase 35 - Parser local do retorno SEFAZ

## Objetivo

Preparar a normalizacao local do retorno `NFeDistribuicaoDFe` antes de implementar a chamada SOAP real.

## Implementacao

Novo service:

- `backend/src/modules/fiscal/services/sefaz/sefazDfeResponseParserService.js`

O processor fiscal tambem passou a expor:

- `processarXmlRetornoDistribuicaoDfe(...)`

Essa funcao recebe o XML bruto da SEFAZ, chama o parser local e delega para o fluxo existente de processamento normalizado.

Funcoes principais:

- `parseDistribuicaoDfeResponse(responseXml)`
- `extractDocZipEntries(responseXml)`
- `normalizeDocZipEntry(entry)`
- `unzipDocZip(base64Content)`

## O que o parser faz

- Lê `retDistDFeInt`.
- Extrai `cStat`, `xMotivo`, `ultNSU`, `maxNSU`.
- Localiza todos os `docZip`.
- Descompacta o conteudo base64/gzip.
- Normaliza:
  - `procNFe` / `NFe` com XML completo;
  - `resNFe` como resumo de documento;
  - `procEventoNFe` como evento separado.
- Anexa eventos ao documento do mesmo `access_key` quando ambos vierem no mesmo lote.

## Segurança

- Nao consulta SEFAZ.
- Nao grava no banco.
- Nao grava no S3.
- Nao expõe XML em logs.
- Falha de descompactacao retorna erro controlado.

Observacao: `processarXmlRetornoDistribuicaoDfe` grava no banco/S3 apenas quando for chamado explicitamente por um fluxo autenticado e configurado. Nesta fase nenhum job automatico chama essa funcao.

## Teste

O fixture local de distribuicao foi ampliado com `docZip` compactado em gzip/base64.

Comando validado:

```bash
npm run test:fiscal-dfe-processor
```

## Proxima etapa

Conectar este parser ao cliente SOAP real somente quando:

- certificado A1 estiver validado no ambiente DEV;
- bucket S3 fiscal estiver validado;
- `FISCAL_SEFAZ_ENABLED` continuar controlado por `.env`;
- endpoint manual estiver testado com um CNPJ em homologacao/ambiente apropriado.
